using Omphalos.Domain.DTOs;

namespace Omphalos.Domain.Interfaces;

public interface IUserService
{
    Task<List<UserDto>> GetAllAsync(CancellationToken ct = default);
    Task<UserDto> CreateAsync(CreateUserRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
    Task<SettingsDto> GetSettingsAsync(Guid userId, CancellationToken ct = default);
    Task<SettingsDto> UpdateSettingsAsync(Guid userId, UpdateSettingsRequest request, CancellationToken ct = default);
}
