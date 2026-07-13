using Omphalos.Domain.Entities;

namespace Omphalos.Domain.Interfaces;

public enum DeleteGlobalLocationResult { Deleted, NotFound, ReferencedBySessions }

public interface IGlobalLocationRepository
{
    Task<List<GlobalLocation>> GetAllAsync(CancellationToken ct = default);
    Task<GlobalLocation?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<GlobalLocation> CreateAsync(GlobalLocation location, CancellationToken ct = default);
    Task<GlobalLocation?> UpdateAsync(string id, GlobalLocation location, CancellationToken ct = default);
    Task<DeleteGlobalLocationResult> DeleteAsync(string id, bool force, CancellationToken ct = default);

    // Not user-scoped (Global* entities have no owner). cropped=true resolves the
    // Cropped ?? Original fallback; cropped=false returns the original only.
    Task<byte[]?> GetImageAsync(string id, bool cropped, CancellationToken ct = default);
}
