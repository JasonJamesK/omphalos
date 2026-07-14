---
phase: 04-image-cropping-storage-cropper-js-v2-rollout
verified: 2026-07-14T08:08:52Z
status: passed
score: 13/13 must-haves verified (code-level), behavior_unverified: 3 (interactive crop UX)
behavior_unverified: 3
overrides_applied: 0
human_verification:

  - test: "Crop a character portrait in the Character Library, an in-session character portrait, and a location image via drag-to-reposition, mouse-wheel zoom, and (if a touch device is available) pinch-zoom/touch-drag; confirm rule-of-thirds grid and all 8 corner/edge resize handles render and work at all 3 sites."
    expected: "Selection box drags, resizes via handles, zooms in/out smoothly; grid overlay renders in amber (#d4a574); works with touch as well as mouse."
    why_human: "No frontend test framework exists in this repo (no vitest/jest/@testing-library) — CROP-01/02/03/04/08 interactive behavior can only be judged by driving a real browser. Code inspection confirms the wiring (movable/resizable/scalable attributes, 8 cropper-handle elements, amber theme-color) is present at all 3 call sites, but no automated test exercises the interaction itself."

  - test: "Upload a real EXIF-rotated phone photo at each of the 3 crop sites and confirm it renders right-side-up (not sideways/upside-down) in the crop stage; if an iOS Safari device is available, confirm no blank/crashed canvas."
    expected: "Photo appears correctly oriented regardless of source EXIF orientation tag; crop stage renders (no blank canvas) on iOS Safari."
    why_human: "CROP-09's `createImageBitmap(..., { imageOrientation: 'from-image' })` + 2400px downscale is present in `imageUpload.js`'s `prepareWorkingCopy` (code-verified), but correct visual orientation on a real EXIF-tagged photo and iOS Safari's canvas-size behavior can only be confirmed on a real device/browser."

  - test: "Upload an animated GIF at each of the 3 sites; confirm the crop modal never opens, an inline notice appears, and the GIF still animates (not a single static frame) in every place its portrait/image subsequently renders. Then click Re-crop on that same GIF-holding entry and confirm the crop modal is still skipped (CR-01 fix)."
    expected: "GIF bytes stored as-is; animation plays in all cards/previews; Re-crop on a GIF shows the same skip notice rather than opening ImageCropModal and baking it to a static frame."
    why_human: "IMG-03 backend fallback (`Cropped ?? Original`) is proven by passing integration tests, and CR-01's guard (`isGifBlob` check before every one of the 4 re-crop entry points) is confirmed present in source for all 4 sites — but whether an actual GIF animates correctly end-to-end in a browser after the full upload/display/re-crop round trip needs live confirmation."
gaps: []
---

# Phase 4: Image Cropping & Storage — Cropper.js v2 Rollout Verification Report

**Phase Goal:** A DM can crop portrait and location images end-to-end using a Cropper.js v2-based `ImageCropModal` — with zoom, EXIF-safe handling, and touch support — at all three existing upload sites, backed by a new image storage and serving model: both the original and cropped image are stored per entity (Character, GlobalCharacter, Location, GlobalLocation) and served via dedicated, HTTP-cached binary endpoints instead of embedded base64 in JSON payloads, so a DM can re-crop without re-uploading, animated GIFs still display, and character/location pages load without waiting on image bytes.

