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
    bool HasImage,
    string? QuestHooks,
    List<CharacterRelationshipDto>? Relationships,
    bool IsNpc = false,
    NpcStatBlockDto? StatBlock = null
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
    bool HasImage,
    byte[]? OriginalImageData,
    byte[]? CroppedImageData,
    string? QuestHooks,
    List<CharacterRelationshipDto>? Relationships,
    bool IsNpc = false,
    NpcStatBlockDto? StatBlock = null
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
    bool HasImage,
    byte[]? OriginalImageData,
    byte[]? CroppedImageData,
    string? QuestHooks,
    List<CharacterRelationshipDto>? Relationships,
    bool IsNpc = false,
    NpcStatBlockDto? StatBlock = null
);
