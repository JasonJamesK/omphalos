# Phase 2: Markdown Editing — Character & Location Fields - Pattern Map

**Mapped:** 2026-07-12
**Files analyzed:** 12 (4 new components/utils + 8 modified usage sites)
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `src/client/components/markdown/MarkdownField.jsx` (new) | component | transform (controlled edit+preview) | `src/client/components/RichTextEditor.jsx` | role-match (toolbar chrome + controlled editor shape; RichTextEditor uses TipTap doc state, MarkdownField uses plain string) |
| `src/client/components/markdown/MarkdownPreview.jsx` (new) | component | transform (render-only) | `src/client/components/RichTextEditor.jsx`'s `EditorContent`/CSS pairing + `.tiptap-editor .ProseMirror` scoped CSS block in `index.css` | role-match |
| `src/client/components/markdown/markdownToolbar.js` (new) | utility | transform (pure functions, DOM manipulation) | none in codebase (no prior plain-text cursor-splice utility) — RICH pattern in RESEARCH.md Pattern 4 is the analog | no-analog (use RESEARCH.md pattern verbatim) |
| `src/client/components/markdown/stripMarkdown.js` (new) | utility | transform | none in codebase | no-analog (use RESEARCH.md `strip-markdown` wrapper) |
| `src/client/components/character/CharacterModal.jsx` (modify) | component (form modal) | CRUD (controlled form) | itself — existing `set(k,v)` helper + `textarea` call sites are the pattern to replace in-place | exact (self) |
| `src/client/components/Library.jsx` (modify — `GlobalCharacterModal` + `GlobalLocationModal` internal forms) | component (form modal) | CRUD | `CharacterModal.jsx` (identical `set()` + `inp`/`lbl` textarea convention) | exact |
| `src/client/components/location/AddLocationModal.jsx` (modify) | component (multi-step form modal) | CRUD | `Library.jsx`'s `GlobalLocationModal` (same field set: description/notes/secretsAndHazards) | exact |
| `src/client/components/tabs/Locations.jsx` (modify — `EditLocationModal`, `LocationCard`) | component (modal + card) | CRUD + read-only display | `CharacterModal.jsx` linked branch (Shared Info box pattern) | role-match |
| `src/client/components/character/AddFromLibraryModal.jsx` (modify — `CharacterPreview`) | component (read-only preview) | transform (display) | `Locations.jsx`'s `LocationCard` truncated-description pattern | role-match |
| `src/client/index.css` (modify — add `.markdown-preview` + `.markdown-field` scoped CSS block) | config/style | n/a | existing `.tiptap-editor .ProseMirror` block (lines 21-46) | exact |
| `package.json` (modify — add 4 deps) | config | n/a | existing `@tiptap/*` dependency block | exact |

## Pattern Assignments

### `src/client/components/markdown/MarkdownField.jsx` (new component)

**Analog:** `src/client/components/RichTextEditor.jsx` (toolbar chrome, container styling) + RESEARCH.md Patterns 1-4 (concrete implementation, already vetted)

**Toolbar button styling** (`RichTextEditor.jsx` lines 4-9):
```jsx
const btnCls = (active) =>
  `px-2 py-1 text-xs rounded transition-colors ${
    active
      ? 'bg-[#d4a574] text-[#161310]'
      : 'bg-[#332922] text-[#f0f0f0] hover:bg-[#40332a]'
  }`
```
Reuse this exact `btnCls` shape for the new insert-syntax toolbar (D-08), but buttons never carry an "active" state (plain-text has no cursor-position formatting state to detect) — likely always render the inactive branch, or drop the boolean and always use the `bg-[#332922]` style.

