using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Omphalos.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddGlobalLocations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GlobalLocationId",
                table: "Locations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SessionNotes",
                table: "Locations",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GlobalLocations",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Type = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    SecretsAndHazards = table.Column<string>(type: "text", nullable: true),
                    ImageBase64 = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GlobalLocations", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Locations_GlobalLocationId",
                table: "Locations",
                column: "GlobalLocationId");

            migrationBuilder.AddForeignKey(
                name: "FK_Locations_GlobalLocations_GlobalLocationId",
                table: "Locations",
                column: "GlobalLocationId",
                principalTable: "GlobalLocations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Locations_GlobalLocations_GlobalLocationId",
                table: "Locations");

            migrationBuilder.DropTable(
                name: "GlobalLocations");

            migrationBuilder.DropIndex(
                name: "IX_Locations_GlobalLocationId",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "GlobalLocationId",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "SessionNotes",
                table: "Locations");
        }
    }
}
