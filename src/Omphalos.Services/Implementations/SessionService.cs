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
            PortraitBase64 = c.PortraitBase64,
            PortraitPanX = c.PortraitPanX,
            PortraitPanY = c.PortraitPanY,
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
        }).ToList(),
        Locations = (r.Locations ?? []).Select(l => new Location
        {
            Id = l.Id,
            SessionId = r.Id,
            Name = l.Name,
            Type = l.Type,
            Description = l.Description,
            Notes = l.Notes,
            ImageBase64 = l.ImageBase64,
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
        }).ToList(),
    };

    private static SessionDto MapToDto(GameSession s) => new(
        s.Id,
        s.Title,
        s.DateCreated,
        s.DateModified,
        s.SessionLog,
        s.SessionNotes,
        new SessionMetadataDto(
            s.Metadata.Location,
            s.Metadata.DateTime,
            s.Metadata.Weather,
            s.Metadata.NpcsMet,
            s.Metadata.TreasureAcquired,
            s.Metadata.PlotPoints,
            s.Metadata.PartyLevelChange,
            s.Metadata.NextSessionHooks),
        s.Characters.Select(c => new CharacterDto(
            c.Id, c.Name, c.PortraitBase64, c.PortraitPanX, c.PortraitPanY,
            c.Tagline, c.Class, c.Race, c.Level, c.Alignment,
            c.PersonalityTraits, c.Flaw, c.Inventory, c.QuestHooks, c.Description,
            c.Relationships.Select(r => new CharacterRelationshipDto(r.Name, r.Type)).ToList()
        )).ToList(),
        s.Locations.Select(l => new LocationDto(l.Id, l.Name, l.Type, l.Description, l.Notes, l.ImageBase64)).ToList(),
        s.Encounters.Select(e => new EncounterDto(e.Id, e.Name, e.Type, e.Description, e.Notes, e.Difficulty)).ToList()
    );
}
