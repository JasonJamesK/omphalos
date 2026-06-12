using Omphalos.Domain.DTOs;
using Omphalos.Domain.Entities;
using Omphalos.Domain.Interfaces;

namespace Omphalos.Services.Implementations;

public class UserService(IUserRepository users) : IUserService
{
    public async Task<List<UserDto>> GetAllAsync(CancellationToken ct = default)
    {
        var list = await users.GetAllAsync(ct);
        return list.Select(u => new UserDto(u.Id, u.Username, u.Role.ToString(), u.CreatedAt)).ToList();
    }

    public async Task<UserDto> CreateAsync(CreateUserRequest request, CancellationToken ct = default)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = Enum.TryParse<UserRole>(request.Role, ignoreCase: true, out var role) ? role : UserRole.Player,
            CreatedAt = DateTime.UtcNow,
        };
        var created = await users.CreateAsync(user, ct);
        return new UserDto(created.Id, created.Username, created.Role.ToString(), created.CreatedAt);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken ct = default) =>
        users.DeleteAsync(id, ct);

    public async Task<SettingsDto> GetSettingsAsync(Guid userId, CancellationToken ct = default)
    {
        var settings = await users.GetSettingsAsync(userId, ct);
        return new SettingsDto(settings?.GeminiApiKey ?? string.Empty);
    }

    public async Task<SettingsDto> UpdateSettingsAsync(Guid userId, UpdateSettingsRequest request, CancellationToken ct = default)
    {
        var saved = await users.UpsertSettingsAsync(new UserSettings
        {
            UserId = userId,
            GeminiApiKey = request.GeminiApiKey,
        }, ct);
        return new SettingsDto(saved.GeminiApiKey);
    }
}
