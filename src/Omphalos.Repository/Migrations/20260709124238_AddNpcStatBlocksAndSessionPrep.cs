using System.Text.Json;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Omphalos.Repository.Migrations
{
    /// <inheritdoc />
    public partial class AddNpcStatBlocksAndSessionPrep : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsNpc",
                table: "GlobalCharacters",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "StatBlock",
                table: "GlobalCharacters",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<JsonDocument>(
                name: "PrepData",
                table: "GameSessions",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsNpc",
                table: "Characters",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "StatBlock",
                table: "Characters",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsNpc",
                table: "GlobalCharacters");

            migrationBuilder.DropColumn(
                name: "StatBlock",
                table: "GlobalCharacters");

            migrationBuilder.DropColumn(
                name: "PrepData",
                table: "GameSessions");

            migrationBuilder.DropColumn(
                name: "IsNpc",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "StatBlock",
                table: "Characters");
        }
    }
}
