using Omphalos.Domain.Entities;

namespace Omphalos.Domain.Interfaces;

public interface ISessionRepository
{
    Task<List<GameSession>> GetAllByUserAsync(Guid userId, CancellationToken ct = default);
    Task<GameSession?> GetByIdAsync(string id, Guid userId, CancellationToken ct = default);
    Task<GameSession> UpsertAsync(GameSession session, CancellationToken ct = default);
    Task<bool> DeleteAsync(string id, Guid userId, CancellationToken ct = default);
}
