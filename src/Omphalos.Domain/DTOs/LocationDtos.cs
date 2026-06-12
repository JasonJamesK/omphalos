namespace Omphalos.Domain.DTOs;

public record LocationDto(
    string Id,
    string Name,
    string? Type,
    string? Description,
    string? Notes,
    string? ImageBase64
);
