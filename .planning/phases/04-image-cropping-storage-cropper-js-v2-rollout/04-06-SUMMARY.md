---
phase: 04-image-cropping-storage-cropper-js-v2-rollout
plan: 06
subsystem: ui
tags: [cropperjs, react, image-upload, crop, location, session]

# Dependency graph
requires:
  - phase: 04-01
    provides: Dual OriginalImageData/CroppedImageData write DTO fields + HasImage flag on GlobalLocation
  - phase: 04-02
    provides: Shared ImageCropModal.jsx (Cropper.js v2), imageUpload.js (isGifFile/blobToBase64/prepareWorkingCopy), imageUrls.js (getImageUrl/sessionLocationImageUrl/fetchImageBlob)
  - phase: 04-03
    provides: Binary GET image endpoints for global-location and session-location (image/{variant})
  - phase: 04-04
    provides: Library.jsx's ImageCropModal wiring pattern (GlobalLocationModal) as the equivalent location-side reference
  - phase: 04-05
    provides: CharacterModal.jsx's base64ToBlob/cropFile/cropMode re-crop pattern, mirrored here for locations; confirmed no other importers of CropModal.jsx remain before this plan's deletion
provides:
  - In-session location create flow (AddLocationModal) wired to the shared ImageCropModal (4:3) with GIF-skip and re-crop-from-original
  - Session-location display (Locations tab + LocationsBlock prep-block mini cards) fully migrated to sessionLocationImageUrl / binary endpoints
  - The hand-rolled CropModal.jsx deleted with zero remaining importers anywhere in src/client
