# Phase 3: Markdown Editing — Session Prep Fields - Research

**Researched:** 2026-07-13
**Domain:** Wiring an already-built, already-shipped React component (`MarkdownField`) into 4 new call sites in a page-width (not modal-width) layout, plus two open styling-integration questions. No new packages, no new backend surface, no new markdown stack decisions.
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `Overview & Hook` (`SessionPrep.jsx`, `prep.overview`) gets the standard `MarkdownField` — same top-level, full-width treatment as the Phase 2 modal forms.
- **D-02:** `Notes` block (`body`) and `Callout` block (`body`) get `MarkdownField`.
- **D-03:** `Loot` block gets `MarkdownField` on `items[].description` only. `items[].name` stays a plain single-line `<input>` — matches the Phase 2 precedent of excluding label/single-line fields (e.g. `Inventory` stayed plain text) from markdown treatment. Confirmed by the user, not left to discretion.
- **Out of scope by domain, not asked:** `LocationsBlock` (no prose field), `RandomTableBlock` (`title` is single-line like Phase 2's excluded fields; row/column cells are short structured data, not prose), `PhaseCard`'s own `title`/`summary` inputs.

### Claude's Discretion

- **Block chrome density (D-04):** Whether Notes/Callout/Loot's `MarkdownField` instances use the exact same full chrome (toolbar row + Edit/Preview tabs) as Overview & Hook, or a more compact variant sized for the smaller, repeatable, nested block UI. User explicitly delegated — default assumption is full chrome (same component, zero divergence) unless it visibly overwhelms the block layout once built; a compact skin sharing the same underlying render/toolbar logic is acceptable if needed.
- **Callout visual identity integration (D-05):** How `MarkdownField`'s own chrome (dark border/background, toolbar bar) combines with `CalloutBlock`'s existing visual identity (italic body text, colored left border — amber for Flavor Text, green for Read-Aloud). User explicitly delegated. Two integration directions were discussed as options, either is acceptable: (a) the callout's colored-left-border box stays the outer chrome and `MarkdownField` sits inside without its own border, with forced-italic dropped since the DM can now type `*italics*` explicitly; or (b) `MarkdownField` keeps its full standard look and the colored-variant accent moves to a label/header strip above it. Whichever is chosen, the Flavor Text vs. Read-Aloud color distinction must remain visually clear.
- Whether the Loot `description` field's `MarkdownField` instance shares the same discretionary compact/full chrome resolution as Notes/Callout (D-04) — it's a block-level prose field like the others, so should follow whatever chrome-density decision is made for blocks generally, not be treated as a fourth special case.

### Deferred Ideas (OUT OF SCOPE)

None raised — discussion stayed within phase scope. No pending todos matched this phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MDED-01 | DM can write the Session "Overview & Hook" field using markdown syntax with live rendering | `SessionPrep.jsx` integration point confirmed by direct read (line 53-59); drop-in `MarkdownField` swap, no persistence changes needed (Persistence Flow Verification section) |
| MDED-02 | DM can write session-prep block content (Notes, Callout, Loot blocks) using markdown syntax with live rendering | `NotesBlock.jsx`, `CalloutBlock.jsx`, `LootBlock.jsx` integration points confirmed by direct read; Common Pitfalls #1 (Loot key stability) and #2 (Callout italic/chrome integration) directly support safe implementation |
| MDED-09 | One shared `MarkdownField` component is reused across all 4 field locations rather than four divergent implementations | Architecture Patterns — confirms `MarkdownField`/`MarkdownPreview`/`markdownToolbar.js` need zero forking; any D-04/D-05 chrome changes should be additive optional props, not a second component |
</phase_requirements>

## Summary

This phase has no new technology to evaluate — `MarkdownField`, `MarkdownPreview`, and `markdownToolbar.js` were built, researched, and UAT-hardened in Phase 2 (see `.planning/phases/02-markdown-editing-character-location-fields/02-RESEARCH.md`), and all three markdown packages (`react-markdown@10.1.0`, `remark-gfm@4.0.1`, `remark-breaks@4.0.0`) are already installed in `package.json` alongside `strip-markdown@6.0.0`. This phase's job is pure integration: replace 4 `<textarea>` call sites with `<MarkdownField>`, verify the existing full-payload persistence flow (Phase 1's fix) tolerates markdown content correctly, and resolve two genuine (not rhetorical) styling-integration questions.

