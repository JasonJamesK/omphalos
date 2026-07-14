using Omphalos.Domain.DTOs;
using Omphalos.Domain.Entities;
using Omphalos.Domain.Interfaces;

namespace Omphalos.Services.Implementations;

public class SessionService(ISessionRepository repo) : ISessionService
{
    public async Task<List<SessionSummaryDto>> GetAllAsync(Guid userId, CancellationToken ct = default)
    {
        var sessions = await repo.GetAllByUserAsync(userId, ct);
        return sessions.Select(s => new SessionSummaryDto(s.Id, s.Title, s.DateCreated, s.DateModified)).ToList();
    }

    public async Task<SessionDto?> GetByIdAsync(string id, Guid userId, CancellationToken ct = default)
    {
        var s = await repo.GetByIdAsync(id, userId, ct);
        return s is null ? null : MapToDto(s);
    }

    public async Task<SessionDto> UpsertAsync(UpsertSessionRequest request, Guid userId, CancellationToken ct = default)
    {
        var session = MapToEntity(request, userId);
        var saved = await repo.UpsertAsync(session, ct);
        return MapToDto(saved);
    }

    public Task<bool> DeleteAsync(string id, Guid userId, CancellationToken ct = default) =>
        repo.DeleteAsync(id, userId, ct);

    public async Task<List<SessionDto>> ImportAsync(List<UpsertSessionRequest> sessions, Guid userId, CancellationToken ct = default)
    {
        var results = new List<SessionDto>();
        foreach (var request in sessions)
        {
            var dto = await UpsertAsync(request, userId, ct);
            results.Add(dto);
        }
        return results;
    }

    private static GameSession MapToEntity(UpsertSessionRequest r, Guid userId) => new()
    {
        Id = r.Id,
        UserId = userId,
        Title = r.Title,
        DateCreated = r.DateCreated,
        DateModified = r.DateModified,
        SessionLog = r.SessionLog,
        SessionNotes = r.SessionNotes,
        PrepData = r.PrepData,
        Metadata = r.Metadata is null ? new() : new SessionMetadata
        {
            Location = r.Metadata.Location,
            DateTime = r.Metadata.DateTime,
            Weather = r.Metadata.Weather,
            NpcsMet = r.Metadata.NpcsMet,
            TreasureAcquired = r.Metadata.TreasureAcquired,
            PlotPoints = r.Metadata.PlotPoints,
            PartyLevelChange = r.Metadata.PartyLevelChange,
            NextSessionHooks = r.Metadata.NextSessionHooks,
        },
        Characters = (r.Characters ?? []).Select(c => new Character
        {
            Id = c.Id,
            SessionId = r.Id,
            Name = c.Name,
            HasImage = c.HasImage,
            OriginalImageData = c.OriginalImageData,
            CroppedImageData = c.CroppedImageData,
            Tagline = c.Tagline,
            Class = c.Class,
            Race = c.Race,
            Level = c.Level,
            Alignment = c.Alignment,
            PersonalityTraits = c.PersonalityTraits,
            Flaw = c.Flaw,
            Inventory = c.Inventory,
            QuestHooks = c.QuestHooks,
            Description = c.Description,
            Relationships = (c.Relationships ?? []).Select(r => new CharacterRelationship { Name = r.Name, Type = r.Type }).ToList(),
            GlobalCharacterId = c.GlobalCharacterId,
            SessionNotes = c.SessionNotes,
            IsNpc = c.IsNpc,
            StatBlock = MapStatBlockToEntity(c.StatBlock),
        }).ToList(),
        Locations = (r.Locations ?? []).Select(l => new Location
        {
            Id = l.Id,
            SessionId = r.Id,
            Name = l.Name,
            Type = l.Type,
            Description = l.Description,
            Notes = l.Notes,
            HasImage = l.HasImage,
            OriginalImageData = l.OriginalImageData,
            CroppedImageData = l.CroppedImageData,
            GlobalLocationId = l.GlobalLocationId,
            SessionNotes = l.SessionNotes,
        }).ToList(),
        Encounters = (r.Encounters ?? []).Select(e => new Encounter
        {
            Id = e.Id,
            SessionId = r.Id,
            Name = e.Name,
            Type = e.Type,
            Description = e.Description,
            Notes = e.Notes,
            Difficulty = e.Difficulty,
            Enemies = (e.Enemies ?? []).Select(en => new EncounterEnemy
            {
                Name = en.Name,
                Qty = en.Qty,
                Tier = en.Tier,
            }).ToList(),
        }).ToList(),
    };

    private static SessionDto MapToDto(GameSession s) => new(
        s.Id,
        s.Title,
        s.DateCreated,
        s.DateModified,
        s.SessionLog,
        s.SessionNotes,
        MapMetadataToDto(s.Metadata),
        s.Characters.Select(c => new CharacterDto(
            c.Id, c.Name, c.OriginalImageData != null, null, null,
            c.Tagline, c.Class, c.Race, c.Level, c.Alignment,
            c.PersonalityTraits, c.Flaw, c.Inventory, c.QuestHooks, c.Description,
            c.Relationships.Select(r => new CharacterRelationshipDto(r.Name, r.Type)).ToList(),
            c.GlobalCharacterId, c.SessionNotes, c.IsNpc, MapStatBlockToDto(c.StatBlock)
        )).ToList(),
        s.Locations.Select(l => new LocationDto(l.Id, l.Name, l.Type, l.Description, l.Notes, l.OriginalImageData != null, null, null, l.GlobalLocationId, l.SessionNotes)).ToList(),
        s.Encounters.Select(e => new EncounterDto(e.Id, e.Name, e.Type, e.Description, e.Notes, e.Difficulty,
            e.Enemies.Select(en => new EnemyDto(en.Name, en.Qty, en.Tier)).ToList())).ToList(),
        s.PrepData
    );

    private static SessionMetadataDto MapMetadataToDto(SessionMetadata m) => new(
        m.Location, m.DateTime, m.Weather, m.NpcsMet,
        m.TreasureAcquired, m.PlotPoints, m.PartyLevelChange, m.NextSessionHooks);

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
