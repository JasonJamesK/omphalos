namespace Omphalos.Domain.Interfaces;

// Thin orchestrator over the per-repository image fetch methods, used by the dedicated
// binary image endpoints (CharacterImageEndpoints, LocationImageEndpoints, and the Global*
// endpoint extensions). Each method returns null when the requested bytes are absent or
// (for the session-scoped methods) the character/location is not owned by userId.
public interface IImageService
{
    Task<byte[]?> GetSessionCharacterImageAsync(string sessionId, string characterId, Guid userId, bool cropped, CancellationToken ct = default);
    Task<byte[]?> GetSessionLocationImageAsync(string sessionId, string locationId, Guid userId, bool cropped, CancellationToken ct = default);
    Task<byte[]?> GetGlobalCharacterImageAsync(string id, bool cropped, CancellationToken ct = default);
    Task<byte[]?> GetGlobalLocationImageAsync(string id, bool cropped, CancellationToken ct = default);
}