Direct code reads confirm the persistence path is safe and requires no changes: `SessionPrep.jsx`'s `updatePrep()` calls `dispatch({ type: 'UPDATE_SESSION', payload: { ...activeSession, prepData: newPrep } })` on every keystroke — the exact full-payload pattern Phase 1's `detailLoadedIds` gate was built to protect. `AppContext.jsx`'s `dispatchWithPersist` only calls `saveSession()` for `UPDATE_SESSION` when `detailLoadedIds.current.has(action.payload.id)` is true (line 293), so this phase inherits that protection automatically — no new persistence work needed. There is no debounce anywhere in the save path (`db.saveSession` fires a `PUT /api/sessions/{id}` with the full session object on every dispatch); this is pre-existing behavior unchanged by this phase (the pre-Phase-3 plain `<textarea>` already dispatched on every keystroke) and is not made worse by adding `MarkdownField`, since only one field can have keyboard focus at a time regardless of how many `MarkdownField` instances are mounted.

Two findings materially change the shape of the discretionary decisions from what CONTEXT.md's framing implies. First, **unlike Phase 2's fixed-width modals, all four Session Prep call sites live in a full-width page tab with no `max-width` constraint** (`App.jsx` line 134, `flex-1 overflow-y-auto`, no width cap) — so the existing 480px `@container` breakpoint (already shipped in `index.css`, no new CSS needed) will trigger side-by-side split-view for Overview & Hook, Notes, Callout, **and** Loot's description field on any normal laptop/desktop viewport, since none of these fields sit inside a `grid-cols-2` split like Phase 2's `CharacterModal.jsx` fields did. D-04's "compact chrome" question is therefore not really about breakpoint-forcing (all four will default to side-by-side on real screens) — it's purely about vertical/visual density of the toolbar+tabs bar repeated 6+ times in a list. Second, **`LootBlock.jsx`'s `items.map((item, i) => <div key={i}>...)` uses the array index as the React key**, and Loot items carry no stable `id` field at all (`{ name: '', description: '' }` on creation) — wiring a stateful component (`MarkdownField` holds its own `activeTab` `useState`) into a `key={i}`-keyed list is a genuine correctness bug waiting to surface: deleting or reordering a loot item will cause React to reuse a sibling item's `MarkdownField` instance (and its Edit/Preview tab state) for the wrong logical item. This must be fixed as part of this phase's Loot wiring, not treated as a pre-existing acceptable risk.

