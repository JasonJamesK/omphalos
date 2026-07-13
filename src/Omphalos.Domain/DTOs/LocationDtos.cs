namespace Omphalos.Domain.DTOs;

public record LocationDto(
    string Id,
    string Name,
    string? Type,
    string? Description,
    string? Notes,
    bool HasImage,
    byte[]? OriginalImageData,
    byte[]? CroppedImageData,
    string? GlobalLocationId,
    string? SessionNotes
);
