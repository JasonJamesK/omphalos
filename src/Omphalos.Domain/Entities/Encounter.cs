namespace Omphalos.Domain.Entities;

public class Encounter
{
    public string Id { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public string? Difficulty { get; set; }

    // Stored as JSONB
    public List<EncounterEnemy> Enemies { get; set; } = [];

    public GameSession Session { get; set; } = null!;
}

public class EncounterEnemy
{
    public string Name { get; set; } = string.Empty;
    public int Qty { get; set; } = 1;
    public string Tier { get; set; } = string.Empty;
}