**Verified:** 2026-07-14T08:08:52Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria + PLAN must_haves, merged)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DM crops a character-library portrait, an in-session character portrait, and a location image, all via the same shared `ImageCropModal`, with matching aspect-lock/drag/touch/grid/handles | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `ImageCropModal.jsx` is imported and mounted at all 3 sites (`Library.jsx` x2, `CharacterModal.jsx`, `AddLocationModal.jsx`); `aspect-ratio` attribute set from `aspectW/aspectH` (3:4 character, 4:3 location); `movable resizable` on `<cropper-selection>`, 8 `<cropper-handle>` resize actions, `<cropper-grid>` present; 44px touch hit-target CSS confirmed. Interactive drag/resize/touch behavior not exercised by any automated test (no frontend test framework in this repo) — routed to human verification. |
| 2 | DM can zoom (wheel/pinch) while cropping; EXIF-rotated phone photo crops right-side-up, doesn't blank on iOS Safari, via EXIF-correction + downscale before cropping | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `<cropper-image scalable>` present (native wheel/pinch zoom per Cropper.js v2); `prepareWorkingCopy()` in `imageUpload.js` calls `createImageBitmap(fileOrBlob, { imageOrientation: 'from-image' })` (bakes EXIF rotation) and caps the longest edge at 2400px. Code-verified; actual EXIF-photo/iOS Safari behavior needs a live device — routed to human verification. |
| 3 | Crop modal matches existing chrome (dark overlay, `bg-[#211b17]` card, amber heading, `×` close, Cancel/"Crop & Save"); on save hands caller both original + cropped data | ✓ VERIFIED | `ImageCropModal.jsx` markup: `bg-black/85` overlay, `bg-[#211b17] rounded-lg p-5 fade-in` card, amber `<h3>` title, `&times;` close button, Cancel + "Crop & Save" buttons — classes match `CropModal.jsx`'s precedent (grep-confirmed). `handleCropAndSave` calls `onSave(file, blob)` — both the raw original File and the cropped Blob — confirmed by direct source read. WR-03 fix adds try/catch + null-blob guard around this path. |
| 4 | DM re-crops an existing portrait/location image without re-uploading, because the original is retained separately | ✓ VERIFIED | Backend: `ImageWriteContract.Apply` Rule 3 (`incomingCropped != null` and `incomingOriginal == null` → preserve `existingOriginal`, replace only cropped) — proven by `ImageFallback_WriteContract_RecropPreservesOriginalUpdatesCropped` (passing integration test). Frontend: all 4 re-crop entry points (`CharacterModal.jsx`, `AddLocationModal.jsx`, both `Library.jsx` modals) fetch the retained `/original` via `fetchImageBlob`/`sessionCharacterImageUrl(..., 'original')` (or reuse a local unsaved original) and set only `croppedImageData` on save — confirmed by source read. The interactive "click Re-crop, see the right image" UX itself is covered under item 1's human-verification note. |
| 5 | Animated GIF (skips cropping) still displays correctly everywhere via cropped-or-original fallback; re-crop never bakes a GIF to a static frame | ✓ VERIFIED (backend + guard code); interactive display in item 6 below | Backend fallback (`CroppedImageData ?? OriginalImageData`) proven by `ImageFallback_ReturnsOriginalWhenCroppedIsNull`/`ImageFallback_ReturnsCroppedWhenSet` (passing). `isGifFile` gates all 3 upload sites (skip crop, `croppedImageData` stays null). CR-01 (critical finding, now fixed): all 4 re-crop entry points call `isGifBlob(source)` before mounting `ImageCropModal`, short-circuiting with the GIF notice instead of baking the animation to a static JPEG frame — confirmed present in `CharacterModal.jsx`, `AddLocationModal.jsx`, and both `Library.jsx` modals. |
| 6 | Character/location list & detail pages render without waiting on image bytes; DTOs expose only `HasImage` until requested; images load via cached binary endpoints | ✓ VERIFIED | `CharacterDto`/`LocationDto` read mapping in `SessionService.MapToDto` passes literal `null` for both byte fields and computes `HasImage = entity.OriginalImageData != null` (source-read confirmed); `GlobalCharacterDto`/`GlobalLocationDto` read shapes declare no byte fields at all. All display sites (`Portrait.jsx`, card/preview renders in `Library.jsx`, `Characters.jsx`, `NpcQuickBar.jsx`, `Locations.jsx`, `LocationsBlock.jsx`, `AddFromLibraryModal.jsx`) resolve an `<img src>` via `getImageUrl`/`sessionCharacterImageUrl`/`sessionLocationImageUrl` — a separate, async network request — no embedded base64 remains anywhere in the list/detail JSON payload path (grep-confirmed zero `portraitBase64`/`imageBase64` in source outside the historical migration). Endpoints return `TypedResults.File` with SHA256 ETag + `Cache-Control` (private for session-scoped and, after WR-04's fix, for Global* as well, since Global* routes are also `RequireAuthorization()`-gated); 304-on-If-None-Match and cross-user 404 (IDOR) both proven by passing `ImageEndpointTests`. |

**Score:** 4/6 roadmap success criteria fully code+test VERIFIED; 2/6 have VERIFIED backend/wiring but an interactive-UX component left ⚠️ PRESENT_BEHAVIOR_UNVERIFIED (routed to human verification, not counted as failed or verified).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/Omphalos.Repository/Migrations/20260713134719_RenameImageColumnsAddCropped.cs` | Rename+cast migration, no `AlterColumn` for image cols | ✓ VERIFIED | Confirmed `RenameColumn` + `migrationBuilder.Sql(... decode(...,'base64') ...)`; WR-05 fix adds `OR "X" = ''` guard for legacy empty-string rows. |
| `src/Omphalos.Repository/Migrations/20260714075728_AddLocationNameConstraints.cs` | Follow-up migration for WR-06 | ✓ VERIFIED | Exists; adds `Name` `IsRequired`/`HasMaxLength(500)` to match sibling entities. |
| `src/Omphalos.IntegrationTests/ImageStorageModelTests.cs` | Migration-cast, fallback-read, write-contract tests | ✓ VERIFIED | 6 tests present and passing (`dotnet test --filter ImageColumnMigration\|ImageFallback` → 6/6). |
| `src/Omphalos.Repository/Repositories/ImageWriteContract.cs` | Shared 4-rule write contract | ✓ VERIFIED | Present; called from `SessionRepository` (both update AND create paths, post-WR-01), `GlobalCharacterRepository`, `GlobalLocationRepository` (update AND create paths). |
| `src/Omphalos.Services/Implementations/ImageService.cs` + `ImageValidation.cs` | Orchestrator + magic-byte/size validation | ✓ VERIFIED | `IsRecognizedImage`, `DetectImageMimeType`, `MaxImageBytes` (5MB), `IsInvalidUpload` all present; DI-registered in `Program.cs`. |
| `src/Omphalos.Web/Endpoints/CharacterImageEndpoints.cs`, `LocationImageEndpoints.cs` | Session-owned cached binary GET routes | ✓ VERIFIED | Routes match `imageUrls.js`'s `<url_contract>` exactly; `TypedResults.File` + SHA256 ETag + `private` Cache-Control; ownership enforced via `IImageService`→repository `.Session.UserId == userId` filter. |
| `src/Omphalos.Web/Endpoints/GlobalCharacterEndpoints.cs` / `GlobalLocationEndpoints.cs` (extended) | Public/authenticated binary GET routes | ✓ VERIFIED | Routes present; post-WR-04, `Cache-Control` is `private` (not `public`) since these routes are also `RequireAuthorization()`-gated. |
| `src/Omphalos.IntegrationTests/WebAppFactory.cs` + `ImageEndpointTests.cs` | New WebApplicationFactory harness + endpoint tests | ✓ VERIFIED | 6 endpoint tests present and passing; test names confirm ownership/404, 304-caching, Cache-Control, 400-on-invalid-upload coverage. |
| `src/client/components/ImageCropModal.jsx` | Shared Cropper.js v2 crop component | ✓ VERIFIED | Present; used at all 3 crop sites; dual `onSave(file, blob)` output; amber theming; WR-03 error handling. |
| `src/client/utils/imageUrls.js` | URL builder + display resolvers | ✓ VERIFIED | `getImageUrl`, `sessionCharacterImageUrl`, `sessionLocationImageUrl`, `fetchImageBlob` all present, routes match backend exactly. |
| `src/client/components/CropModal.jsx` | Must be deleted, zero dangling imports | ✓ VERIFIED | File absent; `grep -rn "CropModal" src/client` returns only `ImageCropModal` matches. |
| `src/client/components/PortraitCrop.jsx` | Dead code, must be deleted | ✓ VERIFIED | File absent, no references remain. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `ImageCropModal.jsx` | `cropperjs` web components | `import 'cropperjs'` + refs | ✓ WIRED | Registers custom elements; `$ready()`/`$center()`/`$initSelection()` wired in `useEffect`. |
| `Library.jsx`, `CharacterModal.jsx`, `AddLocationModal.jsx` | `ImageCropModal.jsx` | Direct import + mount | ✓ WIRED | All 4 usages confirmed (2 in Library.jsx, 1 each in CharacterModal/AddLocationModal). |
| `getImageUrl`/`sessionCharacterImageUrl`/`sessionLocationImageUrl` (frontend) | `CharacterImageEndpoints`/`LocationImageEndpoints`/`GlobalCharacterEndpoints`/`GlobalLocationEndpoints` (backend) | Route string match | ✓ WIRED | All 4 route shapes verified identical on both sides. |
| `Program.cs` | `IImageService`, `MapCharacterImageEndpoints`, `MapLocationImageEndpoints` | DI + endpoint mapping | ✓ WIRED | All 3 registrations confirmed present. |
| `SessionRepository`/`GlobalCharacterRepository`/`GlobalLocationRepository` (create AND update paths) | `ImageWriteContract.Apply` | Direct call | ✓ WIRED | Post-WR-01 fix, all 3 repos' create paths now also route through the 4-rule contract (previously only update paths did). |
| `SessionEndpoints` PUT + `/import` | `ImageValidation.IsInvalidUpload` | `HasInvalidImages` guard | ✓ WIRED | Confirmed on both the PUT upsert handler and the bulk `/import` handler. |

### Requirements Coverage

All 16 phase requirement IDs are declared across the 6 plans' frontmatter; cross-referenced against `.planning/REQUIREMENTS.md`. No orphaned requirements found (every ID mapped to Phase 4 in REQUIREMENTS.md's traceability table is claimed by at least one plan).

| Requirement | Source Plan(s) | Status | Evidence |
|---|---|---|---|
| CROP-01 | 04-04 | ✓ SATISFIED (code); interactive UX → human_verification | Library.jsx GlobalCharacterModal wired to ImageCropModal (3:4) |
| CROP-02 | 04-05 | ✓ SATISFIED (code); interactive UX → human_verification | CharacterModal.jsx wired to ImageCropModal (3:4), sessionId prop added |
| CROP-03 | 04-04, 04-06 | ✓ SATISFIED (code); interactive UX → human_verification | Library.jsx GlobalLocationModal (4:3) + AddLocationModal.jsx (4:3) both wired |
| CROP-04 | 04-02, 04-04, 04-05, 04-06 | ✓ SATISFIED (code); interactive UX → human_verification | aspect-lock, movable/resizable, grid, 8 handles, 44px touch CSS all present |
| CROP-05 | 04-02 | ✓ SATISFIED | Chrome classes match CropModal.jsx precedent exactly (grep-confirmed) |
| CROP-06 | 04-02 | ✓ SATISFIED | `onSave(file, blob)` dual-output contract confirmed in source |
| CROP-07 | 04-02 | ✓ SATISFIED | Single `ImageCropModal.jsx` reused at all 3 sites, `CropModal.jsx` deleted |
| CROP-08 | 04-02 | ✓ SATISFIED (code); zoom interaction → human_verification | `<cropper-image scalable>` present |
| CROP-09 | 04-02 | ✓ SATISFIED (code); EXIF/iOS behavior → human_verification | `createImageBitmap(..., {imageOrientation:'from-image'})` + 2400px cap confirmed |
| IMG-01 | 04-01 | ✓ SATISFIED | Dual `OriginalImageData`/`CroppedImageData` bytea columns on all 4 entities, migration confirmed, tests pass |
| IMG-02 | 04-01, 04-04, 04-05, 04-06 | ✓ SATISFIED | Re-crop-without-reupload proven by integration test + all 4 frontend re-crop flows |
| IMG-03 | 04-01, 04-04, 04-05, 04-06 | ✓ SATISFIED | `Cropped ?? Original` fallback proven by integration test; GIF-skip + CR-01 re-crop guard confirmed in frontend |
| IMG-04 | 04-03 | ✓ SATISFIED | 4 binary GET routes confirmed, endpoint tests pass |
| IMG-05 | 04-01, 04-03 | ✓ SATISFIED | Read DTOs never carry bytes (compile+source confirmed); scalar `.Select(...)` projections, not `.Include(...)` |
| IMG-06 | 04-04, 04-05, 04-06 | ✓ SATISFIED | All display sites use endpoint URLs, zero embedded base64 in list/detail JSON |
| IMG-07 | 04-03 | ✓ SATISFIED | ETag + 304 + Cache-Control proven by endpoint tests; WR-04 fix corrected Global* to `private` |

No ORPHANED requirements — REQUIREMENTS.md's Phase 4 traceability rows (currently marked "Pending" in that file) match this phase's 6 plans exactly; the "Pending" markers are stale documentation, not evidence of missing implementation (REQUIREMENTS.md is typically updated at ship time, after verification).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/client/components/LocationsLibrary.jsx` | 11, 185, 196 | Stale `imageBase64` field references | ℹ️ Info | Dead code — this component is never imported anywhere in `src/client` (confirmed via grep) and predates Phase 4 (last touched in a pre-Phase-4 commit). It is not reachable from the running app and was not in this phase's `files_modified` scope. If it were ever wired in, its `imageBase64` field would silently no-op against the new DTOs (which no longer accept that field name) — worth a follow-up cleanup, but out of scope for this phase and does not affect any of the phase's observable truths. |
| `src/Omphalos.Services/Implementations/ImageValidation.cs` | 14-17 | `DetectImageMimeType` defaults unrecognized bytes to `image/jpeg` (IN-01) | ℹ️ Info | Deliberately deferred per 04-REVIEW-FIX.md — documented, not a phase-goal blocker. |
| `src/Omphalos.Web/Endpoints/CharacterImageEndpoints.cs` etc. | ~34 | Duplicated `GetUserId` helper across 3 files (IN-02) | ℹ️ Info | Deliberately deferred per 04-REVIEW-FIX.md. |
| `src/Omphalos.Web/Endpoints/CharacterImageEndpoints.cs` | 18 | Invalid `variant` returns 404 instead of 400 (IN-03) | ℹ️ Info | Deliberately deferred per 04-REVIEW-FIX.md. |

No blocker-level anti-patterns found. No unresolved `TBD`/`FIXME`/`XXX` debt markers in phase-touched files.

### Behavioral Spot-Checks / Automated Test Execution

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend build | `dotnet build Omphalos.slnx` | 7 projects, 0 errors | ✓ PASS |
| Image storage model tests (migration cast, fallback, write-contract) | `dotnet test src/Omphalos.IntegrationTests --filter "FullyQualifiedName~ImageColumnMigration\|FullyQualifiedName~ImageFallback"` | 6/6 passed | ✓ PASS |
| Full integration suite (incl. 6 `ImageEndpointTests`) | `dotnet test src/Omphalos.IntegrationTests` | 15/15 passed | ✓ PASS |
| Unit test suite | `dotnet test src/Omphalos.UnitTests` | 4/4 passed | ✓ PASS |
| Frontend build | `npm run build` | 673 modules, built successfully | ✓ PASS |
| CR-01 fix (GIF-guard on all 4 re-crop entry points) | `grep -n isGifBlob` across `CharacterModal.jsx`, `AddLocationModal.jsx`, `Library.jsx` (both modals) | All 4 sites confirmed | ✓ PASS |
| WR-01 fix (write-contract on create paths) | `grep -n ImageWriteContract.Apply` across `SessionRepository.cs`, `GlobalCharacterRepository.cs`, `GlobalLocationRepository.cs` | Present on create AND update paths in all 3 | ✓ PASS |
| WR-04 fix (Cache-Control private on Global* endpoints) | Source read of `GlobalCharacterEndpoints.cs`/`GlobalLocationEndpoints.cs` | `private, max-age=31536000, immutable` | ✓ PASS |
| WR-05 fix (empty-string guard in migration) | Source read of migration `Up()` | `OR "X" = ''` guard present on all 4 tables | ✓ PASS |
| WR-06 fix (LocationConfiguration Name constraint + accompanying migration) | Source read + migration file existence | `IsRequired().HasMaxLength(500)` + `AddLocationNameConstraints` migration present | ✓ PASS |
| Total automated test count matches REVIEW-FIX claim (19/19) | 15 (integration) + 4 (unit) | 19/19 | ✓ PASS |

**Step 7b note:** Full-suite runs were each executed exactly once (integration suite once, unit suite once); the filtered migration/fallback run was a separate, smaller, plan-specified command, not a repeated full-suite filter.

### Probe Execution

No `scripts/*/tests/probe-*.sh` conventional probes exist in this repository, and no PLAN/SUMMARY declares any probe-based verification for this phase. Skipped — N/A.

### Human Verification Required

1. **Interactive crop-stage behavior (drag, resize handles, grid, touch) at all 3 sites**
   **Test:** Open the Character Library, add/edit a character, upload a portrait; repeat for the Locations-tab library; repeat for an in-session character (Characters tab or NPC Quick Bar) and an in-session location (AddLocationModal). At each site, drag the crop selection, resize via each corner/edge handle, and confirm the rule-of-thirds grid renders in the app's amber accent (not Cropper's default blue).
   **Expected:** Selection drags/resizes smoothly; grid and handles render amber; behavior matches the retired `CropModal.jsx`'s drag/resize UX.
   **Why human:** No frontend test framework exists in this repo; code inspection confirms wiring (`movable resizable`, 8 handle actions, theme-color attributes) but not the actual rendered/interactive result.

