---
phase: 04-image-cropping-storage-cropper-js-v2-rollout
review_path: 04-REVIEW.md
fixed_at: 2026-07-14T08:00:00Z
fix_scope: critical_warning
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 4 — Code Review Fix Report

Fix scope: Critical + Warning findings from `04-REVIEW.md` (8 of 11 total findings; 3 Info-level findings — IN-01/02/03 — left for a future pass).

> **Recovery note:** The `gsd-code-fixer` agent that produced these fixes was interrupted mid-run by a PC reboot, after committing 7 of 8 findings to its isolated worktree (`gsd-reviewfix/04-1318`) but before writing this report. The 8th finding (WR-06) was left with an uncommitted, complete, correct change in the working tree. The orchestrator recovered by: committing the pending WR-06 change, discovering (via a failing integration test) that WR-06's entity-configuration change required an accompanying EF Core migration the fixer hadn't generated, adding that migration, discovering a second consequence (an existing test hardcoded the pre-WR-04 `Cache-Control: public` value that WR-04's fix correctly changed to `private`), updating that test, then merging the completed worktree back and writing this report.

## Findings Fixed

### CR-01 (Critical): Re-crop flow never checks for animated GIFs
**Commit:** `3e108fc` — fix(04): CR-01 guard all four re-crop entry points against animated GIFs
All four re-crop entry points (`CharacterModal.jsx`, `AddLocationModal.jsx`, both modals in `Library.jsx`) now check `isGifFile` on the currently-stored image before mounting `ImageCropModal`, matching the component's own documented invariant.

### WR-01: Image write-contract not enforced on create paths
**Commit:** `02b2486` — fix(04): WR-01 enforce image write-contract on all three create paths
`SessionRepository.UpsertAsync`'s insert branch and both `GlobalCharacterRepository.CreateAsync`/`GlobalLocationRepository.CreateAsync` now apply the same 4-rule `ImageWriteContract` logic as the update paths, instead of persisting raw request bytes verbatim.

### WR-02: GIF upload preview broken/stale until save
**Commit:** `922ad24` — fix(04): WR-02 show a local object-URL preview for not-yet-saved GIF uploads
A local `URL.createObjectURL` preview is shown for a freshly-selected GIF before the record is saved, instead of falling through to a server endpoint that doesn't have the bytes yet.

### WR-03: `ImageCropModal.handleCropAndSave` has no error handling
**Commit:** `83c1997` — fix(04): WR-03 handle canvas export failures in ImageCropModal
A rejected `$toCanvas()` or null `toBlob()` result is now caught and surfaced instead of throwing unhandled.

### WR-04: `Cache-Control: public` on authorization-gated Global image endpoints
**Commit:** `6ac41aa` — fix(04): WR-04 use private Cache-Control on authorization-gated image endpoints
Both `GlobalCharacterEndpoints.cs` and `GlobalLocationEndpoints.cs` now respond `Cache-Control: private`, consistent with the session-scoped endpoints — a shared/proxy cache honoring `public` would not participate in the origin's `RequireAuthorization()` check, so an unauthenticated request could otherwise be served a previously-cached authenticated response.
**Follow-up (orchestrator, commit `38410da`):** the existing test `GetGlobalCharacterCropped_ReturnsPublicCacheControl` hardcoded the old `public` expectation; renamed to `...ReturnsPrivateCacheControl` and updated the assertion to match the corrected behavior.

### WR-05: Migration only guards `IS NULL`, not empty string
**Commit:** `047bd1b` — fix(04): WR-05 treat empty string as no-image when casting legacy base64 columns
The migration's `CASE` guard now treats both `NULL` and `''` as no-image before decoding, for all four affected columns.

### WR-06: `LocationConfiguration` omits `Name` constraints
**Commits:** `28610a0` (entity configuration), `f7f1ca5` (orchestrator follow-up: accompanying EF migration)
Added `builder.Property(l => l.Name).IsRequired().HasMaxLength(500)`, matching the other three image-bearing entity configurations touched this phase (500, matching `GlobalLocationConfiguration`'s sibling declaration). The entity-configuration change alone left the EF model and migration snapshot out of sync (caught by `PendingModelChangesWarning` failing all 15 integration tests on startup) — the orchestrator generated and committed the accompanying `AddLocationNameConstraints` migration (`ALTER COLUMN ... TYPE character varying(500) ... NOT NULL`) to close the gap.

### WR-07: `base64ToBlob` helpers default to the wrong MIME type
**Commit:** `a1ebbbb` — fix(04): WR-07 sniff real MIME type in base64ToBlob crop-stage helpers
The three near-identical helpers now sniff the real MIME type from the decoded bytes' magic-byte prefix instead of hardcoding/defaulting to `image/jpeg` (or no type at all), preventing alpha-channel loss when re-cropping a not-yet-saved PNG.

## Findings Deferred (Info-level, out of scope for this pass)
- **IN-01** — `DetectImageMimeType`'s silent JPEG fallback for unrecognized magic bytes
- **IN-02** — duplicated `GetUserId` helpers across endpoint files with a fragile null-forgiving parse
- **IN-03** — 404-vs-400 semantics for an invalid `variant` route segment

## Verification
- `dotnet build Omphalos.slnx` — 0 errors
- `dotnet test` — 19/19 passed (4 unit + 15 integration, including the corrected Cache-Control assertion)
- `npm run build` — 673 modules, built successfully
