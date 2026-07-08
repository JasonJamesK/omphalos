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
}
