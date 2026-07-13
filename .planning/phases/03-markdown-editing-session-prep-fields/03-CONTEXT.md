# Phase 3: Markdown Editing — Session Prep Fields - Context

**Gathered:** 2026-07-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase wires the shared `MarkdownField` component (built in Phase 2) into the two remaining Session Prep prose surfaces: the top-level "Overview & Hook" field in `SessionPrep.jsx`, and the free-text fields inside session-prep blocks — Notes (`body`), Callout (`body`), and Loot (`items[].description`) — in `PhaseCard.jsx`/`blocks/*.jsx`. It completes MDED-09 (one shared markdown component reused across all 4 field locations: character bio/notes, location description, Overview & Hook, prep blocks).

It does not touch: Session Log (TipTap WYSIWYG, untouched), the Locations block (links to locations, no prose field), the Random Table block (structured die/columns/rows, no prose field), Loot item `name` (single-line, stays plain), Phase `title`/`summary` (single-line, stays plain), or image cropping (Phase 4).

Unlike Phase 2's call sites (fixed-width modal forms), this phase's fields sit in smaller, nested, repeatable list UI — a Callout block carries its own colored-border/italic flavor styling, and a Loot item is one row in a repeatable list — so the decisions here are about how the already-built component fits denser layouts, not about the component's internals.

</domain>

<decisions>
## Implementation Decisions

