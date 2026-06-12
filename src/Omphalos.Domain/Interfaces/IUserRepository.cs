using Omphalos.Domain.Entities;

namespace Omphalos.Domain.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByUsernameAsync(string username, CancellationToken ct = default);
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<User>> GetAllAsync(CancellationToken ct = default);
    Task<User> CreateAsync(User user, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
    Task<bool> AnyUsersExistAsync(CancellationToken ct = default);
    Task<UserSettings?> GetSettingsAsync(Guid userId, CancellationToken ct = default);
    Task<UserSettings> UpsertSettingsAsync(UserSettings settings, CancellationToken ct = default);
}
