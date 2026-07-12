---
phase: 02-markdown-editing-character-location-fields
plan: 04
subsystem: ui
tags: [react, textarea, undo, markdown, dom-api]

# Dependency graph
requires:
  - phase: 02-markdown-editing-character-location-fields (Plan 02-01)
    provides: markdownToolbar.js, MarkdownField.jsx, and their call sites (Bold/Italic/Heading/Bulleted-list)
provides:
  - "markdownToolbar.js rewritten to mutate the textarea via textarea.setRangeText(...) instead of the native value-property setter, so toolbar insertions are recorded on the browser's native undo (Ctrl+Z) stack as discrete steps"
  - "02-RESEARCH.md Pattern 4 / Pitfall 1 / Anti-Patterns / Deprecated-note corrected so the undo-preservation rationale is factually accurate for future readers (Phase 3 MarkdownField reuse)"
affects: [phase-3-session-prep-markdown, markdown-field-reuse]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Textarea toolbar mutations use textarea.setRangeText(replacement, start, end, 'preserve') routed through applyRangeEdit, followed by a synthetic input event dispatch solely to keep React's controlled value in sync — setRangeText is undo-tracked, the input event is not what preserves undo"

key-files:
  created: []
  modified:
    - src/client/components/markdown/markdownToolbar.js
    - .planning/phases/02-markdown-editing-character-location-fields/02-RESEARCH.md

key-decisions:
  - "Replaced setNativeTextareaValue (native value-property setter + dispatchEvent) with a new applyRangeEdit helper built on textarea.setRangeText, per the confirmed root cause in .planning/debug/DEBUG-markdown-toolbar-undo.md"
  - "Kept the synthetic input event dispatch after setRangeText — it does not restore undo by itself, but it is still required so React's controlled onChange fires and form state stays in sync"
  - "Corrected 02-RESEARCH.md in place with dated correction markers rather than silently rewriting history, so the mistake and its debugging trail stay auditable"

patterns-established:
  - "applyRangeEdit(textarea, start, end, replacement, selectionStart, selectionEnd): focus -> setRangeText -> dispatch input -> rAF caret restore. Reusable shape for any future textarea toolbar mutation in this codebase."

requirements-completed: [MDED-03, MDED-04]

coverage:
  - id: D1
    description: "Markdown toolbar buttons (Bold/Italic/Heading/Bulleted-list) mutate the textarea via setRangeText so each insertion is a discrete, Ctrl+Z-undoable step, while React's controlled onChange still fires and caret/selection restore to the same positions as before"
    requirement: "MDED-03"
    verification:
      - kind: other
        ref: "npm run build (vite build) — exits 0, confirms no syntax/type errors and unchanged call-site contract with MarkdownField.jsx"
        status: pass
    human_judgment: true
    rationale: "Native Ctrl+Z undo-stack behavior cannot be exercised in jsdom/automation (confirmed in the DEBUG session that diagnosed this exact gap) — only a real browser with real keyboard input can confirm the undo fix, matching UAT Test 3's original failure mode."
  - id: D2
    description: "02-RESEARCH.md's Pattern 4 / Pitfall 1 / Anti-Patterns / Deprecated-note sections corrected to state setRangeText (not the native value-setter + dispatchEvent) as the undo-preserving mechanism, with dated correction markers"
    requirement: "MDED-04"
    verification:
      - kind: other
        ref: "grep -n setRangeText .planning/phases/02-markdown-editing-character-location-fields/02-RESEARCH.md — 7 matches across Pattern 4, Anti-Patterns, Pitfall 1, Deprecated/outdated"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-12
status: complete
---

# Phase 2 Plan 04: Markdown Toolbar Undo Fix Summary