### Field Scope
- **D-01:** `Overview & Hook` (`SessionPrep.jsx`, `prep.overview`) gets the standard `MarkdownField` — same top-level, full-width treatment as the Phase 2 modal forms.
- **D-02:** `Notes` block (`body`) and `Callout` block (`body`) get `MarkdownField`.
- **D-03:** `Loot` block gets `MarkdownField` on `items[].description` only. `items[].name` stays a plain single-line `<input>` — matches the Phase 2 precedent of excluding label/single-line fields (e.g. `Inventory` stayed plain text) from markdown treatment. Confirmed by the user, not left to discretion.
- **Out of scope by domain, not asked:** `LocationsBlock` (no prose field), `RandomTableBlock` (`title` is single-line like Phase 2's excluded fields; row/column cells are short structured data, not prose), `PhaseCard`'s own `title`/`summary` inputs.

### Claude's Discretion
- **Block chrome density (D-04):** Whether Notes/Callout/Loot's `MarkdownField` instances use the exact same full chrome (toolbar row + Edit/Preview tabs) as Overview & Hook, or a more compact variant sized for the smaller, repeatable, nested block UI. User explicitly delegated — default assumption is full chrome (same component, zero divergence) unless it visibly overwhelms the block layout once built; a compact skin sharing the same underlying render/toolbar logic is acceptable if needed.
- **Callout visual identity integration (D-05):** How `MarkdownField`'s own chrome (dark border/background, toolbar bar) combines with `CalloutBlock`'s existing visual identity (italic body text, colored left border — amber for Flavor Text, green for Read-Aloud). User explicitly delegated. Two integration directions were discussed as options, either is acceptable: (a) the callout's colored-left-border box stays the outer chrome and `MarkdownField` sits inside without its own border, with forced-italic dropped since the DM can now type `*italics*` explicitly; or (b) `MarkdownField` keeps its full standard look and the colored-variant accent moves to a label/header strip above it. Whichever is chosen, the Flavor Text vs. Read-Aloud color distinction must remain visually clear.
- Whether the Loot `description` field's `MarkdownField` instance shares the same discretionary compact/full chrome resolution as Notes/Callout (D-04) — it's a block-level prose field like the others, so should follow whatever chrome-density decision is made for blocks generally, not be treated as a fourth special case.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` §"Markdown Editing" — MDED-01 (Overview & Hook), MDED-02 (prep blocks), MDED-09 (component-reuse requirement this phase completes)
- `.planning/REQUIREMENTS.md` §"Out of Scope" — no full WYSIWYG toolbar / inline-render-as-you-type; no draft history/versioning
- `.planning/PROJECT.md` §"Key Decisions" — locks the rendering stack (`react-markdown` + `remark-gfm` + `remark-breaks`, client-side only) and the "one shared `MarkdownField` component" requirement
- `.planning/ROADMAP.md` §"Phase 3" — goal, success criteria, dependency on Phase 1 (`PrepData` persistence fix) and Phase 2 (`MarkdownField` component)

### Prior phase context (established patterns and locked decisions this phase must not diverge from)
- `.planning/phases/02-markdown-editing-character-location-fields/02-CONTEXT.md` — full decision set (D-01 through D-14) for the `MarkdownField` component: field-scope precedent (prose fields only, single-line fields excluded — directly reused for D-03 above), toolbar design (D-08), auto-grow behavior (D-10, D-11), split-view breakpoint approach (D-06, container-based, Claude's discretion), read-only rendering pattern (D-05) and `strip-markdown` for truncated previews (D-13) — not directly needed here since Session Prep has no read-only/linked-entity display equivalent, but relevant if one is discovered during planning
- `.planning/phases/02-markdown-editing-character-location-fields/02-RESEARCH.md` — technical research: package legitimacy, container-query breakpoint measurements, auto-grow pattern, toolbar undo-preservation pitfall and fix
- `.planning/phases/01-session-persistence-reliability/01-CONTEXT.md` — why Phase 3 was gated on Phase 1: `PrepData` previously never persisted on update; now fixed, and the full-payload `UPDATE_SESSION` dispatch pattern (which `SessionPrep.jsx`'s `updatePrep` already uses) is now safe

### Component/styling reference (primary source — direct code inspection)
- `src/client/components/markdown/MarkdownField.jsx` — the shared component to wire in; current props: `value`, `onChange`, `className`, `textareaClassName`, `placeholder`, `autoFocus` — no compact/chromeless variant exists yet, would need to be added if D-04/D-05 discretion lands on a compact/embedded skin
- `src/client/components/markdown/MarkdownPreview.jsx` — plain `ReactMarkdown` wrapper with `remark-gfm`+`remark-breaks`, `className` and `emptyText` props, no italic-forcing behavior built in (relevant to D-05)
- `src/client/components/markdown/markdownToolbar.js` — `wrapSelection`/`insertAtCursor` helpers used by `MarkdownField`'s toolbar buttons

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/client/components/markdown/MarkdownField.jsx` — drop-in replacement for each `<textarea>` call site identified below; already handles auto-grow, toolbar, Edit/Preview tabs
- Local generic setter pattern already used by `SessionPrep.jsx`/`PhaseCard.jsx`/block components (`onChange({ ...thing, field: value })`) — `MarkdownField`'s `value`/`onChange` props fit this without call-site restructuring

### Established Patterns
- `SessionPrep.jsx` owns `prep = activeSession.prepData || emptyPrep()` and calls `updatePrep(newPrep)` → `dispatch({ type: 'UPDATE_SESSION', payload: { ...activeSession, prepData: newPrep } })` directly on every change (no separate `dirtySessionRef` staging step, unlike character/location sub-resources) — this is the full-payload pattern Phase 1 made safe; markdown wiring doesn't need to change this persistence flow, only swap the `<textarea>` for `MarkdownField` at each field.
- `PhaseCard.jsx` only renders its blocks (and thus any `MarkdownField` instances inside them) when the phase is expanded (`{expanded && (...)}`) — collapsed phases don't mount their block editors, which bounds how many `MarkdownField` instances can be live at once regardless of how many blocks/phases exist.
- Each block component (`CalloutBlock`, `LootBlock`, `NotesBlock`) receives `{ block, onChange }` and calls `onChange({ ...block, field: value })` — same shape as `SessionPrep.jsx`'s pattern, so `MarkdownField` wiring is consistent across both the top-level field and the nested blocks.

### Integration Points — full usage-site list (confirmed via code read)
- `src/client/components/tabs/SessionPrep.jsx` (line ~53-59) — `prep.overview`, currently a fixed `rows={4}` `<textarea>` → `MarkdownField` (D-01)
- `src/client/components/session/blocks/NotesBlock.jsx` (line ~5-11) — `block.body`, currently `rows={3}` `<textarea>` → `MarkdownField` (D-02)
- `src/client/components/session/blocks/CalloutBlock.jsx` (line ~29-35) — `block.body`, currently `rows={4}` `<textarea>` with an `italic` class and colored-left-border wrapper (variant-dependent: amber `flavor` / green `readAloud`) → `MarkdownField` (D-02, integration approach per D-05)
- `src/client/components/session/blocks/LootBlock.jsx` (line ~30-36) — `items[i].description`, currently `rows={2}` `<textarea>` inside a per-item `bg-[#161310]` row → `MarkdownField` on `description` only (D-03); `items[i].name` (line ~24-29) stays a plain `<input>`, unchanged
- `src/client/components/session/PhaseCard.jsx` — parent container; `title`/`summary` inputs (line ~86-104) stay plain, out of scope; renders `BlockRenderer` which dispatches to the block components above
- `src/client/components/session/blocks/LocationsBlock.jsx`, `src/client/components/session/blocks/RandomTableBlock.jsx` — confirmed no prose fields; excluded from this phase (RandomTableBlock's `title` is single-line like other excluded label fields; row/column cells are short structured data)

</code_context>

<specifics>
## Specific Ideas

No additional "I want it like X" references beyond what's captured in Decisions above — the user delegated the two open styling questions (block chrome density, Callout visual-identity integration) to Claude's discretion rather than specifying a preferred look.

</specifics>

<deferred>
## Deferred Ideas

None raised — discussion stayed within phase scope. No pending todos matched this phase (`todo.match-phase` returned 0 matches).

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 3-Markdown Editing — Session Prep Fields*
*Context gathered: 2026-07-13*
