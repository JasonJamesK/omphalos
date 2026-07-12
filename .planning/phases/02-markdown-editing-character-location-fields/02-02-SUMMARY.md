---
phase: 02-markdown-editing-character-location-fields
plan: 02
subsystem: ui
tags: [react-markdown, remark, strip-markdown, library, markdown]

# Dependency graph
requires:
  - phase: 02-markdown-editing-character-location-fields (plan 01)
    provides: Shared MarkdownField (edit+preview) and stripMarkdown() components/utilities, proven end-to-end in CharacterModal.jsx
provides:
  - Shared-library Character form (GlobalCharacterModal) fully markdown-enabled across all four prose fields
  - Shared-library Location form (GlobalLocationModal) fully markdown-enabled across all three prose fields
  - Both library grid cards (GlobalCharacterCard, GlobalLocationCard) render clean, stripped plain-text description snippets
  - Fixed stripMarkdown.js's dependency on an unlocked `remark` package (latent bug from Plan 02-01, first surfaced by this plan's usage)
affects: [02-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "stripMarkdown.js now builds its own unified()-based processor (unified + remark-parse + remark-stringify + strip-markdown) instead of the convenience `remark` package, since `remark` was never added as a locked dependency"

key-files:
  created: []
  modified:
    - src/client/components/Library.jsx
    - src/client/components/markdown/stripMarkdown.js

key-decisions:
  - "Fixed the missing `remark` dependency in stripMarkdown.js by rewriting it against unified/remark-parse/remark-stringify — all three already resolved transitively in package-lock.json via remark-gfm/remark-breaks/strip-markdown — rather than adding the new `remark` package, avoiding any package-manager install (and the associated legitimacy-checkpoint requirement) entirely"

patterns-established: []

requirements-completed: [MDED-03, MDED-04]

coverage:
  - id: D1
    description: "GlobalCharacterModal (shared library Character form) renders Personality Traits, Flaw, Description, and Quest Hooks as MarkdownField with live dark-themed preview"
    requirement: "MDED-03"
    verification:
      - kind: other
        ref: "npm run build (660 modules transformed, exit 0) — confirms MarkdownField is imported/bundled at all four call sites"
        status: pass
      - kind: manual_procedural
        ref: "npm run dev — open Library > Characters > New/Edit Character, type markdown into each of the 4 fields, confirm live preview + auto-grow + Edit/Preview tab toggle at ~330px width"
        status: unknown
    human_judgment: true
    rationale: "Visual preview rendering, auto-grow sizing, and container-query tab-toggle behavior require human eyes; no frontend test framework exists in this project (manual-UAT-only convention)"
  - id: D2
    description: "GlobalCharacterCard truncated description snippet is cleaned via stripMarkdown before the 160-char slice, with mid-sentence # (e.g. 'C# is great') preserved"
    requirement: "MDED-03"
    verification:
      - kind: other
        ref: "npm run build exit 0"
        status: pass
      - kind: manual_procedural
        ref: "npm run dev — save a character with markdown syntax (**bold**, # heading, and literal 'C# is great') in Description; confirm card snippet shows clean plain text with C# preserved"
        status: unknown
    human_judgment: true
    rationale: "Requires visually confirming rendered card text is free of literal markdown syntax while a legitimate mid-word # survives — a judgment call on AST-strip output, not just a build check"
  - id: D3
    description: "GlobalLocationModal (shared library Location form) renders Description, Secrets & Hazards, and Notes as MarkdownField with live dark-themed preview, side-by-side split at ~540px width"
    requirement: "MDED-04"
    verification:
      - kind: other
        ref: "npm run build (660 modules transformed, exit 0) — confirms MarkdownField is imported/bundled at all three call sites"
        status: pass
      - kind: manual_procedural
        ref: "npm run dev — open Library > Locations > New/Edit Location, type markdown into each of the 3 fields, confirm live preview + side-by-side edit+preview split at ~540px single-column width"
        status: unknown
    human_judgment: true
    rationale: "Visual preview rendering and container-query split-view behavior require human eyes; no frontend test framework exists in this project"
  - id: D4
    description: "GlobalLocationCard description snippet is cleaned via stripMarkdown before the 200-char slice; the hazardLines '▸' bullet list (read-only, per-line rendering of secretsAndHazards) is left completely unchanged"
    requirement: "MDED-04"
    verification:
      - kind: other
        ref: "git diff confirms hazardLines block (lines defining the ▸ bullet <ul>) is byte-identical to pre-change version; npm run build exit 0"
        status: pass
      - kind: manual_procedural
        ref: "npm run dev — save a location with markdown in Description and multi-line Secrets & Hazards; confirm card description snippet is clean plain text and hazard bullets still render one ▸ per line"
        status: unknown
    human_judgment: true
    rationale: "Requires visually confirming both the stripped description snippet and the unchanged hazard bullet rendering side by side in the running app"

# Metrics
duration: ~20min
completed: 2026-07-12
status: complete
---

# Phase 2 Plan 2: Markdown Editing — Shared Library Character & Location Forms Summary

**Rolled the Plan 02-01 MarkdownField/stripMarkdown components out to `Library.jsx`'s GlobalCharacterModal (4 fields) and GlobalLocationModal (3 fields), plus clean stripped-text snippets on both grid cards — while fixing a latent missing-dependency bug in stripMarkdown.js that Plan 02-01 shipped but never exercised**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-12T14:17:55+02:00 (base commit)
- **Completed:** 2026-07-12T14:24:31+02:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `GlobalCharacterModal`'s Personality Traits, Flaw, Description, and Quest Hooks textareas replaced with `MarkdownField` — DM now writes markdown with live preview for shared-library NPCs/characters, matching the in-session `CharacterModal.jsx` UX from Plan 02-01
- `GlobalCharacterCard`'s description snippet now runs through `stripMarkdown()` before the existing 160-char truncation, so grid cards show clean plain text with mid-sentence `#` preserved
- `GlobalLocationModal`'s Description, Secrets & Hazards, and Notes textareas replaced with `MarkdownField` — same live-preview markdown editing for shared-library locations
- `GlobalLocationCard`'s description snippet now runs through `stripMarkdown()` before the existing 200-char truncation; the read-only `hazardLines` `▸` bullet list is untouched, per D-12
- Fixed `stripMarkdown.js` (built in Plan 02-01, unused until this plan activated it): it imported the `remark` convenience package, which was never added to `package.json`/`package-lock.json`, so the production build failed as soon as something actually imported `stripMarkdown`. Rewrote it against `unified` + `remark-parse` + `remark-stringify` — all three already locked as transitive dependencies of `remark-gfm`/`remark-breaks`/`strip-markdown` — so no new npm package was installed.

## Task Commits

Each task was committed atomically:

1. **Task 1: Markdown-enable the library Character form + clean its card preview** - `cedcf4c` (feat)
2. **Task 2: Markdown-enable the library Location form + clean its card preview** - `7879a70` (feat)

_Note: worktree/parallel-execution mode — the plan-completion metadata commit (STATE.md/ROADMAP.md) is owned by the orchestrator after wave merge, not this executor._

## Files Created/Modified
- `src/client/components/Library.jsx` - `GlobalCharacterModal`/`GlobalLocationModal` forms wired to `MarkdownField`; `GlobalCharacterCard`/`GlobalLocationCard` description snippets wired to `stripMarkdown`
- `src/client/components/markdown/stripMarkdown.js` - Rewrote to use `unified`/`remark-parse`/`remark-stringify` (already-locked packages) instead of the unlocked `remark` package

## Decisions Made
- Fixed the missing `remark` dependency by swapping to already-locked `unified`/`remark-parse`/`remark-stringify` packages rather than running `npm install remark` — this avoids introducing a new dependency (and the associated package-legitimacy-checkpoint requirement) for what is functionally identical behavior, since `remark()` is itself just `unified().use(remarkParse).use(remarkStringify)`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stripMarkdown.js's missing `remark` dependency**
- **Found during:** Task 1 (running `npm run build` to verify the library Character form changes)
- **Issue:** `stripMarkdown.js` (created in Plan 02-01) imports `{ remark } from 'remark'`, but the `remark` package was never added to `package.json` or `package-lock.json` — only `remark-gfm`, `remark-breaks`, `strip-markdown`, and `react-markdown` were locked. Because nothing imported `stripMarkdown.js` in Plan 02-01 (confirmed dead code per its own SUMMARY), the bug was latent and the build never exercised the broken import until this plan wired `stripMarkdown` into `Library.jsx`'s two card components. `npm run build` failed with `Rollup failed to resolve import "remark"`.
- **Fix:** Rewrote `stripMarkdown.js` to build its own `unified()` processor from `unified` + `remark-parse` + `remark-stringify` + `strip-markdown` — the same packages that power `remark()` internally — all three of which were already present in `package-lock.json` as transitive dependencies of the already-locked `remark-gfm`/`remark-breaks`/`strip-markdown`. No new npm package was installed.
- **Files modified:** `src/client/components/markdown/stripMarkdown.js`
- **Verification:** `npm run build` exits 0 (660 modules transformed) after the fix; behavior is unchanged since `remark()` is itself a thin wrapper around the same three packages.
- **Committed in:** `cedcf4c` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking bug)
**Impact on plan:** Necessary to make `npm run build` pass at all once `stripMarkdown` was actually wired into card previews. No scope creep — no new dependency, no new UI surface, purely a source-level import fix.

## Issues Encountered

`node_modules` did not exist in this worktree at the start of execution (fresh worktree checkout). Ran `npm ci` to install exactly what `package-lock.json` specifies before the first `npm run build` verification — this is standard setup, not a deviation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `Library.jsx`'s Character and Location forms are fully markdown-enabled; both grid cards show clean stripped snippets.
- `stripMarkdown.js` is now correctly buildable and its fix benefits every future consumer (including Plan 02-03's remaining card-preview sites), not just this plan's two call sites.
- Manual UAT items (D1-D4 in the coverage table above) are `status: unknown` pending human verification per this project's manual-UAT-only convention — the phase-level `gsd-verify-work` pass should exercise these against `npm run dev`.

---
*Phase: 02-markdown-editing-character-location-fields*
*Completed: 2026-07-12*
