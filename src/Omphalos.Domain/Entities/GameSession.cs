using System.Text.Json;

namespace Omphalos.Domain.Entities;

public class GameSession
{
    public string Id { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public long DateCreated { get; set; }
    public long DateModified { get; set; }
    public JsonDocument? SessionLog { get; set; }
    public string? SessionNotes { get; set; }

    // Owned entity — stored in same table
    public SessionMetadata Metadata { get; set; } = new();

    public User User { get; set; } = null!;
    public ICollection<Character> Characters { get; set; } = [];
    public ICollection<Location> Locations { get; set; } = [];
    public ICollection<Encounter> Encounters { get; set; } = [];
}

public class SessionMetadata
{
    public string? Location { get; set; }
    public string? DateTime { get; set; }
    public string? Weather { get; set; }
    public string? NpcsMet { get; set; }
    public string? TreasureAcquired { get; set; }
    public string? PlotPoints { get; set; }
    public string? PartyLevelChange { get; set; }
    public string? NextSessionHooks { get; set; }
}