**Primary recommendation:** Swap all 4 call sites to `<MarkdownField>` unchanged from Phase 2's shipped interface (no forking, no new component). Add loot items a stable `id` (reuse the existing `phaseUid()`/`blockUid()` generator pattern) and switch `LootBlock`'s list key from index to `item.id` as a required, in-scope fix — not optional. For D-04, default to full chrome everywhere (matches MDED-09's "zero divergence" framing and the confirmed wide-container reality) and treat a compact variant as a fallback only if visual QA during execution shows it's genuinely too heavy. For D-05, prefer dropping the CalloutBlock's forced-italic entirely (option (a) from CONTEXT.md) — since `MarkdownField` lets the DM type `*italics*` explicitly, forcing italic via CSS class conflicts with the raw/preview markdown convention and doesn't compose cleanly with `MarkdownPreview`'s un-italicized `em` styling; implement the colored-left-border box as an outer wrapper around `MarkdownField` (no internal fork needed — CalloutBlock's own div already supplies the border/color, so `MarkdownField`'s own border can either stay as a subtle inner frame or be dropped by adding one small additive `bare` prop to `MarkdownField.jsx`, see Architecture Patterns).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Markdown raw-text editing (textarea + toolbar) at 4 new sites | Browser / Client | — | Pure React component reuse; no server round-trip per keystroke; identical to Phase 2's established tier assignment |
| Markdown → styled preview rendering at 4 new sites | Browser / Client | — | Reuses `MarkdownPreview`/`react-markdown` unchanged; client-side rendering already locked in `PROJECT.md` |
| Loot item list-key stability fix | Browser / Client | — | Pure React reconciliation correctness issue; no data-shape or API change (id is a client-generated string, not persisted differently than existing `name`/`description` fields already are) |
| Callout visual-identity integration (border/italic) | Browser / Client | — | Pure CSS/JSX composition; no server involvement |
| Persisted markdown source (`prepData.overview`, block `body`, item `description`) | API / Backend | Database / Storage | Existing `PrepData` JSON column (fixed by Phase 1) — no schema change, no new endpoint; this phase writes through the same `PUT /api/sessions/{id}` already in place |

## Package Legitimacy Audit

No new packages are installed by this phase. All required packages (`react-markdown@10.1.0`, `remark-gfm@4.0.1`, `remark-breaks@4.0.0`, `strip-markdown@6.0.0`) were verified `OK` in Phase 2's Package Legitimacy Audit (`.planning/phases/02-markdown-editing-character-location-fields/02-RESEARCH.md`) and are already present in `package.json` `[VERIFIED: package.json read]`. This phase only wires the already-approved `MarkdownField` component into new call sites — no `npm install` step is part of this phase's plan.

**Packages removed due to [SLOP] verdict:** none (no new packages)
**Packages flagged as suspicious [SUS]:** none (no new packages)

## Architecture Patterns

### System Architecture Diagram

```
DM types in a Session Prep field  ──▶  MarkdownField (unchanged from Phase 2)
        │                                       │
        │ onChange (raw markdown string)        │ value prop
        ▼                                       ▼
  parent local state update:                react-markdown
   - SessionPrep.jsx: updatePrep()               │ remarkPlugins=[remarkGfm, remarkBreaks]
   - NotesBlock/CalloutBlock: onChange(block)    │ (identical config to Phase 2, MarkdownPreview.jsx)
   - LootBlock: updateItem(i, 'description', v)  ▼
        │                                  Rendered preview pane
        ▼                                  (hidden via CSS in edit-tab-only mode,
  dispatch({ type: 'UPDATE_SESSION',        visible in side-by-side mode — see
    payload: { ...activeSession,            Common Pitfall #3)
    prepData: newPrep } })
        │
        ▼
  dispatchWithPersist (AppContext.jsx line 277)
        │
        ├─ detailLoadedIds.current.has(session.id)? ──NO──▶ dispatch only, no network call
        │         │ YES                                    (protects summary-only sessions,
        │         ▼                                          Phase 1's PERSIST fix — unchanged
        │   saveSession(session) → PUT /api/sessions/{id}     by this phase)
        │   (full session payload, every keystroke,
        │    no debounce — pre-existing behavior)
        ▼
  PostgreSQL PrepData column (JSON) — Phase 1 fixed UpsertAsync to actually
  assign PrepData on update; this phase adds no new persistence risk
```

### Recommended Project Structure

No new files. All work is edits to 4 existing files:

```
src/client/components/
├── tabs/SessionPrep.jsx                    # swap Overview & Hook <textarea> → <MarkdownField>
├── session/blocks/NotesBlock.jsx           # swap body <textarea> → <MarkdownField>
├── session/blocks/CalloutBlock.jsx         # swap body <textarea> → <MarkdownField>, resolve D-05
├── session/blocks/LootBlock.jsx            # swap description <textarea> → <MarkdownField>,
│                                            #   fix key stability (add item.id, key={item.id})
└── markdown/MarkdownField.jsx              # only touched if D-05 needs an additive `bare` prop
                                             #   (optional — see Pattern 3)
```

### Pattern 1: Direct drop-in replacement (Overview & Hook, Notes, Loot description)

**What:** Replace the `<textarea className={inp} rows={N} value={...} onChange={e => ...(e.target.value)} placeholder={...} />` pattern with `<MarkdownField value={...} onChange={v => ...(v)} placeholder={...} />`. `MarkdownField`'s `onChange` receives the raw string directly (not an event), unlike the plain `<textarea>`'s `e.target.value` — this is the one call-shape change at every site.

**When to use:** `SessionPrep.jsx` (`prep.overview`), `NotesBlock.jsx` (`block.body`), `LootBlock.jsx` (`items[i].description`).

**Example (NotesBlock.jsx, before → after):**
```jsx
// Before
<textarea
  className={inp}
  rows={3}
  value={block.body || ''}
  onChange={e => onChange({ ...block, body: e.target.value })}
  placeholder="DM notes, mechanics, reminders..."
/>

// After
// Source: src/client/components/markdown/MarkdownField.jsx (Phase 2, unchanged)
import MarkdownField from '../../markdown/MarkdownField'

<MarkdownField
  value={block.body}
  onChange={v => onChange({ ...block, body: v })}
  placeholder="DM notes, mechanics, reminders..."
/>
```
Note `MarkdownField`'s own `value || ''` guard (line 63 of `MarkdownField.jsx`) means passing `block.body` (possibly `undefined`) directly is safe — no need to keep the `|| ''` at the call site, though it's harmless if left in place.

### Pattern 2: Loot item key-stability fix (required, not optional)

**What:** `LootBlock.jsx` currently generates loot items with no `id` field (`{ name: '', description: '' }`) and keys the list by array index (`<div key={i}>`). `MarkdownField` is a stateful component (internal `activeTab` `useState`, `useAutoGrow`'s `useRef`-held DOM node and its cached height). When items are removed from the middle of the list or reordered, `key={i}` causes React to reuse a `MarkdownField` instance — and its internal Edit/Preview tab state and auto-grow height — for a *different* logical loot item than the one it was previously rendering. The `value` prop updates correctly (so no data corruption), but the UI can show the wrong tab selected or a stale auto-grow height for a frame, and — more importantly — this is the exact `[VERIFIED: general React reconciliation semantics, cross-checked via WebSearch]` failure mode the task brief specifically flagged as a risk to check.

**When to use:** Fix in `LootBlock.jsx` as part of wiring `MarkdownField` into `items[i].description` — this is in-scope for MDED-02, not a separate task.

**Example:**
```jsx
// Source: reuses the existing blockUid()/phaseUid() generator pattern already
// established in this codebase (PhaseCard.jsx line 18, SessionPrep.jsx line 7)
function itemUid() { return `item-${Date.now()}-${Math.random().toString(36).slice(2)}` }

const addItem = () => onChange({ ...block, items: [...items, { id: itemUid(), name: '', description: '' }] })

// ...

{items.map((item, i) => (
  <div key={item.id ?? i} className="bg-[#161310] rounded p-2 flex gap-2">
```
`key={item.id ?? i}` (fallback to index) handles pre-existing persisted loot items created before this fix ships, which won't have an `id` yet — the fallback is only a display-time concern (no migration needed, since the fallback only affects React's reconciliation key, not the persisted data shape). New items always get a real `id`. If the plan wants zero fallback ambiguity, a one-time migration step (assign `id` to any item missing one, on next save) is also viable but not required — flag as a planning-time choice, not a blocker.

### Pattern 3: Callout visual-identity integration (D-05)

**What:** `CalloutBlock.jsx` currently wraps its `<textarea>` in a colored-left-border box (`borderLeft: 3px solid ${v.color}`, `backgroundColor: '#161310'`) and forces `italic` via a Tailwind class directly on the `<textarea>`. `MarkdownField`'s own outer div independently applies `border border-[#332922] rounded-lg bg-[#161310]` (hardcoded in JSX, not conditionally overridable via the existing `className` prop — Tailwind utility class precedence is determined by stylesheet order, not JSX string order, so appending `border-none` via `className` is not a reliable way to strip the hardcoded `border` class).

**Recommended approach (Option A from CONTEXT.md D-05, refined):**
1. Drop the forced `italic` class entirely — do not port it to `MarkdownField`'s `textareaClassName` prop, and do not add italic styling to `MarkdownPreview`. The DM can type `*italics*` explicitly now that raw markdown syntax is available; forcing italic via CSS on top of a markdown-aware field creates a mismatch where the rendered preview (not italicized, since `MarkdownPreview` has no italic override) looks different from the edit pane (italicized via class), which is confusing.
2. Keep `CalloutBlock`'s colored-left-border wrapper `<div>` as the outer chrome (it already carries the Flavor Text amber / Read-Aloud green distinction via `borderLeft`).
3. `MarkdownField`'s own border can be left in place initially (nested "box in a box" look, both using `#161310` background so no color clash — verify visually) as the zero-code-change option; if visual QA during execution shows the double border reads as cluttered, add one small **additive, optional** prop to `MarkdownField.jsx` (e.g. `bare = false`) that swaps `border border-[#332922] rounded-lg` for no border/no rounding when `true`, leaving every other Phase 2 call site (which won't pass `bare`) pixel-identical. This keeps `MarkdownField` a single shared component (satisfies MDED-09) rather than forking a second component for Callout.

