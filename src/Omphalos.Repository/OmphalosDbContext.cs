using Microsoft.EntityFrameworkCore;
using Omphalos.Domain.Entities;

namespace Omphalos.Repository;

public class OmphalosDbContext(DbContextOptions<OmphalosDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();
    public DbSet<GameSession> GameSessions => Set<GameSession>();
    public DbSet<Character> Characters => Set<Character>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<Encounter> Encounters => Set<Encounter>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(OmphalosDbContext).Assembly);
    }
}
