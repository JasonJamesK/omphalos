---
phase: 04-image-cropping-storage-cropper-js-v2-rollout
plan: 02
subsystem: ui
tags: [cropperjs, web-components, react, image-upload, crop]

# Dependency graph
requires: []
provides:
  - Shared ImageCropModal.jsx (Cropper.js v2 web-component crop stage, themed to match CropModal.jsx chrome)
  - prepareWorkingCopy/isGifFile/blobToBase64 exports on imageUpload.js
  - imageUrls.js (getImageUrl, sessionCharacterImageUrl, sessionLocationImageUrl, fetchImageBlob)
  - cropperjs@2.1.1 dependency
  - Confirmed cropperjs v2.1.1 ready-detection API: use `<cropper-image>.$ready()`, not a plain 'load' DOM event
affects: [04-03 (endpoints), 04-04 (wiring at call sites), 04-05 (app-wide img refactor)]

# Tech tracking
tech-stack:
  added: ["cropperjs@2.1.1"]
  patterns:
    - "Direct Web-Component ref wiring (React 18 cannot bind custom-element props/events through JSX) — imperative setAttribute/property assignment in useEffect"
    - "theme-color attribute per cropper element (not CSS inheritance) to retint the library's default-blue crop stage to the app's amber accent"

key-files:
  created:
    - src/client/components/ImageCropModal.jsx
    - src/client/utils/imageUrls.js
  modified:
    - package.json
    - package-lock.json
    - src/client/utils/imageUpload.js
  deleted:
    - src/client/components/PortraitCrop.jsx

key-decisions:
  - "Used cropperjs's public `$ready()` promise instead of the plain `load` DOM event RESEARCH.md's Pattern 1 skeleton assumed — verified directly against node_modules/cropperjs/dist/cropper.esm.js that <cropper-image>'s internal Image lives in its own shadow root and its native load event does not bubble/compose to the host element."
  - "Retinted every crop-stage element (selection, grid, crosshair, all handles) via the theme-color attribute, since cropperjs's shared-style mechanism only picks up --theme-color when that attribute is explicitly set per element (no global default to override)."
  - "Added a best-effort coarse-pointer media query expanding resize-handle hit-boxes to 44px without inflating the visible ~5-15px indicator dot, satisfying UI-SPEC's touch-target requirement; full verification deferred to phase-end manual UAT per the plan's own verification section."

patterns-established:
  - "Web-Component crop stage: mount only after an object-URL working copy is ready, wire $ready()/$center()/$initSelection() in a useEffect keyed off that URL, and never rely on JSX props for anything but the very first custom-element attributes."

requirements-completed: [CROP-04, CROP-05, CROP-06, CROP-07, CROP-08, CROP-09]

coverage:
  - id: D1
    description: "cropperjs@2.1.1 installed (npm-verified, package-legitimacy OK) and dead PortraitCrop.jsx removed"
    requirement: "CROP-07"
    verification:
      - kind: other
        ref: "npm ls cropperjs (resolved 2.1.1); grep -rn PortraitCrop src/client (no hits)"
        status: pass
    human_judgment: false
  - id: D2
    description: "imageUpload.js exports prepareWorkingCopy (createImageBitmap + from-image + 2400px cap), isGifFile, blobToBase64"
    requirement: "CROP-09"
    verification:
      - kind: other
        ref: "grep -n 'prepareWorkingCopy|isGifFile|blobToBase64' src/client/utils/imageUpload.js"
        status: pass
    human_judgment: false
  - id: D3
    description: "imageUrls.js builds correct binary-endpoint URLs and session display resolvers per the phase's url_contract"
    requirement: "CROP-06"
    verification:
      - kind: other
        ref: "getImageUrl('session-character','x','cropped','s') === '/api/sessions/s/characters/x/portrait/cropped'"
        status: pass
    human_judgment: false
  - id: D4
    description: "ImageCropModal.jsx: shared Cropper.js v2 stage with aspect lock, zoom (wheel/pinch via scalable), rule-of-thirds grid, 8 resize handles, amber theming, dual onSave(file, croppedBlob) output, themed chrome matching CropModal.jsx"
    requirement: "CROP-04, CROP-05, CROP-06, CROP-08"
    verification:
      - kind: other
        ref: "grep checks (import 'cropperjs', onSave(file, chrome classes/#d4a574, prepareWorkingCopy usage) all pass; esbuild syntax-check of the standalone file passes (npm run build alone cannot exercise it since no call site imports it yet in this plan)"
        status: pass
      - kind: manual_procedural
        ref: "Interactive drag/zoom/pinch/grid/handle behavior — deferred to phase-end UAT per this plan's own <verification> section, since ImageCropModal is not yet wired into any call site (that's Plan 04's job)"
        status: unknown
    human_judgment: true
    rationale: "Interactive crop-stage behavior (drag, wheel/pinch zoom, real EXIF-rotated photo) can only be judged live in a browser at the 3 wired call sites, which this plan does not create — the plan's own verification section explicitly defers this to phase-end manual UAT."

