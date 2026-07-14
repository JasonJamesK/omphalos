using Omphalos.Domain.Interfaces;

namespace Omphalos.Services.Implementations;

public class ImageService(
    ISessionRepository sessions,
    IGlobalCharacterRepository globalCharacters,
    IGlobalLocationRepository globalLocations) : IImageService
{
    public Task<byte[]?> GetSessionCharacterImageAsync(string sessionId, string characterId, Guid userId, bool cropped, CancellationToken ct = default) =>
        sessions.GetCharacterImageAsync(sessionId, characterId, userId, cropped, ct);

    public Task<byte[]?> GetSessionLocationImageAsync(string sessionId, string locationId, Guid userId, bool cropped, CancellationToken ct = default) =>
        sessions.GetLocationImageAsync(sessionId, locationId, userId, cropped, ct);

    public Task<byte[]?> GetGlobalCharacterImageAsync(string id, bool cropped, CancellationToken ct = default) =>
        globalCharacters.GetImageAsync(id, cropped, ct);

    public Task<byte[]?> GetGlobalLocationImageAsync(string id, bool cropped, CancellationToken ct = default) =>
        globalLocations.GetImageAsync(id, cropped, ct);
}
