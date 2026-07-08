using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Omphalos.Domain.Entities;

namespace Omphalos.Repository.Configurations;

public class GlobalLocationConfiguration : IEntityTypeConfiguration<GlobalLocation>
{
    public void Configure(EntityTypeBuilder<GlobalLocation> builder)
    {
        builder.HasKey(g => g.Id);
        builder.Property(g => g.Name).IsRequired().HasMaxLength(500);

        builder.HasMany(g => g.SessionLocations)
            .WithOne(l => l.GlobalLocation)
            .HasForeignKey(l => l.GlobalLocationId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
