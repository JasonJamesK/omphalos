using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Omphalos.Domain.DTOs;
using Omphalos.Domain.Interfaces;

namespace Omphalos.Web.Endpoints;

public static class AuthEndpoints
{
    private static readonly CookieOptions TokenCookieOptions = new()
    {
        HttpOnly = true,
        SameSite = SameSiteMode.Lax,
        Expires = DateTimeOffset.UtcNow.AddDays(30),
        // Secure = true  ← enable once behind HTTPS
    };

    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/login", async (LoginRequest req, IAuthService auth, HttpContext http, CancellationToken ct) =>
        {
            var result = await auth.LoginAsync(req, ct);
            if (result is null) return Results.Unauthorized();

            http.Response.Cookies.Append("omphalos_token", result.Token, TokenCookieOptions);
            return Results.Ok(new { username = result.Username, role = result.Role });
        }).AllowAnonymous();

        group.MapPost("/logout", (HttpContext http) =>
        {
            http.Response.Cookies.Delete("omphalos_token");
            return Results.NoContent();
        }).AllowAnonymous();

        group.MapGet("/me", (ClaimsPrincipal user) =>
        {
            var id = user.FindFirstValue(ClaimTypes.NameIdentifier);
            var name = user.FindFirstValue(ClaimTypes.Name);
            var role = user.FindFirstValue(ClaimTypes.Role);
            return Results.Ok(new { id, username = name, role });
        }).RequireAuthorization();

        return app;
    }
}
