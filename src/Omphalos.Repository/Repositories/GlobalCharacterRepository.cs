using Microsoft.EntityFrameworkCore;
using Omphalos.Domain.Entities;
using Omphalos.Domain.Interfaces;

namespace Omphalos.Repository.Repositories;

public class GlobalCharacterRepository(OmphalosDbContext db) : IGlobalCharacterRepository
{
    public Task<List<GlobalCharacter>> GetAllAsync(CancellationToken ct = default) =>
        db.GlobalCharacters.OrderBy(g => g.Name).ToListAsync(ct);

    public Task<GlobalCharacter?> GetByIdAsync(string id, CancellationToken ct = default) =>
        db.GlobalCharacters.FirstOrDefaultAsync(g => g.Id == id, ct);

    public async Task<GlobalCharacter> CreateAsync(GlobalCharacter character, CancellationToken ct = default)
    {
        db.GlobalCharacters.Add(character);
        await db.SaveChangesAsync(ct);
        return character;
    }

    public async Task<GlobalCharacter?> UpdateAsync(string id, GlobalCharacter character, CancellationToken ct = default)
    {
        var existing = await db.GlobalCharacters.FirstOrDefaultAsync(g => g.Id == id, ct);
        if (existing is null) return null;

        existing.Name = character.Name;
        existing.Tagline = character.Tagline;
        existing.Class = character.Class;
        existing.Race = character.Race;
        existing.Alignment = character.Alignment;
        existing.PersonalityTraits = character.PersonalityTraits;
        existing.Flaw = character.Flaw;
        existing.Description = character.Description;
        existing.PortraitBase64 = character.PortraitBase64;
        existing.PortraitPanX = character.PortraitPanX;
        existing.PortraitPanY = character.PortraitPanY;
        existing.QuestHooks = character.QuestHooks;
        existing.Relationships = character.Relationships;

        await db.SaveChangesAsync(ct);
        return existing;
    }

    public async Task<DeleteGlobalCharacterResult> DeleteAsync(string id, bool force, CancellationToken ct = default)
    {
        var existing = await db.GlobalCharacters
            .Include(g => g.SessionCharacters)
            .FirstOrDefaultAsync(g => g.Id == id, ct);

        if (existing is null) return DeleteGlobalCharacterResult.NotFound;

        if (!force && existing.SessionCharacters.Count > 0)
            return DeleteGlobalCharacterResult.ReferencedBySessions;

        db.GlobalCharacters.Remove(existing);
        await db.SaveChangesAsync(ct);
        return DeleteGlobalCharacterResult.Deleted;
    }
}
