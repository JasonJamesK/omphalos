namespace Omphalos.Domain.DTOs;

public record EncounterDto(
    string Id,
    string Name,
    string? Type,
    string? Description,
    string? Notes,
    string? Difficulty
);
