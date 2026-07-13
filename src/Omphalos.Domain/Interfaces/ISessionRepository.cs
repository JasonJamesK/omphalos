using Omphalos.Domain.Entities;

namespace Omphalos.Domain.Interfaces;

public interface ISessionRepository
{
    Task<List<GameSession>> GetAllByUserAsync(Guid userId, CancellationToken ct = default);
    Task<GameSession?> GetByIdAsync(string id, Guid userId, CancellationToken ct = default);
    Task<GameSession> UpsertAsync(GameSession session, CancellationToken ct = default);
    Task<bool> DeleteAsync(string id, Guid userId, CancellationToken ct = default);

    // Session-ownership-scoped image reads (IDOR-safe): only returns bytes when the
    // character/location's session belongs to userId. cropped=true resolves the
    // Cropped ?? Original fallback; cropped=false returns the original only.
    Task<byte[]?> GetCharacterImageAsync(string sessionId, string characterId, Guid userId, bool cropped, CancellationToken ct = default);
    Task<byte[]?> GetLocationImageAsync(string sessionId, string locationId, Guid userId, bool cropped, CancellationToken ct = default);
}
