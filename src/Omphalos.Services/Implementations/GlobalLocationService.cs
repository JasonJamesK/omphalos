using Omphalos.Domain.DTOs;
using Omphalos.Domain.Entities;
using Omphalos.Domain.Interfaces;

namespace Omphalos.Services.Implementations;

public class GlobalLocationService(IGlobalLocationRepository repo) : IGlobalLocationService
{
    public async Task<List<GlobalLocationDto>> GetAllAsync(CancellationToken ct = default) =>
        (await repo.GetAllAsync(ct)).Select(MapToDto).ToList();

    public async Task<GlobalLocationDto?> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var location = await repo.GetByIdAsync(id, ct);
        return location is null ? null : MapToDto(location);
    }

    public async Task<GlobalLocationDto> CreateAsync(CreateGlobalLocationRequest request, CancellationToken ct = default)
    {
        var entity = new GlobalLocation
        {
            Id = request.Id,
            Name = request.Name,
            Type = request.Type,
            Description = request.Description,
            Notes = request.Notes,
            SecretsAndHazards = request.SecretsAndHazards,
            HasImage = request.HasImage,
            OriginalImageData = request.OriginalImageData,
            CroppedImageData = request.CroppedImageData,
        };
        var created = await repo.CreateAsync(entity, ct);
        return MapToDto(created);
    }

    public async Task<GlobalLocationDto?> UpdateAsync(string id, UpdateGlobalLocationRequest request, CancellationToken ct = default)
    {
        var entity = new GlobalLocation
        {
            Id = id,
            Name = request.Name,
            Type = request.Type,
            Description = request.Description,
            Notes = request.Notes,
            SecretsAndHazards = request.SecretsAndHazards,
            HasImage = request.HasImage,
            OriginalImageData = request.OriginalImageData,
            CroppedImageData = request.CroppedImageData,
        };
        var updated = await repo.UpdateAsync(id, entity, ct);
        return updated is null ? null : MapToDto(updated);
    }

    public Task<DeleteGlobalLocationResult> DeleteAsync(string id, bool force, CancellationToken ct = default) =>
        repo.DeleteAsync(id, force, ct);

    private static GlobalLocationDto MapToDto(GlobalLocation g) => new(
        g.Id, g.Name, g.Type, g.Description, g.Notes, g.SecretsAndHazards, g.OriginalImageData != null);
}
