using System.Security.Claims;
using Omphalos.Domain.DTOs;
using Omphalos.Domain.Interfaces;

namespace Omphalos.Web.Endpoints;

public static class SessionEndpoints
{
    public static IEndpointRouteBuilder MapSessionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/sessions").RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal user, ISessionService sessions, CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            return Results.Ok(await sessions.GetAllAsync(userId, ct));
        });

        group.MapGet("/{id}", async (string id, ClaimsPrincipal user, ISessionService sessions, CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            var session = await sessions.GetByIdAsync(id, userId, ct);
            return session is null ? Results.NotFound() : Results.Ok(session);
        });

        group.MapPut("/{id}", async (string id, UpsertSessionRequest req, ClaimsPrincipal user, ISessionService sessions, CancellationToken ct) =>
        {
            if (req.Id != id) return Results.BadRequest("ID mismatch");
            var userId = GetUserId(user);
            var result = await sessions.UpsertAsync(req, userId, ct);
            return Results.Ok(result);
        });

        group.MapDelete("/{id}", async (string id, ClaimsPrincipal user, ISessionService sessions, CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            var deleted = await sessions.DeleteAsync(id, userId, ct);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        group.MapPost("/import", async (List<UpsertSessionRequest> reqs, ClaimsPrincipal user, ISessionService sessions, CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            var results = await sessions.ImportAsync(reqs, userId, ct);
            return Results.Ok(results);
        });

        return app;
    }

    private static Guid GetUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
