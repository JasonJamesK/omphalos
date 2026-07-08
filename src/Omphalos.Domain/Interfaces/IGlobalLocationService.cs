using Omphalos.Domain.DTOs;

namespace Omphalos.Domain.Interfaces;

public interface IGlobalLocationService
{
    Task<List<GlobalLocationDto>> GetAllAsync(CancellationToken ct = default);
    Task<GlobalLocationDto?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<GlobalLocationDto> CreateAsync(CreateGlobalLocationRequest request, CancellationToken ct = default);
    Task<GlobalLocationDto?> UpdateAsync(string id, UpdateGlobalLocationRequest request, CancellationToken ct = default);
    Task<DeleteGlobalLocationResult> DeleteAsync(string id, bool force, CancellationToken ct = default);
}
