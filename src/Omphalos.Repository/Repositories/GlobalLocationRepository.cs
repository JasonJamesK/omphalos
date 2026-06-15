using Microsoft.EntityFrameworkCore;
using Omphalos.Domain.Entities;
using Omphalos.Domain.Interfaces;

namespace Omphalos.Repository.Repositories;

public class GlobalLocationRepository(OmphalosDbContext db) : IGlobalLocationRepository
{
    public Task<List<GlobalLocation>> GetAllAsync(CancellationToken ct = default) =>
        db.GlobalLocations.OrderBy(g => g.Name).ToListAsync(ct);

    public Task<GlobalLocation?> GetByIdAsync(string id, CancellationToken ct = default) =>
        db.GlobalLocations.FirstOrDefaultAsync(g => g.Id == id, ct);

    public async Task<GlobalLocation> CreateAsync(GlobalLocation location, CancellationToken ct = default)
    {
        db.GlobalLocations.Add(location);
        await db.SaveChangesAsync(ct);
        return location;
    }

    public async Task<GlobalLocation?> UpdateAsync(string id, GlobalLocation location, CancellationToken ct = default)
    {
        var existing = await db.GlobalLocations.FirstOrDefaultAsync(g => g.Id == id, ct);
        if (existing is null) return null;

        existing.Name = location.Name;
        existing.Type = location.Type;
        existing.Description = location.Description;
        existing.Notes = location.Notes;
        existing.SecretsAndHazards = location.SecretsAndHazards;
        existing.ImageBase64 = location.ImageBase64;

        await db.SaveChangesAsync(ct);
        return existing;
    }

    public async Task<DeleteGlobalLocationResult> DeleteAsync(string id, bool force, CancellationToken ct = default)
    {
        var existing = await db.GlobalLocations
            .Include(g => g.SessionLocations)
            .FirstOrDefaultAsync(g => g.Id == id, ct);

        if (existing is null) return DeleteGlobalLocationResult.NotFound;

        if (!force && existing.SessionLocations.Count > 0)
            return DeleteGlobalLocationResult.ReferencedBySessions;

        db.GlobalLocations.Remove(existing);
        await db.SaveChangesAsync(ct);
        return DeleteGlobalLocationResult.Deleted;
    }
}
