using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Omphalos.Repository.Migrations
{
    /// <inheritdoc />
    public partial class RenameImageColumnsAddCropped : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Characters.PortraitBase64 (text) -> OriginalImageData (bytea)
            migrationBuilder.RenameColumn(name: "PortraitBase64", table: "Characters", newName: "OriginalImageData");
            migrationBuilder.Sql(
                "ALTER TABLE \"Characters\" ALTER COLUMN \"OriginalImageData\" TYPE bytea " +
                "USING CASE WHEN \"OriginalImageData\" IS NULL THEN NULL ELSE decode(\"OriginalImageData\", 'base64') END;");
            migrationBuilder.AddColumn<byte[]>(name: "CroppedImageData", table: "Characters", type: "bytea", nullable: true);
            migrationBuilder.DropColumn(name: "PortraitPanX", table: "Characters");
            migrationBuilder.DropColumn(name: "PortraitPanY", table: "Characters");

            // GlobalCharacters.PortraitBase64 (text) -> OriginalImageData (bytea)
            migrationBuilder.RenameColumn(name: "PortraitBase64", table: "GlobalCharacters", newName: "OriginalImageData");
            migrationBuilder.Sql(
                "ALTER TABLE \"GlobalCharacters\" ALTER COLUMN \"OriginalImageData\" TYPE bytea " +
                "USING CASE WHEN \"OriginalImageData\" IS NULL THEN NULL ELSE decode(\"OriginalImageData\", 'base64') END;");
            migrationBuilder.AddColumn<byte[]>(name: "CroppedImageData", table: "GlobalCharacters", type: "bytea", nullable: true);
            migrationBuilder.DropColumn(name: "PortraitPanX", table: "GlobalCharacters");
            migrationBuilder.DropColumn(name: "PortraitPanY", table: "GlobalCharacters");

            // Locations.ImageBase64 (text) -> OriginalImageData (bytea)
            migrationBuilder.RenameColumn(name: "ImageBase64", table: "Locations", newName: "OriginalImageData");
            migrationBuilder.Sql(
                "ALTER TABLE \"Locations\" ALTER COLUMN \"OriginalImageData\" TYPE bytea " +
                "USING CASE WHEN \"OriginalImageData\" IS NULL THEN NULL ELSE decode(\"OriginalImageData\", 'base64') END;");
            migrationBuilder.AddColumn<byte[]>(name: "CroppedImageData", table: "Locations", type: "bytea", nullable: true);

            // GlobalLocations.ImageBase64 (text) -> OriginalImageData (bytea)
            migrationBuilder.RenameColumn(name: "ImageBase64", table: "GlobalLocations", newName: "OriginalImageData");
            migrationBuilder.Sql(
                "ALTER TABLE \"GlobalLocations\" ALTER COLUMN \"OriginalImageData\" TYPE bytea " +
                "USING CASE WHEN \"OriginalImageData\" IS NULL THEN NULL ELSE decode(\"OriginalImageData\", 'base64') END;");
            migrationBuilder.AddColumn<byte[]>(name: "CroppedImageData", table: "GlobalLocations", type: "bytea", nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // GlobalLocations: drop CroppedImageData, cast OriginalImageData back to text, rename back
            migrationBuilder.DropColumn(name: "CroppedImageData", table: "GlobalLocations");
            migrationBuilder.Sql(
                "ALTER TABLE \"GlobalLocations\" ALTER COLUMN \"OriginalImageData\" TYPE text " +
                "USING CASE WHEN \"OriginalImageData\" IS NULL THEN NULL ELSE encode(\"OriginalImageData\", 'base64') END;");
            migrationBuilder.RenameColumn(name: "OriginalImageData", table: "GlobalLocations", newName: "ImageBase64");

            // Locations: drop CroppedImageData, cast OriginalImageData back to text, rename back
            migrationBuilder.DropColumn(name: "CroppedImageData", table: "Locations");
            migrationBuilder.Sql(
                "ALTER TABLE \"Locations\" ALTER COLUMN \"OriginalImageData\" TYPE text " +
                "USING CASE WHEN \"OriginalImageData\" IS NULL THEN NULL ELSE encode(\"OriginalImageData\", 'base64') END;");
            migrationBuilder.RenameColumn(name: "OriginalImageData", table: "Locations", newName: "ImageBase64");

            // GlobalCharacters: re-add pan columns, drop CroppedImageData, cast back to text, rename back
            migrationBuilder.AddColumn<double>(name: "PortraitPanX", table: "GlobalCharacters", type: "double precision", nullable: false, defaultValue: 0.0);
            migrationBuilder.AddColumn<double>(name: "PortraitPanY", table: "GlobalCharacters", type: "double precision", nullable: false, defaultValue: 0.0);
            migrationBuilder.DropColumn(name: "CroppedImageData", table: "GlobalCharacters");
            migrationBuilder.Sql(
                "ALTER TABLE \"GlobalCharacters\" ALTER COLUMN \"OriginalImageData\" TYPE text " +
                "USING CASE WHEN \"OriginalImageData\" IS NULL THEN NULL ELSE encode(\"OriginalImageData\", 'base64') END;");
            migrationBuilder.RenameColumn(name: "OriginalImageData", table: "GlobalCharacters", newName: "PortraitBase64");

            // Characters: re-add pan columns, drop CroppedImageData, cast back to text, rename back
            migrationBuilder.AddColumn<double>(name: "PortraitPanX", table: "Characters", type: "double precision", nullable: false, defaultValue: 0.0);
            migrationBuilder.AddColumn<double>(name: "PortraitPanY", table: "Characters", type: "double precision", nullable: false, defaultValue: 0.0);
            migrationBuilder.DropColumn(name: "CroppedImageData", table: "Characters");
            migrationBuilder.Sql(
                "ALTER TABLE \"Characters\" ALTER COLUMN \"OriginalImageData\" TYPE text " +
                "USING CASE WHEN \"OriginalImageData\" IS NULL THEN NULL ELSE encode(\"OriginalImageData\", 'base64') END;");
            migrationBuilder.RenameColumn(name: "OriginalImageData", table: "Characters", newName: "PortraitBase64");
        }
    }
}
