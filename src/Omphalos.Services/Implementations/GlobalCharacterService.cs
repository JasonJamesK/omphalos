using Omphalos.Domain.DTOs;
using Omphalos.Domain.Entities;
using Omphalos.Domain.Interfaces;

namespace Omphalos.Services.Implementations;

public class GlobalCharacterService(IGlobalCharacterRepository repo) : IGlobalCharacterService
{
    public async Task<List<GlobalCharacterDto>> GetAllAsync(CancellationToken ct = default) =>
        (await repo.GetAllAsync(ct)).Select(MapToDto).ToList();

    public async Task<GlobalCharacterDto?> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var character = await repo.GetByIdAsync(id, ct);
        return character is null ? null : MapToDto(character);
    }

    public async Task<GlobalCharacterDto> CreateAsync(CreateGlobalCharacterRequest request, CancellationToken ct = default)
    {
        var entity = new GlobalCharacter
        {
            Id = request.Id,
            Name = request.Name,
            Tagline = request.Tagline,
            Class = request.Class,
            Race = request.Race,
            Alignment = request.Alignment,
            PersonalityTraits = request.PersonalityTraits,
            Flaw = request.Flaw,
            Description = request.Description,
            PortraitBase64 = request.PortraitBase64,
            PortraitPanX = request.PortraitPanX,
            PortraitPanY = request.PortraitPanY,
            QuestHooks = request.QuestHooks,
            Relationships = (request.Relationships ?? []).Select(r => new CharacterRelationship { Name = r.Name, Type = r.Type }).ToList(),
        };
        var created = await repo.CreateAsync(entity, ct);
        return MapToDto(created);
    }

    public async Task<GlobalCharacterDto?> UpdateAsync(string id, UpdateGlobalCharacterRequest request, CancellationToken ct = default)
    {
        var entity = new GlobalCharacter
        {
            Id = id,
            Name = request.Name,
            Tagline = request.Tagline,
            Class = request.Class,
            Race = request.Race,
            Alignment = request.Alignment,
            PersonalityTraits = request.PersonalityTraits,
            Flaw = request.Flaw,
            Description = request.Description,
            PortraitBase64 = request.PortraitBase64,
            PortraitPanX = request.PortraitPanX,
            PortraitPanY = request.PortraitPanY,
            QuestHooks = request.QuestHooks,
            Relationships = (request.Relationships ?? []).Select(r => new CharacterRelationship { Name = r.Name, Type = r.Type }).ToList(),
        };
        var updated = await repo.UpdateAsync(id, entity, ct);
        return updated is null ? null : MapToDto(updated);
    }

    public Task<DeleteGlobalCharacterResult> DeleteAsync(string id, bool force, CancellationToken ct = default) =>
        repo.DeleteAsync(id, force, ct);

    private static GlobalCharacterDto MapToDto(GlobalCharacter g) => new(
        g.Id, g.Name, g.Tagline, g.Class, g.Race, g.Alignment,
        g.PersonalityTraits, g.Flaw, g.Description,
        g.PortraitBase64, g.PortraitPanX, g.PortraitPanY,
        g.QuestHooks,
        g.Relationships.Select(r => new CharacterRelationshipDto(r.Name, r.Type)).ToList());
}
