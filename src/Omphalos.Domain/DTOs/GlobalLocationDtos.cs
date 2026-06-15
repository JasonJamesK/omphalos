namespace Omphalos.Domain.DTOs;

public record GlobalLocationDto(
    string Id,
    string Name,
    string? Type,
    string? Description,
    string? Notes,
    string? SecretsAndHazards,
    string? ImageBase64
);

public record CreateGlobalLocationRequest(
    string Id,
    string Name,
    string? Type,
    string? Description,
    string? Notes,
    string? SecretsAndHazards,
    string? ImageBase64
);

public record UpdateGlobalLocationRequest(
    string Name,
    string? Type,
    string? Description,
    string? Notes,
    string? SecretsAndHazards,
    string? ImageBase64
);