2. **Zoom (wheel + pinch) and EXIF-photo orientation**
   **Test:** In the crop modal, scroll the mouse wheel to zoom in/out; if a touch device is available, pinch-zoom. Upload a real phone photo known to carry EXIF rotation data and confirm it appears right-side-up in the crop stage. If an iOS device is available, confirm the canvas isn't blank.
   **Expected:** Smooth zoom in both input modes; EXIF-rotated photo displays correctly oriented; no blank canvas on iOS Safari.
   **Why human:** `createImageBitmap(..., {imageOrientation: 'from-image'})` + 2400px downscale is code-verified, but real EXIF-photo orientation and iOS Safari's canvas-size ceiling can only be observed live.

3. **GIF upload/display/re-crop round trip**
   **Test:** Upload a small animated GIF at each of the 3 crop sites; confirm the crop modal never opens (inline notice shows instead) and the GIF animates in every card/preview that subsequently renders it. Then click "Re-crop" on that same GIF-holding entry and confirm the crop modal is still skipped (not opened) — this is the CR-01 fix's live behavior.
   **Expected:** GIF stored and displayed as-is (animating); Re-crop shows the same skip notice, never bakes the GIF down to a static frame.
   **Why human:** Backend fallback and the CR-01 code guard are both confirmed present and covered by integration/source-level checks, but whether the GIF's animation genuinely survives the full upload→display→re-crop round trip in a real browser needs live confirmation.

### Gaps Summary

No blocking gaps found. All backend data-model, endpoint, and validation work (IMG-01 through IMG-07) is proven by 19/19 passing automated tests (15 integration + 4 unit) plus direct source verification of all 8 code-review fixes (CR-01, WR-01 through WR-07) from `04-REVIEW-FIX.md`. All frontend wiring (all 3 crop call sites, all display sites, `CropModal.jsx` deletion) is confirmed present and correctly connected via source inspection and a green `npm run build`.

The only open item is the class of frontend interactive behaviors (drag/zoom/touch/EXIF-photo/GIF-animation) that this project has no automated test coverage for — consistent with the project's existing convention (documented in `04-VALIDATION.md`'s "Manual-Only Verifications" table) and explicitly anticipated by every plan's own `<verification>` section ("Manual (phase-end UAT)..."). These are routed to human verification rather than treated as failures, per the phase's own validation strategy.

One pre-existing, unreachable dead-code inconsistency was noted (`LocationsLibrary.jsx` still references the old `imageBase64` field) — it predates this phase, is never imported/rendered, and does not affect any of the phase's observable truths; flagged as Info for a future cleanup pass, not a gap.

---

_Verified: 2026-07-14T08:08:52Z_
_Verifier: Claude (gsd-verifier)_
