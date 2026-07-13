namespace Omphalos.Domain.DTOs;

public record GlobalLocationDto(
    string Id,
    string Name,
    string? Type,
    string? Description,
    string? Notes,
    string? SecretsAndHazards,
    bool HasImage
);

public record CreateGlobalLocationRequest(
    string Id,
    string Name,
    string? Type,
    string? Description,
    string? Notes,
    string? SecretsAndHazards,
    bool HasImage,
    byte[]? OriginalImageData,
    byte[]? CroppedImageData
);

public record UpdateGlobalLocationRequest(
    string Name,
    string? Type,
    string? Description,
    string? Notes,
    string? SecretsAndHazards,
    bool HasImage,
    byte[]? OriginalImageData,
    byte[]? CroppedImageData
);
