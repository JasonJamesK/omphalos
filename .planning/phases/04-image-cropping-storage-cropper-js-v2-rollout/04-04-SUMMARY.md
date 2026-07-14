---
phase: 04-image-cropping-storage-cropper-js-v2-rollout
plan: 04
subsystem: ui
tags: [cropperjs, react, image-upload, crop, library]

# Dependency graph
requires:
  - phase: 04-01
    provides: Dual OriginalImageData/CroppedImageData columns + HasImage flag on GlobalCharacter/GlobalLocation DTOs
  - phase: 04-02
    provides: Shared ImageCropModal.jsx, imageUpload.js (isGifFile/blobToBase64/prepareWorkingCopy), imageUrls.js (getImageUrl/fetchImageBlob)
  - phase: 04-03
    provides: Binary cached GET endpoints for GlobalCharacter/GlobalLocation original/cropped images
provides:
  - Character Library (GlobalCharacterModal) fully migrated to ImageCropModal (3:4), GIF-skip, re-crop-from-original, dual-image save payload, endpoint-based card/preview display
  - Locations-tab library (GlobalLocationModal) fully migrated to ImageCropModal (4:3), same behaviors
  - Library.jsx has zero remaining references to CropModal/portraitBase64/portraitPanX/portraitPanY/imageBase64/readImageFile
