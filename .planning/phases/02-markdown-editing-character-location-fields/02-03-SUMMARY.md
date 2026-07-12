---
phase: 02-markdown-editing-character-location-fields
plan: 03
subsystem: ui
tags: [react, react-markdown, remark, markdown, location, character-library]

# Dependency graph
requires:
  - phase: 02-markdown-editing-character-location-fields (Plan 02-01)
    provides: MarkdownField, MarkdownPreview, stripMarkdown shared components
provides:
  - Markdown editing/rendering wired into the in-session Locations tab (EditLocationModal + LocationCard)
  - Markdown editing/rendering wired into the add/create-location flow (AddLocationModal)
  - Stripped read-only preview + markdown Session Notes in the add-character-from-library flow (AddFromLibraryModal)
  - Fixed a latent missing-dependency bug in stripMarkdown.js (Plan 02-01) that blocked any consumer's build
affects: [phase-4-cropper-rollout]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read-only Shared Info Description → MarkdownPreview; card/preview snippet Description → stripMarkdown; Secrets & Hazards custom ▸-bullet renderer left untouched everywhere"

key-files:
  created: []
  modified:
    - src/client/components/tabs/Locations.jsx
    - src/client/components/location/AddLocationModal.jsx
    - src/client/components/character/AddFromLibraryModal.jsx
    - src/client/components/markdown/stripMarkdown.js

key-decisions:
  - "Fixed stripMarkdown.js's missing 'remark' import by using unified + remark-parse + remark-stringify directly (already-resolvable transitive deps of remark-gfm/react-markdown) instead of running npm install remark, per the package-install exclusion in the deviation rules"

patterns-established:
  - "LocationCard's untruncated Session Notes gets full MarkdownPreview (D-14) while its truncated Description gets stripMarkdown — same file, two different read-only treatments based on truncation"

requirements-completed: [MDED-03, MDED-04]

coverage:
  - id: D1
    description: "EditLocationModal (session Locations tab): read-only Shared Info Description renders as markdown, Session Notes is a MarkdownField, Secrets/Hazards bullet renderer unchanged"
    requirement: "MDED-04"
    verification:
      - kind: other
        ref: "npm run build (vite build exits 0, 660 modules transformed)"
        status: pass
    human_judgment: true
    rationale: "Live markdown rendering, live-preview auto-grow, and preserved bullet styling require visual confirmation in the browser — not verifiable from a build check alone."
  - id: D2
    description: "LocationCard: truncated Description is strip-cleaned plain text, hazard bullets unchanged, untruncated Session Notes renders full markdown (D-14)"
    requirement: "MDED-04"
    verification:
      - kind: other
        ref: "npm run build (vite build exits 0)"
        status: pass
    human_judgment: true
    rationale: "Visual confirmation needed that card snippets show no literal markdown syntax and that full Session Notes renders headings/lists/emphasis correctly."
  - id: D3
    description: "AddLocationModal create step: Description, Secrets & Hazards, Notes are all MarkdownFields with live preview"
    requirement: "MDED-04"
    verification:
      - kind: other
        ref: "npm run build (vite build exits 0)"
        status: pass
    human_judgment: true
    rationale: "Live split-view preview and auto-grow behavior at ~540px width require visual confirmation."
  - id: D4
    description: "AddLocationModal notes step: read-only Description renders as markdown, Secrets/Hazards bullet renderer unchanged, Session Notes is a MarkdownField"
    requirement: "MDED-04"
    verification:
      - kind: other
        ref: "npm run build (vite build exits 0)"
        status: pass
    human_judgment: true
    rationale: "Visual confirmation of markdown rendering and preserved bullets in the confirm step."
  - id: D5
    description: "AddFromLibraryModal CharacterPreview: Personality, Flaw, Description, Quest Hooks show clean strip-cleaned plain text (compact + full modes), preserving 'C#' style text"
    requirement: "MDED-03"
    verification:
      - kind: other
        ref: "npm run build (vite build exits 0)"
        status: pass
    human_judgment: true
    rationale: "Need to visually confirm no literal '**'/'#' markdown syntax leaks into the preview and that 'C#' is preserved (stripMarkdown correctness on real content)."
  - id: D6
    description: "AddFromLibraryModal notes step: Session Notes is a MarkdownField with live preview"
    requirement: "MDED-03"
    verification:
      - kind: other
        ref: "npm run build (vite build exits 0)"
        status: pass
    human_judgment: true
    rationale: "Live preview and add-to-session flow require interactive confirmation."

duration: 2min
completed: 2026-07-12
status: complete
---

# Phase 2 Plan 03: In-Session Location & Library-Character-Link Markdown Rollout Summary

**Rolled the Plan 02-01 MarkdownField/MarkdownPreview/stripMarkdown components out to the session Locations tab, the add/create-location flow, and the add-character-from-library flow — closing MDED-03/MDED-04 — and fixed a latent missing-dependency bug in stripMarkdown.js along the way.**

## Performance

- **Duration:** ~2 min (3 task commits)
- **Tasks:** 3
- **Files modified:** 4 (3 planned + 1 deviation fix)

