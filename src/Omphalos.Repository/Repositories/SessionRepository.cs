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
            existing.PrepData = session.PrepData;
            existing.Metadata = session.Metadata;

            ApplyDiff(existing.Characters, session.Characters, c => c.Id, db.Characters, CopyCharacterFields);
            ApplyDiff(existing.Locations, session.Locations, l => l.Id, db.Locations, CopyLocationFields);
            ApplyDiff(existing.Encounters, session.Encounters, e => e.Id, db.Encounters, CopyEncounterFields);
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

    // Reconciles a session-scoped child collection against an incoming payload, by Id.
    // Only ever operates on collections already loaded off the UserId-scoped session
    // query above — never introduces a global lookup by child Id alone.
    private static void ApplyDiff<T>(
        ICollection<T> existingCollection,
        ICollection<T> incomingCollection,
        Func<T, string> keySelector,
        DbSet<T> dbSet,
        Action<T, T> copyFields) where T : class
    {
        var diff = SessionCollectionSync.Diff(existingCollection, incomingCollection, keySelector);

        foreach (var stale in diff.ToRemove)
        {
            existingCollection.Remove(stale);
            dbSet.Remove(stale);
        }

        foreach (var (existingItem, incomingItem) in diff.ToUpdate)
        {
            copyFields(existingItem, incomingItem);
        }

        foreach (var added in diff.ToAdd)
        {
            existingCollection.Add(added);
        }
    }

    private static void CopyCharacterFields(Character existing, Character incoming)
    {
        existing.Name = incoming.Name;
        var (original, cropped) = ImageWriteContract.Apply(
            incoming.HasImage, incoming.OriginalImageData, incoming.CroppedImageData,
            existing.OriginalImageData, existing.CroppedImageData);
        existing.OriginalImageData = original;
        existing.CroppedImageData = cropped;
        existing.Tagline = incoming.Tagline;
        existing.Class = incoming.Class;
        existing.Race = incoming.Race;
        existing.Level = incoming.Level;
        existing.Alignment = incoming.Alignment;
        existing.PersonalityTraits = incoming.PersonalityTraits;
        existing.Flaw = incoming.Flaw;
        existing.Inventory = incoming.Inventory;
        existing.QuestHooks = incoming.QuestHooks;
        existing.Description = incoming.Description;
        existing.GlobalCharacterId = incoming.GlobalCharacterId;
        existing.SessionNotes = incoming.SessionNotes;
        existing.IsNpc = incoming.IsNpc;
        existing.Relationships = incoming.Relationships;
        existing.StatBlock = incoming.StatBlock;
    }

    private static void CopyLocationFields(Location existing, Location incoming)
    {
        existing.Name = incoming.Name;
        existing.Type = incoming.Type;
        existing.Description = incoming.Description;
        existing.Notes = incoming.Notes;
        var (original, cropped) = ImageWriteContract.Apply(
            incoming.HasImage, incoming.OriginalImageData, incoming.CroppedImageData,
            existing.OriginalImageData, existing.CroppedImageData);
        existing.OriginalImageData = original;
        existing.CroppedImageData = cropped;
        existing.GlobalLocationId = incoming.GlobalLocationId;
        existing.SessionNotes = incoming.SessionNotes;
    }

    private static void CopyEncounterFields(Encounter existing, Encounter incoming)
    {
        existing.Name = incoming.Name;
        existing.Type = incoming.Type;
        existing.Description = incoming.Description;
        existing.Notes = incoming.Notes;
        existing.Difficulty = incoming.Difficulty;
        existing.Enemies = incoming.Enemies;
    }
}
