using Microsoft.EntityFrameworkCore;
using Omphalos.Repository;
using Testcontainers.PostgreSql;
using Xunit;

namespace Omphalos.IntegrationTests;

public class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:17") // matches docker-compose.yml's pinned Postgres version
        .Build();

    public string ConnectionString => _container.GetConnectionString();

    public async ValueTask InitializeAsync()
    {
        await _container.StartAsync();

        await using var db = new OmphalosDbContext(
            new DbContextOptionsBuilder<OmphalosDbContext>()
                .UseNpgsql(ConnectionString)
                .Options);

        // Apply the project's real EF Core migrations rather than EnsureCreated() —
        // this also verifies the migrations themselves apply cleanly against Postgres.
        await db.Database.MigrateAsync();
    }

    public async ValueTask DisposeAsync()
    {
        await _container.DisposeAsync();
    }
}

[CollectionDefinition("Postgres")]
public class PostgresCollection : ICollectionFixture<PostgresFixture>;
