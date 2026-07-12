# Phase 2: Markdown Editing — Character & Location Fields - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-12
**Phase:** 2-Markdown Editing — Character & Location Fields
**Areas discussed:** Field scope, Split-view breakpoint, Syntax helpers, Auto-grow limits

---

## Field Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Description + SessionNotes | Matches MDED-03's wording most directly ("bios/notes") — Description is the bio, SessionNotes is literally labeled Notes. Smallest footprint. | |
| + PersonalityTraits/Flaw/QuestHooks | All prose fields get markdown except Inventory (stays a plain list). | ✓ |
| Description only | Narrowest reading — just the character bio field. | |

**User's choice:** + PersonalityTraits/Flaw/QuestHooks (character fields: Description, SessionNotes, PersonalityTraits, Flaw, QuestHooks all get MarkdownField)

| Option | Description | Selected |
|--------|-------------|----------|
| Description only | Matches MDED-04's literal wording — narrowest scope. | |
| Description + Notes | Adds the location's own Notes field. | |
| Description + Notes + Secrets | All three prose fields get markdown — full consistency. | ✓ |

**User's choice:** Description + Notes + Secrets (location fields: Description, Notes, SecretsAndHazards)

| Option | Description | Selected |
|--------|-------------|----------|
| Both (Recommended) | Library forms and in-session forms both use MarkdownField for the chosen fields. | ✓ |
| In-session only | Only session-scoped forms get markdown; library forms stay plain textareas. | |

**User's choice:** Both — library forms (Library.jsx, LocationsLibrary.jsx) and in-session forms (CharacterModal.jsx, Locations.jsx tab, AddLocationModal.jsx) both get MarkdownField.

| Option | Description | Selected |
|--------|-------------|----------|
| Render as markdown (Recommended) | Read-only "Shared Info" summary for linked characters/locations renders markdown, not literal syntax characters. | ✓ |
| Keep as plain text | Read-only summary stays raw text as today. | |

**User's choice:** Render as markdown — discovered mid-discussion while reading `CharacterModal.jsx`'s linked-character branch and `Locations.jsx`'s `EditLocationModal`, which currently render shared-info fields as raw strings with no markdown processing at all.

**Notes:** Field scope turned out to be significantly wider than the requirement text ("bios/notes", "descriptions") implied — the actual entities have 5 free-text character fields and up to 3 free-text location fields, spread across 6 different component files depending on library vs. in-session vs. linked vs. unlinked state. This was the most consequential area discussed.

---

## Split-View Breakpoint

| Option | Description | Selected |
|--------|-------------|----------|
| Tailwind md (768px) (Recommended) | Matches existing responsive pattern (Locations.jsx uses md:grid-cols-2). | |
| Tailwind lg (1024px) | More conservative — side-by-side only on genuinely wide screens. | |
| Let Claude decide | Pick based on actual modal widths (e.g. CharacterModal is a fixed 720px modal, not full viewport). | ✓ |

**User's choice:** Let Claude decide.
**Notes:** Flagged that several usage sites are fixed-width modals (720px, 560px), not full-viewport — a naive `window`-width breakpoint may not switch layouts correctly inside a narrow modal on a wide screen. Recommended researching container-query or ResizeObserver-based sizing instead of assuming a single global viewport breakpoint.

| Option | Description | Selected |
|--------|-------------|----------|
| Edit (Recommended) | Field opens ready to type, matching current textarea behavior. | ✓ |
| Preview if content exists, else Edit | Populated fields open showing rendered result first. | |

**User's choice:** Edit — always opens on the Edit tab by default on narrow viewports.

---

## Syntax Helpers

| Option | Description | Selected |
|--------|-------------|----------|
| No toolbar — raw typing only (Recommended) | Matches the "true markdown editing" decision in PROJECT.md and REQUIREMENTS.md's toolbar exclusion. | |
| Light insert-syntax toolbar | Buttons (B/I/#/list) that insert raw markdown syntax at the cursor, distinct from a full WYSIWYG toolbar — never renders inline. | ✓ |

**User's choice:** Light insert-syntax toolbar, after the distinction from the excluded "full WYSIWYG toolbar / inline-render-as-you-type editing" was explained — this toolbar manipulates plain-text markdown characters, it doesn't render inline like TipTap.

| Option | Description | Selected |
|--------|-------------|----------|
| No hint text | Keep it clean — matches v1 scope; full cheat-sheet is MDED-10 (v2, deferred). | |
| Let Claude decide | Small discretionary addition if it fits naturally. | ✓ |

**User's choice:** Let Claude decide — discretionary, must not duplicate the deferred MDED-10 cheat-sheet requirement.

---

## Auto-Grow Limits

| Option | Description | Selected |
|--------|-------------|----------|
| Unbounded growth (Recommended) | Matches MDED-07's literal wording — no ceiling, containing modal/page scrolls instead. | ✓ |
| Cap with internal scroll (e.g. ~500px) | Prevents one huge field from pushing everything else off-screen. | |

**User's choice:** Unbounded growth.

| Option | Description | Selected |
|--------|-------------|----------|
| Match editor height (Recommended) | Preview pane grows/shrinks to match the editor's current height. | ✓ |
| Independent heights | Preview renders at its own natural height, scrolls independently. | |

**User's choice:** Match editor height.

---

## Claude's Discretion

- Exact split-view breakpoint value/mechanism — evaluate container-query or ResizeObserver-based sizing given several usage sites are fixed-width modals, not full-viewport.
- Whether to add a syntax hint near the editor — only if it doesn't complicate layout; must not duplicate the deferred MDED-10 cheat-sheet.
- Toolbar button set and exact insertion/wrapping behavior for the light toolbar — mirror `RichTextEditor.jsx`'s `btnCls` styling pattern, adapted for plain-text manipulation.
- Whether the read-only markdown render reuses `MarkdownField`'s preview path directly or is a separate lightweight component.

## Deferred Ideas

- Markdown syntax cheat-sheet / hint text — `MDED-10`, explicitly v2/deferred in `REQUIREMENTS.md`.
- Extending auto-grow or markdown to `Inventory`, stat blocks, or random tables — explicitly out of scope per `PROJECT.md`.
