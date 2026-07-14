# Phase 2: Markdown Editing — Character & Location Fields - Research

**Researched:** 2026-07-12
**Domain:** Client-side markdown editing/rendering (react-markdown ecosystem) + responsive layout inside fixed-width modals (CSS container queries) — pure React 18 frontend, no backend changes
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** MarkdownField applies to these `Character`/`GlobalCharacter` fields: `Description`, `SessionNotes`, `PersonalityTraits`, `Flaw`, `QuestHooks`. `Inventory` stays a plain textarea — it's a structured list (items/gold/equipment), not prose, consistent with auto-grow/markdown being scoped to prose fields only.
- **D-02:** This applies to **both** the in-session character form (`CharacterModal.jsx`, unlinked/ad-hoc branch) and the global Character Library form (`Library.jsx`) — not just one or the other. Consistency was chosen over minimizing footprint.
- **D-03:** MarkdownField applies to these `Location`/`GlobalLocation` fields: `Description`, `Notes`, `SecretsAndHazards`. Note `SecretsAndHazards` only exists on `GlobalLocation`, not the session-scoped `Location` entity.
- **D-04:** Same "both library and in-session" scope as characters — applies to `AddLocationModal.jsx`, `Library.jsx` (location form), `LocationsLibrary.jsx`, and `Locations.jsx` tab (session-scoped `SessionNotes` field), wherever these fields are editable.
- **D-05:** For **linked** characters/locations, the in-session UI shows a read-only "Shared Info" summary box instead of an editable field (`CharacterModal.jsx` linked branch ~line 41-78; `Locations.jsx` `EditLocationModal` ~line 24-45). These currently render the raw string directly. **Decision: these read-only summaries must render as markdown too**, not stay as raw text. `MarkdownField` (or a lighter render-only sibling) needs a read-only/display-only mode, distinct from its edit+preview mode.
- **D-06:** Exact breakpoint left to Claude's discretion, but several usage sites are **fixed-width modals** (`CharacterModal.jsx` 720px; `EditLocationModal` in `Locations.jsx` 560px). A pure `window`-width media query breakpoint may not produce the right side-by-side/tab-toggle switch inside a narrow fixed-width modal. Research/planning should evaluate container-based sizing (CSS container queries, or a JS-measured `ResizeObserver` approach) rather than assuming a single global viewport breakpoint works uniformly.
- **D-07:** On narrow/tab-toggle mode, the field always opens on the **Edit** tab by default, regardless of whether content already exists.
- **D-08:** `MarkdownField` includes a **light insert-syntax toolbar** — buttons (bold/italic/heading/list) that insert or wrap raw markdown characters at the cursor/selection, similar chrome to `RichTextEditor.jsx`'s toolbar but manipulating plain text rather than calling TipTap editor commands. This is a deliberate, informed deviation from PROJECT.md's locked "no toolbar" framing: it never renders inline — it only inserts/wraps raw markdown syntax in the underlying plain-text value.
- **D-09:** A syntax cheat-sheet hint near the editor is Claude's discretion — add only if it fits cleanly without changing layout. Keep it minimal; a full hint/cheat-sheet is `MDED-10` (v2, explicitly deferred).
- **D-10:** The editor grows **unbounded** with content — no max-height cap or internal scroll on the field itself. The containing modal/page scrolls instead.
- **D-11:** In side-by-side mode, the preview pane's height **matches the editor pane's height** (not independent/natural heights).

### Claude's Discretion

- Exact split-view breakpoint value/mechanism (D-06) — pick based on actual measured widths of the modals this ships in, favoring a container-based approach if it's not materially more complex than a viewport media query.
- Whether to add a syntax hint near the editor (D-09) — only if it doesn't complicate layout.
- Toolbar button set and exact insertion/wrapping behavior for the light toolbar (D-08) — mirror `RichTextEditor.jsx`'s button styling/chrome (`btnCls` pattern) for visual consistency, adapted to manipulate a plain-text `<textarea>` value instead of a TipTap editor instance.
- Whether the read-only markdown render (D-05) reuses `MarkdownField`'s preview-only rendering path directly, or is a separate lightweight component — as long as visual output matches the editable preview exactly.

### Deferred Ideas (OUT OF SCOPE)

- **Markdown syntax cheat-sheet / hint text** — `MDED-10`, explicitly v2/deferred. D-09 allows a minimal discretionary hint but not a full cheat-sheet implementation.
- **Extending auto-grow or markdown to `Inventory`, stat blocks, or random tables** — explicitly out of scope per `PROJECT.md`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MDED-03 | DM can write character bios/notes using markdown syntax with live rendering | Standard Stack (react-markdown+remark-gfm+remark-breaks), Architecture Patterns (`MarkdownField` component), Code Examples |
| MDED-04 | DM can write location descriptions using markdown syntax with live rendering | Same stack/component reused for Location fields per D-03/D-04 |
| MDED-05 | Markdown fields show a side-by-side edit+preview split view on wide viewports, falling back to Edit/Preview tab toggle on narrow viewports | Split-View Breakpoint Mechanism section — container-query measurements against actual modal widths |
| MDED-06 | Existing plain-text content (literal line breaks) renders correctly without collapsing into run-on paragraphs | `remark-breaks` research — confirmed single-newline→`<br>` behavior, confirmed it does NOT fix multi-blank-line collapsing (CommonMark behavior, not a bug) |
| MDED-07 | Markdown fields auto-grow to fit their content instead of being fixed-height boxes | Auto-Grow Textarea Technique section — scrollHeight pattern, unbounded per D-10 |
| MDED-08 | Markdown preview matches the app's dark theme (readable typography for headings, lists, bold/italic, blockquote, code) | Architecture Patterns — scoped CSS block pattern (matches `.tiptap-editor` convention), no Tailwind Typography plugin needed |
</phase_requirements>

## Summary

This phase has no backend surface — it is a pure React/Vite frontend addition. The three locked packages (`react-markdown` 10.1.0, `remark-gfm` 4.0.1, `remark-breaks` 4.0.0) are current, actively maintained by the `remarkjs` GitHub org, ESM-only (fine under Vite 6), and none are yet installed in `package.json`. `react-markdown` is safe by default against XSS (it builds a React element tree from the syntax tree — it never calls `dangerouslySetInnerHTML`), so no `rehype-sanitize` is needed given this phase doesn't enable `rehype-raw` (raw embedded HTML passthrough).

