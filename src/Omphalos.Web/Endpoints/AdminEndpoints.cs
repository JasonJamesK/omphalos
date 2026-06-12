using Omphalos.Domain.DTOs;
using Omphalos.Domain.Interfaces;

namespace Omphalos.Web.Endpoints;

public static class AdminEndpoints
{
    public static IEndpointRouteBuilder MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin").RequireAuthorization("AdminOnly");

        group.MapGet("/users", async (IUserService users, CancellationToken ct) =>
            Results.Ok(await users.GetAllAsync(ct)));

        group.MapPost("/users", async (CreateUserRequest req, IUserService users, CancellationToken ct) =>
        {
            var user = await users.CreateAsync(req, ct);
            return Results.Created($"/api/admin/users/{user.Id}", user);
        });

        group.MapDelete("/users/{id:guid}", async (Guid id, IUserService users, CancellationToken ct) =>
        {
            var deleted = await users.DeleteAsync(id, ct);
            return deleted ? Results.NoContent() : Results.NotFound();
        });

        return app;
    }
}
