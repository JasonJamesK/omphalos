using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Omphalos.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddGlobalCharacters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GlobalCharacterId",
                table: "Characters",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SessionNotes",
                table: "Characters",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GlobalCharacters",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Tagline = table.Column<string>(type: "text", nullable: true),
                    Class = table.Column<string>(type: "text", nullable: true),
                    Race = table.Column<string>(type: "text", nullable: true),
                    Alignment = table.Column<string>(type: "text", nullable: true),
                    PersonalityTraits = table.Column<string>(type: "text", nullable: true),
                    Flaw = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    PortraitBase64 = table.Column<string>(type: "text", nullable: true),
                    PortraitPanX = table.Column<double>(type: "double precision", nullable: false),
                    PortraitPanY = table.Column<double>(type: "double precision", nullable: false),
                    QuestHooks = table.Column<string>(type: "text", nullable: true),
                    Relationships = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GlobalCharacters", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Characters_GlobalCharacterId",
                table: "Characters",
                column: "GlobalCharacterId");

            migrationBuilder.AddForeignKey(
                name: "FK_Characters_GlobalCharacters_GlobalCharacterId",
                table: "Characters",
                column: "GlobalCharacterId",
                principalTable: "GlobalCharacters",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Characters_GlobalCharacters_GlobalCharacterId",
                table: "Characters");

            migrationBuilder.DropTable(
                name: "GlobalCharacters");

            migrationBuilder.DropIndex(
                name: "IX_Characters_GlobalCharacterId",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "GlobalCharacterId",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "SessionNotes",
                table: "Characters");
        }
    }
}