The highest-value finding from measuring the actual modal source is that **the split-view breakpoint problem is worse than CONTEXT.md's framing suggests**: it's not just that modals are fixed-width relative to the viewport — several of the *character* prose fields (`PersonalityTraits`, `Flaw`, `Description` in `CharacterModal.jsx` and `Library.jsx`) sit inside a `grid-cols-2` two-column layout **inside** the 720px modal, giving them an effective container width of only **~330px**, while location prose fields (`Description`, `Notes`, `SecretsAndHazards`) sit in single-column modals with **~520-640px** of width. A single fixed pixel breakpoint therefore needs to fall somewhere between these two measured widths (e.g. ~480px) and MUST be driven by the immediate parent container's width, not the modal's or the viewport's — confirming CONTEXT.md's suspicion and ruling out a `md:`/`lg:` Tailwind viewport variant entirely.

For the container-query mechanism itself: **Tailwind CSS v3.4 does NOT ship built-in `@container` support** (that only landed in Tailwind v4) — this project is pinned to Tailwind 3.4.17. Two viable paths exist: (a) the official `@tailwindcss/container-queries` plugin (peer-compatible with `>=3.2.0`, actively maintained by tailwindlabs, 1.78M weekly downloads), or (b) hand-written native CSS `@container` rules in `index.css`, which requires zero new dependencies and matches this codebase's existing convention of hand-rolled scoped CSS blocks for complex components (see `.tiptap-editor .ProseMirror` in `index.css`). Native CSS `@container` is broadly supported in all evergreen browsers since 2022-2023 (Chrome 105+, Firefox 110+, Safari 16+) — safe for a self-hosted DM tool used on modern browsers. **Recommendation: native CSS, no new dependency**, for consistency with the TipTap CSS pattern already in the file.

The auto-grow textarea (D-10, unbounded) is a well-established `scrollHeight`-reset pattern (`height: auto` then `height: scrollHeight + 'px'` on every value change) with no new dependency needed. Keeping the preview pane's height in sync with the editor (D-11) is naturally free once both live in the same CSS Grid row with `align-items: stretch`, or the editor's measured height is applied to a sibling.

The insert-syntax toolbar (D-08) is standard `textarea.selectionStart`/`selectionEnd` splicing. Because this is a **controlled** React `<textarea>`, naively splicing the string in JS and calling `setState` works for the *displayed* value but silently **breaks the browser's native Undo/Redo stack** (Ctrl+Z) for that keystroke, because React never dispatched a real `input` event through the DOM's internal value tracker. The standard fix — used by every markdown editor toolbar in the wild (including CodeMirror-free ones) — is to use the native `HTMLTextAreaElement.prototype.value` setter plus `dispatchEvent(new Event('input', { bubbles: true }))`, which preserves native undo. This is the one non-obvious pitfall in this phase and should be called out explicitly in the plan.

**Primary recommendation:** Ship one `MarkdownField.jsx` component (edit+preview mode) plus a lightweight read-only rendering path (either a `readOnly` prop on the same component or a thin sibling that shares the same `components`/plugin config) — no new backend work, no data migration, plain-text storage unchanged.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Markdown raw-text editing (textarea + toolbar) | Browser / Client | — | Pure React component state; no server round-trip per keystroke |
| Markdown → styled preview rendering | Browser / Client | — | `PROJECT.md` locks client-side rendering (`react-markdown`); no Razor/server-rendering pipeline exists in this ASP.NET minimal-API backend |
| Split-view vs. tab-toggle layout switching | Browser / Client | — | Pure CSS (`@container`) or `ResizeObserver`; no server involvement |
| Auto-grow sizing | Browser / Client | — | DOM measurement (`scrollHeight`) only |
| Persisted markdown source (plain string) | API / Backend | Database / Storage | Existing string columns (`Description`, `Notes`, etc.) — no schema change, no new endpoint; this phase writes through the same `PUT /api/sessions/{id}` / global character/location endpoints already in place |
| Read-only "Shared Info" markdown display | Browser / Client | — | Same client-side renderer, `readOnly` mode, no data fetch changes |

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `react-markdown` | npm | published 10.1.0 2025-03-07 (project est. 2015) | 22.1M/wk | github.com/remarkjs/react-markdown | OK | Approved |
| `remark-gfm` | npm | published 4.0.1 2025-02-10 | 30.9M/wk | github.com/remarkjs/remark-gfm | OK | Approved |
| `remark-breaks` | npm | published 4.0.0 2023-09-22 | 3.15M/wk | github.com/remarkjs/remark-breaks | OK | Approved |
| `@tailwindcss/container-queries` (candidate, see below — not the chosen path) | npm | published 2023-03-31, 0.1.1 | 1.78M/wk | github.com/tailwindlabs/tailwindcss-container-queries | OK | Approved but NOT recommended — see Architecture Patterns (native CSS `@container` preferred, zero new dependency) |
| `strip-markdown` | npm | published 2023-10-25, 508K/wk downloads | github.com/remarkjs/strip-markdown | OK | Approved — D-13, for card-preview/secondary read-only sites (post-research addition, see Open Questions resolution) |
| `remove-markdown` (considered, REJECTED) | npm | published 2026-05-09, 1.0M/wk downloads | github.com/zuchka/remove-markdown | OK (registry-clean) but NOT recommended — different, non-`remarkjs`-org maintainer, regex-based (not AST-based) — would not correctly distinguish "C# is great" from "# Heading" |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

