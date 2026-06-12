using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Omphalos.Domain.Entities;

namespace Omphalos.Repository.Configurations;

public class GameSessionConfiguration : IEntityTypeConfiguration<GameSession>
{
    public void Configure(EntityTypeBuilder<GameSession> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Title).IsRequired().HasMaxLength(500);
        builder.Property(s => s.SessionLog).HasColumnType("jsonb");

        builder.OwnsOne(s => s.Metadata, m =>
        {
            m.Property(x => x.Location).HasColumnName("meta_location");
            m.Property(x => x.DateTime).HasColumnName("meta_date_time");
            m.Property(x => x.Weather).HasColumnName("meta_weather");
            m.Property(x => x.NpcsMet).HasColumnName("meta_npcs_met");
            m.Property(x => x.TreasureAcquired).HasColumnName("meta_treasure_acquired");
            m.Property(x => x.PlotPoints).HasColumnName("meta_plot_points");
            m.Property(x => x.PartyLevelChange).HasColumnName("meta_party_level_change");
            m.Property(x => x.NextSessionHooks).HasColumnName("meta_next_session_hooks");
        });

        builder.HasOne(s => s.User)
            .WithMany(u => u.Sessions)
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(s => s.Characters)
            .WithOne(c => c.Session)
            .HasForeignKey(c => c.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(s => s.Locations)
            .WithOne(l => l.Session)
            .HasForeignKey(l => l.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(s => s.Encounters)
            .WithOne(e => e.Session)
            .HasForeignKey(e => e.SessionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
