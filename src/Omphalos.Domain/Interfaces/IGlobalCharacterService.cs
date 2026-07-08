using Omphalos.Domain.DTOs;

namespace Omphalos.Domain.Interfaces;

public interface IGlobalCharacterService
{
    Task<List<GlobalCharacterDto>> GetAllAsync(CancellationToken ct = default);
    Task<GlobalCharacterDto?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<GlobalCharacterDto> CreateAsync(CreateGlobalCharacterRequest request, CancellationToken ct = default);
    Task<GlobalCharacterDto?> UpdateAsync(string id, UpdateGlobalCharacterRequest request, CancellationToken ct = default);
    Task<DeleteGlobalCharacterResult> DeleteAsync(string id, bool force, CancellationToken ct = default);
}