## Accomplishments
- `Locations.jsx`: `EditLocationModal` read-only Description now renders markdown, Session Notes is a `MarkdownField`; `LocationCard` truncated Description is strip-cleaned and untruncated Session Notes renders full markdown (D-14); hazard bullets preserved in both places.
- `AddLocationModal.jsx`: create-step Description/Secrets & Hazards/Notes are all `MarkdownField`s; notes-step read-only Description renders markdown, Session Notes is a `MarkdownField`, hazard bullets preserved.
- `AddFromLibraryModal.jsx`: `CharacterPreview` read-only fields (Personality, Flaw, Description, Quest Hooks) are strip-cleaned plain text in both compact and full modes; Session Notes is a `MarkdownField`.
- Fixed a pre-existing bug in `stripMarkdown.js` (from Plan 02-01) that referenced an npm package (`remark`) never added to `package.json`, which silently never triggered a build failure until this plan became the first consumer of `stripMarkdown` in the build graph.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire markdown into the session Locations tab (EditLocationModal + LocationCard)** - `1bcdf45` (feat)
2. **Task 2: Wire markdown into the add/create-location flow (AddLocationModal)** - `cc2f9d4` (feat)
3. **Task 3: Wire markdown into the add-character-from-library flow (AddFromLibraryModal)** - `5d730ca` (feat)

_Note: SUMMARY.md commit follows separately per worktree protocol._

## Files Created/Modified
- `src/client/components/tabs/Locations.jsx` - EditLocationModal Description → MarkdownPreview, Session Notes → MarkdownField; LocationCard Description → stripMarkdown, Session Notes → MarkdownPreview (D-14)
- `src/client/components/location/AddLocationModal.jsx` - create-step Description/Secrets & Hazards/Notes → MarkdownField; notes-step Description → MarkdownPreview, Session Notes → MarkdownField
- `src/client/components/character/AddFromLibraryModal.jsx` - CharacterPreview fields → stripMarkdown; Session Notes → MarkdownField
- `src/client/components/markdown/stripMarkdown.js` - fixed missing `remark` import (deviation, see below)

## Decisions Made
- Followed the plan's explicit distinction between D-05 (named "Shared Info" read-only Description → full `MarkdownPreview`) and D-13 (compact preview/card snippets → `stripMarkdown`), and D-12 (Secrets & Hazards custom bullet renderer stays untouched everywhere it appears) exactly as specified.
- For the `stripMarkdown.js` fix: chose to rewrite the implementation using `unified` + `remark-parse` + `remark-stringify` (already-installed transitive dependencies of `remark-gfm`/`react-markdown`, which are themselves declared dependencies) rather than running `npm install remark`, since the deviation rules explicitly exclude package-manager installs from auto-fix and require a checkpoint for any new install. This achieves functionally identical behavior to the `remark` convenience package (which is itself just `unified().use(remarkParse).use(remarkStringify)`) without adding any new dependency or requiring human verification of package legitimacy.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed missing `remark` package import in stripMarkdown.js**
- **Found during:** Task 1 (wiring `stripMarkdown` into `LocationCard`'s truncated Description — the first real consumer of `stripMarkdown` in the build graph)
- **Issue:** `stripMarkdown.js` (created in Plan 02-01) imported `{ remark } from 'remark'`, but `remark` was never added to `package.json` — Plan 02-01 added `react-markdown`, `remark-gfm`, `remark-breaks`, and `strip-markdown` but not `remark` itself. This never surfaced during Plan 02-01 because no component actually called `stripMarkdown` at that point, so `npm run build` never touched the broken import path.
- **Fix:** Rewrote `stripMarkdown.js` to use `unified()`, `remark-parse`, and `remark-stringify` directly instead of the `remark` preset package. These three packages are already present in `node_modules` as legitimate transitive runtime dependencies of `remark-gfm` and `react-markdown` (both already direct `package.json` dependencies) — no new package was installed. `unified().use(remarkParse).use(stripMarkdownPlugin).use(remarkStringify)` is functionally identical to what `remark()` does internally.
- **Files modified:** `src/client/components/markdown/stripMarkdown.js`
- **Verification:** `npm run build` exits 0 (660 modules transformed) after the fix, confirmed after each of the three task commits.
- **Committed in:** `1bcdf45` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to unblock `npm run build` verification for all three tasks in this plan (all three tasks call `stripMarkdown` or depend on files that do). No scope creep — the fix is contained to the shared utility file's implementation and adds no new dependency.

## Issues Encountered
None beyond the deviation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- MDED-03 (character Session Notes in library-link flow) and MDED-04 (location markdown fields, in-session + library-link) are both closed by this plan.
- All editable D-01/D-03 prose fields across the app now write markdown; all named read-only "Shared Info" Descriptions render markdown (D-05); hazard bullets preserved everywhere (D-12); card/preview snippets are strip-cleaned (D-13); LocationCard's Session Notes renders full markdown (D-14).
- `LocationsLibrary.jsx` remains untouched per D-04 exclusion (dead code).
- No blockers for Phase 3 or Phase 4 — this plan consumed only existing Plan 02-01 artifacts and introduced no new dependencies or trust boundaries.
- Manual UAT per `02-VALIDATION.md` (D1-D6 coverage items above) still needs to be run interactively — human_judgment: true on all coverage items since this is visual/interactive markdown rendering behavior.

---
*Phase: 02-markdown-editing-character-location-fields*
*Completed: 2026-07-12*

## Self-Check: PASSED

All claimed files and commits verified present:
- `src/client/components/tabs/Locations.jsx` - FOUND
- `src/client/components/location/AddLocationModal.jsx` - FOUND
- `src/client/components/character/AddFromLibraryModal.jsx` - FOUND
- `src/client/components/markdown/stripMarkdown.js` - FOUND
- `.planning/phases/02-markdown-editing-character-location-fields/02-03-SUMMARY.md` - FOUND
- Commits `1bcdf45`, `cc2f9d4`, `5d730ca`, `e9fb3eb` - all FOUND in `git log --all`
