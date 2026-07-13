using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Omphalos.Domain.Entities;
using Omphalos.Repository;
using Omphalos.Repository.Repositories;
using Xunit;

namespace Omphalos.IntegrationTests;

// Covers the RenameImageColumnsAddCropped migration's data-preservation guarantee plus the
// Cropped ?? Original fallback read and the 4-rule image write contract introduced in
// 04-01-PLAN.md. Test names include "ImageColumnMigration" or "ImageFallback" so they can be
// targeted individually with `dotnet test --filter`.
[Collection("Postgres")]
public class ImageStorageModelTests(PostgresFixture fixture)
{
    private OmphalosDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<OmphalosDbContext>()
            .UseNpgsql(fixture.ConnectionString)
            .Options);

    // Migration-testing option (a) from 04-VALIDATION.md: PostgresFixture applies ALL
    // migrations to a fresh Testcontainers instance up front, so there is no pre-migration
    // data to migrate against the shared collection database. This test instead creates its
    // own throwaway database on the same Postgres server, migrates it up to the migration
    // immediately BEFORE RenameImageColumnsAddCropped (leaving the old text columns in
    // place), seeds a row with a raw Base64 string via the OLD column name, then applies
    // RenameImageColumnsAddCropped and asserts the resulting bytea column holds the decoded
    // bytes -- exercising the real `decode(..., 'base64')` cast against Postgres, not just
    // asserting the migration's generated SQL text.
    [Fact]
    public async Task ImageColumnMigration_DecodesExistingBase64DataIntoBytea()
    {
        var ct = TestContext.Current.CancellationToken;
        var testDbName = $"img_migration_test_{Guid.NewGuid():N}";
        var adminConnectionString = fixture.ConnectionString;

        await using (var adminConn = new NpgsqlConnection(adminConnectionString))
        {
            await adminConn.OpenAsync(ct);
            await using var createCmd = new NpgsqlCommand($"CREATE DATABASE \"{testDbName}\";", adminConn);
            await createCmd.ExecuteNonQueryAsync(ct);
        }

        var testConnectionString = new NpgsqlConnectionStringBuilder(adminConnectionString)
        {
            Database = testDbName,
            Pooling = false, // avoid a lingering pooled connection blocking the final DROP DATABASE
        }.ConnectionString;

        var originalBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A }; // PNG magic-byte prefix, tiny payload
        var base64 = Convert.ToBase64String(originalBytes);
        var characterId = $"char-{Guid.NewGuid():N}";
        var characterName = "Migration Test Character";

        try
        {
            await using var db = new OmphalosDbContext(
                new DbContextOptionsBuilder<OmphalosDbContext>().UseNpgsql(testConnectionString).Options);

            var migrator = db.GetInfrastructure().GetRequiredService<IMigrator>();
            var allMigrations = db.Database.GetMigrations().ToList();
            var targetIndex = allMigrations.FindIndex(m => m.EndsWith("RenameImageColumnsAddCropped", StringComparison.Ordinal));
            Assert.True(targetIndex > 0, "Expected the RenameImageColumnsAddCropped migration to exist with a prior migration.");

            var priorMigrationId = allMigrations[targetIndex - 1];
            var targetMigrationId = allMigrations[targetIndex];

            // Migrate up to (but not including) RenameImageColumnsAddCropped -- schema still
            // has the old PortraitBase64 text column at this point.
            await migrator.MigrateAsync(priorMigrationId, ct);

            await db.Database.ExecuteSqlInterpolatedAsync(
                $"""
                 INSERT INTO "GlobalCharacters" ("Id", "Name", "PortraitBase64", "PortraitPanX", "PortraitPanY", "Relationships")
                 VALUES ({characterId}, {characterName}, {base64}, 0, 0, '[]')
                 """,
                ct);

            // Now apply the migration under test.
            await migrator.MigrateAsync(targetMigrationId, ct);

            var decoded = await db.GlobalCharacters
                .Where(g => g.Id == characterId)
                .Select(g => g.OriginalImageData)
                .FirstOrDefaultAsync(ct);

            Assert.NotNull(decoded);
            Assert.Equal(originalBytes, decoded);
        }
        finally
        {
            await using var adminConn = new NpgsqlConnection(adminConnectionString);
            await adminConn.OpenAsync(ct);

            await using (var terminateCmd = new NpgsqlCommand(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = @db AND pid <> pg_backend_pid();",
                adminConn))
            {
                terminateCmd.Parameters.AddWithValue("db", testDbName);
                await terminateCmd.ExecuteNonQueryAsync(ct);
            }

            await using var dropCmd = new NpgsqlCommand($"DROP DATABASE IF EXISTS \"{testDbName}\";", adminConn);
            await dropCmd.ExecuteNonQueryAsync(ct);
        }
    }

    // IMG-02/IMG-03: a GIF (or any image with no crop yet) stores only OriginalImageData;
    // the Cropped ?? Original fallback read must resolve to the original bytes.
    [Fact]
    public async Task ImageFallback_ReturnsOriginalWhenCroppedIsNull()
    {
        var ct = TestContext.Current.CancellationToken;
        var originalBytes = new byte[] { 0x47, 0x49, 0x46, 0x38 }; // GIF magic-byte prefix
        var id = $"gc-{Guid.NewGuid():N}";

        await using (var writeDb = CreateContext())
        {
            var repo = new GlobalCharacterRepository(writeDb);
            await repo.CreateAsync(new GlobalCharacter
            {
                Id = id,
                Name = "Fallback Test Character",
                HasImage = true,
                OriginalImageData = originalBytes,
                CroppedImageData = null,
            }, ct);
        }

        await using var readDb = CreateContext();
        var character = await readDb.GlobalCharacters.FirstOrDefaultAsync(g => g.Id == id, ct);

        Assert.NotNull(character);
        var resolved = character!.CroppedImageData ?? character.OriginalImageData;
        Assert.Equal(originalBytes, resolved);
    }

    [Fact]
    public async Task ImageFallback_ReturnsCroppedWhenSet()
    {
        var ct = TestContext.Current.CancellationToken;
        var originalBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47 }; // PNG magic-byte prefix
        var croppedBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 }; // JPEG magic-byte prefix
        var id = $"gc-{Guid.NewGuid():N}";

        await using (var writeDb = CreateContext())
        {
            var repo = new GlobalCharacterRepository(writeDb);
            await repo.CreateAsync(new GlobalCharacter
            {
                Id = id,
                Name = "Fallback Test Character",
                HasImage = true,
                OriginalImageData = originalBytes,
                CroppedImageData = null,
            }, ct);
        }

        await using (var writeDb2 = CreateContext())
        {
            var repo = new GlobalCharacterRepository(writeDb2);
            await repo.UpdateAsync(id, new GlobalCharacter
            {
                Name = "Fallback Test Character",
                HasImage = true,
                OriginalImageData = null,
                CroppedImageData = croppedBytes,
            }, ct);
        }

        await using var readDb = CreateContext();
        var character = await readDb.GlobalCharacters.FirstOrDefaultAsync(g => g.Id == id, ct);

        Assert.NotNull(character);
        var resolved = character!.CroppedImageData ?? character.OriginalImageData;
        Assert.Equal(croppedBytes, resolved);
    }

    // Write-contract rule 4 (preserve): HasImage=true with both incoming byte fields null must
    // leave the stored original+cropped bytes untouched -- the common case of a save that only
    // touched unrelated fields.
    [Fact]
    public async Task ImageFallback_WriteContract_PreservesStoredBytesWhenNoNewBytesSupplied()
    {
        var ct = TestContext.Current.CancellationToken;
        var originalBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47 };
        var croppedBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 };
        var id = $"gc-{Guid.NewGuid():N}";

        await using (var writeDb = CreateContext())
        {
            var repo = new GlobalCharacterRepository(writeDb);
            await repo.CreateAsync(new GlobalCharacter
            {
                Id = id,
                Name = "Write Contract Character",
                HasImage = true,
                OriginalImageData = originalBytes,
                CroppedImageData = croppedBytes,
            }, ct);
        }

        await using (var writeDb2 = CreateContext())
        {
            var repo = new GlobalCharacterRepository(writeDb2);
            await repo.UpdateAsync(id, new GlobalCharacter
            {
                Name = "Write Contract Character (renamed)",
                HasImage = true,
                OriginalImageData = null,
                CroppedImageData = null,
            }, ct);
        }

        await using var readDb = CreateContext();
        var character = await readDb.GlobalCharacters.FirstOrDefaultAsync(g => g.Id == id, ct);

        Assert.NotNull(character);
        Assert.Equal(originalBytes, character!.OriginalImageData);
        Assert.Equal(croppedBytes, character.CroppedImageData);
    }

    // Write-contract rule 1 (clear): HasImage=false must null out both stored byte columns.
    [Fact]
    public async Task ImageFallback_WriteContract_ClearsBothWhenHasImageIsFalse()
    {
        var ct = TestContext.Current.CancellationToken;
        var originalBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47 };
        var croppedBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 };
        var id = $"gc-{Guid.NewGuid():N}";

        await using (var writeDb = CreateContext())
        {
            var repo = new GlobalCharacterRepository(writeDb);
            await repo.CreateAsync(new GlobalCharacter
            {
                Id = id,
                Name = "Write Contract Character",
                HasImage = true,
                OriginalImageData = originalBytes,
                CroppedImageData = croppedBytes,
            }, ct);
        }

        await using (var writeDb2 = CreateContext())
        {
            var repo = new GlobalCharacterRepository(writeDb2);
            await repo.UpdateAsync(id, new GlobalCharacter
            {
                Name = "Write Contract Character",
                HasImage = false,
                OriginalImageData = null,
                CroppedImageData = null,
            }, ct);
        }

        await using var readDb = CreateContext();
        var character = await readDb.GlobalCharacters.FirstOrDefaultAsync(g => g.Id == id, ct);

        Assert.NotNull(character);
        Assert.Null(character!.OriginalImageData);
        Assert.Null(character.CroppedImageData);
    }

    // Write-contract rule 3 (re-crop): HasImage=true with a new CroppedImageData and no new
    // OriginalImageData must update only the cropped bytes and leave the original untouched
    // (IMG-02: re-crop without re-upload).
    [Fact]
    public async Task ImageFallback_WriteContract_RecropPreservesOriginalUpdatesCropped()
    {
        var ct = TestContext.Current.CancellationToken;
        var originalBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47 };
        var firstCrop = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 };
        var secondCrop = new byte[] { 0xFF, 0xD8, 0xFF, 0xE1 };
        var id = $"gc-{Guid.NewGuid():N}";

        await using (var writeDb = CreateContext())
        {
            var repo = new GlobalCharacterRepository(writeDb);
            await repo.CreateAsync(new GlobalCharacter
            {
                Id = id,
                Name = "Recrop Character",
                HasImage = true,
                OriginalImageData = originalBytes,
                CroppedImageData = firstCrop,
            }, ct);
        }

        await using (var writeDb2 = CreateContext())
        {
            var repo = new GlobalCharacterRepository(writeDb2);
            await repo.UpdateAsync(id, new GlobalCharacter
            {
                Name = "Recrop Character",
                HasImage = true,
                OriginalImageData = null,
                CroppedImageData = secondCrop,
            }, ct);
        }

        await using var readDb = CreateContext();
        var character = await readDb.GlobalCharacters.FirstOrDefaultAsync(g => g.Id == id, ct);

        Assert.NotNull(character);
        Assert.Equal(originalBytes, character!.OriginalImageData);
        Assert.Equal(secondCrop, character.CroppedImageData);
    }
}