**Example (if `bare` prop is needed):**
```jsx
// Source: additive change to src/client/components/markdown/MarkdownField.jsx
export default function MarkdownField({ value, onChange, className = '', textareaClassName = '', placeholder = '', autoFocus = false, bare = false }) {
  // ...
  return (
    <div className={`markdown-field ${bare ? '' : 'border border-[#332922] rounded-lg bg-[#161310]'} ${className}`}>
```

**Why not Option B (accent moves to a label strip, MarkdownField keeps full standard look):** Viable and lower-risk (zero changes to `MarkdownField.jsx`), but loses the immediately-scannable colored-left-border affordance that currently lets a DM glance down a phase's blocks and distinguish Flavor Text from Read-Aloud at a glance without reading a label. Either option satisfies D-05's constraint ("the Flavor Text vs. Read-Aloud color distinction must remain visually clear") — Option A is the research recommendation because it preserves the existing at-a-glance affordance with less visual redundancy (one border instead of two nested chrome layers), but Option B is a legitimate fallback if the `bare` prop addition is judged out of scope for this phase's size.

### Anti-Patterns to Avoid

- **Forking a second `MarkdownField`-like component for Callout/Loot's "compact" needs:** Directly contradicts MDED-09 ("reused across all 4 field locations... rather than four divergent implementations"). Any chrome-density change must be an additive prop on the existing component, not a new file.
- **Keeping `key={i}` on Loot's item list once `MarkdownField` (a stateful component) is nested inside it:** See Pattern 2 — this is a latent bug, not a style preference, once a component with internal state is added to an index-keyed, reorderable/removable list `[CITED via WebSearch cross-check: React key stability documentation]`.
- **Porting the `italic` class onto `MarkdownField`'s `textareaClassName` without also styling `MarkdownPreview`'s `em`/paragraph output:** produces an edit/preview visual mismatch (see Pattern 3).
- **Adding a debounce to `SessionPrep.jsx`'s per-keystroke save as part of this phase:** Out of scope — this is pre-existing behavior from before Phase 3, unrelated to markdown wiring, and changing it here would conflate an unrelated performance change with this phase's scope. Flag as a candidate for a future polish phase if it becomes a real problem, matching the pattern already used for the Phase 1 "silent discard during race window" note in `STATE.md`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown parsing/rendering at the 4 new sites | A second, simplified markdown renderer "since these fields are smaller" | The exact same `MarkdownField`/`MarkdownPreview` from Phase 2 | MDED-09 explicitly requires one shared component; field size doesn't change markdown syntax needs |
| Stable list-item identity for Loot items | A `Date.now()`-only key (collision risk if items are added in the same millisecond, e.g. programmatically or via fast double-click) | The existing `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}` generator pattern already used by `phaseUid()`/`blockUid()` in this codebase | Consistency with existing ID-generation convention; the `Math.random()` suffix already defends against the collision case single `Date.now()` calls have |

