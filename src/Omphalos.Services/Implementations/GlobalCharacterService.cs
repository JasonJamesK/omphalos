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
            IsNpc = request.IsNpc,
            StatBlock = MapStatBlockToEntity(request.StatBlock),
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
            IsNpc = request.IsNpc,
            StatBlock = MapStatBlockToEntity(request.StatBlock),
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
        g.Relationships.Select(r => new CharacterRelationshipDto(r.Name, r.Type)).ToList(),
        g.IsNpc,
        MapStatBlockToDto(g.StatBlock));

    private static NpcStatBlock? MapStatBlockToEntity(NpcStatBlockDto? d) => d is null ? null : new NpcStatBlock
    {
        SizeType = d.SizeType,
        Alignment = d.Alignment,
        ArmorClass = d.ArmorClass,
        HitPoints = d.HitPoints,
        Speed = d.Speed,
        Str = d.Str,
        Dex = d.Dex,
        Con = d.Con,
        Int = d.Int,
        Wis = d.Wis,
        Cha = d.Cha,
        SavingThrows = d.SavingThrows,
        Skills = d.Skills,
        DamageVulnerabilities = d.DamageVulnerabilities,
        DamageResistances = d.DamageResistances,
        DamageImmunities = d.DamageImmunities,
        ConditionImmunities = d.ConditionImmunities,
        Senses = d.Senses,
        Languages = d.Languages,
        ChallengeRating = d.ChallengeRating,
        Traits = (d.Traits ?? []).Select(t => new StatBlockEntry { Name = t.Name, Text = t.Text, Cost = t.Cost }).ToList(),
        Actions = (d.Actions ?? []).Select(t => new StatBlockEntry { Name = t.Name, Text = t.Text, Cost = t.Cost }).ToList(),
        LegendaryActions = (d.LegendaryActions ?? []).Select(t => new StatBlockEntry { Name = t.Name, Text = t.Text, Cost = t.Cost }).ToList(),
    };

    private static NpcStatBlockDto? MapStatBlockToDto(NpcStatBlock? s) => s is null ? null : new NpcStatBlockDto(
        s.SizeType, s.Alignment, s.ArmorClass, s.HitPoints, s.Speed,
        s.Str, s.Dex, s.Con, s.Int, s.Wis, s.Cha,
        s.SavingThrows, s.Skills, s.DamageVulnerabilities, s.DamageResistances, s.DamageImmunities,
        s.ConditionImmunities, s.Senses, s.Languages, s.ChallengeRating,
        s.Traits.Select(t => new StatBlockEntryDto(t.Name, t.Text, t.Cost)).ToList(),
        s.Actions.Select(t => new StatBlockEntryDto(t.Name, t.Text, t.Cost)).ToList(),
        s.LegendaryActions.Select(t => new StatBlockEntryDto(t.Name, t.Text, t.Cost)).ToList()
    );
}