All four packages verified `OK` via `gsd-tools query package-legitimacy check --ecosystem npm` (registry existence, publish history, non-deprecated, no suspicious `postinstall` script, active GitHub source repo under a well-known maintainer org). `react-markdown`/`remark-gfm`/`remark-breaks` package names were locked in `PROJECT.md` prior to this research session (user/prior-session decision, matching the `remarkjs` GitHub org convention) — cross-checked here against the npm registry and GitHub, tag `[VERIFIED: npm registry + package-legitimacy tool]`.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-markdown` | `^10.1.0` | Parses markdown and renders directly to React elements (no `dangerouslySetInnerHTML`) | The de facto React markdown renderer; 22M weekly downloads; maintained by unifiedjs/remarkjs core team `[VERIFIED: npm registry]` |
| `remark-gfm` | `^4.0.1` | Adds GitHub-Flavored Markdown: tables, strikethrough, autolinks, task lists | Locked in `PROJECT.md`; needed for the "lists, bold/italic, blockquote, code" success criteria plus tables if DMs use them `[VERIFIED: npm registry]` |
| `remark-breaks` | `^4.0.0` | Converts single soft line breaks (`\n`) into hard `<br>` breaks | Locked in `PROJECT.md`, directly required by MDED-06 ("existing plain-text content typed with literal line breaks still renders with those line breaks preserved") `[VERIFIED: npm registry]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `strip-markdown` | `^6.0.0` | Unified/remark plugin that strips markdown AST formatting nodes down to plain text, preserving literal characters that were never real syntax (e.g. mid-sentence `#`) | D-13 — card-preview truncated snippets and other secondary read-only text outside D-05's named "Shared Info" scope (`LocationCard`, `GlobalLocationCard`, `GlobalCharacterCard`, `AddFromLibraryModal.jsx`'s `CharacterPreview`). Use via `remark().use(stripMarkdown).processSync(source).toString()`. `[VERIFIED: npm registry + package-legitimacy tool + github.com/remarkjs/strip-markdown README]` |
| *(none else)* | — | — | No syntax highlighter, no `rehype-sanitize`, no `rehype-raw` needed — this phase's markdown is plain prose (headings/lists/bold/italic/blockquote/code), not embedded HTML or fenced code with language-aware highlighting per the success criteria |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-markdown` (AST → React elements) | `marked` / `markdown-it` + `dangerouslySetInnerHTML` | Faster and smaller, but reintroduces XSS surface that must be manually sanitized (`DOMPurify`) — `react-markdown`'s no-`dangerouslySetInnerHTML` design is the reason `PROJECT.md` locked this choice; not revisited here |
| `@tailwindcss/container-queries` plugin | Native CSS `@container` in `index.css` | Plugin gives Tailwind utility classes (`@sm:flex-row`); native CSS needs a few lines of hand-written CSS but adds zero new dependencies and matches the existing `.tiptap-editor` scoped-CSS convention already in `index.css` — **recommended: native CSS** |
| CSS `@container` (either path) | `ResizeObserver` + JS state (`isWide` boolean) | JS approach works in equally-old browsers and can drive non-CSS logic (e.g. conditionally mount toolbar variants), but adds render-thrash risk and more code than CSS; CSS containment is simpler, more idiomatic, and sufficient since only layout (not JS behavior) needs to change at the breakpoint |
| Auto-grow via `scrollHeight` reset | `react-textarea-autosize` npm package | A well-known small library (Andarist/`react-textarea-autosize`) exists and handles resize-observer edge cases automatically, but adds a dependency for a ~15-line hand-rollable hook; given the codebase has zero utility dependencies of this kind today (all auto-grow-adjacent code, e.g. TipTap, is hand-integrated), a local hook fits convention better. Flag as Claude's discretion at plan time if edge cases (browser zoom, font loading) prove troublesome |

**Installation:**
```bash
npm install react-markdown remark-gfm remark-breaks strip-markdown
```

**Version verification:** Confirmed via `npm view <package> version` against the live npm registry on 2026-07-12: `react-markdown@10.1.0` (published 2025-03-07), `remark-gfm@4.0.1` (published 2025-02-10), `remark-breaks@4.0.0` (published 2023-09-22). All three declare `react: '>=18'` / `@types/react: '>=18'` as peer requirements — compatible with this project's React `^18.3.1`. All three are pure ESM (`"type": "module"` in their own `package.json`s, confirmed via their `dependencies` graph resting on `unified@^11`), which Vite 6 (used here) handles natively — no CJS interop shims required.

## Architecture Patterns

### System Architecture Diagram

```
DM types in <textarea>  ──▶  MarkdownField (controlled component)
        │                          │
        │ onChange (raw string)    │ value prop (raw markdown string)
        ▼                          ▼
  parent form state         react-markdown
  (form.description,             │  remarkPlugins=[remarkGfm, remarkBreaks]
   form.personalityTraits,       │  components={ ...scoped dark-theme overrides }
   etc.)                         ▼
        │                  Rendered preview pane
        │                  (React element tree, no dangerouslySetInnerHTML)
        │
        ▼
  existing dirty-tracking / dispatchWithPersist flow (AppContext.jsx)
        │
        ▼
  PUT /api/sessions/{id}  or  PUT /api/global-characters/{id}  (UNCHANGED —
  plain string field, no new endpoint, no migration)

┌─────────────────────────────────────────────────────────┐
│ MarkdownField layout container ( container-type: inline-size ) │
│                                                           │
│  narrow (<~480px measured container width):              │
│    [Edit] [Preview]  ← tab toggle, opens on Edit (D-07)   │
│                                                           │
│  wide (≥~480px measured container width):                │
│    ┌───────────────┬───────────────┐                     │
│    │ <textarea>     │ preview pane  │  ← @container rule, │
│    │ (auto-grow,    │ (height       │    matches height   │
│    │  unbounded)    │  matched, D-11)│   via CSS grid row │
│    └───────────────┴───────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/client/components/
├── markdown/
│   ├── MarkdownField.jsx       # edit+preview mode, drop-in <textarea> replacement
│   ├── MarkdownPreview.jsx     # shared render-only component (used by MarkdownField's
│   │                           # preview pane AND the read-only "Shared Info" boxes, D-05)
│   ├── markdownToolbar.js      # pure functions: wrapSelection(), insertAtCursor(),
│   │                            # applyNativeValue() — no JSX, easily unit-testable
│   └── stripMarkdown.js        # thin wrapper around remark().use(stripMarkdown), D-13 —
│                                # used by card previews and other secondary read-only sites
├── RichTextEditor.jsx          # unchanged — Session Log only
```

`MarkdownPreview.jsx` should own the single `remarkPlugins`/`components` config so both the live preview and the D-05 read-only summaries render byte-for-byte identically (satisfies the "visual output matches" discretion note).

### Pattern 1: Shared render-only preview component (satisfies D-05 + MDED-09)

**What:** One `MarkdownPreview` component wraps `<ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>`; `MarkdownField` renders it inside its preview pane, and the two read-only "Shared Info" sites (`CharacterModal.jsx` linked branch, `Locations.jsx` `EditLocationModal`) import and render it directly against `form.personalityTraits` / `loc.description` etc.

**When to use:** Any place currently doing `{form.personalityTraits}` or `{loc.description}` raw-string interpolation for one of the D-01/D-03 fields.