**Key insight:** This phase's only genuine "build" surface is the Loot key-stability fix and (possibly) one additive prop on `MarkdownField` — everything else is literally copy-pasting Phase 2's already-proven JSX pattern into 4 new locations.

## Common Pitfalls

### Pitfall 1: Loot item `MarkdownField` instances losing/mixing Edit-vs-Preview tab state on delete/reorder

**What goes wrong:** DM has 3 loot items, the 2nd item's description field is on the "Preview" tab, DM deletes the 1st item — the field that is now visually "item 2" (was item 3) incorrectly shows "Preview" tab active, because React reused the `key={1}` component instance's internal state for whatever item now sits at index 1.
**Why it happens:** `LootBlock.jsx`'s `items.map((item, i) => <div key={i}>...)` keys by array position, not logical item identity; `MarkdownField` holds `activeTab` in `useState`, which is state React must decide whether to preserve or reset per key.
**How to avoid:** Implement Pattern 2 (add `item.id` on creation, key by `item.id`) as part of this phase's Loot wiring — not deferred.
**Warning signs:** During manual testing: set one loot item's field to "Preview" tab, delete a different (earlier) item, observe whether the "Preview" tab state moved to the wrong item.

### Pitfall 2: Callout's forced-italic and MarkdownField's un-italicized preview producing a visual mismatch

**What goes wrong:** If the existing `italic` Tailwind class is copied onto `MarkdownField`'s `textareaClassName`, the edit pane renders in italics but the preview pane (via `MarkdownPreview`, which has no italic override — confirmed by direct read of `MarkdownPreview.jsx`) renders in normal weight, so the same text looks different in Edit vs. Preview tabs/panes for no reason a DM would understand.
**Why it happens:** `MarkdownField`'s two panes (raw textarea, rendered preview) are visually independent; a class applied to the textarea alone doesn't propagate to the preview's rendering config.
**How to avoid:** Drop the forced italic entirely (Pattern 3, Option A) — let the DM's own `*text*` markdown syntax control emphasis, consistent with how markdown normally works and consistent with `MarkdownPreview`'s existing behavior at all Phase 2 call sites.
**Warning signs:** Visual QA: type unformatted callout text, switch to Preview tab, notice the text is no longer italic even though it was in the Edit tab.

