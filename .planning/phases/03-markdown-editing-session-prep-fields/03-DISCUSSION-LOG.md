# Phase 3: Markdown Editing — Session Prep Fields - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-13
**Phase:** 3-Markdown Editing — Session Prep Fields
**Areas discussed:** Block chrome density, Callout visual-identity integration, Loot item field scope

---

## Block chrome density

| Option | Description | Selected |
|--------|-------------|----------|
| Full chrome everywhere | Same MarkdownField component, same toolbar+tabs, at every site including small nested blocks. Zero divergence — most literal reading of MDED-09. | |
| Compact variant for blocks | Overview & Hook keeps full chrome; Notes/Callout/Loot get a smaller/lighter skin — still the same underlying render logic, just sized for a denser layout. | |
| You decide | Claude picks based on how it actually looks once the blocks are wired up — full chrome is the default assumption unless it visibly overwhelms the block UI. | ✓ |

**User's choice:** You decide.
**Notes:** Delegated to Claude's discretion at build time. Default assumption is full chrome unless it visibly overwhelms the block layout.

---

## Callout visual-identity integration

| Option | Description | Selected |
|--------|-------------|----------|
| Callout's colored box stays outer chrome | MarkdownField sits inside the existing colored-left-border box without its own border; forced-italic styling is dropped since the DM can now type *italics* explicitly via markdown. | |
| MarkdownField keeps its standard look | Full standard MarkdownField appearance (own border/bg/toolbar); the callout's colored-variant accent moves to a label/header strip above it instead of wrapping the whole field. | |
| You decide | Claude picks the integration that reads cleanest once built, keeping the flavor/read-aloud color distinction visible either way. | ✓ |

**User's choice:** You decide.
**Notes:** Delegated to Claude's discretion. Either integration direction is acceptable; the Flavor Text vs. Read-Aloud color distinction must remain visually clear regardless of which is chosen.

---

## Loot item field scope

| Option | Description | Selected |
|--------|-------------|----------|
| Only description gets markdown | name stays a plain single-line <input> (matches the Phase 2 precedent); description becomes a MarkdownField. | ✓ |
| You decide | Claude applies the same reasoning Phase 2 used without re-confirming here. | |

**User's choice:** Only description gets markdown.
**Notes:** Explicitly confirmed rather than delegated — matches Phase 2's precedent of excluding single-line/label fields (e.g. Inventory) from markdown treatment.

---

## Claude's Discretion

- Block chrome density (full vs. compact MarkdownField chrome for Notes/Callout/Loot) — see above.
- Callout visual-identity integration (how MarkdownField's chrome combines with the existing colored-border/italic styling) — see above.
- Whether Loot's description field follows whatever chrome-density resolution is chosen for blocks generally (it's treated as a block-level prose field, not a special fourth case).

## Deferred Ideas

None raised — discussion stayed within phase scope.