**Example:**
```jsx
// Source: pattern derived from react-markdown README (github.com/remarkjs/react-markdown) + this codebase's existing components-prop-free styling convention
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

export default function MarkdownPreview({ value, className = '' }) {
  if (!value) return null
  return (
    <div className={`markdown-preview ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {value}
      </ReactMarkdown>
    </div>
  )
}
```

Dark-theme styling lives as a scoped CSS block in `index.css`, mirroring the existing `.tiptap-editor .ProseMirror` block rather than per-element `components` overrides or `@tailwindcss/typography` (not installed, and adding it would pull in a plugin for a handful of element styles this codebase already knows how to hand-write):

```css
/* Source: pattern mirrors existing .tiptap-editor .ProseMirror block above it in index.css */
.markdown-preview :is(h1, h2, h3) { color: #d4a574; font-weight: bold; margin: 12px 0 6px; }
.markdown-preview h1 { font-size: 1.5em; }
.markdown-preview h2 { font-size: 1.25em; }
.markdown-preview h3 { font-size: 1.1em; }
.markdown-preview p { margin: 0 0 8px 0; line-height: 1.6; }
.markdown-preview ul { padding-left: 20px; list-style: disc; margin: 8px 0; }
.markdown-preview ol { padding-left: 20px; list-style: decimal; margin: 8px 0; }
.markdown-preview li { margin: 2px 0; }
.markdown-preview strong { font-weight: 700; color: #f0f0f0; }
.markdown-preview em { font-style: italic; color: #d4d4d4; }
.markdown-preview blockquote { border-left: 3px solid #332922; padding-left: 12px; margin: 8px 0; color: #999999; }
.markdown-preview code { background: #332922; padding: 1px 5px; border-radius: 3px; font-size: 0.9em; }
.markdown-preview pre { background: #161310; border: 1px solid #332922; padding: 8px; border-radius: 6px; overflow-x: auto; }
```

### Pattern 2: Native CSS container query for split-view breakpoint (D-06)

**What:** Wrap `MarkdownField`'s outer element in `container-type: inline-size`, then use `@container` at-rule to switch between tab-toggle (default) and grid-based side-by-side.

**When to use:** Every `MarkdownField` instance — the same component ships at both the ~330px-wide character-field containers and the ~520-640px-wide location-field containers, so the switch must be driven by the immediate parent's measured width, not viewport or modal width.

**Example:**
```css
/* Source: MDN CSS Container Queries (developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) — native browser feature, Chrome 105+/Firefox 110+/Safari 16+ */
.markdown-field { container-type: inline-size; container-name: mdfield; }
.markdown-field-body { display: flex; flex-direction: column; }

@container mdfield (min-width: 480px) {
  .markdown-field-body { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: stretch; }
  .markdown-field-tabs { display: none; } /* side-by-side mode has no tabs */
}
```
480px sits between the measured ~330px character-field container width and the ~520-640px location-field container width (see Runtime measurements below) — verify against the actual rendered widths during implementation since padding/border-box math can shift by a few px, but this is the right order of magnitude.

**Runtime measurements (computed from current JSX, `[VERIFIED: codebase read]`):**

| Usage site | Modal/container width | Layout | Content width after `p-5` (40px) padding | Further split? | Effective field container width |
|---|---|---|---|---|---|
| `CharacterModal.jsx` unlinked branch — `PersonalityTraits`, `Flaw`, `Description` | 720px modal | `grid-cols-2 gap-5` (20px gap) | 680px | Yes, /2 columns | **~330px** |
| `CharacterModal.jsx` unlinked branch — `QuestHooks` | 720px modal | `grid-cols-2 gap-5` (right column) | 680px | Yes, /2 columns | **~330px** |
| `CharacterModal.jsx` linked branch — `SessionNotes` (D-05 companion editable field) | 720px modal | single column, `space-y-3` | 680px | No | **~680px** |
| `Library.jsx` `GlobalCharacterModal` — `PersonalityTraits`, `Flaw`, `Description`, `QuestHooks` | 720px modal | `grid-cols-2 gap-5` | 680px | Yes, /2 columns | **~330px** |
| `Library.jsx` `GlobalLocationModal` — `Description`, `SecretsAndHazards`, `Notes` | 580px modal | single column, `space-y-4` | 540px | No | **~540px** |
| `AddLocationModal.jsx` create step — `Description`, `SecretsAndHazards`, `Notes` | 580px modal | single column, `space-y-4` | 540px | No | **~540px** |
| `LocationsLibrary.jsx` `GlobalLocationModal` (see Open Questions — dead code) | 580px modal | single column | 540px | No | **~540px** |
| `Locations.jsx` `EditLocationModal` — `SessionNotes` | 560px modal | single column, `space-y-4` | 520px | No | **~520px** |
| `AddLocationModal.jsx` notes step — `SessionNotes` | 580px modal | single column | 540px | No | **~540px** |
| `AddFromLibraryModal.jsx` notes step — `SessionNotes` | 680px modal | single column, `space-y-4` | 640px | No | **~640px** |

**Conclusion:** every *Character* prose field (`Description`, `PersonalityTraits`, `Flaw`, `QuestHooks`) renders in a ~330px column; every *Location* field and every `SessionNotes` field (character or location) renders in a ~520-680px single column. A ~480px `@container` threshold cleanly separates these two groups — Character bio fields always show the tab toggle, Location/SessionNotes fields always show side-by-side, regardless of the user's actual browser window size. This is a structural property of the current two-column character form layout, not a viewport concern — a `md:`/`lg:` Tailwind viewport breakpoint would incorrectly show side-by-side for narrow 330px character columns on any wide monitor.

### Pattern 3: Auto-grow unbounded textarea (D-10)

**What:** Reset `textarea.style.height = 'auto'` then set it to `scrollHeight + 'px'` on every value change (and once on mount for pre-filled content).

**Example:**
```jsx
// Source: standard React community pattern (see e.g. tigerabrodi.blog/how-to-build-a-proper-auto-growing-textarea,
// blog.sachinchaurasiya.dev/how-to-dynamically-adjust-the-height-of-a-textarea-in-reactjs) — no library needed
import { useLayoutEffect, useRef } from 'react'

function useAutoGrow(value) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return ref
}
```
No `max-height` is set anywhere (D-10 explicitly requires unbounded growth — the containing modal already scrolls via `overflow-y-auto` on the modal's outer `<div>` in every usage site, e.g. `CharacterModal.jsx` line 45 `max-h-[92vh] overflow-y-auto`).

For D-11 (preview pane height matches editor pane height in side-by-side mode): since Pattern 2's `@container` rule puts both panes in the same CSS Grid row with `align-items: stretch` (default `grid-template-rows: auto`), the taller of the two children (almost always the `<textarea>`, since it drives layout via `useAutoGrow`) sets the row height and `stretch` makes the preview `<div>` match it automatically — no JS height-syncing code needed. Set `min-height: 0` and `overflow: hidden` is NOT needed since neither pane should ever scroll internally (unbounded growth applies to the whole field).

### Pattern 4: Insert-syntax toolbar preserving native undo (D-08)

**What:** Wrap/insert markdown syntax at the current selection using `document.execCommand('insertText', false, text)`, not a naive `setState` splice, not a native `value`-property-setter assignment, and — despite this document's own earlier guidance — not `textarea.setRangeText(...)` either.

**Why it matters:** A naive `onClick` handler that does `set('description', before + '**' + selected + '**' + after)` updates the *React* state and the *displayed* value correctly, but the browser's native undo stack (Ctrl+Z) is driven by the browser's own internal text-editing command pipeline — real keystrokes, IME composition, cut/paste, drag-drop, and `document.execCommand` — not by any DOM event. Skipping the real editing pipeline means the user's next Ctrl+Z after clicking "Bold" silently does nothing — a subtle, hard-to-notice bug class specific to controlled React inputs.

*Correction #2 (2026-07-12): this pattern was corrected twice in one day. The original shipped code used the native `HTMLTextAreaElement.prototype.value` property-descriptor setter plus `dispatchEvent(new Event('input'))`, on the claim that it "preserves native undo" — wrong, caught by real-browser UAT (see `.planning/debug/DEBUG-markdown-toolbar-undo.md`). The first fix replaced it with `textarea.setRangeText(...)`, on the claim (matching MDN/general web guidance, and Correction #1 below) that `setRangeText` is undo-tracked while `execCommand` is merely a deprecated legacy fallback. That claim was ALSO wrong: a human re-tested the `setRangeText` fix against the real, rebuilt app and Ctrl+Z still did nothing. The pattern that actually works, confirmed by the same human re-test, is `document.execCommand('insertText', ...)` — matching the approach used by [text-field-edit](https://github.com/fregante/text-field-edit), a cross-browser library maintained specifically for reliable undo-preserving programmatic text insertion in `<textarea>`/`<input>` fields. `execCommand` is formally deprecated in the HTML Living Standard, but in practice it goes through the actual editing-command pipeline real keystrokes use, which is exactly why a library solving this precise problem still reaches for it over the "modern," non-deprecated `setRangeText`. Lesson: deprecated-in-spec does not mean unreliable-in-practice, and the safest validation for undo-preservation claims is a human with a real keyboard against a real build — not spec reading, not `[VERIFIED]`-tagged registry checks, and not this project's own browser-automation tooling, which cannot exercise native Ctrl+Z at all (confirmed via a control test: plain real-keystroke-typed text with zero toolbar involvement also does not undo through it).*

**Example (corrected):**
```jsx
// execCommand('insertText', ...) goes through the browser's real editing-command
// pipeline (the same one real keystrokes use), so the change is recorded on the
// native undo stack as a discrete, undoable step. It operates on the field's
// *current selection*, so the range to replace is selected first. It fires a
// genuine (non-synthetic) input event on its own, so no manual dispatchEvent is
// needed for React's controlled-component reconciliation to notice the change.
function replaceRange(textarea, start, end, replacement) {
  textarea.setSelectionRange(start, end)
  if (document.activeElement !== textarea) textarea.focus()
  if (replacement === '') {
    document.execCommand('delete')
  } else {
    document.execCommand('insertText', false, replacement)
  }
}

function wrapSelection(textareaRef, before, after = before) {
  const el = textareaRef.current
  const { selectionStart: start, selectionEnd: end, value } = el
  const selected = value.slice(start, end)
  replaceRange(el, start, end, before + selected + after)
  // Reselect the originally-selected text, now sitting inside the markers.
  el.selectionStart = start + before.length
  el.selectionEnd = start + before.length + selected.length
}
```
`document.execCommand` is formally deprecated in the HTML Living Standard but is broadly supported in all evergreen browsers and has no non-deprecated equivalent that is actually undo-reliable for this use case — `setRangeText` is the "correct," non-deprecated API by spec, but real-browser testing here showed it does not reliably integrate with the native undo manager.

### Anti-Patterns to Avoid

- **Naive `setState` splice for toolbar buttons:** breaks native undo (Ctrl+Z) — see Pattern 4.
- **Native `value`-property-setter + `dispatchEvent` for toolbar buttons:** breaks native undo (Ctrl+Z) — the DOM `input` event does not drive the browser's undo manager.
- **`textarea.setRangeText(...)` for toolbar buttons:** *(Correction #2, 2026-07-12)* also did not reliably preserve native undo (Ctrl+Z) in real-browser testing here, despite matching general web guidance and being the non-deprecated, spec-recommended API. Use `document.execCommand('insertText', ...)` (Pattern 4) instead.
- **`@tailwindcss/typography` (`prose` classes) for the preview pane:** not installed, and this codebase already has an established hand-rolled scoped-CSS convention (`.tiptap-editor .ProseMirror`) for exactly this kind of styling — adding a second, different styling mechanism (a Tailwind plugin) for a visually similar problem (dark rich-text-like typography) is inconsistent with the existing pattern and pulls in an unused-elsewhere dependency.
- **`window`-width or Tailwind `md:`/`lg:` viewport breakpoints for split-view:** measurably wrong for this phase — see Pattern 2's width table. A DM on a 4K monitor with `CharacterModal.jsx` open still only has ~330px of field width for `Description`/`PersonalityTraits`; a global viewport breakpoint would incorrectly force side-by-side there.
- **`max-height` + internal scroll on the textarea or preview pane:** explicitly excluded by D-10 — the modal already scrolls.
- **`rehype-raw` / raw HTML passthrough:** not needed for this phase's plain-prose use case, and enabling it without also adding `rehype-sanitize` would reopen the XSS surface `react-markdown` avoids by default.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown parsing/rendering | A regex-based mini markdown-to-JSX converter | `react-markdown` + `remark-gfm` + `remark-breaks` | Markdown has surprisingly many edge cases (nested lists, escaped characters, mixed emphasis markers, table alignment); a hand-rolled parser will diverge from CommonMark/GFM behavior the moment a DM pastes anything non-trivial |
| XSS-safe HTML rendering from user text | Manual string-replace + `dangerouslySetInnerHTML` | `react-markdown`'s default AST→React-element rendering | `react-markdown` never touches `dangerouslySetInnerHTML`; reimplementing this safety property by hand is exactly the kind of "deceptively complex" security-adjacent problem call to avoid hand-rolling |
| Container-width-aware responsive layout | A `ResizeObserver` + `useState` + manual re-render loop | Native CSS `@container` | Fewer moving parts, no render-thrash risk, and the browser does the measurement/repaint scheduling itself; only reach for `ResizeObserver` if a future requirement needs the width value in JS (not the case here — D-06/D-07 are pure layout/interaction switches) |

**Key insight:** every piece of custom logic this phase truly needs (auto-grow height, toolbar cursor manipulation, container breakpoint) is small and well-precedented — the risk in this phase is not "under-building" but reaching for extra dependencies (`react-textarea-autosize`, `@tailwindcss/typography`, `@tailwindcss/container-queries`) where the codebase's existing hand-rolled conventions already cover the need in ~15-30 lines each.

## Common Pitfalls

### Pitfall 1: Toolbar buttons silently breaking Ctrl+Z

**What goes wrong:** DM clicks "Bold", types more text, then hits Ctrl+Z expecting to undo their last keystrokes — instead nothing happens, or the undo jumps unexpectedly.
**Why it happens:** Any script-driven assignment to a controlled textarea's `.value` — whether via a naive React `setState` splice, via the native `value`-property-descriptor setter plus `dispatchEvent(new Event('input'))`, **or via `textarea.setRangeText(...)`** — bypasses (or, for `setRangeText`, unreliably engages) the browser's real internal text-editing command pipeline, so the native undo manager never registers the change as an undoable step. The `input` DOM event only notifies JS listeners (including React); it does not drive the browser's own undo stack.
**How to avoid:** Use `document.execCommand('insertText', ...)` (Pattern 4) for every toolbar-triggered mutation — it goes through the actual editing-command pipeline real keystrokes use, so it is genuinely undo-tracked, and it fires a real (non-synthetic) `input` event on its own, so React's controlled-component reconciliation picks up the change with no manual `dispatchEvent` needed.
**Warning signs:** During manual testing, click a toolbar button then immediately press Ctrl+Z — if the button's insertion isn't undone, the pitfall is present. *(Correction #2, 2026-07-12: UAT Test 3 caught this twice in the same day — first against the native-setter version of Pattern 4, then again against the `setRangeText` version that replaced it. Only the `execCommand` version passed real-keyboard re-testing. See `.planning/debug/DEBUG-markdown-toolbar-undo.md`.)*

### Pitfall 2: `remark-breaks` does not fix multi-blank-line collapsing

**What goes wrong:** A DM might expect that pressing Enter twice (a blank line) between paragraphs of old plain-text content preserves extra vertical space; instead, CommonMark collapses any run of blank lines to a single paragraph break, with or without `remark-breaks`.
**Why it happens:** This is fundamental CommonMark/markdown behavior, not a `remark-breaks` bug — confirmed by the `remarkjs` maintainers (`[CITED: github.com/orgs/remarkjs/discussions/1095]`). `remark-breaks` only affects **single** soft line breaks (one `\n`) — it converts them to `<br>` instead of being swallowed into the same paragraph. It does not create multiple `<br>` elements for multiple blank lines.
**How to avoid:** This is expected/acceptable behavior — MDED-06's actual wording ("literal line breaks preserved, not collapsed into a run-on paragraph") is fully satisfied by `remark-breaks`'s single-newline→`<br>` conversion. No further work needed; just don't over-promise "exact whitespace preservation" during UAT — a DM's double-blank-line spacing will visually compress to single-blank-line spacing, which is correct GFM/CommonMark behavior and matches how GitHub itself renders the same content.
**Warning signs:** UAT complaint like "my double line breaks got squished" — this is expected, not a bug; consider a one-line note in the (optional, D-09) syntax hint if one is added.

### Pitfall 3: Read-only "Shared Info" secrets/hazards loses its custom bullet-line styling

**What goes wrong:** `Locations.jsx`'s `EditLocationModal` (line 37-44) and `AddLocationModal.jsx`'s notes step (line 239-246) currently render `secretsAndHazards` with **custom** per-line logic — `.split('\n').filter(Boolean).map(...)` producing a red "▸" bullet per line, NOT literal markdown. If D-05's "must render as markdown too" is implemented by swapping this custom renderer for a generic `MarkdownPreview`, the visual output changes: a DM who never used markdown list syntax (`- item`) will see their secrets/hazards render as one plain paragraph instead of the current per-line bulleted list, since `remark-breaks` turns single newlines into `<br>` (not list items).
**Why it happens:** The custom split-on-newline bullet renderer and true markdown list rendering are visually similar but structurally different — one is view-layer formatting of a flat string, the other requires the DM to actually type `- ` or `* ` markdown syntax for each line to become a list item.
**How to avoid:** Flag explicitly during planning whether D-05's read-only markdown replacement should (a) run existing content through `remark-breaks` only (matches current one-bullet-per-line visual via `<br>`, loses the red "▸" marker unless custom-styled via CSS `::before` on `<br>`-adjacent lines — not straightforward), or (b) accept the visual change and document it in the phase's UAT notes, or (c) special-case `secretsAndHazards` to keep its current custom per-line renderer and only apply true `MarkdownPreview` to `description`. This is a genuine design decision CONTEXT.md's D-05 did not fully resolve — surfaced here as an Open Question below, not decided by this research.
**Warning signs:** UAT reviewer sees hazards list rendered as a single paragraph instead of bulleted lines.

### Pitfall 4: ESM-only packages under Vite — generally safe, but verify no legacy tooling touches this path

**What goes wrong:** `react-markdown`, `remark-gfm`, and `remark-breaks` are pure ESM (`"type": "module"`), which is fully supported by Vite 6 (this project's bundler) with zero configuration. The risk is theoretical for this project (no CJS-only bundler in the toolchain), but worth a one-line pre-flight check.
**Why it happens:** Older bundlers (CRA/webpack-without-ESM-config, Jest's default CJS transform) choke on ESM-only packages; Vite does not.
**How to avoid:** No action needed — `npm run build` (Vite) after `npm install` is sufficient verification; flag only if a future test runner (Jest) is introduced without ESM support configured.
**Warning signs:** `ERR_REQUIRE_ESM` at build/test time — not expected here.

## Code Examples

Verified patterns from official sources:

### Basic react-markdown usage with the locked plugin set
```jsx
// Source: github.com/remarkjs/react-markdown README (fetched 2026-07-12)
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

<ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
  {markdownSource}
</ReactMarkdown>
```

### Custom component override (only if a specific element needs different markup — not required for this phase's plain scoped-CSS approach, documented for completeness)
```jsx
// Source: github.com/remarkjs/react-markdown README
<ReactMarkdown
  components={{
    h1: 'h2', // demote h1 to h2 to avoid competing with modal's own <h2> title
  }}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `react-markdown` v8/v9 CJS+ESM dual build | `react-markdown` v10, pure ESM | v9 (2024) dropped CJS | Requires an ESM-capable bundler (Vite qualifies, no action needed) |
| Manual `dangerouslySetInnerHTML` + `DOMPurify` for markdown-to-HTML in React | `react-markdown`'s direct AST→React-element rendering (no HTML string step at all) | Longstanding `react-markdown` design, not a recent change | Eliminates an entire class of sanitization bugs by construction |
| `@tailwindcss/container-queries` plugin required for any container query in Tailwind projects | Tailwind v4 ships `@container` support in core; **this project is on v3.4.17**, so the plugin (or native CSS) is still required | Tailwind v4 (2025) | Not directly relevant unless/until this project upgrades to Tailwind v4 — noted so the plan doesn't assume core support that doesn't exist at v3.4 |

**Deprecated/outdated:**
- `document.execCommand('insertText', …)`: formally deprecated in the HTML Living Standard, but — despite two earlier corrections in this document claiming otherwise — this is what the shipped fix actually uses (Pattern 4), because it is the only approach that survived real-keyboard UAT re-testing. `textarea.setRangeText(...)`, the "modern," non-deprecated, spec-recommended alternative, does not reliably preserve native undo for this use case in practice. *(Correction #2, 2026-07-12: an earlier version of this note recommended `setRangeText` over `execCommand` on undo-preservation grounds, and before that, an even earlier version recommended the native `value`-property-setter + `dispatchEvent` pattern over both. Both recommendations were factually wrong — see Pattern 4's correction notes.)*

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A ~480px `@container` threshold is the right split point between the measured ~330px character-field containers and ~520-640px location-field containers | Pattern 2 | Low — this is a tunable CSS value, not a structural decision; if 480px feels wrong during visual QA it's a one-line CSS edit, not a rework |
| A2 | Native CSS `@container` (vs. the `@tailwindcss/container-queries` plugin) is the better fit for this codebase | Architecture Patterns / Alternatives Considered | Low — both are legitimate `[OK]`-verdict options; if the planner/team prefers Tailwind utility-class ergonomics over hand-written CSS, swapping to the plugin is a drop-in change, not a redesign |
| A3 | ~~Read-only "Shared Info" `secretsAndHazards` rendering...~~ **RESOLVED:** locked as D-12 (keep custom bullet renderer, no markdown rendering for this one field) after post-research user review | Common Pitfalls #3 / Open Questions | Resolved — no longer a risk |

**If this table is empty:** N/A — see rows above; A1/A2 remain low-risk tuning decisions; A3 was resolved via user decision (D-12) after this research was written.

## Open Questions — RESOLVED (post-research user review, 2026-07-12)

All four open questions below were raised by this research and then resolved directly with the user in a follow-up review round. Resolutions are locked in CONTEXT.md as D-04 (corrected), D-12, and D-13 — restated here for traceability between research and decisions.

1. **Card-level truncated description previews — RESOLVED as D-13.**
   - Original question: should `LocationCard` (`tabs/Locations.jsx`), `GlobalLocationCard`/`GlobalCharacterCard` (`Library.jsx`) truncated previews render markdown?
   - Resolution: Use `strip-markdown` (official `remarkjs`-org plugin, AST-based) to render clean plain text — not raw markdown source, not full HTML rendering. User specifically requested this after recalling quest-board uses the same "parse correctly, then strip only real syntax" pattern (verified: `strip-markdown` correctly preserves `#` in "C# is great" while stripping it from "# Real Heading", since it operates on the parsed AST, not regex). See "strip-markdown" addition to Standard Stack below.

2. **`AddFromLibraryModal.jsx`'s `CharacterPreview` — RESOLVED as D-13.**
   - Same resolution as #1: uses `strip-markdown`, not full markdown rendering, not raw text.

3. **`LocationsLibrary.jsx` dead code — RESOLVED, D-04 corrected.**
   - User initially pushed back on the dead-code claim, recalling "a library button that opens a list for locations and characters." Re-verified: that button routes to `Library.jsx`, which has its own **internal** two-tab `LocationsTab`/`CharactersTab` switcher (`activeTab` state, `TABS` array) — a different file that happens to serve the same user-facing purpose. `LocationsLibrary.jsx` remains confirmed dead code (no import anywhere in `src/client`). Resolution: **excluded from this phase** — CONTEXT.md's D-04 now points to `Library.jsx`'s internal `LocationsTab` as the real usage site instead.

4. **Read-only `secretsAndHazards` custom bullet-line styling — RESOLVED as D-12.**
   - Resolution: `SecretsAndHazards`' read-only display keeps its current custom `▸`-per-line bullet renderer, unchanged. Only `Description`/`Notes` get true markdown rendering per D-05. Avoids visually breaking existing hazard notes typed one-per-line without markdown list syntax.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | `npm install react-markdown remark-gfm remark-breaks` | ✓ (per `npm view` calls succeeding during this research session) | not directly queried, but registry calls succeeded | — |
| Vite | ESM package bundling | ✓ | `^6.0.7` (package.json) | — |
| Modern evergreen browser (Chrome 105+/Firefox 110+/Safari 16+) | CSS `@container` support (Pattern 2) | Assumed ✓ (self-hosted DM tool, single/small user base, no legacy-browser requirement stated anywhere in `PROJECT.md`/`CLAUDE.md`) | — | If a legacy browser must be supported, fall back to the `@tailwindcss/container-queries` plugin (same browser support floor — the plugin is a Tailwind authoring convenience, not a polyfill) or a `ResizeObserver` JS approach, which has near-identical modern-browser-only support anyway |

No missing dependencies block this phase — everything needed is either already present (Node/npm/Vite/React 18/Tailwind 3.4.17) or a single `npm install` away.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **None currently configured for the frontend.** `package.json` has no `test` script, no `vitest`/`jest` devDependency, and no `*.test.jsx`/`*.spec.jsx` files exist anywhere in `src/client/`. The only test projects in the repo (`Omphalos.UnitTests`, `Omphalos.IntegrationTests`, xUnit/.NET) cover the backend, which this phase does not touch. |
| Config file | none — see Wave 0 |
| Quick run command | n/a (no frontend framework installed) |
| Full suite command | n/a |

This phase is 100% frontend, UI-layout, and visual-rendering work (markdown preview styling, responsive split-view, auto-grow, toolbar cursor manipulation) — the kind of change this project has so far validated exclusively through conversational UAT (`gsd-verify-work`), consistent with Phase 1's closure pattern (`test(01): confirm UAT — all 4 human-verification items pass`).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MDED-03 | Character bio/notes fields render live markdown preview | manual (visual) | n/a — UAT | ❌ Wave 0 (framework absent) |
| MDED-04 | Location description fields render live markdown preview | manual (visual) | n/a — UAT | ❌ Wave 0 |
| MDED-05 | Side-by-side vs. tab-toggle switches correctly per container width | manual (visual, resize modal/window) | n/a — UAT | ❌ Wave 0 |
| MDED-06 | Existing plain-text literal line breaks still render correctly (regression check on old data) | unit-testable in isolation (pure function: markdown source string → expected `<br>` count) OR manual UAT against a seeded old-format record | `vitest run src/client/components/markdown/__tests__/breaks.test.js` (if Wave 0 framework added) | ❌ Wave 0 |
| MDED-07 | Field auto-grows unbounded with content | manual (visual, type long content, confirm no internal scrollbar appears) | n/a — UAT | ❌ Wave 0 |
| MDED-08 | Preview typography matches dark theme (headings/lists/bold/italic/blockquote/code all styled, none default-browser-black-on-white) | manual (visual) | n/a — UAT | ❌ Wave 0 |
| D-08 (toolbar, not a formal REQ but locked decision) | Toolbar buttons wrap/insert syntax AND preserve Ctrl+Z undo | unit-testable: `wrapSelection()`/`setNativeTextareaValue()` are pure-ish DOM functions, testable with `@testing-library/react` + `userEvent`, OR manual (click button, Ctrl+Z, confirm reversal) | `vitest run src/client/components/markdown/__tests__/toolbar.test.js` (if Wave 0 framework added) | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** manual smoke check in the browser (dev server: `npm run dev`) — type sample markdown into one Character field and one Location field, confirm preview renders and grows.
- **Per wave merge:** re-run the full D-01/D-03 field list across all named usage sites (`CharacterModal.jsx`, `Library.jsx` ×2 forms, `AddLocationModal.jsx`, `Locations.jsx`, `AddFromLibraryModal.jsx`) — this is inherently manual given no frontend test runner exists.
- **Phase gate:** Full conversational UAT via `gsd-verify-work` covering all 4 phase success criteria before phase closure, matching Phase 1's established pattern.

### Wave 0 Gaps

- [ ] **Frontend test framework install** (`vitest` + `@testing-library/react` + `@testing-library/user-event` + `jsdom`) — genuinely optional for this phase given the project's established all-manual-UAT convention (Phase 1 had zero new automated frontend tests), but recommended at minimum for the two purely-logical, non-visual pieces that are cheap to unit test and easy to silently regress: (a) the toolbar's cursor-insert/wrap function (Pattern 4 — the native-undo-preservation behavior is exactly the kind of thing that "looks right" visually while being subtly broken), and (b) the `remark-breaks` line-preservation regression check against a fixed sample of old-format plain-text content (MDED-06). If the planner decides to stay 100% manual-UAT (matching project convention), state that decision explicitly rather than silently skipping — this is a genuine judgment call, not a hard requirement.
- [ ] If a test framework is added: `src/client/components/markdown/__tests__/toolbar.test.js`, `src/client/components/markdown/__tests__/breaks.test.js` — new files, no existing fixtures to reuse.
- [ ] No `conftest`/shared-fixture equivalent needed for such a small, isolated addition.

*(If the planner chooses manual-UAT-only, consistent with this project's Phase 1 precedent: "None — all verification for this phase is conversational UAT per project convention; no frontend test infrastructure exists or is being introduced.")*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Unchanged — this phase touches no auth code |
| V3 Session Management | No | Unchanged |
| V4 Access Control | No | Unchanged — same existing endpoints/authorization already in place for Character/Location saves |
| V5 Input Validation | Yes (light) | Markdown source is stored as an opaque string (existing DB columns, no new validation needed server-side); client-side, `react-markdown`'s parser is itself the "validator" in the sense that malformed markdown degrades gracefully to plain text rather than erroring |
| V6 Cryptography | No | Not applicable |
| V5/XSS-adjacent (Output Encoding) | Yes | `react-markdown`'s default rendering path (AST → React elements, no `dangerouslySetInnerHTML`) — this is the standard, correct control; do not introduce `rehype-raw` (raw HTML passthrough) in this phase, as that would require also adding `rehype-sanitize` to stay safe, and neither is needed for the plain-prose scope here |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Stored XSS via markdown content (a DM types/pastes a malicious payload disguised as markdown, e.g. an autolink or raw HTML tag, hoping it executes when another user views the rendered preview) | Tampering / Information Disclosure | `react-markdown`'s default configuration (no `rehype-raw`) strips/escapes raw HTML tags found in markdown source rather than rendering them — confirmed via official README `[CITED: github.com/remarkjs/react-markdown]`. Do not add `rehype-raw` in this phase. If link rendering (`remark-gfm` autolinks) is a future concern, `react-markdown`'s `urlTransform` prop is the sanctioned customization point — leave at its safe default here. |
| `javascript:` URL in a markdown link (`[click me](javascript:alert(1))`) | Tampering | `react-markdown`'s default `urlTransform` (formerly `transformLinkUri`) already neutralizes unsafe URL schemes — no action needed beyond not overriding it with something permissive `[CITED: github.com/remarkjs/react-markdown]` |

This phase's threat surface is low: all markdown content is authored by the same trusted DM/admin-level users who already have full CRUD access to this data via the existing plain-`<textarea>` fields being replaced — this phase changes *rendering*, not *trust boundary*, since the data was always attacker-controllable-only-by-an-already-privileged-user (self-hosted, small-user-base app per `PROJECT.md`/`CLAUDE.md` context).

## Sources

### Primary (HIGH confidence)

- `gsd-tools query package-legitimacy check --ecosystem npm react-markdown remark-gfm remark-breaks @tailwindcss/container-queries` — registry existence, publish dates, weekly downloads, repo URLs, deprecation/postinstall-script checks, run 2026-07-12
- `npm view react-markdown/remark-gfm/remark-breaks version|dependencies|peerDependencies` — live npm registry queries, run 2026-07-12
- Direct codebase reads: `package.json`, `tailwind.config.js`, `src/client/index.css`, `src/client/App.jsx`, `src/client/components/RichTextEditor.jsx`, `src/client/components/character/CharacterModal.jsx`, `src/client/components/tabs/Locations.jsx`, `src/client/components/Library.jsx`, `src/client/components/location/AddLocationModal.jsx`, `src/client/components/LocationsLibrary.jsx`, `src/client/components/character/AddFromLibraryModal.jsx`, `.planning/config.json`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`

### Secondary (MEDIUM confidence)

- `github.com/remarkjs/react-markdown` README (fetched via WebFetch 2026-07-12) — usage examples, `components` prop pattern, security/XSS-safety statement, ESM-only note
- `github.com/orgs/remarkjs/discussions/1095` (fetched via WebFetch 2026-07-12) — `remark-breaks` multi-blank-line behavior clarified by maintainers
- `tailwindcss.com/blog/tailwindcss-v3-4` (fetched via WebFetch 2026-07-12) — confirms container queries are NOT part of Tailwind v3.4 core (corrects an initial WebSearch summary that incorrectly implied built-in v3.4 support)
- MDN CSS Container Queries browser support figures (via WebSearch, cross-checked against caniuse.com references, 2026-07-12)
- React controlled-textarea native-value-setter undo-preservation pattern (via WebSearch, cross-checked across multiple community sources, 2026-07-12)

### Tertiary (LOW confidence)

- General "auto-grow textarea in React" community blog posts (WebSearch aggregate summary, not independently fetched in full) — the underlying `scrollHeight` technique is well-established and low-risk regardless, but individual blog post code wasn't fetched verbatim; the pattern shown in this document is a standard synthesis, not a verbatim quote from any single low-confidence source

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all three markdown packages verified via authoritative registry check + official README; no ambiguity on version/compatibility
- Architecture (container-query breakpoint): HIGH for the width measurements (direct codebase read), MEDIUM for the exact 480px threshold choice (a reasonable, tunable value, not a hard-verified constant)
- Pitfalls: HIGH for the native-undo-preservation issue (well-documented, reproducible browser behavior) and the `remark-breaks` blank-line behavior (confirmed by maintainers); MEDIUM for the "Shared Info" secrets/hazards visual-change pitfall (a design tradeoff, not a verified bug)

**Research date:** 2026-07-12
**Valid until:** 2026-08-11 (30 days — stable, mature ecosystem; react-markdown/remark-gfm/remark-breaks are low-churn packages, and CSS `@container` browser support only grows over time)