### Pitfall 3: Preview pane parses markdown on every keystroke even while the Edit tab is active (bounded, low-risk)

**What goes wrong:** `MarkdownField.jsx` (line 68-70) always renders `<MarkdownPreview value={value} />` in the JSX tree, hidden via a CSS class (`markdown-field-pane-hidden { display: none }`) rather than being conditionally unmounted — meaning `react-markdown` re-parses the full markdown source on every keystroke regardless of which tab is active, and (per the width analysis in this document) most Session Prep fields will actually render in side-by-side mode by default on normal viewports, so the preview is usually visible and re-parsing anyway.
**Why it happens:** This is Phase 2's existing, shipped, already-in-production design (not something this phase introduces) — CSS-hiding rather than unmounting avoids remount/focus-loss issues when switching tabs.
**How to avoid:** No action required for this phase — this is a pre-existing, already-accepted tradeoff from Phase 2 that this phase inherits by reusing the component unchanged. It becomes a real concern only if a single expanded `PhaseCard` accumulates a very large number of blocks (tens+) with long prose content; flag as a "watch for it" item during UAT if session prep content becomes unusually large, but do not build any mitigation (e.g. debounced re-parse, virtualization) speculatively — out of scope per MDED-09's "reuse, don't diverge" framing.
**Warning signs:** Noticeable typing lag when many blocks are expanded simultaneously with long content — not expected at normal DM session-prep content volumes (a handful of blocks per phase, short notes/loot descriptions).

### Pitfall 4: Assuming Session Prep fields will default to tab-toggle mode like Phase 2's narrow character-field columns

**What goes wrong:** Planner or reviewer might assume, by analogy to Phase 2's ~330px character-field columns, that Session Prep's smaller/nested block fields will also default to the narrow tab-toggle layout, and plan/design for that as the primary case.
**Why it happens:** Session Prep has no `grid-cols-2` column-splitting anywhere in `SessionPrep.jsx`/`PhaseCard.jsx`/the block components, and the tab content area (`App.jsx` line 134) has no `max-width` — so container widths at all 4 call sites are typically 500px+ on any real laptop/desktop viewport (verified by direct code read of the layout chain: `App.jsx` → `SessionPrep.jsx` `p-4` → `PhaseCard.jsx` `px-4 pb-4` → block component, with no intermediate width constraint). The 480px `@container` breakpoint (already shipped, unchanged) will therefore trigger side-by-side split-view as the *common* case, not the tab-toggle fallback.
**How to avoid:** Design/test primarily against the side-by-side layout for all 4 fields; only treat tab-toggle as the narrow-viewport (mobile/small-window) fallback case, not the default expected experience.
**Warning signs:** UAT on a normal-width browser window shows side-by-side split for Loot's small `description` field — this is expected, not a bug, given the measured container widths.

## Code Examples

### Overview & Hook wiring (SessionPrep.jsx)
```jsx
// Source: this codebase, src/client/components/tabs/SessionPrep.jsx (existing pattern)
// and src/client/components/markdown/MarkdownField.jsx (Phase 2, unchanged)
import MarkdownField from '../markdown/MarkdownField'

function updateOverview(v) {
  updatePrep({ ...prep, overview: v })
}

<div>
  <h2 className="text-sm font-semibold text-[#d4a574] uppercase tracking-wider mb-2">Adventure Overview & Hook</h2>
  <MarkdownField
    value={prep.overview}
    onChange={updateOverview}
    placeholder="The setup, the hook that draws the party in, who wants what..."
  />
</div>
```
Note the call-shape change from the current `updateOverview(e)` (reads `e.target.value`) to `updateOverview(v)` (reads `v` directly) — `MarkdownField`'s `onChange` prop passes the string, not a synthetic event, matching Phase 2's established `MarkdownField` contract.

### Loot description wiring with key-stability fix (LootBlock.jsx)
```jsx
// Source: this codebase, src/client/components/session/blocks/LootBlock.jsx,
// combined with the id-stability fix from Pattern 2 above
import MarkdownField from '../../markdown/MarkdownField'

function itemUid() { return `item-${Date.now()}-${Math.random().toString(36).slice(2)}` }

const addItem = () => onChange({ ...block, items: [...items, { id: itemUid(), name: '', description: '' }] })

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
```

## State of the Art

