namespace Omphalos.Domain.Entities;

public class Character
{
    public string Id { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? PortraitBase64 { get; set; }
    public double PortraitPanX { get; set; }
    public double PortraitPanY { get; set; }
    public string? Tagline { get; set; }
    public string? Class { get; set; }
    public string? Race { get; set; }
    public int Level { get; set; }
    public string? Alignment { get; set; }
    public string? PersonalityTraits { get; set; }
    public string? Flaw { get; set; }
    public string? Inventory { get; set; }
    public string? QuestHooks { get; set; }
    public string? Description { get; set; }

    // Stored as JSONB
    public List<CharacterRelationship> Relationships { get; set; } = [];

    public GameSession Session { get; set; } = null!;
}

public class CharacterRelationship
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
}
