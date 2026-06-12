using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Omphalos.Domain.Entities;

namespace Omphalos.Repository.Configurations;

public class CharacterConfiguration : IEntityTypeConfiguration<Character>
{
    public void Configure(EntityTypeBuilder<Character> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Name).IsRequired().HasMaxLength(200);

        builder.Property(c => c.Relationships)
            .HasColumnType("jsonb")
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<List<CharacterRelationship>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new()
            );
    }
}
