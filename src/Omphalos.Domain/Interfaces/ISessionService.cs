using Omphalos.Domain.DTOs;

namespace Omphalos.Domain.Interfaces;

public interface ISessionService
{
    Task<List<SessionSummaryDto>> GetAllAsync(Guid userId, CancellationToken ct = default);
    Task<SessionDto?> GetByIdAsync(string id, Guid userId, CancellationToken ct = default);
    Task<SessionDto> UpsertAsync(UpsertSessionRequest request, Guid userId, CancellationToken ct = default);
    Task<bool> DeleteAsync(string id, Guid userId, CancellationToken ct = default);
    Task<List<SessionDto>> ImportAsync(List<UpsertSessionRequest> sessions, Guid userId, CancellationToken ct = default);
}
