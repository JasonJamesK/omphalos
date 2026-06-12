using System.Security.Claims;
using Omphalos.Domain.DTOs;
using Omphalos.Domain.Interfaces;

namespace Omphalos.Web.Endpoints;

public static class SettingsEndpoints
{
    public static IEndpointRouteBuilder MapSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/settings").RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal user, IUserService users, CancellationToken ct) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            return Results.Ok(await users.GetSettingsAsync(userId, ct));
        });

        group.MapPut("/", async (UpdateSettingsRequest req, ClaimsPrincipal user, IUserService users, CancellationToken ct) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            return Results.Ok(await users.UpdateSettingsAsync(userId, req, ct));
        });

        return app;
    }
}
