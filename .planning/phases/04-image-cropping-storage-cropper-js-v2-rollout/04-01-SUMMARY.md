---
phase: 04-image-cropping-storage-cropper-js-v2-rollout
plan: 01
subsystem: database
tags: [ef-core, postgres, npgsql, bytea, migration, dto]

# Dependency graph
requires: []
provides:
  - Dual OriginalImageData/CroppedImageData byte[] (bytea) columns on Character, GlobalCharacter, Location, GlobalLocation
  - RenameImageColumnsAddCropped EF migration (rename + decode('base64') cast, no data loss)
  - HasImage transient write-intent flag + shared ImageWriteContract 4-rule apply logic
  - HasImage read-only bool on all four DTOs' read shapes; byte fields only on write shapes
affects: [04-02, 04-03, 04-04, 04-05, 04-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "4-rule image write contract (clear / full-replace / re-crop / preserve) centralized in Omphalos.Repository.Repositories.ImageWriteContract, shared by SessionRepository and both Global* repositories"
    - "EF Core RenameColumn + raw migrationBuilder.Sql(... USING decode(...,'base64') ...) for a text-to-bytea column retype that preserves data (never AlterColumn for this class of change)"

key-files:
  created:
    - src/Omphalos.Repository/Configurations/LocationConfiguration.cs
    - src/Omphalos.Repository/Migrations/20260713134719_RenameImageColumnsAddCropped.cs
    - src/Omphalos.Repository/Repositories/ImageWriteContract.cs
    - src/Omphalos.IntegrationTests/ImageStorageModelTests.cs
  modified:
    - src/Omphalos.Domain/Entities/Character.cs
    - src/Omphalos.Domain/Entities/GlobalCharacter.cs
    - src/Omphalos.Domain/Entities/Location.cs
    - src/Omphalos.Domain/Entities/GlobalLocation.cs
    - src/Omphalos.Domain/DTOs/CharacterDtos.cs
    - src/Omphalos.Domain/DTOs/LocationDtos.cs
    - src/Omphalos.Domain/DTOs/GlobalCharacterDtos.cs
    - src/Omphalos.Domain/DTOs/GlobalLocationDtos.cs
    - src/Omphalos.Repository/Configurations/CharacterConfiguration.cs
    - src/Omphalos.Repository/Configurations/GlobalCharacterConfiguration.cs
    - src/Omphalos.Repository/Configurations/GlobalLocationConfiguration.cs
    - src/Omphalos.Repository/Repositories/SessionRepository.cs
    - src/Omphalos.Repository/Repositories/GlobalCharacterRepository.cs
    - src/Omphalos.Repository/Repositories/GlobalLocationRepository.cs
    - src/Omphalos.Services/Implementations/SessionService.cs
    - src/Omphalos.Services/Implementations/GlobalCharacterService.cs
    - src/Omphalos.Services/Implementations/GlobalLocationService.cs

key-decisions:
  - "CharacterDto/LocationDto stay single bidirectional records (Open Question Option B) — HasImage + both byte fields added alongside existing fields rather than splitting into separate read/write DTOs"
  - "Shared static ImageWriteContract.Apply(...) helper (not duplicated per-repository logic) implements the 4-rule contract once, called identically from SessionRepository and both Global* repositories"

patterns-established:
  - "4-rule image write contract: HasImage=false clears both; HasImage=true+incoming original replaces both; HasImage=true+incoming cropped only re-crops; HasImage=true+both null preserves stored bytes"

requirements-completed: [IMG-01, IMG-02, IMG-03, IMG-05]

coverage:
  - id: D1
    description: "Migration renames PortraitBase64/ImageBase64 (text) to OriginalImageData (bytea) via decode('base64') cast, preserving existing image data, across all 4 image-bearing entities; adds CroppedImageData; drops PortraitPanX/PortraitPanY"
    requirement: "IMG-01"
    verification:
      - kind: integration
        ref: "src/Omphalos.IntegrationTests/ImageStorageModelTests.cs#ImageColumnMigration_DecodesExistingBase64DataIntoBytea"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cropped ?? Original fallback read resolves correctly whether only an original is stored (GIF/pre-crop) or a crop has been applied"
    requirement: "IMG-02, IMG-03"
    verification:
      - kind: integration
        ref: "src/Omphalos.IntegrationTests/ImageStorageModelTests.cs#ImageFallback_ReturnsOriginalWhenCroppedIsNull"
        status: pass
      - kind: integration
        ref: "src/Omphalos.IntegrationTests/ImageStorageModelTests.cs#ImageFallback_ReturnsCroppedWhenSet"
        status: pass
    human_judgment: false
  - id: D3
    description: "4-rule image write contract (preserve / clear / re-crop) applied consistently by SessionRepository and both Global* repositories"
    requirement: "IMG-02"
    verification:
      - kind: integration
        ref: "src/Omphalos.IntegrationTests/ImageStorageModelTests.cs#ImageFallback_WriteContract_PreservesStoredBytesWhenNoNewBytesSupplied"
        status: pass
      - kind: integration
        ref: "src/Omphalos.IntegrationTests/ImageStorageModelTests.cs#ImageFallback_WriteContract_ClearsBothWhenHasImageIsFalse"
        status: pass
      - kind: integration
        ref: "src/Omphalos.IntegrationTests/ImageStorageModelTests.cs#ImageFallback_WriteContract_RecropPreservesOriginalUpdatesCropped"
        status: pass
    human_judgment: false
  - id: D4
    description: "Read DTOs (CharacterDto, LocationDto, GlobalCharacterDto, GlobalLocationDto) expose HasImage bool and never carry image bytes in read responses"
    requirement: "IMG-05"
    verification:
      - kind: unit
        ref: "dotnet build Omphalos.slnx (compile-time proof: MapToDto call sites pass literal null for byte fields)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-13
status: complete
---

# Phase 4 Plan 01: Image Storage Model Summary

**Dual OriginalImageData/CroppedImageData bytea columns replacing single Base64 text columns on all 4 image-bearing entities, with a hand-edited EF migration that decodes existing data in place and a shared 4-rule write contract governing every image write path**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-13T13:40:23Z
- **Completed:** 2026-07-13T13:54:46Z
- **Tasks:** 2
- **Files modified:** 22 (18 modified, 4 created across Task 1+2)

## Accomplishments
- Renamed `PortraitBase64`/`ImageBase64` (text) to `OriginalImageData` (bytea) on Character, GlobalCharacter, Location, GlobalLocation via a single coordinated migration that hand-replaces EF's auto-scaffolded destructive Drop+Add with `RenameColumn` + raw-SQL `decode(..., 'base64')` cast, preserving every existing image byte-for-byte
- Added `CroppedImageData` (bytea, nullable) to all four entities/tables; dropped the write-only, never-read `PortraitPanX`/`PortraitPanY` columns from Character/GlobalCharacter
- Added a transient (EF-ignored) `HasImage` bool write-intent flag to all four entities, with a new `LocationConfiguration.cs` (previously missing) registering its `Ignore`
- Replaced the bidirectional `CharacterDto`/`LocationDto`'s Portrait/pan fields with `HasImage` + `OriginalImageData`/`CroppedImageData` (Option B from RESEARCH's Open Question — no DTO split, no new endpoints needed for the write path); split `GlobalCharacterDto`/`GlobalLocationDto`'s read shape (HasImage only) from their Create/Update write shapes (byte fields)
- Centralized the 4-rule image write contract (clear / full-replace / re-crop / preserve) in a single shared `ImageWriteContract.Apply(...)` helper, called identically from `SessionRepository.CopyCharacterFields`/`CopyLocationFields` and both `GlobalCharacterRepository`/`GlobalLocationRepository.UpdateAsync` — no duplicated logic across the three write paths
- Wrote 6 integration tests proving the migration's data-preservation, the `Cropped ?? Original` fallback read, and all 3 write-contract rules (preserve/clear/re-crop) against real Postgres via Testcontainers