affects: [04-05 (app-wide img refactor), 04-06 (phase-end UAT)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Crop-site wiring: form state as hasImage/originalImageData/croppedImageData; file input branches GIF (blobToBase64 direct) vs. non-GIF (ImageCropModal); re-crop fetches the stored /original (or reuses a local unsaved original) and updates only croppedImageData"
    - "base64ToBlob (local helper) converts a locally-held original back into a Blob so an unsaved new upload's original can be re-crop-fed into ImageCropModal without a network round-trip"

key-files:
  modified:
    - src/client/components/Library.jsx

key-decisions:
  - "Split the two tasks' commits by reconstructing an intermediate, independently-buildable file state (Task 1 kept the old CropModal/readImageFile imports and the untouched GlobalLocationModal alive alongside the new Character wiring; Task 2 then migrated GlobalLocationModal and dropped the now-fully-unused CropModal/readImageFile imports) so each task's commit passes `npm run build` standalone, since both tasks touch the same single file and share one import block."
  - "GIF preview follows the plan's locked crop_site_wiring_contract literally: croppedImageData stays null for a GIF upload (no crop is ever applied), so the preview falls through to the hasImage-gated endpoint URL branch. For an unsaved new entity this means the preview won't resolve until after Save (the entity has no server-side image row yet to fetch) — an accepted, minor UX rough edge of the locked contract, not a deviation."
  - "Ran `npm install` in this worktree before the first build attempt — cropperjs@2.1.1 (added to package.json/package-lock.json in Plan 02) was not present in the shared node_modules resolved via Node's parent-directory walk from this worktree. This is a routine lockfile-sync install of an already-vetted, already-committed dependency, not a new/unverified package addition (Rule 3's package-install exclusion does not apply)."

patterns-established:
  - "Locked crop_site_wiring_contract (6-step form-state/GIF/re-crop/remove/preview/payload pattern) — reusable verbatim at any future crop call site in this codebase (in-session Character/Location sites are Plan 05's job)."

requirements-completed: [CROP-01, CROP-03, CROP-04, IMG-02, IMG-03, IMG-06]

coverage:
  - id: D1
    description: "GlobalCharacterModal (Character Library) uses ImageCropModal (3:4 aspect), skips crop for GIFs with an inline notice, re-crops from the retained original (server-fetched or local-unsaved), and its save payload/card/preview use hasImage/originalImageData/croppedImageData + the binary /cropped endpoint instead of portraitBase64/pan fields"
    requirement: "CROP-01, IMG-02, IMG-03, IMG-06"
    verification:
      - kind: other
        ref: "grep -n 'portraitBase64|portraitPanX|portraitPanY' src/client/components/Library.jsx (no matches); npm run build (green) at the Task 1 commit (df5f965)"
        status: pass
    human_judgment: true
    rationale: "Interactive crop/GIF/re-crop behavior in a real browser (drag, zoom, GIF animating in the card, re-crop opening against the stored original with no re-upload) can only be judged live — deferred to this phase's own phase-end manual UAT per its <verification> section, matching Plan 02's precedent for ImageCropModal's own interactive behavior."
  - id: D2
    description: "GlobalLocationModal (Locations-tab library) uses ImageCropModal (4:3 aspect) with the same GIF-skip/re-crop/remove/dual-image-payload/endpoint-display behavior; imageBase64 fully removed from the location form/card/payload"
    requirement: "CROP-03, IMG-02, IMG-03, IMG-06"
    verification:
      - kind: other
        ref: "grep -n 'imageBase64|CropModal|readImageFile' src/client/components/Library.jsx (no matches); npm run build (green) at the Task 2 commit (d1cb5a4)"
        status: pass
    human_judgment: true
    rationale: "Same as D1 — interactive crop-stage/GIF/re-crop behavior requires live browser verification, deferred to phase-end manual UAT."

duration: 30min
completed: 2026-07-14
status: complete
---

# Phase 4 Plan 04: Character/Location Library Crop Wiring Summary

**Wired both Character Library portraits (3:4) and the Locations-tab library images (4:3) in `Library.jsx` to the shared `ImageCropModal`, replacing `CropModal`/base64 form state with the `hasImage`/`originalImageData`/`croppedImageData` dual-image contract and binary-endpoint card/preview display.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-07-14T06:15:00Z (approx.)
- **Completed:** 2026-07-14T06:44:47Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- `GlobalCharacterModal` (Character Library, 3:4 portrait) migrated off `CropModal`/`portraitBase64`/`portraitPanX`/`portraitPanY` onto `ImageCropModal` + `hasImage`/`originalImageData`/`croppedImageData`, with GIF-skip (inline notice, no crop stage), re-crop-from-original (fetches the stored `/original` via `getImageUrl`/`fetchImageBlob`, or reuses a local unsaved original), and Remove.
- `LibraryPortrait` (character card thumbnail) now renders `getImageUrl('global-character', char.id, 'cropped')` gated on `char.hasImage`, no embedded base64.
- `GlobalLocationModal` (Locations-tab library, 4:3 image) migrated identically off `CropModal`/`imageBase64` onto `ImageCropModal` + the same dual-image contract.
- `GlobalLocationCard` now renders `getImageUrl('global-location', loc.id, 'cropped')` gated on `loc.hasImage`.
- Both tabs' `handleSave` payloads to `db.createGlobalCharacter`/`updateGlobalCharacter`/`createGlobalLocation`/`updateGlobalLocation` now send `hasImage`/`originalImageData`/`croppedImageData` instead of the old base64/pan fields, matching the `CreateGlobalCharacterRequest`/`UpdateGlobalCharacterRequest`/`CreateGlobalLocationRequest`/`UpdateGlobalLocationRequest` DTOs (byte[]? fields, serialized as base64 strings over JSON — no server-side change needed here, Plan 03 already shipped those DTOs/endpoints).
- `Library.jsx` now has zero remaining references to `CropModal`, `readImageFile`, `portraitBase64`, `portraitPanX`, `portraitPanY`, or `imageBase64`.

## Task Commits

Each task was committed atomically:

1. **Task 1: GlobalCharacterModal — crop wiring, display, save payload (aspect 3:4)** - `df5f965` (feat)
2. **Task 2: GlobalLocationModal — crop wiring, display, save payload (aspect 4:3)** - `d1cb5a4` (feat)

**Plan metadata:** committed separately after this SUMMARY (see final commit below).

## Files Created/Modified
- `src/client/components/Library.jsx` - Both GlobalCharacterModal and GlobalLocationModal (plus their cards and tab save handlers) migrated to ImageCropModal + the dual-image contract + binary-endpoint display.

## Decisions Made
- Kept the two tasks' commits independently buildable despite both touching the same file's shared import block, by staging an intermediate file state for Task 1 (character wiring done, location section and its `CropModal`/`readImageFile` imports left untouched) before completing Task 2's migration. See frontmatter `key-decisions` for full detail.
- Followed the plan's locked `crop_site_wiring_contract` preview logic literally (local `croppedImageData` → data URI; else `hasImage` → endpoint URL; else placeholder) even though this means a GIF selected on a brand-new, not-yet-saved entity won't preview until after Save (no server-side image row exists yet to fetch from). This is the contract's own specified behavior, not something this plan's action text carves an exception for.
- Ran `npm install` in the worktree since `cropperjs` (added in Plan 02) wasn't present in the shared `node_modules` this worktree resolves via Node's directory-walk — a routine lockfile sync, not a new/unverified dependency (already vetted in Plan 02's summary).

## Deviations from Plan

None - plan executed exactly as written. (The two items above are process/build-environment notes, not code-behavior deviations from the plan's action text.)

## Issues Encountered
- Local `node_modules` was missing `cropperjs` in this worktree (see Decisions Made) — resolved with a one-time `npm install`, which created a worktree-local (gitignored) `node_modules` folder; `git status` confirmed clean after.
- Both tasks modify the same file's shared import line, which made independent per-task `npm run build` verification require reconstructing an intermediate "Task 1 only" file state rather than a simple sequential edit — documented above, not a functional issue.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `Library.jsx` (both Character Library and Locations-tab library) is fully off `CropModal`/base64 image state — ready for phase-end UAT (crop a portrait and a location image, upload a GIF, re-crop an existing entry, confirm cards load via network requests to the binary endpoints).
- Plan 05 (in-session Character/Location crop wiring in `CharacterModal.jsx`/`AddLocationModal.jsx`, plus the app-wide `<img>` refactor) can follow the same `crop_site_wiring_contract` pattern established here.
- No blockers.

---
*Phase: 04-image-cropping-storage-cropper-js-v2-rollout*
*Completed: 2026-07-14*

## Self-Check: PASSED

All modified-file claims and both task commit hashes verified present (see below).
