using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Omphalos.Repository;

public class OmphalosDbContextFactory : IDesignTimeDbContextFactory<OmphalosDbContext>
{
    public OmphalosDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<OmphalosDbContext>()
            .UseNpgsql(
                Environment.GetEnvironmentVariable("CONNECTION_STRING")
                ?? "Host=localhost;Database=omphalos;Username=omphalos;Password=omphalos")
            .Options;
        return new OmphalosDbContext(options);
    }
}
