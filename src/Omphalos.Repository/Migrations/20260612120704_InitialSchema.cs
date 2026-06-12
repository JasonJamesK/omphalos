using System;
using System.Text.Json;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Omphalos.Repository.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    Role = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GameSessions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    DateCreated = table.Column<long>(type: "bigint", nullable: false),
                    DateModified = table.Column<long>(type: "bigint", nullable: false),
                    SessionLog = table.Column<JsonDocument>(type: "jsonb", nullable: true),
                    SessionNotes = table.Column<string>(type: "text", nullable: true),
                    meta_location = table.Column<string>(type: "text", nullable: true),
                    meta_date_time = table.Column<string>(type: "text", nullable: true),
                    meta_weather = table.Column<string>(type: "text", nullable: true),
                    meta_npcs_met = table.Column<string>(type: "text", nullable: true),
                    meta_treasure_acquired = table.Column<string>(type: "text", nullable: true),
                    meta_plot_points = table.Column<string>(type: "text", nullable: true),
                    meta_party_level_change = table.Column<string>(type: "text", nullable: true),
                    meta_next_session_hooks = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GameSessions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserSettings",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    GeminiApiKey = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSettings", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_UserSettings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Characters",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    SessionId = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PortraitBase64 = table.Column<string>(type: "text", nullable: true),
                    PortraitPanX = table.Column<double>(type: "double precision", nullable: false),
                    PortraitPanY = table.Column<double>(type: "double precision", nullable: false),
                    Tagline = table.Column<string>(type: "text", nullable: true),
                    Class = table.Column<string>(type: "text", nullable: true),
                    Race = table.Column<string>(type: "text", nullable: true),
                    Level = table.Column<int>(type: "integer", nullable: false),
                    Alignment = table.Column<string>(type: "text", nullable: true),
                    PersonalityTraits = table.Column<string>(type: "text", nullable: true),
                    Flaw = table.Column<string>(type: "text", nullable: true),
                    Inventory = table.Column<string>(type: "text", nullable: true),
                    QuestHooks = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Relationships = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Characters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Characters_GameSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "GameSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Encounters",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    SessionId = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    Difficulty = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Encounters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Encounters_GameSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "GameSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Locations",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    SessionId = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    ImageBase64 = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Locations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Locations_GameSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "GameSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Characters_SessionId",
                table: "Characters",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_SessionId",
                table: "Encounters",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_GameSessions_UserId",
                table: "GameSessions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_SessionId",
                table: "Locations",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Username",
                table: "Users",
                column: "Username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Characters");

            migrationBuilder.DropTable(
                name: "Encounters");

            migrationBuilder.DropTable(
                name: "Locations");

            migrationBuilder.DropTable(
                name: "UserSettings");

            migrationBuilder.DropTable(
                name: "GameSessions");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
