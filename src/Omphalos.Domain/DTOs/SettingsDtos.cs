namespace Omphalos.Domain.DTOs;

public record SettingsDto(string GeminiApiKey);

public record UpdateSettingsRequest(string GeminiApiKey);
