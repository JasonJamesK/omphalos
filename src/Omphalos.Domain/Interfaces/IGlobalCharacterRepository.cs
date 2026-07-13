using Omphalos.Domain.Entities;

namespace Omphalos.Domain.Interfaces;

public enum DeleteGlobalCharacterResult { Deleted, NotFound, ReferencedBySessions }

public interface IGlobalCharacterRepository
{
    Task<List<GlobalCharacter>> GetAllAsync(CancellationToken ct = default);
    Task<GlobalCharacter?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<GlobalCharacter> CreateAsync(GlobalCharacter character, CancellationToken ct = default);
    Task<GlobalCharacter?> UpdateAsync(string id, GlobalCharacter character, CancellationToken ct = default);
    Task<DeleteGlobalCharacterResult> DeleteAsync(string id, bool force, CancellationToken ct = default);

    // Not user-scoped (Global* entities have no owner). cropped=true resolves the
    // Cropped ?? Original fallback; cropped=false returns the original only.
    Task<byte[]?> GetImageAsync(string id, bool cropped, CancellationToken ct = default);
}
