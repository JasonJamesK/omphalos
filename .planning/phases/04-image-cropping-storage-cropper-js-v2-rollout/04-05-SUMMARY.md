---
phase: 04-image-cropping-storage-cropper-js-v2-rollout
plan: 05
subsystem: ui
tags: [react, cropperjs, image-upload, character, session]

# Dependency graph
requires:
  - phase: 04-01
    provides: Dual OriginalImageData/CroppedImageData write DTO fields + HasImage flag on Character/GlobalCharacter
  - phase: 04-02
    provides: Shared ImageCropModal.jsx (Cropper.js v2), imageUpload.js (isGifFile/blobToBase64/prepareWorkingCopy), imageUrls.js (getImageUrl/sessionCharacterImageUrl/fetchImageBlob)
  - phase: 04-03
    provides: Binary GET image endpoints (/api/sessions/{sid}/characters/{id}/portrait/{variant}, /api/characters/{id}/portrait/{variant})
provides:
  - In-session CharacterModal (Characters tab + NpcQuickBar) wired to the shared ImageCropModal with GIF-skip and re-crop-from-original
  - Portrait.jsx render contract changed to a caller-resolved imageUrl prop (no more char.portraitBase64 read)
  - Session-character portrait display fully migrated to binary endpoints via sessionCharacterImageUrl (own image, else linked library image, else placeholder)
  - Character write/copy/seed surface free of portraitBase64/portraitPanX/portraitPanY (D-11 complete for characters)
