---
phase: 02-markdown-editing-character-location-fields
fixed_at: 2026-07-12T12:46:31Z
review_path: .planning/phases/02-markdown-editing-character-location-fields/02-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-07-12T12:46:31Z
**Source review:** .planning/phases/02-markdown-editing-character-location-fields/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (1 Critical, 5 Warning — Info excluded per `fix_scope: critical_warning`)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: "Secrets & Hazards" markdown is edited with a full formatting toolbar but never rendered anywhere it's displayed

**Files modified:** `src/client/components/Library.jsx`, `src/client/components/tabs/Locations.jsx`, `src/client/components/location/AddLocationModal.jsx`
**Commit:** `8cd948f`
**Applied fix:** Routed `secretsAndHazards` through `stripMarkdown` at every display site before splitting into lines: `GlobalLocationCard` in `Library.jsx`, `LocationCard` and `EditLocationModal`'s shared-info panel in `Locations.jsx`, and the "notes" step read-only preview in `AddLocationModal.jsx`. Added the missing `stripMarkdown` import to `AddLocationModal.jsx` (also needed by WR-04, applied in the same file in a later commit).

### WR-01: `MarkdownField`'s `className` prop is applied to the outer wrapper, not the textarea

**Files modified:** `src/client/components/markdown/MarkdownField.jsx`, `src/client/components/character/CharacterModal.jsx`, `src/client/components/Library.jsx`, `src/client/components/tabs/Locations.jsx`, `src/client/components/location/AddLocationModal.jsx`, `src/client/components/character/AddFromLibraryModal.jsx`
**Commit:** `ce4c402`
**Applied fix:** Added a new `textareaClassName` prop to `MarkdownField`, applied to the inner `<textarea>` alongside the fixed `markdown-field-textarea` class. Updated every call site that was previously passing input styling (`inputCls`/`inp`) as the `className` prop to pass it as `textareaClassName` instead, restoring correct padding/border and the amber focus ring on the actual input element.

### WR-02: Session-notes fields lost `autoFocus` when migrated to `MarkdownField`

**Files modified:** `src/client/components/markdown/MarkdownField.jsx` (same commit as WR-01/WR-03), `src/client/components/location/AddLocationModal.jsx`, `src/client/components/character/AddFromLibraryModal.jsx`, `src/client/components/tabs/Locations.jsx`
**Commit:** `ce4c402`
**Applied fix:** Added an `autoFocus` prop to `MarkdownField`, forwarded to the `<textarea>`. Restored the `autoFocus` attribute at all three "Session Notes" call sites that had it before the migration (`AddLocationModal.jsx` notes step, `AddFromLibraryModal.jsx` notes step, `Locations.jsx`'s `EditLocationModal`).

### WR-03: Formatting toolbar stays active while the "Preview" tab is selected

**Files modified:** `src/client/components/markdown/MarkdownField.jsx` (same commit as WR-01/WR-02)
**Commit:** `ce4c402`
**Applied fix:** Added `disabled={activeTab !== 'edit'}` to all four toolbar buttons (Bold, Italic, Heading, Bulleted list) plus `disabled:opacity-40 disabled:cursor-not-allowed` styling, so they can no longer mutate the hidden textarea's selection state while the Preview tab is active.

### WR-04: `AddLocationModal`'s "pick" step shows raw, unstripped markdown in the description snippet

**Files modified:** `src/client/components/location/AddLocationModal.jsx`
**Commit:** `d4b75c4`
**Applied fix:** Wrapped the truncated description preview in the library picker list item with `stripMarkdown(loc.description)`, consistent with every other truncated-description preview in this phase. (The `stripMarkdown` import was already added to this file by the CR-01 fix.)

### WR-05: `stripMarkdown.js` imports undeclared transitive dependencies

**Files modified:** `package.json`
**Commit:** `977c593`
**Applied fix:** Added `remark-parse@^11.0.0`, `remark-stringify@^11.0.0`, and `unified@^11.0.5` as explicit `dependencies`, matching the versions already resolved as transitive dependencies in `package-lock.json`. Versions were confirmed against the lockfile rather than assumed. A subsequent `npm install` will move these from nested/transitive entries to top-level entries in the lockfile — not performed as part of this fix since no network/`node_modules` access was available in the isolated fix worktree.

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-07-12T12:46:31Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
