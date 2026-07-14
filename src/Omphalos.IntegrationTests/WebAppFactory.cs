using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Omphalos.Domain.Entities;
using Omphalos.Repository;

namespace Omphalos.IntegrationTests;

// WebApplicationFactory harness for endpoint-level integration tests (new pattern for this
// repo — see 04-VALIDATION.md Wave 0 Requirements). Points the app under test at the shared
// PostgresFixture Testcontainers database (never spins its own container) and exposes helpers
// to seed a user and mint a valid omphalos_token JWT cookie for that user, so tests can call
// authorized routes as a specific userId without going through the real login endpoint.
public class WebAppFactory(string connectionString) : WebApplicationFactory<Program>
{
    public const string JwtSecret = "integration-test-jwt-secret-minimum-32-characters";
    public const string JwtIssuer = "omphalos-integration-tests";
    public const string JwtAudience = "omphalos-integration-tests";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Program.cs reads Jwt:Secret into a local variable via `builder.Configuration["Jwt:Secret"]`
        // as an eager top-level statement, before any ConfigureAppConfiguration callback added here
        // has been folded into that same live configuration snapshot -- an AddInMemoryCollection
        // override lands too late and the app silently keeps signing/validating against
        // appsettings.json's default secret while these tests sign with a different one, so every
        // token fails signature validation. UseSetting writes into the host configuration that IS
        // part of the WebApplicationBuilder's initial config before Program.cs's own code runs, so
        // early eager reads pick it up correctly.
        builder.UseSetting("ConnectionStrings:DefaultConnection", connectionString);
        builder.UseSetting("Jwt:Secret", JwtSecret);
        builder.UseSetting("Jwt:Issuer", JwtIssuer);
        builder.UseSetting("Jwt:Audience", JwtAudience);
        // Empty admin credentials skip first-boot admin seeding -- tests seed their own users.
        builder.UseSetting("Admin:Username", "");
        builder.UseSetting("Admin:Password", "");
    }

    // Seeds a fresh user directly via the DbContext (bypassing the real registration/login
    // flow, which this app doesn't even expose) so tests can authenticate as a known userId.
    public async Task<User> SeedUserAsync(CancellationToken ct = default)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<OmphalosDbContext>();

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = $"test-user-{Guid.NewGuid():N}",
            PasswordHash = "unused-in-tests",
            Role = UserRole.Player,
            CreatedAt = DateTime.UtcNow,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return user;
    }

    // Mirrors AuthService.GenerateToken's claim shape exactly (sub/unique_name/role) so the
    // app's real GetUserId(ClaimsPrincipal) helpers resolve the same way they do in production —
    // just signed with this factory's test-only Jwt:Secret instead of the app's configured one.
    public string CreateJwtToken(Guid userId, string username = "test-user", string role = "Player")
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, username),
            new Claim(ClaimTypes.Role, role),
        };

        var token = new JwtSecurityToken(
            issuer: JwtIssuer,
            audience: JwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // An HttpClient that attaches a valid omphalos_token cookie for the given user, so requests
    // through it hit authorized routes exactly as a logged-in browser would. HandleCookies must
    // be disabled here — the default WebApplicationFactory client wraps a CookieContainerHandler
    // that recomputes the Cookie header from its (empty) container and silently drops any
    // manually-added Cookie header otherwise.
    public HttpClient CreateAuthenticatedClient(Guid userId, string username = "test-user", string role = "Player")
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var token = CreateJwtToken(userId, username, role);
        client.DefaultRequestHeaders.Add("Cookie", $"omphalos_token={token}");
        return client;
    }
}
