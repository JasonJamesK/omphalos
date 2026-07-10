namespace Omphalos.Domain.DTOs;

public record StatBlockEntryDto(string Name, string Text, string? Cost = null);

public record NpcStatBlockDto(
    string? SizeType,
    string? Alignment,
    string? ArmorClass,
    string? HitPoints,
    string? Speed,
    int Str,
    int Dex,
    int Con,
    int Int,
    int Wis,
    int Cha,
    string? SavingThrows,
    string? Skills,
    string? DamageVulnerabilities,
    string? DamageResistances,
    string? DamageImmunities,
    string? ConditionImmunities,
    string? Senses,
    string? Languages,
    string? ChallengeRating,
    List<StatBlockEntryDto>? Traits,
    List<StatBlockEntryDto>? Actions,
    List<StatBlockEntryDto>? LegendaryActions
);