## Task Commits

Each task was committed atomically:

1. **Task 1: Coordinated column rename + dual bytea model + image write contract** - `ca0057e` (feat)
2. **Task 2: Integration tests — migration data-preservation, fallback read, write-contract behavior** - `8059d38` (test)

_Note: Task 1 carries `tdd="true"` in the plan frontmatter but its own `<verify>` step is `dotnet build` only — the actual behavioral tests it names in `<behavior>` are the ones Task 2 writes and runs against the Task-1-built schema/logic. This plan's frontmatter `type: execute` (not `type: tdd`), so the strict RED-before-GREEN commit gate does not apply; both tasks build/pass cleanly in commit order._

## Files Created/Modified

**Created:**
- `src/Omphalos.Repository/Configurations/LocationConfiguration.cs` - registers `builder.Ignore(l => l.HasImage)` for Location (no config file existed for this entity before)
- `src/Omphalos.Repository/Migrations/20260713134719_RenameImageColumnsAddCropped.cs` - hand-edited migration: RenameColumn + `decode(...,'base64')`/`encode(...,'base64')` cast for all 4 tables, drops/re-adds pan columns
- `src/Omphalos.Repository/Repositories/ImageWriteContract.cs` - shared static 4-rule write-contract resolver
- `src/Omphalos.IntegrationTests/ImageStorageModelTests.cs` - 6 tests covering migration cast, fallback read, write contract

