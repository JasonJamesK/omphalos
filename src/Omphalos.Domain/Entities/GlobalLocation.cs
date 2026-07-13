namespace Omphalos.Domain.Entities;

public class GlobalLocation
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public string? SecretsAndHazards { get; set; }
    public byte[]? OriginalImageData { get; set; }
    public byte[]? CroppedImageData { get; set; }
    public bool HasImage { get; set; }

    public ICollection<Location> SessionLocations { get; set; } = [];
}
