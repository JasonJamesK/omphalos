using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.Net.Http.Headers;
using Omphalos.Domain.DTOs;
using Omphalos.Domain.Interfaces;
using Omphalos.Services.Implementations;

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

        group.MapGet("/{id}/image/{variant}", async (
            string id, string variant, IImageService images, HttpContext http, CancellationToken ct) =>
        {
            if (variant != "original" && variant != "cropped") return Results.NotFound();

            var bytes = await images.GetGlobalLocationImageAsync(id, variant == "cropped", ct);
            if (bytes is null) return Results.NotFound();

            var mime = ImageValidation.DetectImageMimeType(bytes);
            var etag = new EntityTagHeaderValue($"\"{Convert.ToHexString(SHA256.HashData(bytes))}\"");
            // Private: this endpoint requires authorization, and a shared/proxy cache
            // does not participate in that check — "public" here would risk one
            // authenticated user's response being served to a different, unauthenticated
            // request for the same URL if an intermediary is configured to share it.
            http.Response.Headers.CacheControl = "private, max-age=31536000, immutable";
            return TypedResults.File(bytes, mime, entityTag: etag);
        });

        group.MapPost("/", async (CreateGlobalLocationRequest req, IGlobalLocationService service, CancellationToken ct) =>
        {
            if (ImageValidation.IsInvalidUpload(req.OriginalImageData) || ImageValidation.IsInvalidUpload(req.CroppedImageData))
                return Results.BadRequest("Invalid image data.");

            var result = await service.CreateAsync(req, ct);
            return Results.Created($"/api/locations/{result.Id}", result);
        });

        group.MapPut("/{id}", async (string id, UpdateGlobalLocationRequest req, IGlobalLocationService service, CancellationToken ct) =>
        {
            if (ImageValidation.IsInvalidUpload(req.OriginalImageData) || ImageValidation.IsInvalidUpload(req.CroppedImageData))
                return Results.BadRequest("Invalid image data.");

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