affects: [04-CONTEXT (phase-end UAT)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Same crop_site_wiring_contract established in Plans 04/05 applied to AddLocationModal's create-a-shared-location form: hasImage/originalImageData/croppedImageData state, GIF-skip via isGifFile+blobToBase64, ImageCropModal for non-GIF uploads, handleRecrop preferring a locally-held originalImageData (base64ToBlob) before falling back to a server /original fetch"
    - "sessionLocationImageUrl(loc, sessionId) is the single call every session-location display site makes to resolve own-vs-linked-vs-none image URLs, mirroring sessionCharacterImageUrl's precedent from Plan 05 — sessionId is threaded down as a prop from the nearest component holding activeSession via useApp()"

key-files:
  created: []
  modified:
    - src/client/components/location/AddLocationModal.jsx
    - src/client/components/tabs/Locations.jsx
    - src/client/components/session/blocks/LocationsBlock.jsx
  deleted:
    - src/client/components/CropModal.jsx

key-decisions:
  - "handleConfirm (session-add flow) sets hasImage: false unconditionally rather than copying any image field from the picked/created global location — the session-location links via globalLocationId (already set), which sessionLocationImageUrl resolves as a display fallback with zero byte copy, matching the plan's crop_site_wiring_contract step 3/CharacterModal precedent for addFromLibrary/link flows."
  - "Added a local base64ToBlob helper to AddLocationModal.jsx (identical to CharacterModal.jsx's) rather than promoting it to a shared util — same rationale Plan 05 gave: this is the only call site in this plan needing to feed a locally-held unsaved original back into ImageCropModal for re-crop."
  - "The create-form's Library search-result 'pick' cards were checked (per the plan's read_first notes) but render no images today (name/type/description only) — the plan's contract line about search-result cards using getImageUrl gated on hasImage does not apply here; nothing to change, not a deviation."

patterns-established:
  - "Locked crop_site_wiring_contract now applied at all three original crop call sites (Character Library, in-session Character, in-session Location) plus the Locations-tab library (Plan 04) — a full, consistent set for any future crop-adjacent work in this codebase."

requirements-completed: [CROP-03, CROP-04, IMG-02, IMG-03, IMG-06]

coverage:
  - id: D1
    description: "AddLocationModal's create-a-shared-location form crops via ImageCropModal (4:3, 'Crop Location Image'), skips crop for GIFs with an inline notice, re-crops from the retained original (local unsaved or server /original), and its create-global payload sends hasImage/originalImageData/croppedImageData instead of imageBase64"
    requirement: "CROP-03, IMG-02, IMG-03"
    verification:
      - kind: other
        ref: "grep -n 'CropModal|imageBase64' src/client/components/location/AddLocationModal.jsx (only ImageCropModal matches); npm run build (green) at commit 3c08c47"
        status: pass
    human_judgment: true
    rationale: "Interactive crop/GIF/re-crop behavior in a real browser (drag, zoom, GIF animating, re-crop opening against the stored original with no re-upload) can only be judged live — deferred to this phase's own phase-end manual UAT per its <verification> section, matching Plans 02/04/05's precedent."
  - id: D2
    description: "handleConfirm (session-add) sends hasImage: false and relies on globalLocationId for display, copying no image bytes"
    requirement: "IMG-02, IMG-06"
    verification:
      - kind: other
        ref: "Read of handleConfirm in src/client/components/location/AddLocationModal.jsx (commit 3c08c47) confirms hasImage: false with no imageBase64/originalImageData/croppedImageData fields sent"
        status: pass
    human_judgment: false
  - id: D3
    description: "Locations.jsx (EditLocationModal + LocationCard) and LocationsBlock.jsx (LocationMiniCard) render session-location images via sessionLocationImageUrl(loc, sessionId) instead of loc.imageBase64"
    requirement: "IMG-06"
    verification:
      - kind: other
        ref: "grep -rn imageBase64 src/client/components/tabs/Locations.jsx src/client/components/session/blocks/LocationsBlock.jsx (no matches); npm run build (green) at commit 573cc57"
        status: pass
    human_judgment: false
  - id: D4
    description: "CropModal.jsx deleted; grep across src/client confirms zero remaining importers (only ImageCropModal references remain)"
    requirement: "CROP-04"
    verification:
      - kind: other
        ref: "grep -rn \"from '.*CropModal'|CropModal\" src/client (only ImageCropModal matches); file absence confirmed post-delete"
        status: pass
    human_judgment: false

duration: 7min
completed: 2026-07-14
status: complete
---

# Phase 4 Plan 06: In-Session Location Crop Wiring + Display Migration + CropModal.jsx Deletion Summary

**In-session location creation (AddLocationModal) now crops via the shared Cropper.js v2 `ImageCropModal` with GIF-skip and re-crop-from-retained-original, session-location display (Locations tab + LocationsBlock mini cards) reads from the binary endpoints via `sessionLocationImageUrl`, and the obsolete hand-rolled `CropModal.jsx` is deleted with zero remaining imports anywhere in the app.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-07-14T08:50:27+02:00 (approx., base commit)
- **Completed:** 2026-07-14T08:57:01+02:00 (last task commit)
- **Tasks:** 2
- **Files modified:** 3 (+ 1 deleted)

## Accomplishments
- `AddLocationModal.jsx` (create-a-shared-location form) migrated off `CropModal`/`readImageFile`/`imageBase64` onto the shared `ImageCropModal` (4:3, "Crop Location Image"), with GIF-skip (inline notice, no crop stage), re-crop-from-original (fetches the stored `/original` via `getImageUrl`/`fetchImageBlob`, or reuses a local unsaved original via a new `base64ToBlob` helper), and Remove.
- The create-global-location payload (`db.createGlobalLocation`) now sends `hasImage`/`originalImageData`/`croppedImageData` instead of `imageBase64`.
- The session-add flow (`handleConfirm`) sends `hasImage: false` and relies on the already-set `globalLocationId` for display — no image bytes are copied into the session-location record.
- `Locations.jsx`'s `EditLocationModal` and `LocationCard`, and `LocationsBlock.jsx`'s `LocationMiniCard`, now render `sessionLocationImageUrl(loc, sessionId)` instead of reading `loc.imageBase64` directly; `sessionId` is threaded down as a prop from each component's `activeSession` (via `useApp()`).
- `src/client/components/CropModal.jsx` deleted. Confirmed via grep across `src/client` that no import of it remains anywhere — every former usage site (`Library.jsx`, `CharacterModal.jsx`, `AddLocationModal.jsx`) is now on `ImageCropModal`.

## Task Commits

Each task was committed atomically:

1. **Task 1: AddLocationModal.jsx — ImageCropModal wiring, create-global write, session-add link** - `3c08c47` (feat)
2. **Task 2: Locations.jsx + LocationsBlock.jsx display refactor + delete CropModal.jsx** - `573cc57` (feat)

**Plan metadata:** committed separately after this SUMMARY (see final commit below).

## Files Created/Modified
- `src/client/components/location/AddLocationModal.jsx` - `ImageCropModal` wiring (4:3), `hasImage`/`originalImageData`/`croppedImageData` create-form state, GIF-skip, re-crop-from-original, create-global payload, session-add link with no byte copy.
- `src/client/components/tabs/Locations.jsx` - `EditLocationModal`/`LocationCard` render `sessionLocationImageUrl(loc, sessionId)`; `sessionId` passed down from `activeSession.id`.
- `src/client/components/session/blocks/LocationsBlock.jsx` - `LocationMiniCard` renders `sessionLocationImageUrl(loc, sessionId)`; `sessionId` passed down from `activeSession.id`.
- `src/client/components/CropModal.jsx` - deleted (hand-rolled canvas crop tool, fully superseded by `ImageCropModal`).

## Decisions Made
- `handleConfirm` sends `hasImage: false` unconditionally (no image field copied from the picked/created global location) — the session-location links via the already-set `globalLocationId`, and `sessionLocationImageUrl` resolves the library image as a display fallback with zero byte copy. Matches this plan's `crop_site_wiring_contract` step 3 and the addFromLibrary/link precedent from Plan 05's `CharacterModal.jsx`.
- Added a local `base64ToBlob` helper to `AddLocationModal.jsx` (identical in shape to `CharacterModal.jsx`'s) rather than promoting it to a shared util — same call-site-scoped rationale as Plan 05: this is the only place in this plan needing to feed a locally-held unsaved original back into `ImageCropModal` for a re-crop.
- Checked the create-form's Library "pick" search-result cards per the plan's `read_first` notes — they render no images today (name/type/description only), so the plan's note about search-result cards using `getImageUrl` gated on `hasImage` doesn't apply; nothing needed changing there.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All three original crop call sites (Character Library, in-session Character, in-session Location) plus the Locations-tab library are now fully on `ImageCropModal` + the dual-image contract + binary-endpoint display.
- `CropModal.jsx` is deleted with zero remaining imports — D-04/CROP-04 fully complete across the app.
- Interactive crop/GIF-skip/re-crop behavior for the location call site (drag, zoom, real GIF upload, re-crop confirming the original survives) is deferred to this phase's own phase-end manual UAT, consistent with Plans 02/04/05's precedent.
- No blockers for phase-end UAT.

---
*Phase: 04-image-cropping-storage-cropper-js-v2-rollout*
*Completed: 2026-07-14*

## Self-Check: PASSED

All modified-file claims and both task commit hashes verified present (see below).