**Replaced the markdown toolbar's undo-breaking native-value-setter mutation with `textarea.setRangeText(...)`, and corrected the research doc's factually-wrong undo-preservation rationale so Phase 3's `MarkdownField` reuse can't reintroduce the bug.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-12T14:03:00Z
- **Completed:** 2026-07-12T14:23:05Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `markdownToolbar.js`'s `wrapSelection`/`insertAtCursor` now mutate the textarea through a new `applyRangeEdit` helper built on `textarea.setRangeText(...)`, so every toolbar-triggered insertion is recorded on the browser's native undo stack as a discrete, undoable step (closes UAT Test 3).
- Removed `setNativeTextareaValue` entirely — no code path in the module assigns `.value` wholesale anymore; a synthetic `input` event is still dispatched after the edit purely to keep React's controlled `onChange` in sync.
- Corrected `02-RESEARCH.md`'s Pattern 4, Anti-Patterns list, Pitfall 1, and the "Deprecated/outdated" State-of-the-Art note so they no longer claim the native value-setter + `dispatchEvent` pattern preserves native undo — each now documents `setRangeText` as the real undo-preserving mechanism, with dated correction markers referencing the debug session.

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace the native-value-setter toolbar mutation with undo-preserving setRangeText** - `527a4ad` (fix)
2. **Task 2: Correct the undo-preservation rationale in 02-RESEARCH.md** - `d3cba1f` (docs)

**Plan metadata:** (pending — this SUMMARY commit)

## Files Created/Modified
- `src/client/components/markdown/markdownToolbar.js` — `setNativeTextareaValue` removed; new `applyRangeEdit(textarea, start, end, replacement, selectionStart, selectionEnd)` helper mutates via `textarea.setRangeText(replacement, start, end, 'preserve')`, dispatches a synthetic `input` event for React sync, and restores the caret/selection in a `requestAnimationFrame`. `wrapSelection`/`insertAtCursor` public signatures and selection-restore semantics unchanged; `MarkdownField.jsx` was not touched.
- `.planning/phases/02-markdown-editing-character-location-fields/02-RESEARCH.md` — Pattern 4's "Why it matters" and code example rewritten to the `setRangeText`-based fix, with a dated `Correction (2026-07-12)` note; Anti-Patterns list gained an explicit entry flagging the native-setter pattern as broken; Pitfall 1's "Why it happens"/"How to avoid"/"Warning signs" corrected; the "Deprecated/outdated" State-of-the-Art note corrected to point at `setRangeText` instead of endorsing the native setter.

## Decisions Made
- Used `textarea.setRangeText(replacement, start, end, 'preserve')` (the non-deprecated, browser-native, undo-tracked API) rather than the formally-deprecated `document.execCommand('insertText', ...)`, matching the plan's explicit direction and the corrected research rationale.
- Kept the post-edit synthetic `input` dispatch — it is not what fixes undo, but removing it would break React's controlled-value sync (`onChange` stops firing), so it stays as a React-sync-only step, now documented as such in both the code comment and the research doc.
- Left `MarkdownField.jsx` and all Phase 2 call sites (02-01/02/03) completely untouched — the fix is fully contained in `markdownToolbar.js`'s internal mutation mechanism, so it applies uniformly to every existing `MarkdownField` instance with no call-site changes needed.

## Deviations from Plan

None — plan executed exactly as written. Both tasks matched their `<action>` specs precisely: `applyRangeEdit`'s signature, guard, focus/setRangeText/dispatch/rAF sequence, and the `wrapSelection`/`insertAtCursor` call shapes all match the plan's `<action>` text verbatim. The research doc corrections were scoped exactly to Pattern 4, the Anti-Patterns list, Pitfall 1, and the Deprecated/outdated note — `git diff --stat` confirms no other sections of `02-RESEARCH.md` were touched.

## Issues Encountered

None. `npm run build` (vite build) exited 0 on the first attempt after Task 1's rewrite; `grep setRangeText 02-RESEARCH.md` returned matches after Task 2's edits.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The single remaining UAT gap for Phase 2 (UAT Test 3 — toolbar buttons breaking Ctrl+Z) is now code-complete pending the real-browser human-check documented in this plan's `<verify>` block (native undo-stack behavior cannot be exercised in jsdom/automation, per the DEBUG session that diagnosed this gap).
- `02-RESEARCH.md`'s corrected Pattern 4/Pitfall 1 rationale is now safe for Phase 3 to read when it reuses `MarkdownField` (MDED-09 groundwork) — the broken native-value-setter pattern will not be reintroduced on a mistaken belief that it preserves undo.
- Recommend the orchestrator/user perform the real-browser Ctrl+Z check (Bold/Italic/Heading/Bulleted-list, each followed by more typing then Ctrl+Z) before marking Phase 2's UAT Test 3 as passed in `02-UAT.md`.

---
*Phase: 02-markdown-editing-character-location-fields*
*Completed: 2026-07-12*
