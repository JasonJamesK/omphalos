using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
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
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = connectionString,
                ["Jwt:Secret"] = JwtSecret,
                ["Jwt:Issuer"] = JwtIssuer,
                ["Jwt:Audience"] = JwtAudience,
                // Empty admin credentials skip first-boot admin seeding — tests seed their own users.
                ["Admin:Username"] = "",
                ["Admin:Password"] = "",
            });
        });
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
    // through it hit authorized routes exactly as a logged-in browser would.
    public HttpClient CreateAuthenticatedClient(Guid userId, string username = "test-user", string role = "Player")
    {
        var client = CreateClient();
        var token = CreateJwtToken(userId, username, role);
        client.DefaultRequestHeaders.Add("Cookie", $"omphalos_token={token}");
        return client;
    }
}
