namespace Omphalos.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Player;
    public DateTime CreatedAt { get; set; }

    public ICollection<GameSession> Sessions { get; set; } = [];
    public UserSettings? Settings { get; set; }
}

public enum UserRole { Player, Admin }