No stack changes since Phase 2 — same table applies, restated for reference:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Plain `<textarea>` at all Session Prep prose fields | `MarkdownField` (edit+preview, toolbar, auto-grow) | This phase | Matches Character/Location fields already shipped in Phase 2 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Dropping CalloutBlock's forced-italic (Pattern 3, Option A) is the better integration choice vs. keeping it and styling `MarkdownPreview`'s `em` to compensate | Architecture Patterns / Pattern 3 | Low — purely a visual/UX preference not locked by CONTEXT.md (explicitly left to discretion); reversible with a small CSS/JSX change if the executed result reads worse than expected |
| A2 | A one-time migration for pre-existing loot items missing `id` is not required, since `key={item.id ?? i}`'s index fallback handles the display-time concern safely | Pattern 2 | Low — if reviewers prefer a hard guarantee (every item always has a real id), a trivial migration-on-load step can be added at plan time; does not change the data shape or require a backend change either way |
| A3 | No debounce is needed on the per-keystroke `UPDATE_SESSION` save as part of this phase | Anti-Patterns to Avoid | Low — this is explicitly out of scope per the phase boundary in CONTEXT.md; flagged only so the planner doesn't accidentally scope-creep into it |

**If this table is empty:** N/A — all three items above are low-risk, discretionary/UX judgment calls already anticipated and delegated by CONTEXT.md, not load-bearing technical claims.

## Open Questions

1. **Should the `bare` prop on `MarkdownField.jsx` (Pattern 3) be added in this phase, or should Callout ship with the "box-in-a-box" nested-border look and defer the prop to a later polish pass?**
   - What we know: Both are visually acceptable and satisfy D-05's hard requirement (color distinction stays clear); the `bare` prop is a small, additive, non-breaking change (~2 lines).
   - What's unclear: Whether the nested-border look will read as "cluttered" or "fine" once actually rendered — this is a visual judgment call best made by looking at the built UI, not predicted in research.
   - Recommendation: Build without `bare` first (zero `MarkdownField.jsx` changes, fastest path), visually assess during implementation/UAT, add `bare` only if the nested border genuinely looks wrong. Do not pre-emptively add the prop speculatively.

2. **Should Loot's pre-existing persisted items (created before this phase, missing `id`) get a one-time migration to assign stable ids, or rely on the `key={item.id ?? i}` fallback indefinitely?**
   - What we know: The fallback is safe (no data corruption risk either way) and requires zero backend/migration work.
   - What's unclear: Whether leaving some loot items permanently without a real `id` is an acceptable long-term state, or whether the planner wants a clean invariant ("every loot item always has an id after this phase ships").
   - Recommendation: Default to the fallback-only approach (simpler, no migration code) unless the planner has a reason to want the stronger invariant — flag as a one-line planning decision, not a research blocker.

## Environment Availability

No external dependencies beyond what Phase 2 already verified (Node/npm/Vite/React 18, already installed markdown packages). Skipping this section's full table — no new environment requirements introduced by this phase.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **None currently configured for the frontend** — unchanged from Phase 2's finding. `package.json` has no `test` script, no `vitest`/`jest` devDependency, no `*.test.jsx` files anywhere in `src/client/`. |
| Config file | none — see Wave 0 |
| Quick run command | n/a |
| Full suite command | n/a |

