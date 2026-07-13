namespace Omphalos.Domain.DTOs;

public record CharacterRelationshipDto(string Name, string Type);

public record CharacterDto(
    string Id,
    string Name,
    bool HasImage,
    byte[]? OriginalImageData,
    byte[]? CroppedImageData,
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
    List<CharacterRelationshipDto>? Relationships,
    string? GlobalCharacterId = null,
    string? SessionNotes = null,
    bool IsNpc = false,
    NpcStatBlockDto? StatBlock = null
);
