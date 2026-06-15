using System.Security.Claims;
using Omphalos.Domain.DTOs;
using Omphalos.Domain.Interfaces;

namespace Omphalos.Web.Endpoints;

public static class GlobalLocationEndpoints
{
    public static IEndpointRouteBuilder MapGlobalLocationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/locations").RequireAuthorization();

        group.MapGet("/", async (IGlobalLocationService service, CancellationToken ct) =>
            Results.Ok(await service.GetAllAsync(ct)));

        group.MapGet("/{id}", async (string id, IGlobalLocationService service, CancellationToken ct) =>
        {
            var result = await service.GetByIdAsync(id, ct);
            return result is null ? Results.NotFound() : Results.Ok(result);
        });

        group.MapPost("/", async (CreateGlobalLocationRequest req, IGlobalLocationService service, CancellationToken ct) =>
        {
            var result = await service.CreateAsync(req, ct);
            return Results.Created($"/api/locations/{result.Id}", result);
        });

        group.MapPut("/{id}", async (string id, UpdateGlobalLocationRequest req, IGlobalLocationService service, CancellationToken ct) =>
        {
            var result = await service.UpdateAsync(id, req, ct);
            return result is null ? Results.NotFound() : Results.Ok(result);
        });

        group.MapDelete("/{id}", async (string id, bool? force, ClaimsPrincipal user, IGlobalLocationService service, CancellationToken ct) =>
        {
            var isAdmin = user.IsInRole("Admin");
            var forceDelete = isAdmin && (force ?? false);
            var result = await service.DeleteAsync(id, forceDelete, ct);
            return result switch
            {
                DeleteGlobalLocationResult.Deleted => Results.NoContent(),
                DeleteGlobalLocationResult.NotFound => Results.NotFound(),
                DeleteGlobalLocationResult.ReferencedBySessions => Results.Conflict(
                    new { message = "This location is used in one or more sessions. An admin can force delete it." }),
                _ => Results.StatusCode(500),
            };
        });

        return app;
    }
}
