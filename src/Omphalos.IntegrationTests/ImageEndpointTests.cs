using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Omphalos.Domain.DTOs;
using Omphalos.Domain.Entities;
using Omphalos.Repository;
using Xunit;

namespace Omphalos.IntegrationTests;

// WebApplicationFactory-based endpoint tests for the new binary image-serving routes
// (04-03-PLAN.md Task 3). Covers IDOR-safe session ownership, ETag/304 caching, public vs
// private Cache-Control, and server-side upload validation. Named so `dotnet test --filter
// FullyQualifiedName~ImageEndpoint` selects this class.
[Collection("Postgres")]
public class ImageEndpointTests(PostgresFixture fixture)
{
    private static readonly byte[] PngBytes = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    private static readonly byte[] NotAnImageBytes = [0x00, 0x01, 0x02, 0x03];

    private WebAppFactory CreateFactory() => new(fixture.ConnectionString);

    private static async Task<(GameSession Session, Character Character)> SeedSessionCharacterAsync(
        WebAppFactory factory, Guid userId, byte[]? original, byte[]? cropped, CancellationToken ct)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<OmphalosDbContext>();

        var session = new GameSession
        {
            Id = $"session-{Guid.NewGuid():N}",
            UserId = userId,
            Title = "Image Endpoint Test Session",
            DateCreated = 0,
            DateModified = 0,
        };
        var character = new Character
        {
            Id = $"char-{Guid.NewGuid():N}",
            SessionId = session.Id,
            Name = "Image Endpoint Test Character",
            HasImage = true,
            OriginalImageData = original,
            CroppedImageData = cropped,
        };
        session.Characters.Add(character);
        db.GameSessions.Add(session);
        await db.SaveChangesAsync(ct);
        return (session, character);
    }

    [Fact]
    public async Task GetSessionCharacterCropped_AsOwningUser_Returns200WithPrivateCacheAndEtag()
    {
        var ct = TestContext.Current.CancellationToken;
        using var factory = CreateFactory();
        var owner = await factory.SeedUserAsync(ct);
        var (session, character) = await SeedSessionCharacterAsync(factory, owner.Id, PngBytes, null, ct);

        using var client = factory.CreateAuthenticatedClient(owner.Id);
        var response = await client.GetAsync($"/api/sessions/{session.Id}/characters/{character.Id}/portrait/cropped", ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("image/png", response.Content.Headers.ContentType?.MediaType);
        Assert.NotNull(response.Headers.ETag);
        Assert.Contains("private", response.Headers.CacheControl?.ToString() ?? "");

        var bytes = await response.Content.ReadAsByteArrayAsync(ct);
        Assert.Equal(PngBytes, bytes);
    }

    [Fact]
    public async Task GetSessionCharacterCropped_AsDifferentUser_Returns404()
    {
        var ct = TestContext.Current.CancellationToken;
        using var factory = CreateFactory();
        var owner = await factory.SeedUserAsync(ct);
        var otherUser = await factory.SeedUserAsync(ct);
        var (session, character) = await SeedSessionCharacterAsync(factory, owner.Id, PngBytes, null, ct);

        using var client = factory.CreateAuthenticatedClient(otherUser.Id);
        var response = await client.GetAsync($"/api/sessions/{session.Id}/characters/{character.Id}/portrait/cropped", ct);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetSessionCharacterPortrait_Unauthenticated_Returns401()
    {
        var ct = TestContext.Current.CancellationToken;
        using var factory = CreateFactory();
        var owner = await factory.SeedUserAsync(ct);
        var (session, character) = await SeedSessionCharacterAsync(factory, owner.Id, PngBytes, null, ct);

        using var client = factory.CreateClient();
        var response = await client.GetAsync($"/api/sessions/{session.Id}/characters/{character.Id}/portrait/cropped", ct);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetSessionCharacterCropped_MatchingIfNoneMatch_Returns304()
    {
        var ct = TestContext.Current.CancellationToken;
        using var factory = CreateFactory();
        var owner = await factory.SeedUserAsync(ct);
        var (session, character) = await SeedSessionCharacterAsync(factory, owner.Id, PngBytes, null, ct);

        using var client = factory.CreateAuthenticatedClient(owner.Id);
        var first = await client.GetAsync($"/api/sessions/{session.Id}/characters/{character.Id}/portrait/cropped", ct);
        var etag = first.Headers.ETag;
        Assert.NotNull(etag);

        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/sessions/{session.Id}/characters/{character.Id}/portrait/cropped");
        request.Headers.IfNoneMatch.Add(etag!);
        var second = await client.SendAsync(request, ct);

        Assert.Equal(HttpStatusCode.NotModified, second.StatusCode);
    }

    [Fact]
    public async Task GetGlobalCharacterCropped_ReturnsPrivateCacheControl()
    {
        var ct = TestContext.Current.CancellationToken;
        using var factory = CreateFactory();
        var user = await factory.SeedUserAsync(ct);
        var globalCharacterId = $"gc-{Guid.NewGuid():N}";

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<OmphalosDbContext>();
            db.GlobalCharacters.Add(new GlobalCharacter
            {
                Id = globalCharacterId,
                Name = "Global Image Endpoint Test Character",
                HasImage = true,
                OriginalImageData = PngBytes,
            });
            await db.SaveChangesAsync(ct);
        }

        using var client = factory.CreateAuthenticatedClient(user.Id);
        var response = await client.GetAsync($"/api/characters/{globalCharacterId}/portrait/cropped", ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("private", response.Headers.CacheControl?.ToString() ?? "");
    }

    [Fact]
    public async Task CreateGlobalCharacter_WithInvalidImageBytes_Returns400AndDoesNotPersist()
    {
        var ct = TestContext.Current.CancellationToken;
        using var factory = CreateFactory();
        var user = await factory.SeedUserAsync(ct);
        var id = $"gc-{Guid.NewGuid():N}";

        var req = new CreateGlobalCharacterRequest(
            id, "Invalid Image Character", null, null, null, null, null, null, null,
            true, NotAnImageBytes, null, null, null, false, null);

        using var client = factory.CreateAuthenticatedClient(user.Id);
        var response = await client.PostAsJsonAsync("/api/characters", req, ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<OmphalosDbContext>();
        var persisted = await db.GlobalCharacters.FirstOrDefaultAsync(g => g.Id == id, ct);
        Assert.Null(persisted);
    }
}
