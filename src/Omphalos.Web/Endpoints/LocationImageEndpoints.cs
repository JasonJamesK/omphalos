using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.Net.Http.Headers;
using Omphalos.Domain.Interfaces;
using Omphalos.Services.Implementations;

namespace Omphalos.Web.Endpoints;

public static class LocationImageEndpoints
{
    public static IEndpointRouteBuilder MapLocationImageEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/sessions").RequireAuthorization();

        group.MapGet("/{sessionId}/locations/{id}/image/{variant}", async (
            string sessionId, string id, string variant, ClaimsPrincipal user, IImageService images, HttpContext http, CancellationToken ct) =>
        {
            if (variant != "original" && variant != "cropped") return Results.NotFound();

            var userId = GetUserId(user);
            var bytes = await images.GetSessionLocationImageAsync(sessionId, id, userId, variant == "cropped", ct);
            if (bytes is null) return Results.NotFound();

            var mime = ImageValidation.DetectImageMimeType(bytes);
            var etag = new EntityTagHeaderValue($"\"{Convert.ToHexString(SHA256.HashData(bytes))}\"");
            // Private: this image belongs to a single user's session, never shared/public.
            http.Response.Headers.CacheControl = "private, max-age=31536000, immutable";
            return TypedResults.File(bytes, mime, entityTag: etag);
        });

        return app;
    }

    private static Guid GetUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
