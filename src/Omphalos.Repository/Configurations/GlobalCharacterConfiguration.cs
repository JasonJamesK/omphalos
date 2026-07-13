using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Omphalos.Domain.Entities;

namespace Omphalos.Repository.Configurations;

public class GlobalCharacterConfiguration : IEntityTypeConfiguration<GlobalCharacter>
{
    public void Configure(EntityTypeBuilder<GlobalCharacter> builder)
    {
        builder.HasKey(g => g.Id);
        builder.Property(g => g.Name).IsRequired().HasMaxLength(200);

        builder.Property(g => g.Relationships)
            .HasColumnType("jsonb")
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<List<CharacterRelationship>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new()
            );

        builder.Property(g => g.StatBlock)
            .HasColumnType("jsonb")
            .HasConversion(
                v => v == null ? null : System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => v == null ? null : System.Text.Json.JsonSerializer.Deserialize<NpcStatBlock>(v, (System.Text.Json.JsonSerializerOptions?)null)
            );

        builder.HasMany(g => g.SessionCharacters)
            .WithOne(c => c.GlobalCharacter)
            .HasForeignKey(c => c.GlobalCharacterId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Ignore(g => g.HasImage);
    }
}
