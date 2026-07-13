namespace Omphalos.Domain.Entities;

public class Location
{
    public string Id { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public byte[]? OriginalImageData { get; set; }
    public byte[]? CroppedImageData { get; set; }
    public bool HasImage { get; set; }
    public string? GlobalLocationId { get; set; }
    public string? SessionNotes { get; set; }

    public GameSession Session { get; set; } = null!;
    public GlobalLocation? GlobalLocation { get; set; }
}
