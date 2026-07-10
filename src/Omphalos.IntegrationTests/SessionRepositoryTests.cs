using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Omphalos.Domain.Entities;
using Omphalos.Repository;
using Omphalos.Repository.Repositories;
using Xunit;

namespace Omphalos.IntegrationTests;

[Collection("Postgres")]
public class SessionRepositoryTests(PostgresFixture fixture)
{
    private OmphalosDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<OmphalosDbContext>()
            .UseNpgsql(fixture.ConnectionString)
            .Options);

    private async Task SeedUserAsync(Guid userId, CancellationToken ct)
    {
        await using var seedDb = CreateContext();
        seedDb.Users.Add(new User
        {
            Id = userId,
            Username = $"user-{userId:N}",
            PasswordHash = "not-a-real-hash",
        });
        await seedDb.SaveChangesAsync(ct);
    }

    [Fact]
    public async Task PrepDataPersistsOnUpdate()
    {
        var ct = TestContext.Current.CancellationToken;
        var userId = Guid.NewGuid();
        var sessionId = $"prepdata-{Guid.NewGuid():N}";
        await SeedUserAsync(userId, ct);

        var initialPrep = JsonDocument.Parse("""{"overview":"first draft"}""");
        await using (var writeDb1 = CreateContext())
        {
            var repo = new SessionRepository(writeDb1);
            await repo.UpsertAsync(new GameSession
            {
                Id = sessionId,
                UserId = userId,
                Title = "Session 1",
                PrepData = initialPrep,
            }, ct);
        }

        var updatedPrep = JsonDocument.Parse("""{"overview":"final draft"}""");
        await using (var writeDb2 = CreateContext())
        {
            var repo = new SessionRepository(writeDb2);
            await repo.UpsertAsync(new GameSession
            {
                Id = sessionId,
                UserId = userId,
                Title = "Session 1",
                PrepData = updatedPrep,
            }, ct);
        }

        await using var readDb = CreateContext();
        var persisted = await readDb.GameSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId, ct);

        Assert.NotNull(persisted);
        Assert.NotNull(persisted!.PrepData);
        Assert.Equal("final draft", persisted.PrepData!.RootElement.GetProperty("overview").GetString());
    }

    [Fact]
    public async Task CollectionDiffMerge()
    {
        var ct = TestContext.Current.CancellationToken;
        var userId = Guid.NewGuid();
        var sessionId = $"diffmerge-{Guid.NewGuid():N}";
        await SeedUserAsync(userId, ct);

        await using (var writeDb1 = CreateContext())
        {
            var repo = new SessionRepository(writeDb1);
            await repo.UpsertAsync(new GameSession
            {
                Id = sessionId,
                UserId = userId,
                Title = "Session 1",
                Characters =
                [
                    new Character { Id = "char-a", SessionId = sessionId, Name = "Alice" },
                    new Character { Id = "char-b", SessionId = sessionId, Name = "Bob" },
                ],
                Locations =
                [
                    new Location { Id = "loc-a", SessionId = sessionId, Name = "Tavern" },
                ],
                Encounters =
                [
                    new Encounter { Id = "enc-a", SessionId = sessionId, Name = "Ambush" },
                ],
            }, ct);
        }

        await using (var writeDb2 = CreateContext())
        {
            var repo = new SessionRepository(writeDb2);
            await repo.UpsertAsync(new GameSession
            {
                Id = sessionId,
                UserId = userId,
                Title = "Session 1",
                Characters =
                [
                    new Character { Id = "char-a", SessionId = sessionId, Name = "Alice Updated" },
                    new Character { Id = "char-c", SessionId = sessionId, Name = "Carol" },
                ],
                Locations =
                [
                    new Location { Id = "loc-a", SessionId = sessionId, Name = "Tavern Renamed" },
                ],
                Encounters =
                [
                    new Encounter { Id = "enc-a", SessionId = sessionId, Name = "Ambush Resolved" },
                ],
            }, ct);
        }

        await using var readDb = CreateContext();
        var persisted = await readDb.GameSessions
            .Include(s => s.Characters)
            .Include(s => s.Locations)
            .Include(s => s.Encounters)
            .FirstOrDefaultAsync(s => s.Id == sessionId, ct);

        Assert.NotNull(persisted);

        Assert.Equal(2, persisted!.Characters.Count);
        Assert.Contains(persisted.Characters, c => c.Id == "char-a" && c.Name == "Alice Updated");
        Assert.Contains(persisted.Characters, c => c.Id == "char-c" && c.Name == "Carol");
        Assert.DoesNotContain(persisted.Characters, c => c.Id == "char-b");

        var location = Assert.Single(persisted.Locations);
        Assert.Equal("Tavern Renamed", location.Name);

        var encounter = Assert.Single(persisted.Encounters);
        Assert.Equal("Ambush Resolved", encounter.Name);
    }
}
