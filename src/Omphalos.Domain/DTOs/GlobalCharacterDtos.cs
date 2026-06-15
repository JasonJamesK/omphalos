namespace Omphalos.Domain.DTOs;

public record GlobalCharacterDto(
    string Id,
    string Name,
    string? Tagline,
    string? Class,
    string? Race,
    string? Alignment,
    string? PersonalityTraits,
    string? Flaw,
    string? Description,
    string? PortraitBase64,
    double PortraitPanX,
    double PortraitPanY,
    string? QuestHooks,
    List<CharacterRelationshipDto>? Relationships
);

public record CreateGlobalCharacterRequest(
    string Id,
    string Name,
    string? Tagline,
    string? Class,
    string? Race,
    string? Alignment,
    string? PersonalityTraits,
    string? Flaw,
    string? Description,
    string? PortraitBase64,
    double PortraitPanX,
    double PortraitPanY,
    string? QuestHooks,
    List<CharacterRelationshipDto>? Relationships
);

public record UpdateGlobalCharacterRequest(
    string Name,
    string? Tagline,
    string? Class,
    string? Race,
    string? Alignment,
    string? PersonalityTraits,
    string? Flaw,
    string? Description,
    string? PortraitBase64,
    double PortraitPanX,
    double PortraitPanY,
    string? QuestHooks,
    List<CharacterRelationshipDto>? Relationships
);
