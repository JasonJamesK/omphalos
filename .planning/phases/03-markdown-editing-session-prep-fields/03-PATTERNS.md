# Phase 3: Markdown Editing — Session Prep Fields - Pattern Map

**Mapped:** 2026-07-13
**Files analyzed:** 5 (4 modified call-site files + 1 optionally-modified component)
**Analogs found:** 5 / 5 (all analogs are within-repo, most are the phase's own pre-swap code — this is a pure textarea→component swap, no cross-module analog needed)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `src/client/components/tabs/SessionPrep.jsx` | component (top-level form field) | request-response (local state → dispatch → PUT) | `src/client/components/character/CharacterModal.jsx` (Phase 2 `MarkdownField` call site) | exact — identical `value`/`onChange` contract, same top-level full-width usage |
| `src/client/components/session/blocks/NotesBlock.jsx` | component (nested block field) | request-response | `CharacterModal.jsx` lines 185-186 (`textareaClassName={inp}` pattern) / self (pre-swap textarea) | exact — direct drop-in, no styling wrapper needed |
| `src/client/components/session/blocks/CalloutBlock.jsx` | component (nested block field, custom chrome wrapper) | request-response | self (pre-swap textarea, colored-border wrapper) + `MarkdownField.jsx` (for optional `bare` prop precedent) | role-match — no existing colored-wrapper + MarkdownField combo exists yet in codebase; this phase establishes it |
| `src/client/components/session/blocks/LootBlock.jsx` | component (repeatable list item field) + list-key correctness fix | request-response (list CRUD: add/update/remove) | `SessionPrep.jsx`'s own `phaseUid()` / `PhaseCard.jsx`'s `blockUid()` (id-generator convention) | exact — same uid-generator pattern, same list add/update/remove shape |
| `src/client/components/markdown/MarkdownField.jsx` | component (shared, optionally extended) | request-response (controlled input) | n/a — this is the analog source itself; only touched if `bare` prop becomes necessary | exact — self, additive-only change |

## Pattern Assignments

### `src/client/components/tabs/SessionPrep.jsx` (component, request-response)

**Analog:** `src/client/components/character/CharacterModal.jsx` (Phase 2 shipped call site) + this file's own current textarea (lines 51-60)

**Current code to replace** (`SessionPrep.jsx` lines 1-2, 30-32, 51-60):
```jsx
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import PhaseCard from '../session/PhaseCard'
// ...
function updateOverview(e) {
  updatePrep({ ...prep, overview: e.target.value })
}
// ...
<div>
  <h2 className="text-sm font-semibold text-[#d4a574] uppercase tracking-wider mb-2">Adventure Overview & Hook</h2>
  <textarea
    className={inp}
    rows={4}
    value={prep.overview}
    onChange={updateOverview}
    placeholder="The setup, the hook that draws the party in, who wants what..."
  />
</div>
```

**Analog import pattern** (`CharacterModal.jsx` line 8):
```jsx
import MarkdownField from '../markdown/MarkdownField'
```
(from `src/client/components/tabs/`, the relative path is `../markdown/MarkdownField`)

**Analog call pattern** (`CharacterModal.jsx` line 100):
```jsx
<MarkdownField value={form.sessionNotes || ''} onChange={v => set('sessionNotes', v || null)} placeholder="Notes specific to this session — what happened, status changes, etc." />
```

**Target replacement:**
```jsx
function updateOverview(v) {
  updatePrep({ ...prep, overview: v })
}
// ...
<div>
  <h2 className="text-sm font-semibold text-[#d4a574] uppercase tracking-wider mb-2">Adventure Overview & Hook</h2>
  <MarkdownField
    value={prep.overview}
    onChange={updateOverview}
    placeholder="The setup, the hook that draws the party in, who wants what..."
  />
</div>
```

**Note:** `MarkdownField`'s `onChange` passes the raw string, not an event — the one call-shape change at every site (`e.target.value` → `v`). The `inp` constant on line 5 stays (still used elsewhere) but is no longer referenced by the overview field.

---

### `src/client/components/session/blocks/NotesBlock.jsx` (component, request-response)

**Analog:** self (pre-swap), pattern already proven at `CharacterModal.jsx` lines 185-186 (single-field block, no extra chrome)

**Current code (full file, 14 lines):**
```jsx
const inp = 'w-full bg-[#161310] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574] resize-none'

export default function NotesBlock({ block, onChange }) {
  return (
    <textarea
      className={inp}
      rows={3}
      value={block.body || ''}
      onChange={e => onChange({ ...block, body: e.target.value })}
      placeholder="DM notes, mechanics, reminders..."
    />
  )
}
```

**Target replacement:**
```jsx
import MarkdownField from '../../markdown/MarkdownField'

export default function NotesBlock({ block, onChange }) {
  return (
    <MarkdownField
      value={block.body}
      onChange={v => onChange({ ...block, body: v })}
      placeholder="DM notes, mechanics, reminders..."
    />
  )
}
```
`inp` constant becomes unused and can be removed from this file (not used by `MarkdownField`'s default chrome).

---

### `src/client/components/session/blocks/CalloutBlock.jsx` (component, request-response, custom wrapper)

**Analog:** self (pre-swap, lines 1-38) — colored-left-border wrapper is unique to this file; no other codebase file combines a semantic-color wrapper `<div>` with `MarkdownField`. This phase establishes the pattern per `03-UI-SPEC.md` D-05.

**Current code (full file):**
```jsx
const inp = 'w-full bg-[#161310] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574]'

const VARIANTS = {
  flavor: { label: 'Flavor Text', icon: '📜', color: '#d4a574' },
  readAloud: { label: 'Read-Aloud', icon: '🔊', color: '#6b8e6b' },
}

export default function CalloutBlock({ block, onChange }) {
  const v = VARIANTS[block.variant] || VARIANTS.flavor

  return (
    <div className="rounded p-3" style={{ backgroundColor: '#161310', borderLeft: `3px solid ${v.color}` }}>
      <div className="flex items-center gap-2 mb-2">
        <select
          className="bg-[#211b17] border border-[#332922] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none"
          value={block.variant || 'flavor'}
          onChange={e => onChange({ ...block, variant: e.target.value })}
        >
          <option value="flavor">📜 Flavor Text</option>
          <option value="readAloud">🔊 Read-Aloud</option>
        </select>
        <input
          className={inp + ' flex-1 text-sm py-1.5'}
          value={block.title || ''}
          onChange={e => onChange({ ...block, title: e.target.value })}
          placeholder={`${v.label} title...`}
        />
      </div>
      <textarea
        className={inp + ' resize-none italic'}
        rows={4}
        value={block.body || ''}
        onChange={e => onChange({ ...block, body: e.target.value })}
        placeholder="Read this out loud to your players..."
      />
    </div>
  )
}
```

**Target replacement (D-05 Option A, per 03-UI-SPEC.md — drop forced italic, keep outer border wrapper, `MarkdownField` default chrome unchanged first):**
```jsx
import MarkdownField from '../../markdown/MarkdownField'

// ... VARIANTS unchanged ...

export default function CalloutBlock({ block, onChange }) {
  const v = VARIANTS[block.variant] || VARIANTS.flavor

  return (
    <div className="rounded p-3" style={{ backgroundColor: '#161310', borderLeft: `3px solid ${v.color}` }}>
      <div className="flex items-center gap-2 mb-2">
        {/* select + title input unchanged */}
      </div>
      <MarkdownField
        value={block.body}
        onChange={v => onChange({ ...block, body: v })}
        placeholder="Read this out loud to your players..."
      />
    </div>
  )
}
```
Note the `italic` class from the old textarea (` resize-none italic`) is dropped entirely, not ported to `textareaClassName` — see Shared Patterns below for the reasoning and the contingent `bare` prop.

---

### `src/client/components/session/blocks/LootBlock.jsx` (component, request-response, list CRUD + key-stability fix)

**Analog for id-generator convention:** `src/client/components/tabs/SessionPrep.jsx` line 7 (`phaseUid()`) and `src/client/components/session/PhaseCard.jsx` line 18 (`blockUid()`)

**Id-generator pattern to copy (`PhaseCard.jsx` line 18):**
```jsx
function blockUid() { return `block-${Date.now()}-${Math.random().toString(36).slice(2)}` }
```

**Current code (full file, 45 lines) — includes the `key={i}` bug to fix:**
```jsx
const inp = 'w-full bg-[#161310] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574] resize-none'

export default function LootBlock({ block, onChange }) {
  const items = block.items || []

  const addItem = () => onChange({ ...block, items: [...items, { name: '', description: '' }] })
  const updateItem = (i, k, v) => {
    const arr = [...items]; arr[i] = { ...arr[i], [k]: v }
    onChange({ ...block, items: arr })
  }
  const removeItem = i => onChange({ ...block, items: items.filter((_, j) => j !== i) })

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#999999] uppercase tracking-wide">Loot Pool</span>
        <button onClick={addItem} className="text-xs text-[#d4a574] hover:underline">+ Add Item</button>
      </div>
      {items.length === 0 && <p className="text-xs text-[#666] py-1">No loot yet.</p>}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="bg-[#161310] rounded p-2 flex gap-2">
            <div className="flex-1 space-y-1.5">
              <input
                className={inp + ' py-1.5 text-sm font-medium'}
                value={item.name}
                onChange={e => updateItem(i, 'name', e.target.value)}
                placeholder="Item name..."
              />
              <textarea
                className={inp + ' text-xs'}
                rows={2}
                value={item.description}
                onChange={e => updateItem(i, 'description', e.target.value)}
                placeholder="Description, mechanics..."
              />
            </div>
            <button onClick={() => removeItem(i)} className="text-[#b24545] hover:text-[#922b2b] px-1 text-sm self-start">×</button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Target replacement (id + key fix, `name` input stays plain, `description` becomes `MarkdownField`):**
```jsx
import MarkdownField from '../../markdown/MarkdownField'

function itemUid() { return `item-${Date.now()}-${Math.random().toString(36).slice(2)}` }

export default function LootBlock({ block, onChange }) {
  const items = block.items || []

  const addItem = () => onChange({ ...block, items: [...items, { id: itemUid(), name: '', description: '' }] })
  const updateItem = (i, k, v) => {
    const arr = [...items]; arr[i] = { ...arr[i], [k]: v }
    onChange({ ...block, items: arr })
  }
  const removeItem = i => onChange({ ...block, items: items.filter((_, j) => j !== i) })

  return (
    <div>
      {/* header unchanged */}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={item.id ?? i} className="bg-[#161310] rounded p-2 flex gap-2">
            <div className="flex-1 space-y-1.5">
              <input
                className={inp + ' py-1.5 text-sm font-medium'}
                value={item.name}
                onChange={e => updateItem(i, 'name', e.target.value)}
                placeholder="Item name..."
              />
              <MarkdownField
                value={item.description}
                onChange={v => updateItem(i, 'description', v)}
                placeholder="Description, mechanics..."
              />
            </div>
            <button onClick={() => removeItem(i)} className="text-[#b24545] hover:text-[#922b2b] px-1 text-sm self-start">×</button>
          </div>
        ))}
      </div>
    </div>
  )
}
```
`item.name` `<input>` is unchanged — only `description` swaps to `MarkdownField`. `key={item.id ?? i}` keeps pre-existing persisted items (no `id`) working via index fallback; no data migration needed.

---

### `src/client/components/markdown/MarkdownField.jsx` (component, controlled input — contingent change only)

**Analog:** self — current shipped version (`03-RESEARCH.md`/`03-UI-SPEC.md` Pattern 3 / D-05 §4)

**Current signature (line 18):**
```jsx
export default function MarkdownField({ value, onChange, className = '', textareaClassName = '', placeholder = '', autoFocus = false }) {
```

**Current outer wrapper (line 24):**
```jsx
<div className={`markdown-field border border-[#332922] rounded-lg bg-[#161310] ${className}`}>
```

**Contingent additive change (only if visual QA during execution finds Callout's nested-border look cluttered — build without this first):**
```jsx
export default function MarkdownField({ value, onChange, className = '', textareaClassName = '', placeholder = '', autoFocus = false, bare = false }) {
  // ...
  return (
    <div className={`markdown-field ${bare ? '' : 'border border-[#332922] rounded-lg'} bg-[#161310] ${className}`}>
```
Only `CalloutBlock.jsx` would pass `bare`; every other call site (unchanged, `bare` defaults `false`) stays pixel-identical.

## Shared Patterns

### `MarkdownField` import path convention
**Source:** `src/client/components/character/CharacterModal.jsx` line 8, `src/client/components/location/AddLocationModal.jsx` (Phase 2 sites)
**Apply to:** all 4 new call sites
- From `src/client/components/tabs/SessionPrep.jsx`: `import MarkdownField from '../markdown/MarkdownField'`
- From `src/client/components/session/blocks/*.jsx`: `import MarkdownField from '../../markdown/MarkdownField'`

### `onChange` call-shape change (event → raw string)
**Source:** `MarkdownField.jsx` line 64 (`onChange={e => onChange(e.target.value)}` internally — the component already unwraps the event)
**Apply to:** all 4 call sites — every existing `onChange={e => setX({ ...x, field: e.target.value })}` becomes `onChange={v => setX({ ...x, field: v })}`.

### Uid-generator convention (Loot item id fix)
**Source:** `src/client/components/tabs/SessionPrep.jsx` line 7 (`phaseUid()`), `src/client/components/session/PhaseCard.jsx` line 18 (`blockUid()`)
**Apply to:** `LootBlock.jsx` — add `itemUid()` following the identical `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}` template; do not introduce a UUID library or any other id scheme.

### Persistence flow (unchanged, no new work)
**Source:** `SessionPrep.jsx`'s `updatePrep()` (line 26-28) → `dispatch({ type: 'UPDATE_SESSION', payload: { ...activeSession, prepData: newPrep } })`
**Apply to:** all 4 fields — none of this phase's edits touch this call; `MarkdownField`'s `onChange` plugs directly into the existing `onChange({ ...block, field: v })` / `updatePrep({ ...prep, overview: v })` local-state functions already in place. No changes to `AppContext.jsx`'s `dispatchWithPersist` gating.

### Expand-gated mounting (bounds live `MarkdownField` instance count)
**Source:** `PhaseCard.jsx` line 83 (`{expanded && (...)}`)
**Apply to:** informational only — confirms `NotesBlock`/`CalloutBlock`/`LootBlock`'s new `MarkdownField` instances are only mounted while their parent phase is expanded; no code change needed, just confirms no special unmount handling is required.

## No Analog Found

None — every file in scope is a direct textarea→`MarkdownField` swap of code already fully read above, and the `MarkdownField`/`MarkdownPreview`/`markdownToolbar.js` component trio (the only nontrivial "new" surface, and only conditionally touched) was already built and shipped in Phase 2. This phase introduces no genuinely new pattern that lacks a same-repo precedent — even the Callout colored-wrapper + `MarkdownField` combination is fully specified by `03-UI-SPEC.md` D-05, just not yet built.

## Metadata

**Analog search scope:** `src/client/components/tabs/`, `src/client/components/session/`, `src/client/components/session/blocks/`, `src/client/components/markdown/`, `src/client/components/character/CharacterModal.jsx` (Phase 2 reference), `src/client/components/location/AddLocationModal.jsx` (Phase 2 reference, path-checked only)
**Files scanned:** 8 (SessionPrep.jsx, NotesBlock.jsx, CalloutBlock.jsx, LootBlock.jsx, PhaseCard.jsx, MarkdownField.jsx, MarkdownPreview.jsx grep-checked, CharacterModal.jsx)
**Pattern extraction date:** 2026-07-13
