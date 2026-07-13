using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.Net.Http.Headers;
using Omphalos.Domain.DTOs;
using Omphalos.Domain.Interfaces;
using Omphalos.Services.Implementations;

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

        group.MapGet("/{id}/portrait/{variant}", async (
            string id, string variant, IImageService images, HttpContext http, CancellationToken ct) =>
        {
            if (variant != "original" && variant != "cropped") return Results.NotFound();

            var bytes = await images.GetGlobalCharacterImageAsync(id, variant == "cropped", ct);
            if (bytes is null) return Results.NotFound();

            var mime = ImageValidation.DetectImageMimeType(bytes);
            var etag = new EntityTagHeaderValue($"\"{Convert.ToHexString(SHA256.HashData(bytes))}\"");
            // Public: GlobalCharacter images aren't user-scoped, safe to share across clients.
            http.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
            return TypedResults.File(bytes, mime, entityTag: etag);
        });

        group.MapPost("/", async (CreateGlobalCharacterRequest req, IGlobalCharacterService service, CancellationToken ct) =>
        {
            if (ImageValidation.IsInvalidUpload(req.OriginalImageData) || ImageValidation.IsInvalidUpload(req.CroppedImageData))
                return Results.BadRequest("Invalid image data.");

            var result = await service.CreateAsync(req, ct);
            return Results.Created($"/api/characters/{result.Id}", result);
        });

        group.MapPut("/{id}", async (string id, UpdateGlobalCharacterRequest req, IGlobalCharacterService service, CancellationToken ct) =>
        {
            if (ImageValidation.IsInvalidUpload(req.OriginalImageData) || ImageValidation.IsInvalidUpload(req.CroppedImageData))
                return Results.BadRequest("Invalid image data.");

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
