using Microsoft.EntityFrameworkCore;
using Omphalos.Domain.Entities;
using Omphalos.Repository;
using Xunit;

namespace Omphalos.IntegrationTests;

[Collection("Postgres")]
public class PostgresFixtureSmokeTests(PostgresFixture fixture)
{
    private OmphalosDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<OmphalosDbContext>()
            .UseNpgsql(fixture.ConnectionString)
            .Options);

    [Fact]
    public async Task GameSession_RoundTrips_Through_RealNpgsqlProvider()
    {
        var userId = Guid.NewGuid();

        await using (var writeDb = CreateContext())
        {
            writeDb.Users.Add(new User
            {
                Id = userId,
                Username = $"smoke-user-{userId:N}",
                PasswordHash = "not-a-real-hash",
            });

            writeDb.GameSessions.Add(new GameSession
            {
                Id = "smoke-session",
                UserId = userId,
                Title = "smoke",
            });

            await writeDb.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        // Read back on a fresh context instance to prove a real round-trip through
        // Docker -> Npgsql -> the applied migrations, not a tracked in-memory reference.
        await using var readDb = CreateContext();
        var persisted = await readDb.GameSessions
            .FirstOrDefaultAsync(s => s.Id == "smoke-session", TestContext.Current.CancellationToken);

        Assert.NotNull(persisted);
        Assert.Equal("smoke", persisted!.Title);
    }
}
