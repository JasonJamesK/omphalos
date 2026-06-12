namespace Omphalos.Domain.DTOs;

public record CharacterRelationshipDto(string Name, string Type);

public record CharacterDto(
    string Id,
    string Name,
    string? PortraitBase64,
    double PortraitPanX,
    double PortraitPanY,
    string? Tagline,
    string? Class,
    string? Race,
    int Level,
    string? Alignment,
    string? PersonalityTraits,
    string? Flaw,
    string? Inventory,
    string? QuestHooks,
    string? Description,
    List<CharacterRelationshipDto>? Relationships
);
