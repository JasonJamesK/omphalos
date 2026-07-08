namespace Omphalos.Domain.DTOs;

public record EnemyDto(
    string Name,
    int Qty,
    string Tier
);

public record EncounterDto(
    string Id,
    string Name,
    string? Type,
    string? Description,
    string? Notes,
    string? Difficulty,
    List<EnemyDto>? Enemies
);