This phase is 100% frontend UI wiring — consistent with Phase 1 and Phase 2's closure pattern, this project validates such changes through conversational UAT (`gsd-verify-work`), not automated frontend tests.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MDED-01 | Overview & Hook: write markdown, live preview, save, reload, both raw and rendered content persist | manual (visual + reload) | n/a — UAT | ❌ Wave 0 (framework absent) |
| MDED-02 | Notes/Callout/Loot: write markdown, live preview, save, reload, content persists | manual (visual + reload) | n/a — UAT | ❌ Wave 0 |
| MDED-09 | All 4 field locations render through the same shared `MarkdownField` | code-review-verifiable (grep for `import MarkdownField` at all 4 sites, confirm no second component file exists) | `grep -rn "MarkdownField" src/client/components/tabs/SessionPrep.jsx src/client/components/session/blocks/` | N/A — verifiable via grep, no test file needed |
| Loot key-stability fix (not a formal REQ, but a locked correctness fix from this research) | Deleting/reordering loot items doesn't scramble another item's Edit/Preview tab state | manual (visual): set item 2's field to Preview, delete item 1, confirm item 2's (now item 1's) tab state is correct | n/a — UAT | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** manual smoke check in the browser (`npm run dev`) — type sample markdown into the field just wired, confirm preview renders, save, reload, confirm persistence.
- **Per wave merge:** re-run all 4 field locations plus the Loot key-stability manual test.
- **Phase gate:** Full conversational UAT via `gsd-verify-work` covering all 3 phase success criteria before phase closure, matching Phase 1/Phase 2's established pattern.

### Wave 0 Gaps

None — no frontend test framework exists, and this phase's scope (component wiring + one correctness fix) does not independently justify introducing one, consistent with Phase 2's precedent. "None — all verification for this phase is conversational UAT per project convention; no frontend test infrastructure exists or is being introduced."

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Unchanged — this phase touches no auth code |
| V3 Session Management | No | Unchanged |
| V4 Access Control | No | Unchanged — same existing `PUT /api/sessions/{id}` endpoint/authorization already in place, unchanged by this phase |
| V5 Input Validation | Yes (light) | Unchanged from Phase 2 — markdown source stored as an opaque string in the existing `PrepData` JSON column; `react-markdown`'s parser degrades malformed markdown to plain text rather than erroring |
| V6 Cryptography | No | Not applicable |
| V5/XSS-adjacent (Output Encoding) | Yes | Reuses `react-markdown`'s default AST→React-element rendering (no `dangerouslySetInnerHTML`), identical safe configuration to Phase 2 — no new `rehype-raw` or other passthrough introduced at any of the 4 new call sites |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Stored XSS via markdown content in Session Prep fields (same class of risk as Phase 2's Character/Location fields) | Tampering / Information Disclosure | Unchanged: `react-markdown`'s default configuration strips/escapes raw HTML; no `rehype-raw` added at any of the 4 new sites `[CITED: github.com/remarkjs/react-markdown, verified in Phase 2 research]` |

This phase's threat surface is identical to Phase 2's (already assessed as low: all content is authored by the same trusted DM/admin-level users who already have full CRUD access via the plain `<textarea>` fields being replaced) — this phase changes *rendering*, not *trust boundary*.

## Sources

### Primary (HIGH confidence)

- Direct codebase reads: `src/client/components/tabs/SessionPrep.jsx`, `src/client/components/session/blocks/NotesBlock.jsx`, `src/client/components/session/blocks/CalloutBlock.jsx`, `src/client/components/session/blocks/LootBlock.jsx`, `src/client/components/session/PhaseCard.jsx`, `src/client/components/markdown/MarkdownField.jsx`, `src/client/components/markdown/MarkdownPreview.jsx`, `src/client/components/markdown/markdownToolbar.js`, `src/client/context/AppContext.jsx`, `src/client/db/index.js`, `src/client/App.jsx`, `src/client/index.css`, `package.json`, `.planning/config.json`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/PROJECT.md`
- `.planning/phases/02-markdown-editing-character-location-fields/02-RESEARCH.md` — HIGH-confidence prior research this phase builds directly on (package legitimacy, toolbar undo pattern, container-query breakpoint, auto-grow pattern)
- `.planning/phases/02-markdown-editing-character-location-fields/02-CONTEXT.md`, `.planning/phases/01-session-persistence-reliability/01-CONTEXT.md` — locked prior decisions this phase must not diverge from

### Secondary (MEDIUM confidence)

- WebSearch: React key stability with stateful list-item components and index-based keys, cross-checked across multiple sources (React docs lineage, developer.way, Sentry) `[CITED via WebSearch]`
- WebSearch: `document.execCommand('insertText', ...)` deprecation status vs. real-world browser support as of 2025-2026, cross-checked across MDN and multiple community sources `[CITED via WebSearch]` — confirms Phase 2's shipped toolbar pattern remains valid, no action needed

### Tertiary (LOW confidence)

None — this phase's scope was narrow enough that all findings were either directly verified via codebase read or cross-checked via WebSearch to MEDIUM confidence.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, everything already verified in Phase 2 and confirmed present in `package.json`
- Architecture (container widths, persistence flow, key-stability bug): HIGH — all directly verified via codebase reads, not inferred
- Pitfalls: HIGH for the Loot key-stability issue (a well-documented React reconciliation semantic, directly observable in the current code) and the persistence-flow safety (directly traced through `AppContext.jsx`'s actual gating logic); MEDIUM for the D-04/D-05 styling recommendations (legitimate judgment calls, not verifiable "correct" answers)

**Research date:** 2026-07-13
**Valid until:** 2026-08-12 (30 days — this phase depends only on already-stable, already-shipped Phase 2 code; no fast-moving external dependency)