affects: [04-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Portrait.jsx is now a dumb renderer taking a pre-resolved imageUrl prop — callers own session-vs-global URL resolution via sessionCharacterImageUrl/getImageUrl, keeping that logic in one place (imageUrls.js) instead of duplicated per-caller"
    - "CharacterModal's crop state unified to a single cropFile/cropMode pair (File|Blob + 'new'|'re-crop') so one ImageCropModal onSave handler serves both the fresh-upload and re-crop-from-retained-original flows"

key-files:
  created: []
  modified:
    - src/client/components/character/Portrait.jsx
    - src/client/components/character/AddFromLibraryModal.jsx
    - src/client/components/character/CharacterModal.jsx
    - src/client/components/tabs/Characters.jsx
    - src/client/components/session/NpcQuickBar.jsx
    - src/client/data/mockData.js

key-decisions:
  - "Re-crop no longer re-opens the native file picker (the old CropModal-era behavior) — it fetches the retained /original (via fetchImageBlob(sessionCharacterImageUrl(..., 'original'))) or, for an unsaved new upload, rebuilds a Blob from the locally-held originalImageData base64, so the stored original is preserved across a re-crop (IMG-02) instead of being silently replaced by whatever the user re-selects."
  - "Added a base64ToBlob helper local to CharacterModal.jsx (atob + Uint8Array) to convert a locally-held, not-yet-saved originalImageData string back into a Blob for ImageCropModal — no shared util existed for this direction (blobToBase64 in imageUpload.js only goes the other way)."
  - "'Remove' is the only way to clear an existing portrait and get back to the upload-placeholder button; there is no separate 'replace with a different image' trigger, matching quest-board's confirmed pattern and this phase's crop_site_wiring_contract (Re-crop reuses the existing image, Remove-then-upload replaces it)."

patterns-established:
  - "sessionCharacterImageUrl(char, sessionId[, variant]) is the single call every session-character display site should make to resolve own-vs-linked-vs-none image URLs — Portrait.jsx itself never resolves this."

requirements-completed: [CROP-02, CROP-04, IMG-02, IMG-03, IMG-06]

coverage:
  - id: D1
    description: "Portrait.jsx renders a caller-resolved imageUrl prop (placeholder when null); AddFromLibraryModal's LibraryMiniPortrait/CharacterPreview compute getImageUrl('global-character', char.id, 'cropped') gated on char.hasImage for every library portrait shown"
    requirement: "IMG-06"
    verification:
      - kind: other
        ref: "grep -n portraitBase64 src/client/components/character/Portrait.jsx src/client/components/character/AddFromLibraryModal.jsx (no matches); npm run build (green)"
        status: pass
    human_judgment: false
  - id: D2
    description: "In-session CharacterModal crops via ImageCropModal (3:4, 'Crop Portrait'), accepts a sessionId prop, GIF uploads skip the crop stage and show an inline notice, Re-crop fetches the retained original (local unsaved or via /original endpoint) instead of re-opening the file picker, and Remove clears hasImage/originalImageData/croppedImageData"
    requirement: "CROP-02, IMG-02, IMG-03"
    verification:
      - kind: other
        ref: "grep -n 'CropModal|portraitBase64|portraitPanX|portraitPanY' src/client/components/character/CharacterModal.jsx shows only ImageCropModal; npm run build (green)"
        status: pass
      - kind: manual_procedural
        ref: "Interactive crop/GIF-skip/re-crop-from-original behavior at this call site — deferred to phase-end UAT per this plan's own <verification> section"
        status: unknown
    human_judgment: true
    rationale: "Whether the crop stage actually behaves correctly for a real drag/zoom/GIF-selection/re-crop sequence in a browser can only be judged live — this plan's own <verification> section explicitly defers that to phase-end manual UAT, same as Plan 02/04's ImageCropModal wiring."
  - id: D3
    description: "Characters.jsx and NpcQuickBar.jsx: blank forms, save-to-library payloads, and addFromLibrary/link copies all carry hasImage/originalImageData/croppedImageData instead of portraitBase64/portraitPanX/portraitPanY; every Portrait render passes a resolved sessionCharacterImageUrl; both files pass sessionId to CharacterModal; mockData.js mock characters are free of portrait fields (D-11)"
    requirement: "CROP-04, IMG-02, IMG-03"
    verification:
      - kind: other
        ref: "grep -rn 'portraitBase64|portraitPanX|portraitPanY' src/client/components/tabs/Characters.jsx src/client/components/session/NpcQuickBar.jsx src/client/data/mockData.js (no matches); npm run build (green)"
        status: pass
    human_judgment: false

# Metrics
duration: 47min
completed: 2026-07-14
status: complete
---

# Phase 4 Plan 05: In-Session Character Crop Wiring + Portrait Display Migration Summary

**In-session CharacterModal (Characters tab + NpcQuickBar) now crops via the shared Cropper.js v2 `ImageCropModal` with GIF-skip and re-crop-from-retained-original, and every session-character portrait renders from the binary image endpoints instead of embedded base64 — completing D-11's pan-field removal across the character write/copy/seed surface.**

## Performance

- **Duration:** 47 min
- **Started:** 2026-07-14T07:58:24+02:00 (first task commit)
- **Completed:** 2026-07-14T08:44:57+02:00 (last task commit)
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- `Portrait.jsx` changed to a caller-resolved `imageUrl` prop contract — no more `char.portraitBase64` read; `AddFromLibraryModal`'s `LibraryMiniPortrait`/`CharacterPreview` now compute `getImageUrl('global-character', char.id, 'cropped')` gated on `char.hasImage` for every character it previews from the library
- `CharacterModal.jsx` fully migrated off `CropModal`/`readImageFile` onto the shared `ImageCropModal` (aspect 3:4, "Crop Portrait"), gained a `sessionId` prop, GIF-skip with an inline notice, and a genuine re-crop-from-retained-original flow (fetches `/original` via `fetchImageBlob`, or rebuilds a Blob from a locally-held unsaved original) that leaves the stored original untouched (IMG-02)
- `Characters.jsx` + `NpcQuickBar.jsx`: blank-form defaults, save-to-library payloads, and addFromLibrary/link copies all carry `hasImage`/`originalImageData`/`croppedImageData`; addFromLibrary/link copies never copy image bytes (`hasImage: false` + `globalCharacterId`, display falls back to the linked library portrait via `sessionCharacterImageUrl`); both files pass `sessionId` to `CharacterModal` and a resolved `imageUrl` to every `Portrait`
- `mockData.js`: removed the inline SVG `portrait()` helper and all 7 mock characters' `portraitBase64`/`portraitPanX`/`portraitPanY` fields (D-11) — mock characters now render the letter placeholder, consistent with endpoint-based display superseding inline data URLs

## Task Commits

Each task was committed atomically:

1. **Task 1: Portrait.jsx display via resolved imageUrl + AddFromLibraryModal library previews** - `9cf11ff` (feat)
2. **Task 2: CharacterModal.jsx — ImageCropModal wiring, endpoint preview, sessionId prop** - `09e5742` (feat)
3. **Task 3: Characters.jsx + NpcQuickBar.jsx write/copy/display + mockData.js (D-11)** - `446834e` (feat)

**Plan metadata:** committed separately after this SUMMARY (see final commit below).

## Files Created/Modified
- `src/client/components/character/Portrait.jsx` - takes an `imageUrl` prop instead of reading `char.portraitBase64`
- `src/client/components/character/AddFromLibraryModal.jsx` - `LibraryMiniPortrait`/`CharacterPreview` resolve `getImageUrl('global-character', ..., 'cropped')` gated on `hasImage`
- `src/client/components/character/CharacterModal.jsx` - `ImageCropModal` wiring, `sessionId` prop, GIF-skip, re-crop-from-original, dual-image form contract
- `src/client/components/tabs/Characters.jsx` - blank form/save-to-library/addFromLibrary use the new image fields; passes `sessionId`/resolved `imageUrl`
- `src/client/components/session/NpcQuickBar.jsx` - identical treatment to `Characters.jsx` for the NPC quick-add path
- `src/client/data/mockData.js` - removed `portrait()` SVG helper and all mock portrait/pan fields (D-11)

## Decisions Made
- Re-crop fetches the retained `/original` (or reconstructs a Blob from a locally-held unsaved `originalImageData`) rather than re-opening the file picker, so a re-crop can never silently discard the stored original — this is a behavior change from the old `CropModal` pattern (where "Re-crop" was really "pick a new file"), required by this plan's `crop_site_wiring_contract` and IMG-02.
- Added a small `base64ToBlob` helper local to `CharacterModal.jsx` since no shared util in `imageUpload.js` converts a raw base64 string back into a Blob (only the `blobToBase64` direction exists) — kept local rather than promoting to a shared util since this is the only call site in this plan that needs to feed a locally-held unsaved original back into `ImageCropModal`.
- Kept "Remove" as the only way to clear an existing portrait (no separate "replace" trigger) — matches quest-board's confirmed pattern and the plan's own wiring contract (Re-crop reuses the existing image; Remove-then-upload replaces it).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `npm run build` failed with `Rollup failed to resolve import "cropperjs"` — this worktree had no `node_modules` at all**
- **Found during:** Task 2 (first build attempt after wiring `ImageCropModal` into `CharacterModal.jsx`)
- **Issue:** The worktree had never had `npm install` run in it. `package.json`/`package-lock.json` already declared `cropperjs@2.1.1` (committed by Plan 02 in an earlier wave), but this worktree's checkout had no `node_modules` directory whatsoever, so Rollup couldn't resolve any dependency, not just `cropperjs`.
- **Fix:** Ran `npm install` (no package arguments — materializes exactly what the already-committed `package-lock.json` specifies; not a new/unverified package decision, so the package-legitimacy checkpoint exclusion in Rule 3 does not apply here).
- **Files modified:** None tracked (`node_modules/` is gitignored; `package.json`/`package-lock.json` were unchanged by the install since the lockfile already pinned the correct versions).
- **Verification:** `npm run build` succeeded afterward (674 modules transformed, green build) and stayed green through Tasks 2 and 3.
- **Committed in:** N/A — no trackable file changes resulted from the install itself.

---

**Total deviations:** 1 auto-fixed (1 blocking — missing `node_modules` in a fresh worktree, resolved via a plain `npm install` against the already-committed lockfile, not a new package trust decision).
**Impact on plan:** Necessary to run the plan's own `npm run build` verification command at all. No scope creep — no dependency versions changed.

## Issues Encountered
None beyond the `node_modules` deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The in-session character crop/display path (Characters tab + NpcQuickBar) is now fully on the `ImageCropModal` + binary-endpoint + dual-image model, in lockstep with Plan 04's parallel `Library.jsx` (Global* character/location) wiring.
- Interactive crop/GIF-skip/re-crop behavior at this call site (drag, zoom, real GIF upload, re-crop confirming the original survives) is deferred to phase-end manual UAT, as this plan's own `<verification>` section anticipates.
- D-11 (pan-field removal) is now complete for the character write/copy/seed surface covered by this plan; Plan 04 covers the equivalent removal for `Library.jsx`'s Global* forms, and Plan 06 (if it touches Location fields) would be the corresponding location-side completion.
- No blockers for Plan 06.

---
*Phase: 04-image-cropping-storage-cropper-js-v2-rollout*
*Completed: 2026-07-14*

## Self-Check: PASSED
