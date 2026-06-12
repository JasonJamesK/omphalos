using System.Text.Json;

namespace Omphalos.Domain.DTOs;

public record SessionSummaryDto(
    string Id,
    string Title,
    long DateCreated,
    long DateModified
);

public record SessionMetadataDto(
    string? Location,
    string? DateTime,
    string? Weather,
    string? NpcsMet,
    string? TreasureAcquired,
    string? PlotPoints,
    string? PartyLevelChange,
    string? NextSessionHooks
);

public record SessionDto(
    string Id,
    string Title,
    long DateCreated,
    long DateModified,
    JsonDocument? SessionLog,
    string? SessionNotes,
    SessionMetadataDto Metadata,
    List<CharacterDto> Characters,
    List<LocationDto> Locations,
    List<EncounterDto> Encounters
);

public record UpsertSessionRequest(
    string Id,
    string Title,
    long DateCreated,
    long DateModified,
    JsonDocument? SessionLog,
    string? SessionNotes,
    SessionMetadataDto? Metadata,
    List<CharacterDto>? Characters,
    List<LocationDto>? Locations,
    List<EncounterDto>? Encounters
);
