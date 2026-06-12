using Microsoft.EntityFrameworkCore;
using Omphalos.Domain.Entities;
using Omphalos.Domain.Interfaces;

namespace Omphalos.Repository.Repositories;

public class UserRepository(OmphalosDbContext db) : IUserRepository
{
    public Task<User?> GetByUsernameAsync(string username, CancellationToken ct = default) =>
        db.Users.FirstOrDefaultAsync(u => u.Username == username, ct);

    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.Users.FindAsync([id], ct).AsTask();

    public Task<List<User>> GetAllAsync(CancellationToken ct = default) =>
        db.Users.OrderBy(u => u.Username).ToListAsync(ct);

    public async Task<User> CreateAsync(User user, CancellationToken ct = default)
    {
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return user;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var rows = await db.Users.Where(u => u.Id == id).ExecuteDeleteAsync(ct);
        return rows > 0;
    }

    public Task<bool> AnyUsersExistAsync(CancellationToken ct = default) =>
        db.Users.AnyAsync(ct);

    public Task<UserSettings?> GetSettingsAsync(Guid userId, CancellationToken ct = default) =>
        db.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId, ct);

    public async Task<UserSettings> UpsertSettingsAsync(UserSettings settings, CancellationToken ct = default)
    {
        var existing = await db.UserSettings.FindAsync([settings.UserId], ct);
        if (existing is null)
        {
            db.UserSettings.Add(settings);
        }
        else
        {
            existing.GeminiApiKey = settings.GeminiApiKey;
        }
        await db.SaveChangesAsync(ct);
        return existing ?? settings;
    }
}
