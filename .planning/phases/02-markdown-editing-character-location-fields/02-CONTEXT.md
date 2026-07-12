# Phase 2: Markdown Editing — Character & Location Fields - Context

**Gathered:** 2026-07-12
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers markdown editing (raw syntax + live, dark-themed, auto-growing preview) for character and location free-text fields — both in-session and in the global Character/Location Library. It builds the shared `MarkdownField` component that Phase 3 will later reuse for the Session Prep fields. It does not touch Session Log (TipTap, untouched), does not add a WYSIWYG toolbar, and does not touch image cropping (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Field Scope — Character
- **D-01:** MarkdownField applies to these `Character`/`GlobalCharacter` fields: `Description`, `SessionNotes`, `PersonalityTraits`, `Flaw`, `QuestHooks`. `Inventory` stays a plain textarea — it's a structured list (items/gold/equipment), not prose, consistent with auto-grow/markdown being scoped to prose fields only.
- **D-02:** This applies to **both** the in-session character form (`CharacterModal.jsx`, unlinked/ad-hoc branch) and the global Character Library form (`Library.jsx`) — not just one or the other. Consistency was chosen over minimizing footprint: a field shouldn't be markdown in one place and a plain textarea in another.

### Field Scope — Location
- **D-03:** MarkdownField applies to these `Location`/`GlobalLocation` fields: `Description`, `Notes`, `SecretsAndHazards`. Note `SecretsAndHazards` only exists on `GlobalLocation`, not the session-scoped `Location` entity — see Code Context below for where this actually surfaces.
- **D-04:** Same "both library and in-session" scope as characters — applies to `AddLocationModal.jsx`, `Library.jsx` (location form), `LocationsLibrary.jsx`, and `Locations.jsx` tab (session-scoped `SessionNotes` field), wherever these fields are editable.

### Read-Only "Shared Info" Rendering (new finding, not in original requirements text)
- **D-05:** For **linked** characters/locations (sourced from the library, `char.globalCharacterId` / `loc.globalLocationId` set), the in-session UI shows a read-only "Shared Info" summary box instead of an editable field (`CharacterModal.jsx` linked branch ~line 41-78; `Locations.jsx` `EditLocationModal` ~line 24-45). These currently render the raw string directly (e.g. `{form.personalityTraits}`, `{loc.description}`). **Decision: these read-only summaries must render as markdown too**, not stay as raw text — otherwise a DM who wrote `**bold**` in the Library sees literal asterisks in the session view. `MarkdownField` (or a lighter render-only sibling) needs a read-only/display-only mode, distinct from its edit+preview mode.

### Split-View Breakpoint (MDED-05)
- **D-06:** Exact breakpoint left to Claude's discretion (see below), but with an explicit constraint: several usage sites are **fixed-width modals**, not full-viewport layouts (`CharacterModal.jsx` is a fixed 720px-wide modal; `EditLocationModal` in `Locations.jsx` is 560px). A pure `window`-width media query breakpoint may not produce the right side-by-side/tab-toggle switch inside a narrow fixed-width modal even on a wide screen. Research/planning should evaluate container-based sizing (CSS container queries, or a JS-measured `ResizeObserver` approach) rather than assuming a single global viewport breakpoint works uniformly across all six-plus usage sites.
- **D-07:** On narrow/tab-toggle mode, the field always opens on the **Edit** tab by default, regardless of whether content already exists (not "preview if populated").

### Syntax Helpers
- **D-08:** `MarkdownField` includes a **light insert-syntax toolbar** — buttons (bold/italic/heading/list) that insert or wrap raw markdown characters at the cursor/selection, similar chrome to the existing `RichTextEditor.jsx` toolbar but manipulating plain text rather than calling TipTap editor commands. **This is a deliberate, informed deviation from PROJECT.md's locked "no toolbar" framing** — it is explicitly distinguished from the excluded "full WYSIWYG toolbar / inline-render-as-you-type editing" (`REQUIREMENTS.md` Out of Scope table): this toolbar never renders inline: it only inserts/wraps raw markdown syntax in the underlying plain-text value. The user chose this after the distinction was explained.
- **D-09:** A syntax cheat-sheet hint near the editor is Claude's discretion — add only if it fits cleanly without changing layout. Keep it minimal; a full hint/cheat-sheet is `MDED-10` (v2, explicitly deferred) — don't build a competing implementation of that deferred requirement here.

### Auto-Grow (MDED-07)
- **D-10:** The editor grows **unbounded** with content — no max-height cap or internal scroll on the field itself. The containing modal/page scrolls instead, matching MDED-07's literal wording ("grows to fit content instead of being fixed-height").
- **D-11:** In side-by-side mode, the preview pane's height **matches the editor pane's height** (not independent/natural heights) — keeps the two-column layout visually balanced.

### Claude's Discretion
- Exact split-view breakpoint value/mechanism (D-06) — pick based on actual measured widths of the modals this ships in, favoring a container-based approach if it's not materially more complex than a viewport media query.
- Whether to add a syntax hint near the editor (D-09) — only if it doesn't complicate layout.
- Toolbar button set and exact insertion/wrapping behavior for the light toolbar (D-08) — mirror `RichTextEditor.jsx`'s button styling/chrome (`btnCls` pattern) for visual consistency, adapted to manipulate a plain-text `<textarea>` value instead of a TipTap editor instance.
- Whether the read-only markdown render (D-05) reuses `MarkdownField`'s preview-only rendering path directly, or is a separate lightweight component — as long as visual output matches the editable preview exactly.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` §"Markdown Editing" — MDED-03 through MDED-08 (the requirements this phase satisfies), MDED-09 (component-reuse requirement, satisfied here + consumed by Phase 3), MDED-10 (v2/deferred — do not build)
- `.planning/REQUIREMENTS.md` §"Out of Scope" — explicitly excludes full WYSIWYG toolbar / inline-render-as-you-type editing; D-08's light insert-syntax toolbar is a distinct, narrower thing (see D-08 note)
- `.planning/PROJECT.md` §"Key Decisions" — locks the rendering stack (`react-markdown` + `remark-gfm` + `remark-breaks`, client-side only) and the "one shared `MarkdownField` component" requirement
- `.planning/ROADMAP.md` §"Phase 2" — goal and success criteria; §"Phase 3" — confirms Phase 3 depends on and reuses the `MarkdownField` component built in this phase

### Entity field definitions (primary source — direct code inspection)
- `src/Omphalos.Domain/Entities/Character.cs` — full field list backing D-01 (`Description`, `SessionNotes`, `PersonalityTraits`, `Flaw`, `QuestHooks`, `Inventory`)
- `src/Omphalos.Domain/Entities/Location.cs` — session-scoped location fields (`Description`, `Notes`, `SessionNotes` — no `SecretsAndHazards` here)
- `src/Omphalos.Domain/Entities/GlobalLocation.cs` — library location fields backing D-03 (`Description`, `Notes`, `SecretsAndHazards`)

### Styling/chrome reference
- `src/client/components/RichTextEditor.jsx` — dark-theme toolbar chrome (`btnCls` pattern, `bg-[#332922]`/`bg-[#d4a574]` active state) to visually match for D-08's toolbar and the overall field container styling

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/client/components/RichTextEditor.jsx` — toolbar button styling pattern (`btnCls`), dark container chrome (`border-[#332922] rounded-lg bg-[#161310]`) to mirror for `MarkdownField`'s own toolbar and container
- No markdown library exists yet in `package.json` — `react-markdown`, `remark-gfm`, `remark-breaks` all need to be added as new dependencies (locked choice, not yet installed)

### Established Patterns
- **Linked vs. unlinked entity pattern** (critical for this phase): `CharacterModal.jsx` branches on `isLinked = !!char.globalCharacterId` — linked characters show a read-only "Shared Info" box (must now render markdown per D-05) plus an editable "Session Fields" section (`Inventory`, `SessionNotes` only); unlinked/ad-hoc characters show the full editable form including `Description`/`PersonalityTraits`/`Flaw`/`QuestHooks`. `Locations.jsx`'s `EditLocationModal` mirrors this exact pattern for locations (`loc.description`/`secretsAndHazards` read-only, `sessionNotes` editable).
- Local generic setter helper: `const set = (k, v) => setForm(p => ({ ...p, [k]: v }))` — used throughout `CharacterModal.jsx`, `Library.jsx` forms; `MarkdownField` should be a drop-in replacement for `<textarea className={inp} value={form.x} onChange={e => set('x', e.target.value)} />` call sites to fit this pattern with minimal call-site rewrites.
- Short local Tailwind-class aliases (`const inp = '...'`, `const lbl = '...'`) at the top of form-heavy components — `MarkdownField` should accept a `className`/similar prop rather than hardcoding its own input styling, so it can inherit each call site's existing `inp`-style conventions where reasonable.

### Integration Points — full usage-site list (confirmed via code read, not just requirement text)
- `src/client/components/character/CharacterModal.jsx` — `Description`, `PersonalityTraits`, `Flaw`, `QuestHooks` (unlinked/editable branch); `PersonalityTraits`/`Description` read-only in linked branch
- `src/client/components/Library.jsx` — global character form: `Description`, `PersonalityTraits`, `Flaw`, `QuestHooks`; global location form: `Description`, `Notes`, `SecretsAndHazards`
- `src/client/components/location/AddLocationModal.jsx` — create-step form: `Description`, `Notes`, `SecretsAndHazards`; "Session Notes" field in the confirm/link step
- `src/client/components/LocationsLibrary.jsx` — `Description`, `Notes`, `SecretsAndHazards` (mirrors `Library.jsx`'s location form)
- `src/client/components/tabs/Locations.jsx` — `EditLocationModal`: read-only `Description`/`SecretsAndHazards` (D-05), editable `SessionNotes`
- `src/client/components/character/AddFromLibraryModal.jsx` — "Session Notes" field when linking a library character into a session

</code_context>

<specifics>
## Specific Ideas

quest-board (`C:\Repos\quest-board`) remains the reference pattern for the overall markdown approach (per `PROJECT.md`), but no new quest-board-specific references came up during this discussion beyond what's already in `PROJECT.md`.

</specifics>

<deferred>
## Deferred Ideas

- **Markdown syntax cheat-sheet / hint text** — `MDED-10`, explicitly v2/deferred in `REQUIREMENTS.md`. D-09 allows a minimal discretionary hint but not a full cheat-sheet implementation.
- **Extending auto-grow or markdown to `Inventory`, stat blocks, or random tables** — explicitly out of scope per `PROJECT.md` ("Extending auto-grow to textareas that stay plain text... not requested for this milestone").

### Reviewed Todos (not folded)
None — no pending todos matched this phase (`todo.match-phase` returned 0 matches).

</deferred>

---

*Phase: 2-Markdown Editing — Character & Location Fields*
*Context gathered: 2026-07-12*