**Container chrome** (`RichTextEditor.jsx` line 27):
```jsx
<div className={`tiptap-editor border border-[#332922] rounded-lg bg-[#161310] ...`}>
```
Mirror as `markdown-field` wrapper: `border border-[#332922] rounded-lg bg-[#161310]`, with `container-type: inline-size` added per RESEARCH.md Pattern 2.

**Toolbar bar chrome** (`RichTextEditor.jsx` lines 29, 46, 57, 74):
```jsx
<div className="flex flex-wrap gap-1 p-2 border-b border-[#332922] bg-[#211b17] flex-shrink-0">
  ...
  <div className="w-px bg-[#332922] mx-1" /> {/* separator */}
```

**Core edit+preview split-view pattern:** RESEARCH.md "Pattern 2: Native CSS container query for split-view breakpoint" (lines 223-257 of RESEARCH.md) is the authoritative, already-measured implementation — use verbatim, do not re-derive breakpoint value (480px, confirmed against actual modal widths).

**Auto-grow pattern:** RESEARCH.md "Pattern 3: Auto-grow unbounded textarea" (`useAutoGrow` hook, lines 259-282) — use verbatim.

**Toolbar insert/wrap + native-undo preservation:** RESEARCH.md "Pattern 4" (`setNativeTextareaValue`, `wrapSelection`, lines 284-313) — use verbatim; this is the one non-obvious pitfall in this phase (native `input` event dispatch required or Ctrl+Z silently breaks).

**Drop-in replacement contract:** Must accept the same call-site shape as the textareas it replaces — `value`, `onChange` (string, not event) — so `CharacterModal.jsx`'s existing `set(k, v)` helper (`const set = (k, v) => setForm(p => ({ ...p, [k]: v }))`, line 27) needs zero changes, only `<textarea className={inp} ... onChange={e => set('description', e.target.value)} />` swaps to `<MarkdownField value={form.description} onChange={v => set('description', v)} className={inp} />`.

---

### `src/client/components/markdown/MarkdownPreview.jsx` (new component)

**Analog:** RESEARCH.md "Pattern 1: Shared render-only preview component" (lines 179-221) — use verbatim (`ReactMarkdown` + `remarkGfm`/`remarkBreaks`, no `components` overrides, styling via scoped CSS class `.markdown-preview`).

**CSS analog** — mirror the existing `.tiptap-editor .ProseMirror` scoped-CSS convention in `src/client/index.css` lines 21-46:
```css
.tiptap-editor .ProseMirror { outline: none; min-height: 200px; padding: 12px; color: #f0f0f0; line-height: 1.6; }
.tiptap-editor .ProseMirror p { margin: 0 0 8px 0; }
.tiptap-editor .ProseMirror h1 { font-size: 1.5em; font-weight: bold; margin: 16px 0 8px; color: #d4a574; }
```
New `.markdown-preview` block (already drafted in RESEARCH.md lines 206-221) should be appended immediately after this existing block in `index.css`, following the same selector/property-ordering convention (heading colors `#d4a574`, body text `#f0f0f0`/`#d4d4d4`, muted `#999999`, code bg `#332922`).

**Read-only usage sites this component must serve (D-05):**
- `CharacterModal.jsx` linked branch, `personalityTraits` display, line 73: replace `{form.personalityTraits && <p className="text-xs text-[#999999] leading-relaxed">{form.personalityTraits}</p>}` with `<MarkdownPreview value={form.personalityTraits} className="text-xs text-[#999999]" />`
- `Locations.jsx` `EditLocationModal`, `description` display, line 36: replace `{loc.description && <p className="text-sm text-[#d4d4d4] leading-relaxed">{loc.description}</p>}` with `<MarkdownPreview value={loc.description} className="text-sm text-[#d4d4d4]" />`
- **Do NOT touch** `secretsAndHazards` custom bullet renderer at `Locations.jsx` lines 37-44 (D-12 — keep as-is, no `MarkdownPreview`).

---

### `src/client/components/markdown/markdownToolbar.js` (new utility)

**No codebase analog** — this is genuinely new logic. Use RESEARCH.md Pattern 4 verbatim (`setNativeTextareaValue`, `wrapSelection`, lines 295-313). Export as pure functions (no JSX) per RESEARCH.md's recommended project structure (line 170-171): "pure functions: `wrapSelection()`, `insertAtCursor()`, `applyNativeValue()` — no JSX, easily unit-testable".

---

### `src/client/components/markdown/stripMarkdown.js` (new utility)

**No codebase analog.** Use per RESEARCH.md Standard Stack table (line 105): `remark().use(stripMarkdown).processSync(source).toString()`.

**Usage sites (D-13):**
- `src/client/components/tabs/Locations.jsx` `LocationCard`, line 111-115 (truncated `loc.description` snippet — currently raw `.slice(0, 220)`)
- `src/client/components/Library.jsx` `GlobalLocationCard`, line ~140 (`loc.description.slice(0, 200)`)
- `src/client/components/Library.jsx` `GlobalCharacterCard`, line ~433 (`char.description.slice(0, 160)`)
- `src/client/components/character/AddFromLibraryModal.jsx` `CharacterPreview` (lines 22-59) — `personalityTraits`, `flaw`, `description`, `questHooks` fields, compact mode especially (line 145 truncated `loc.description` too, in a different modal, same pattern)

Apply `stripMarkdown()` to the source string before truncation/slicing so markdown syntax characters never appear mid-snippet.

---

### `src/client/components/character/CharacterModal.jsx` (modify)

**Analog:** itself. **Fields to swap textarea → MarkdownField** (unlinked/editable branch only, D-01/D-02):
- Line 183: `Personality Traits` — `<textarea className={inp + ' resize-none'} rows={3} value={form.personalityTraits} onChange={e => set('personalityTraits', e.target.value)} />`
- Line 187: `Flaw` — same shape, `rows={2}`
- Line 194: `Description` — same shape (note: also used for NPC "Flavor Text / Notes" via ternary label, same field)
- Line 227: `Quest Hooks` — same shape, `rows={3}`
- Line 98 (linked branch): `Session Notes` — editable, MarkdownField per D-01 (`SessionNotes` is in scope)
- Line 93 (linked branch): `Inventory` — **stays plain `<textarea>`** per D-01 exclusion, do not touch
- Line 223 (unlinked branch): `Inventory` — **stays plain `<textarea>`**, do not touch

**Read-only swap (D-05):** line 73, `personalityTraits` Shared Info display → `MarkdownPreview` (see above).

**Generic setter pattern to preserve** (line 27):
```jsx
const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
```

---

### `src/client/components/Library.jsx` (modify — two internal forms: `GlobalCharacterModal`, `GlobalLocationModal`)

**Analog:** `CharacterModal.jsx` (identical `set()`/`inp`/`lbl` convention — this file already mirrors that pattern).

**Character form fields to swap** (lines 343, 347, 373, 377): `personalityTraits`, `flaw`, `description`, `questHooks` — same `textarea` shape as `CharacterModal.jsx`.

**Location form fields to swap** (lines 87, 91, 94-area `notes`): `description`, `secretsAndHazards`, `notes` — all three per D-03.

**Read-only card-preview truncation (D-13, use `stripMarkdown`, not `MarkdownPreview`):**
- `GlobalLocationCard` truncated `description` (~line 140)
- `GlobalCharacterCard` truncated `description` (~line 433)

---

### `src/client/components/location/AddLocationModal.jsx` (modify)

**Analog:** `Library.jsx`'s `GlobalLocationModal` (identical field set and default-object shape, line 21: `{ id: locUid(), name: '', type: '', description: '', notes: '', secretsAndHazards: '', imageBase64: null }`).

**Fields to swap:**
- Line 87: create-step `description`
- Line 91: create-step `secretsAndHazards`
- Line 94-area: `notes`
- "Session Notes" field in confirm/link step (per CONTEXT.md line 90) — same MarkdownField treatment for consistency (SessionNotes is in D-01/D-03 scope wherever it's editable)

**Read-only confirm-step display (line 238-242):** `selected.description` and `selected.secretsAndHazards` — per D-05/D-12, `description` → `MarkdownPreview`, `secretsAndHazards` → **keep existing custom bullet split-render** (line 239-242, do not touch).

---

### `src/client/components/tabs/Locations.jsx` (modify — `EditLocationModal`, `LocationCard`)

**Analog:** `CharacterModal.jsx` linked branch (Shared Info read-only box + editable session field, structurally identical pattern).

**`EditLocationModal`:**
- Line 36: `description` → `MarkdownPreview` (D-05)
- Lines 37-44: `secretsAndHazards` → **unchanged**, keep custom `▸`-bullet renderer (D-12)
- Line 48-55: `sessionNotes` textarea → `MarkdownField` (editable, in scope)

**`LocationCard`** (read-only truncated display, D-13 scope — use `stripMarkdown`, not `MarkdownPreview`):
- Line 111-115: truncated `description` (`.slice(0, 220)`)
- Lines 116-128: `secretsAndHazards` hazard lines — **not in D-13's named list explicitly but structurally identical to the kept-as-is `EditLocationModal` renderer** — leave unchanged, same reasoning as D-12 (bullet-per-line display, not prose truncation)
- Lines 129-134: `sessionNotes` plain display — **not named in D-01/D-03/D-05/D-13 scope for this card**; leave as raw text unless CONTEXT.md's `SessionNotes` markdown scope is read to include card previews too — flag for planner confirmation, default to leaving untouched (no decision covers session-notes card-preview rendering)

---

### `src/client/components/character/AddFromLibraryModal.jsx` (modify — `CharacterPreview`)

**Analog:** `Locations.jsx`'s `LocationCard` truncated-description pattern (same "short read-only prose snippet outside D-05 scope" classification).

**Fields (D-13, `stripMarkdown`):** lines 56-59, `personalityTraits`, `flaw`, `description`, `questHooks` inside `CharacterPreview` — both `compact` and full-detail render modes (lines 150, 174 call sites).

**Session Notes field (line 181):** editable textarea for the linking session-notes field — swap to `MarkdownField` per D-01 in-scope `SessionNotes`.

---

## Shared Patterns

### Dark-theme scoped CSS convention
**Source:** `src/client/index.css` lines 21-46 (`.tiptap-editor .ProseMirror` block)
**Apply to:** `MarkdownPreview.jsx`'s `.markdown-preview` CSS block — append immediately after the existing TipTap block, same selector-per-element style, same color tokens (`#d4a574` headings, `#f0f0f0`/`#d4d4d4` body, `#999999` muted, `#332922` code bg).
```css
.tiptap-editor .ProseMirror h1 { font-size: 1.5em; font-weight: bold; margin: 16px 0 8px; color: #d4a574; }
.tiptap-editor .ProseMirror strong { font-weight: 700; color: #f0f0f0; }
.tiptap-editor .ProseMirror em { font-style: italic; color: #d4d4d4; }
```

### Toolbar button chrome
**Source:** `src/client/components/RichTextEditor.jsx` lines 4-9, 29-91
**Apply to:** `MarkdownField.jsx`'s insert-syntax toolbar (D-08) — reuse `btnCls` shape and `w-px bg-[#332922] mx-1` separator convention exactly.

### Generic form-field setter
**Source:** `src/client/components/character/CharacterModal.jsx` line 27, mirrored in `Library.jsx` and `AddLocationModal.jsx`
```jsx
const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
```
**Apply to:** All `MarkdownField` call sites — component must accept `(value, onChange(value: string))` so it's a drop-in replacement requiring zero changes to this setter pattern.

### Local Tailwind class aliases
**Source:** `inp`/`lbl` (`CharacterModal.jsx` lines 14-15), `inputCls`/`labelCls` (`Locations.jsx` lines 6-7, `AddLocationModal.jsx`, `Library.jsx`)
**Apply to:** `MarkdownField` should accept a `className` prop rather than hardcoding input styling, so each call site's existing `inp`/`inputCls` alias can still be passed through for border/bg/text consistency.

### Linked-vs-unlinked / shared-info read-only pattern
**Source:** `CharacterModal.jsx` lines 42-111 (`isLinked` branch), `Locations.jsx` `EditLocationModal` lines 10-70
**Apply to:** Both call sites already isolate "read-only Shared Info box" vs. "editable Session Fields" — `MarkdownPreview` slots into the read-only box, `MarkdownField` slots into the editable section, with zero structural changes to the branch logic itself.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/client/components/markdown/markdownToolbar.js` | utility | transform | No prior plain-text cursor/selection-splice utility exists in the codebase — RichTextEditor manipulates a TipTap editor instance, not raw textarea DOM. Use RESEARCH.md Pattern 4 (native-value-setter + `dispatchEvent`) verbatim; this is a well-documented external pattern, not derived from existing code. |
| `src/client/components/markdown/stripMarkdown.js` | utility | transform | No prior markdown-stripping logic exists (markdown itself is new to this codebase this phase). Use RESEARCH.md's `remark().use(stripMarkdown)` wrapper verbatim. |

## Metadata

**Analog search scope:** `src/client/components/` (all subdirectories), `src/client/index.css`, `package.json`
**Files scanned:** `RichTextEditor.jsx`, `CharacterModal.jsx`, `Library.jsx`, `AddLocationModal.jsx`, `tabs/Locations.jsx`, `AddFromLibraryModal.jsx`, `index.css`, `package.json`
**Pattern extraction date:** 2026-07-12
