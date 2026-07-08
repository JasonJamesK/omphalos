namespace Omphalos.Domain.Entities;

public class GlobalCharacter
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Tagline { get; set; }
    public string? Class { get; set; }
    public string? Race { get; set; }
    public string? Alignment { get; set; }
    public string? PersonalityTraits { get; set; }
    public string? Flaw { get; set; }
    public string? Description { get; set; }
    public string? PortraitBase64 { get; set; }
    public double PortraitPanX { get; set; }
    public double PortraitPanY { get; set; }
    public string? QuestHooks { get; set; }

    // Stored as JSONB
    public List<CharacterRelationship> Relationships { get; set; } = [];

    public ICollection<Character> SessionCharacters { get; set; } = [];
}