# Metrics
duration: 13min
completed: 2026-07-13
status: complete
---

# Phase 4 Plan 02: Shared Cropper.js v2 Crop Engine Summary

**Built the single shared `ImageCropModal.jsx` Cropper.js v2 web-component wrapper (amber-themed, dual original+cropped output) plus its supporting EXIF-safe working-copy/GIF/base64 utilities and a binary-endpoint URL builder — no call sites wired yet, that's a later plan.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-07-13T13:40:08Z
- **Completed:** 2026-07-13T13:53:03Z
- **Tasks:** 2
- **Files modified:** 6 (2 created, 3 modified, 1 deleted)

## Accomplishments
- Installed `cropperjs@2.1.1` (npm registry re-verified: `latest` dist-tag, no postinstall script)
- Extended `imageUpload.js` with `prepareWorkingCopy` (EXIF-safe via `createImageBitmap(..., { imageOrientation: 'from-image' })`, 2400px longest-edge cap, PNG-stays-PNG/else-JPEG-0.92), `isGifFile`, and `blobToBase64`
- Created `imageUrls.js` with `getImageUrl` (binary-endpoint URL builder per the phase's `<url_contract>`) plus `sessionCharacterImageUrl`/`sessionLocationImageUrl` (own-vs-linked-vs-none resolution) and `fetchImageBlob`
- Built `ImageCropModal.jsx`: aspect-locked, zoomable (wheel/pinch), rule-of-thirds grid, 8-handle Cropper.js v2 stage, retinted from the library's default blue to `#d4a574` throughout, chrome matching `CropModal.jsx` exactly, emitting `onSave(file, croppedBlob)` on save
- Resolved the phase's flagged "Open Question #2" (exact `<cropper-image>` ready/load event) by reading the installed package source directly — see Deviations
- Deleted dead `src/client/components/PortraitCrop.jsx` (D-10, never imported)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install cropperjs + extend image utils + add URL builder + delete dead PortraitCrop** - `89254b4` (feat)
2. **Task 2: Build shared ImageCropModal.jsx** - `d7ab787` (feat)

**Plan metadata:** committed separately after this SUMMARY (see final commit below).

## Files Created/Modified
- `package.json`, `package-lock.json` - added `cropperjs@2.1.1`
- `src/client/utils/imageUpload.js` - added `isGifFile`, `prepareWorkingCopy`, `blobToBase64`
- `src/client/utils/imageUrls.js` - new: `getImageUrl`, `sessionCharacterImageUrl`, `sessionLocationImageUrl`, `fetchImageBlob`
- `src/client/components/ImageCropModal.jsx` - new: shared Cropper.js v2 crop modal
- `src/client/components/PortraitCrop.jsx` - deleted (dead code, D-10)

## Decisions Made

- **Resolved RESEARCH.md's Open Question #2 (exact ready/load event) during implementation, as the plan required.** Direct inspection of `node_modules/cropperjs/dist/cropper.esm.js` shows `CropperImage` loads its source into an internal `Image` object appended to its own shadow root and listens for that internal image's native `load` event — which does not bubble or compose out to the host `<cropper-image>` element (native `load` events are neither `bubbles` nor `composed` by default). An external `imageEl.addEventListener('load', ...)` on the host element (as RESEARCH.md's Pattern 1 skeleton assumed) would therefore never fire. The library instead exposes a public `$ready(callback?)` method returning a `Promise<HTMLImageElement>` for exactly this purpose (used internally by `CropperCanvas.$toCanvas()` itself). `ImageCropModal.jsx` uses `imageEl.$ready().then(...)` to trigger `$center('contain')` + `$initSelection(true, true)`, matching Pitfall 2's sequencing requirement (don't call these until the image has truly loaded) via a mechanism that actually works with this library version.
- **Theming every crop-stage element via the `theme-color` HTML attribute, not CSS custom-property inheritance.** Confirmed via source read that each `CropperElement` only injects a `:host{--theme-color: ...}` rule into its own shadow stylesheet when its own `theme-color` attribute/property is set — there is no ambient/inherited default to override from outside. `<cropper-handle>` (default `rgba(51,153,255,0.5)`, i.e. Cropper's stock blue) and `<cropper-grid>`/`<cropper-crosshair>` (default light gray) each needed an explicit `theme-color="#d4a574"` (or the grid's `rgba(212,165,116,0.35)`), and `<cropper-selection outlined>` needed the same or its outline renders with an unresolved CSS variable.
- **Left `<cropper-shade>` un-hidden with its library-default `rgba(0,0,0,0.65)` theme color**, rather than following RESEARCH.md's copied example (`<cropper-shade hidden />`). The default shade color is an exact match for `CropModal.jsx`'s existing dim-outside-selection overlay opacity (0.65), so keeping it visible (not hidden) better satisfies CROP-05's "match existing chrome" requirement than the hidden example the research pattern happened to copy verbatim from the official minimal demo.
- **Enabled zoom via `<cropper-image scalable>` only** (not `rotatable`/`skewable`/`translatable`, none of which are in scope) — `<cropper-canvas>` handles wheel and pinch gestures natively and dispatches scale actions to any `scalable` image, confirmed via source read of its wheel-event binding.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added a best-effort 44px touch hit-target for resize handles**
- **Found during:** Task 2 (ImageCropModal.jsx)
- **Issue:** Cropper.js v2's default `<cropper-handle>` resize hit-boxes are ~15px (with only a ~5-10px visible indicator dot), below UI-SPEC's explicit 44px minimum touch-target requirement (WCAG 2.5.5).
- **Fix:** Added a scoped `@media (pointer: coarse)` style block widening each resize handle's invisible hit-box to 44px, re-centered on the same point, without touching the library-controlled visible indicator size.
- **Files modified:** `src/client/components/ImageCropModal.jsx`
- **Verification:** Visual/touch confirmation requires a real touch device or emulated coarse-pointer inspection — not verifiable via `npm run build`; flagged for phase-end manual UAT (UI-SPEC already calls this out as "verify during implementation... if not, apply touch-action/padding overrides", so this is expected follow-through, not scope creep).
- **Committed in:** `d7ab787` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical/accessibility)
**Impact on plan:** Necessary for UI-SPEC compliance (explicit 44px requirement). No scope creep — stayed within `ImageCropModal.jsx`.

## Issues Encountered

- **`npm run build` cannot exercise `ImageCropModal.jsx`'s actual syntax/runtime correctness in this plan**, because no call site imports it yet (wiring is a later plan per the phase's 5-plan breakdown) — Vite/Rollup only transforms modules reachable from an entry point, so an unimported file is invisible to the build graph. Compensated by running `node_modules/.bin/esbuild` directly against the file (with React/cropperjs/imageUpload externalized) to confirm it parses/bundles cleanly, in addition to the plan's grep-based acceptance criteria. Full runtime correctness (drag/zoom/EXIF-rotation/handle behavior) can only be confirmed once a later plan wires this component into a real call site and the phase-end UAT runs, exactly as this plan's own `<verification>` section anticipates ("Manual (phase-end UAT): crop interaction, zoom...").
- **Pre-existing `dompurify` moderate/critical `npm audit` findings** surfaced after `npm install` — traced to the existing `jspdf@2.5.2` dependency (`jspdf > dompurify@2.5.9`), unrelated to `cropperjs`. Out of scope per the deviation rules' scope boundary (pre-existing issue in unrelated dependency); not fixed, not logged to `deferred-items.md` since it predates this plan's changes entirely and isn't newly introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `ImageCropModal.jsx`, `imageUpload.js`'s new exports, and `imageUrls.js` are ready for Plan 04 (wiring into `Library.jsx`/`CharacterModal.jsx`/`AddLocationModal.jsx`) and Plan 03 (backend binary endpoints, which `imageUrls.js`'s `<url_contract>` routes are already locked in lockstep with).
- The `$ready()` finding (this plan's key discovery) should be treated as settled for any future Cropper.js v2 work in this codebase — do not reintroduce a plain `addEventListener('load', ...)` on a `<cropper-image>` ref, it will silently never fire.
- No blockers. Phase-end UAT for CROP-01..09's interactive behavior remains outstanding until the wiring plan lands, as originally scoped.

---
*Phase: 04-image-cropping-storage-cropper-js-v2-rollout*
*Completed: 2026-07-13*
