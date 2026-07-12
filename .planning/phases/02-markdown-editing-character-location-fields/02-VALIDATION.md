---
phase: 2
slug: markdown-editing-character-location-fields
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no frontend test runner exists in this repo (`package.json` has no `test` script, no `vitest`/`jest` devDependency, no `*.test.jsx` files anywhere in `src/client/`). The only automated tests in the repo are backend xUnit (`Omphalos.UnitTests`/`Omphalos.IntegrationTests`), which this phase does not touch. |
| **Config file** | none |
| **Quick run command** | n/a — see Manual-Only Verifications below |
| **Full suite command** | n/a |
| **Estimated runtime** | n/a |

This phase is 100% frontend UI/rendering work with no backend surface. Matching Phase 1's established closure pattern (`test(01): confirm UAT — all 4 human-verification items pass`), this phase is verified through conversational UAT via `gsd-verify-work` rather than introducing new frontend test tooling for a single isolated component addition.

---

## Sampling Rate

- **After every task commit:** Manual smoke check in the dev server (`npm run dev`) — type sample markdown into one Character field and one Location field, confirm the preview renders and the field grows.
- **After every plan wave:** Re-verify the full D-01/D-03 field list (Description, SessionNotes, PersonalityTraits, Flaw, QuestHooks for characters; Description, Notes, SecretsAndHazards for locations) across every named usage site (`CharacterModal.jsx`, `Library.jsx`'s two internal forms, `AddLocationModal.jsx`, `Locations.jsx`, `AddFromLibraryModal.jsx`).
- **Before `/gsd-verify-work`:** All 4 phase success criteria (ROADMAP.md) and the two flagged pitfalls below (toolbar undo, hazards rendering) must be manually confirmed.
- **Max feedback latency:** n/a — no automated suite; feedback is the dev-server smoke check above, effectively immediate (HMR).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-* | 01 | 1 | MDED-03, MDED-04, MDED-05, MDED-06, MDED-07, MDED-08 | — | react-markdown default AST→React rendering, no `dangerouslySetInnerHTML`, no `rehype-raw` | manual (visual) | n/a — UAT | ❌ (no test infra) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

No automated command exists for any task in this phase — every row above is manual-only by design (see Test Infrastructure). This is a deliberate, documented choice, not a gap.

---

## Wave 0 Requirements

*None — existing project convention (established in Phase 1) covers this phase's verification needs via conversational UAT. No frontend test framework install is required for Phase 2.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Markdown renders live in edit+preview for all D-01/D-03 fields, styled to the dark theme | MDED-03, MDED-04, MDED-08 | No frontend test runner exists; this is inherently visual | Open each usage site (CharacterModal, Library ×2 forms, AddLocationModal, Locations tab, AddFromLibraryModal), type headings/lists/bold/italic/blockquote/code into each target field, confirm the preview pane renders styled output matching the dark theme (amber headings, readable body text, styled code/blockquote). |
| Side-by-side vs. tab-toggle switches per container width, not viewport width | MDED-05 | Requires resizing/observing layout across multiple fixed-width modals | Open `CharacterModal.jsx` (720px modal, ~330px effective field width for prose fields) and confirm tab-toggle mode. Open `AddLocationModal.jsx`/`Library.jsx` location form (~540px effective width) and confirm side-by-side mode. Resizing the browser window alone must NOT change either — the switch is container-driven. |
| Existing plain-text content with literal line breaks renders without collapsing into a run-on paragraph | MDED-06 | Visual regression check against old-format data | Seed or find an existing character/location record with plain-text content typed using single Enter presses between lines (no markdown). Confirm each line break renders as a visible line break (`<br>`) in the preview, not collapsed into one paragraph. |
| Field auto-grows unbounded with content, no internal scrollbar | MDED-07 | Visual, requires typing long content | Type several paragraphs of long content into a markdown field. Confirm the field's height grows without a max-height cap or internal scrollbar (the containing modal scrolls instead). |
| **Toolbar buttons preserve native Ctrl+Z undo** (Pitfall 1, D-08) | D-08 | Native browser undo-stack behavior is not visible through any static check — must be exercised live | Click a toolbar button (e.g. Bold) to wrap/insert markdown syntax, type a few more characters, then press Ctrl+Z. Confirm the toolbar's insertion is undoable as a discrete step (not skipped, not jumping back further than expected). Repeat for each toolbar button. |
| **`SecretsAndHazards` read-only view keeps its current bullet-per-line rendering, unaffected by the D-05 markdown change to Description/Notes** (D-12) | D-12 | Visual regression on an adjacent, easily-conflated field | Open a linked location's read-only "Shared Info" / `EditLocationModal` view. Confirm `SecretsAndHazards` still renders as a `▸`-per-line bulleted list (unchanged), while `Description`/`Notes` in the same view now render as styled markdown. |
| Card-preview snippets show clean plain text (no literal `**`/`#`/`-`), including correct handling of non-syntax characters | D-13 | Visual + requires a specific edge-case input | In a Location/Character with markdown in its Description (e.g. `**bold** text` and, separately, a name containing `C#` mid-sentence), confirm the truncated card preview (Locations tab, Library grids) shows clean text with no literal `**`/`#` markup clutter, AND that a genuine non-heading `#` (e.g. "C# is great") is NOT stripped. |

---

## Validation Sign-Off

- [x] All tasks have manual UAT verification defined above (no `<automated>` verify exists in this phase by design)
- [x] Sampling continuity: n/a — no automated suite; every task is manual by design, documented above
- [x] Wave 0 covers all MISSING references — none required (see Wave 0 Requirements)
- [x] No watch-mode flags — n/a, no test runner
- [x] Feedback latency < n/a — dev-server HMR is effectively immediate for manual checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-12 (manual-UAT-only strategy, consistent with Phase 1 precedent and this phase's 100%-frontend, no-backend-surface scope)
