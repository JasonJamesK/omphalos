namespace Omphalos.Domain.Entities;

public class NpcStatBlock
{
    public string? SizeType { get; set; }
    public string? Alignment { get; set; }
    public string? ArmorClass { get; set; }
    public string? HitPoints { get; set; }
    public string? Speed { get; set; }
    public int Str { get; set; } = 10;
    public int Dex { get; set; } = 10;
    public int Con { get; set; } = 10;
    public int Int { get; set; } = 10;
    public int Wis { get; set; } = 10;
    public int Cha { get; set; } = 10;
    public string? SavingThrows { get; set; }
    public string? Skills { get; set; }
    public string? DamageVulnerabilities { get; set; }
    public string? DamageResistances { get; set; }
    public string? DamageImmunities { get; set; }
    public string? ConditionImmunities { get; set; }
    public string? Senses { get; set; }
    public string? Languages { get; set; }
    public string? ChallengeRating { get; set; }
    public List<StatBlockEntry> Traits { get; set; } = [];
    public List<StatBlockEntry> Actions { get; set; } = [];
    public List<StatBlockEntry> LegendaryActions { get; set; } = [];
}

public class StatBlockEntry
{
    public string Name { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string? Cost { get; set; }
}
