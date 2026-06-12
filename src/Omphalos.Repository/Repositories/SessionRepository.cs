using Microsoft.EntityFrameworkCore;
using Omphalos.Domain.Entities;
using Omphalos.Domain.Interfaces;

namespace Omphalos.Repository.Repositories;

public class SessionRepository(OmphalosDbContext db) : ISessionRepository
{
    public Task<List<GameSession>> GetAllByUserAsync(Guid userId, CancellationToken ct = default) =>
        db.GameSessions
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.DateModified)
            .Include(s => s.Characters)
            .Include(s => s.Locations)
            .Include(s => s.Encounters)
            .ToListAsync(ct);

    public Task<GameSession?> GetByIdAsync(string id, Guid userId, CancellationToken ct = default) =>
        db.GameSessions
            .Where(s => s.Id == id && s.UserId == userId)
            .Include(s => s.Characters)
            .Include(s => s.Locations)
            .Include(s => s.Encounters)
            .FirstOrDefaultAsync(ct);

    public async Task<GameSession> UpsertAsync(GameSession session, CancellationToken ct = default)
    {
        var existing = await db.GameSessions
            .Include(s => s.Characters)
            .Include(s => s.Locations)
            .Include(s => s.Encounters)
            .FirstOrDefaultAsync(s => s.Id == session.Id && s.UserId == session.UserId, ct);

        if (existing is null)
        {
            db.GameSessions.Add(session);
        }
        else
        {
            existing.Title = session.Title;
            existing.DateModified = session.DateModified;
            existing.SessionLog = session.SessionLog;
            existing.SessionNotes = session.SessionNotes;
            existing.Metadata = session.Metadata;

            db.Characters.RemoveRange(existing.Characters);
            db.Locations.RemoveRange(existing.Locations);
            db.Encounters.RemoveRange(existing.Encounters);

            existing.Characters = session.Characters;
            existing.Locations = session.Locations;
            existing.Encounters = session.Encounters;
        }

        await db.SaveChangesAsync(ct);
        return existing ?? session;
    }

    public async Task<bool> DeleteAsync(string id, Guid userId, CancellationToken ct = default)
    {
        var rows = await db.GameSessions
            .Where(s => s.Id == id && s.UserId == userId)
            .ExecuteDeleteAsync(ct);
        return rows > 0;
    }
}
