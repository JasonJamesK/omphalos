namespace Omphalos.Domain.Entities;

public class UserSettings
{
    public Guid UserId { get; set; }
    public string GeminiApiKey { get; set; } = string.Empty;

    public User User { get; set; } = null!;
}