**Modified:**
- `src/Omphalos.Domain/Entities/{Character,GlobalCharacter,Location,GlobalLocation}.cs` - byte[] OriginalImageData/CroppedImageData + transient HasImage bool; pan fields removed from Character/GlobalCharacter
- `src/Omphalos.Domain/DTOs/{Character,Location,GlobalCharacter,GlobalLocation}Dtos.cs` - HasImage + byte fields replacing Portrait*/Image*/pan fields
- `src/Omphalos.Repository/Configurations/{Character,GlobalCharacter,GlobalLocation}Configuration.cs` - added `builder.Ignore(HasImage)`
- `src/Omphalos.Repository/Repositories/SessionRepository.cs` - `CopyCharacterFields`/`CopyLocationFields` now call `ImageWriteContract.Apply`
- `src/Omphalos.Repository/Repositories/{GlobalCharacter,GlobalLocation}Repository.cs` - `UpdateAsync` now calls `ImageWriteContract.Apply`
- `src/Omphalos.Services/Implementations/{Session,GlobalCharacter,GlobalLocation}Service.cs` - read mapping sets `HasImage` from `OriginalImageData != null` and never serializes bytes on read; write mapping carries `HasImage`/byte fields onto the entity

## Decisions Made
- Kept `CharacterDto`/`LocationDto` as single bidirectional records (RESEARCH's recommended Option B) rather than splitting into separate read/write DTOs — avoids new endpoint routes for the write path, matches the plan's locked resolution of the phase's one open design question.
- Centralized the 4-rule write contract in one shared `ImageWriteContract` static class instead of duplicating the rules independently in `SessionRepository` and both `Global*Repository` classes, so all three write paths are provably identical rather than three hand-synced copies.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Solution file is `Omphalos.slnx`, not `Omphalos.sln`**
- **Found during:** Task 1 (running the plan's cited verify command)
- **Issue:** The plan's `<verify>` step and acceptance criteria cite `dotnet build Omphalos.sln`, but this repo's solution file is `Omphalos.slnx` (the newer XML-based solution format) — `Omphalos.sln` does not exist and the literal command fails with `MSB1009: Project file does not exist`.
- **Fix:** Ran `dotnet build Omphalos.slnx` (and `dotnet test Omphalos.slnx` / the filtered integration-test command against `src/Omphalos.IntegrationTests`) instead. No source change was needed — this is purely a stale command reference in the plan text, not a repo defect.
- **Files modified:** None (verification-only correction)
- **Verification:** `dotnet build Omphalos.slnx` — 7 projects, 0 errors
- **Committed in:** N/A (no code change; documented here for traceability)

---

**Total deviations:** 1 auto-fixed (1 blocking, verification-command-only — no source impact)
**Impact on plan:** No scope creep; the underlying build/test intent of the plan's acceptance criteria was fully satisfied.

## Issues Encountered
- The EF-scaffolded migration (`dotnet ef migrations add`) produced the expected destructive `DropColumn`+`AddColumn` shape (EF cannot express a `text`→`bytea` retype safely); replaced the `Up`/`Down` bodies by hand with `RenameColumn` + raw-SQL `USING decode(...,'base64')`/`encode(...,'base64')` casts per RESEARCH.md Pattern 2, leaving the auto-generated `OmphalosDbContextModelSnapshot.cs` untouched (verified it already reflects the correct final byte[]/no-pan model).
- Testing the migration's actual data-preservation behavior required working around `PostgresFixture` applying all migrations to a fresh Testcontainers database up front (no pre-migration data exists there to migrate). Resolved via VALIDATION.md's option (a): the migration-cast test creates its own throwaway database on the same running Postgres container, migrates it to the point immediately before this migration, seeds a raw Base64 row via the old column name, then applies the migration and asserts the decoded bytes — proving the real `decode()` cast against Postgres rather than only asserting the migration's generated SQL text.

## User Setup Required

None - no external service configuration required. The migration applies automatically on next `docker compose up -d --build` via the existing `db.Database.MigrateAsync()` startup call in `Program.cs`.

## Next Phase Readiness
- The dual bytea storage model, `HasImage` DTO flag, and 4-rule write contract are now in place for all 4 image-bearing entities — Plan 03 (binary serving endpoints) can read `CroppedImageData ?? OriginalImageData` directly off these entities, and Plan 04 (crop-write wiring) can rely on the write contract already being correct for both the session-upsert path and the Global* Create/Update paths.
- Frontend files were deliberately untouched per Task 1's scope boundary — the React app still round-trips the old `portraitBase64`/pan field names in its request payloads, which `System.Text.Json` silently ignores (unknown properties) until Plan 04/05 update the frontend. No frontend build/runtime breakage expected from this plan alone, but portraits/images will not display in the running app again until a later plan wires the new binary endpoints and updates `<img>` call sites.
- No blockers for Plan 02 (Cropper.js v2 npm install + `ImageCropModal` component), which has no dependency on this plan's backend changes.

---
*Phase: 04-image-cropping-storage-cropper-js-v2-rollout*
*Completed: 2026-07-13*

## Self-Check: PASSED

All created files and both task commit hashes (`ca0057e`, `8059d38`) verified present.
