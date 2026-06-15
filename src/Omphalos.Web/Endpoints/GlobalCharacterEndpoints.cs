using System.Security.Claims;
using Omphalos.Domain.DTOs;
using Omphalos.Domain.Interfaces;

namespace Omphalos.Web.Endpoints;

public static class GlobalCharacterEndpoints
{
    public static IEndpointRouteBuilder MapGlobalCharacterEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/characters").RequireAuthorization();

        group.MapGet("/", async (IGlobalCharacterService service, CancellationToken ct) =>
            Results.Ok(await service.GetAllAsync(ct)));

        group.MapGet("/{id}", async (string id, IGlobalCharacterService service, CancellationToken ct) =>
        {
            var result = await service.GetByIdAsync(id, ct);
            return result is null ? Results.NotFound() : Results.Ok(result);
        });

        group.MapPost("/", async (CreateGlobalCharacterRequest req, IGlobalCharacterService service, CancellationToken ct) =>
        {
            var result = await service.CreateAsync(req, ct);
            return Results.Created($"/api/characters/{result.Id}", result);
        });

        group.MapPut("/{id}", async (string id, UpdateGlobalCharacterRequest req, IGlobalCharacterService service, CancellationToken ct) =>
        {
            var result = await service.UpdateAsync(id, req, ct);
            return result is null ? Results.NotFound() : Results.Ok(result);
        });

        group.MapDelete("/{id}", async (string id, bool? force, ClaimsPrincipal user, IGlobalCharacterService service, CancellationToken ct) =>
        {
            var isAdmin = user.IsInRole("Admin");
            var forceDelete = isAdmin && (force ?? false);
            var result = await service.DeleteAsync(id, forceDelete, ct);
            return result switch
            {
                DeleteGlobalCharacterResult.Deleted => Results.NoContent(),
                DeleteGlobalCharacterResult.NotFound => Results.NotFound(),
                DeleteGlobalCharacterResult.ReferencedBySessions => Results.Conflict(
                    new { message = "This character is used in one or more sessions. An admin can force delete it." }),
                _ => Results.StatusCode(500),
            };
        });

        return app;
    }
}
