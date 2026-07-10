# Feature Research

**Domain:** Bolt-on markdown editing + image-crop-library swap for an existing brownfield React SPA (DM campaign manager)
**Researched:** 2026-07-10
**Confidence:** MEDIUM (web-search-grade sources for UX conventions; no official Cropper.js v2 docs fetched via context7 in this session — see Sources)

## Scope Note

This is not a green-field "pick a markdown editor product" or "pick a crop tool product" decision — both libraries are already chosen (`react-markdown` + `remark-gfm`, and Cropper.js v2, per `PROJECT.md` Key Decisions). This research answers a narrower question: **given those libraries are fixed, which specific behaviors are table stakes vs. nice-to-have vs. deliberately-skipped**, so the swap doesn't regress the existing hand-rolled `CropModal.jsx` or the existing plain `<textarea>` fields.

Two independent feature landscapes are covered below: (A) Markdown editing, (B) Image crop replacement.

---

## A. Markdown Editing — Feature Landscape

### A1. Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Edit / Preview toggle (tab-style, "Write" / "Preview") | This is the baseline convention (GitHub's own editor uses exactly this pattern) for any bolt-on markdown field. Anything less (raw-only, no way to check rendering) is a regression vs. having *any* preview at all. | LOW | Two-state local toggle per field instance; default to Edit mode since that's the current behavior (plain textarea) users already expect on page load. |
| GFM rendering (tables, task lists, strikethrough, autolinks, fenced code) via `remark-gfm` | Already the chosen library; GFM is the de facto "markdown that behaves like GitHub/Discord" users half-know from other apps. | LOW | Already decided in PROJECT.md — just confirming it's correctly the minimum viable syntax subset, not an add-on. |
| Auto-grow height in edit mode | Explicit Active requirement in PROJECT.md; also a genuine regression risk — the current fields are fixed-height textareas people already resize by scrolling; shrinking that to a cramped box would be a step backward. | LOW–MEDIUM | Use `react-textarea-autosize` (~1.3KB, standard React solution). Controlled component, `box-sizing: border-box`, disable manual CSS `resize` handle (conflicts with autosize). No hard `maxRows` needed here (session prep / bios are meant to grow), but do NOT set a fixed `height` anywhere in the wrapper — autosize and fixed height fight each other. |
| Single-newline → visual line break preserved in preview | **Critical brownfield risk, not a nice-to-have.** Standard Markdown (and `remark-gfm`) treats a single `\n` as a soft break inside the same paragraph (no visible break) — it only starts a new paragraph on a *blank* line. Every field in scope already has real user data typed as a plain textarea, where every `Enter` key created a visible line break. Rendering that existing content through un-augmented `react-markdown` will visually collapse multi-line notes into single run-on paragraphs — a hard regression on day one for every existing session, bio, and location description. | LOW | Add `remark-breaks` (or equivalent single-newline-to-`<br>` handling) alongside `remark-gfm`. This must ship with the v1, not be deferred — it's what keeps existing data from looking broken the moment this feature lands. |
| No raw HTML execution | Content in these fields may include stray `<`/`>` characters (e.g., "damage < 5", pasted text) that must not be interpreted as HTML/JS. | LOW (default behavior) | `react-markdown` does **not** render raw HTML unless `rehype-raw` is explicitly added — do not add it. This is a "don't add a feature" table stake, not a build task. |
| Preview matches app's dark theme (readable typography: headings, lists, bold/italic, blockquote, code) | A raw unstyled `<div>` of rendered HTML will look broken against the `bg1`/`bg2`/`text1` dark palette (default browser styles assume a white page). | LOW–MEDIUM | Needs a small `prose`-equivalent stylesheet scoped to the preview container matching `amber`/`text1`/`text2` tokens — Tailwind Typography plugin is heavier than needed for 4 fields; a handful of scoped CSS rules is enough. |
| Visual/behavioral consistency with existing modal & field conventions | This is a brownfield app with an established look; a wildly different-styled editor next to `SettingsModal.jsx`-pattern UI would feel bolted-on. | LOW | Reuse existing `inp` class tokens (border `#332922`, bg `#161310`, focus `#d4a574`) for the edit-mode textarea; toggle buttons should reuse the `RichTextEditor.jsx` toolbar button styling (`btnCls` active/inactive pattern) for familiarity, not invent a new visual language. |
| Existing placeholder text preserved | Fields like Overview & Hook already have helpful placeholder copy ("The setup, the hook that draws the party in..."). | LOW | Carry over placeholders unchanged into the new component's edit mode. |

### A2. Differentiators (Nice-to-Have, Not Required for v1)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Small inline syntax hint / cheat-sheet (e.g., collapsible "Markdown cheatsheet" link or a one-line `**bold** *italic* # heading - list` legend under the toggle) | DMs are not developers; research on non-developer markdown adoption consistently shows raw-syntax-only tools create friction for non-technical users, and a lightweight reminder (not a full toolbar) is the cheapest way to reduce that friction. | LOW | A static text hint or `<details>` element, no JS logic — much cheaper than a toolbar and doesn't conflict with the "keep it simple" architecture decision. |
| Side-by-side split view (edit + preview simultaneously) on wide viewports | Removes the extra click of tab-toggling for a large field like Overview & Hook; commonly cited as a UX upgrade over tab-toggle once screen space allows it. | MEDIUM | Reasonable for the largest field (Overview & Hook / character bios) but likely overkill for short blocks (Loot/Callout, which are often 1–3 lines) — if pursued, scope it to specific fields rather than the shared component's default, or make it a responsive enhancement (stack on narrow width, split on wide) rather than a firm requirement. |
| Remembering last-used mode (edit vs. preview) per field across sessions | Minor convenience for a DM who always previews before a session. | LOW | Not requested; trivial to add later via localStorage if wanted. |

### A3. Anti-Features (Explicitly Skip)

| Feature | Why It Seems Appealing | Why Problematic Here | Alternative |
|---------|------------------------|-----------------------|-------------|
| Full WYSIWYG formatting toolbar (Bold/Italic/Heading buttons that wrap selected text with markdown syntax, à la a mini rich-text bar) | Feels like it would help non-developer DMs the way `RichTextEditor.jsx`'s toolbar helps Session Log. | This effectively re-implements a second rich-text editing paradigm parallel to the existing TipTap-based `RichTextEditor.jsx`, which PROJECT.md explicitly keeps untouched and out of scope. Two different "helper toolbar" idioms in the same app (one WYSIWYG/TipTap, one markdown-insert-buttons) is more confusing than either alone, and adds real implementation surface (selection tracking, cursor-position insertion) for a feature not requested. | Raw typing + live/toggle preview + the lightweight syntax hint above. If real user feedback later shows this is needed, add it as its own follow-up, not bundled into this milestone. |
| Inline "renders as you type" WYSIWYG-style editing (e.g., Typora-style, where `**bold**` becomes bold text live inside the same editable surface, no separate preview pane) | Sounds like the best of both worlds — no mode switching at all. | Requires swapping the underlying editing surface from a plain `<textarea>` to a markdown-aware rich text engine (e.g., CodeMirror + a markdown mode, or a heavier package like `@uiw/react-md-editor`'s live mode) — materially larger dependency and complexity footprint than `react-markdown` + a textarea, and works against the "client-side rendering, minimal dependency footprint" decision already made in PROJECT.md. | Tab toggle (table stakes) or side-by-side split (differentiator) — both achieve "see the rendered result" without replacing the editing surface. |
| Extended markdown syntax beyond GFM: footnotes, math/LaTeX, Mermaid diagrams, custom emoji shortcodes, wiki-style `[[links]]` | Some markdown ecosystems (Obsidian, Notion-adjacent tools) bundle these and they look powerful. | None of these map to any DM-prep use case (session notes, NPC bios, location descriptions, loot lists) and each is an extra `remark-*`/`rehype-*` plugin adding bundle size and edge cases for zero requested demand. | GFM (tables, lists, bold/italic, blockquote, links, code) is already a superset of what these four fields need. |
| Rich-paste conversion (auto-converting pasted Word/Google Docs rich text into markdown syntax, à la Turndown.js) | Nice in theory — DMs may draft in Word/Docs and paste in. | Adds a whole new dependency and a long tail of edge cases (nested lists, tables, embedded styles) for a "prep tool" workflow where most content is typed directly, not pasted from rich sources. | Plain paste (strips to plain text, which is what a `<textarea>` already does today — no regression). |
| Draft history / version diffing for markdown fields | Sounds valuable for "what did I change" — but is a completely different capability class. | Not requested anywhere in PROJECT.md; no existing versioning infrastructure for any field in the app to hook into. | Out of scope entirely; would be its own future milestone if ever wanted. |
| Server-side markdown rendering / sanitization pipeline | Would centralize rendering logic once instead of duplicating client-side per field. | PROJECT.md already made this decision explicitly the other way — no Razor/server-rendering pipeline exists in Omphalos's minimal-API/JSON backend, and adding one purely for this would be a new backend dependency for a UI-only feature. | Client-side `react-markdown` + `remark-gfm` (+ `remark-breaks`), as already decided. |

---

## B. Image Crop Replacement — Feature Landscape

### B1. Table Stakes (Parity With Current `CropModal.jsx` — Anything Less Is a Regression)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Locked aspect ratio, configurable per call site | Current tool already takes `aspectW`/`aspectH` props (3:4 for portraits, different ratio for location images) and enforces it. | LOW | Cropper.js v2's `cropper-selection` exposes `aspectRatio`/`initialAspectRatio` directly — maps 1:1 onto the existing prop contract. Do not expose a UI control to change/unlock it; keep it code-driven like today. |
| Drag-to-reposition the crop box, clamped to image bounds | Current hand-rolled tool implements this manually (and it's exactly the kind of math — clamping, drag-start offset — that's easy to get subtly wrong, which is presumably part of the motivation to replace it). | LOW (library-provided) | `cropper-selection[movable]` handles bounds-clamping natively — this is a case where swapping the library *removes* hand-rolled bug surface rather than adding complexity. |
| Corner resize handles with visible affordance | Current tool renders 4 corner handles as styled `<div>`s. | LOW | `cropper-handle` elements — visual parity, restyle to match the amber (`#d4a574`) accent already used. |
| Touch/mobile drag support | Current tool has manual `onTouchStart`/`onTouchMove` handlers bridging to the mouse handlers — meaning touch is already a supported, expected capability today, not a new ask. | LOW (library-provided) | Cropper.js v2 web components handle pointer/touch events internally; no manual touch-to-mouse bridging code needed post-swap. |
| Rule-of-thirds (or equivalent alignment) grid overlay | Current tool renders this explicitly; removing it on "upgrade" would be a visible, noticeable regression to anyone who's used the existing crop tool. | LOW | `cropper-grid` element provides this out of the box. |
| Same modal chrome/theme as the rest of the app (dark overlay, `bg-[#211b17]` card, amber heading, `×` close, Cancel / "Crop & Save" button pair) | Cropper.js v2 ships as unstyled web components — without deliberate theming work it will look visually foreign next to every other modal in the app (`SettingsModal.jsx` pattern). | MEDIUM | This is the main integration work, not the crop mechanics themselves: wrap the web components in a component that reproduces `CropModal.jsx`'s outer chrome (overlay, header, footer buttons) exactly, and re-theme the library's internal CSS custom properties/parts to the existing palette. |
| Preserves the existing output contract (`onSave(dataURL)` / equivalent croppedcanvas → base64 hand-off) | Three call sites (`Library.jsx`, `CharacterModal.jsx`, `AddLocationModal.jsx`) currently call `onSave` with a JPEG data URL from `canvas.toDataURL(...)`. Changing this contract means touching three call sites' surrounding logic instead of one. | LOW | Build one shared wrapper component (e.g., `ImageCropModal.jsx`) that internally uses Cropper.js v2's `getCanvas()`/`toBlob()` but still exposes the same `onSave(dataURL)` / `onClose` prop shape the three call sites already use — this is what "consolidates on one crop implementation" (per PROJECT.md Key Decisions) should mean in practice: one new component, three call sites swapped to use it, zero changes needed to the surrounding upload/save logic. |

### B2. Differentiators (Genuine Upgrades Worth Taking Since the Library Provides Them, Not Required to Ship)

| Feature | Value Proposition | Complexity | Notes |
|---------|--------------------|------------|-------|
| Zoom (mouse wheel + pinch-to-zoom on touch) | The current hand-rolled tool has **no zoom at all** — the crop box can only move around a static, fixed-scale display of the image. Users who want a tighter crop than the display scale allows currently have no way to do it. Cropper.js v2 provides zoom via `cropper-image`/`cropper-selection` `zoomable` essentially for free. | LOW (library-provided) | Worth enabling since it's a real capability gap in the current tool, not scope creep — but it's still additive/optional relative to the "swap the library" requirement, so treat as a should-have, not a blocker if time-constrained. |
| EXIF orientation correction before crop | The current tool naively reads `img.naturalWidth`/`naturalHeight` with no EXIF handling — a portrait photo taken on a phone and stored with EXIF rotation metadata (rather than baked-in pixels) can crop incorrectly depending on browser EXIF auto-rotation behavior. `PROJECT.md` explicitly calls out quest-board's reference pattern as "EXIF-safe downscale before crop." | MEDIUM | This fixes a latent, currently-unaddressed bug class, but it's a separate pre-processing step (e.g., re-drawing the image to canvas with orientation correction, or a small helper like `blueimp-load-image`/manual EXIF-tag read) that happens *before* handing the image to Cropper.js v2 — it is not something Cropper.js v2 itself provides. Recommended given it's part of the proven reference pattern being explicitly borrowed, but it's decomposable from the core library swap and can be sequenced as a follow-up within the same phase rather than a hard blocker. |

### B3. Anti-Features (Cropper.js v2 Supports These — Deliberately Don't Expose Them)

| Feature | Why It Seems Appealing | Why Problematic Here | Alternative |
|---------|--------------------------|------------------------|-------------|
| Rotate / flip controls (Cropper.js v2 supports both) | "The library already has it, so why not add the buttons?" | Not requested, and adds toolbar clutter to what is meant to be a simple, fast "crop this portrait/location photo" step embedded inside a larger character/location form flow — not a general-purpose photo editor. Every extra control is extra surface for a non-technical DM to be confused by mid-session-prep. | Leave unexposed. If a future user need for "my photo is sideways" emerges, EXIF auto-correction (above) addresses the common real-world cause without needing a manual rotate button. |
| Multiple simultaneous crop selections (`cropper-selection[multiple]`) | Library supports it natively. | Every use site needs exactly one output crop per upload — multi-selection is irrelevant complexity for a single-portrait/single-image upload flow. | Single selection only (current behavior, unchanged). |
| Unlocked / user-toggleable aspect ratio | Feels flexible. | All three usage sites have a product-defined fixed aspect ratio (matching how portraits/location images are displayed elsewhere in the UI); letting users pick an arbitrary ratio would produce images that don't fit their display slots. | Aspect ratio stays a prop passed in by the calling component, exactly as it works today — no ratio-picker UI. |
| Filters / brightness / contrast / saturation adjustment | Some "crop tool" wrapper libraries bundle basic photo-editing controls alongside cropping. | Out of scope — this is a crop tool, not an image editor; Cropper.js v2 itself doesn't ship this either, so it would mean pulling in yet another dependency for an unrequested capability. | None needed; skip entirely. |
| Non-rectangular (circular/polygon) crop shapes | Occasionally requested for "avatar" style circular portraits. | Not how portraits or location images are displayed anywhere in the current app (rectangular image slots per `CropModal.jsx`'s `aspectW`/`aspectH` model); would require additional masking work with no current display surface to use it. | Rectangular aspect-locked crop, unchanged from today. |

---

## Feature Dependencies

```
[remark-gfm]  ──required-by──> [GFM preview rendering] (table stakes A1)
[remark-breaks] ──required-by──> [Existing multi-line content renders correctly] (table stakes A1)
                                     (must ship together with remark-gfm, not deferred —
                                      otherwise every existing field's data visually breaks
                                      the first time preview is used)

[react-textarea-autosize] ──used-by──> [Auto-grow] (table stakes A1, explicit PROJECT.md requirement)

[Shared MarkdownField component] ──wraps──> [textarea/autosize] + [react-markdown preview] + [Edit/Preview toggle]
      └──reused-by──> Overview & Hook, Notes/Callout/Loot blocks, character bios, location descriptions
                       (4 usage sites, 1 component — mirrors how RichTextEditor.jsx is reused for Session Log)

[Shared ImageCropModal component] ──wraps──> Cropper.js v2 web components + existing modal chrome
      └──reused-by──> Library.jsx (character portraits), CharacterModal.jsx (in-session portraits),
                       AddLocationModal.jsx (location images)
      └──preserves──> onSave(dataURL) contract  (no changes needed to the 3 call sites' surrounding logic)

[EXIF correction] ──precedes──> [Cropper.js v2 crop] (differentiator B2; separate pre-processing step,
                                  not a Cropper.js v2 feature itself — decomposable/sequenceable independently)

[Side-by-side split view] ──enhances──> [Edit/Preview toggle] (does not replace it; toggle remains the fallback
                                          on narrow viewports / short fields)
```

### Dependency Notes

- **`remark-breaks` must ship alongside `remark-gfm`, not as a follow-up:** this is the single highest-risk dependency in the whole feature set. Every one of the 4 target fields already has real production data typed in a plain `<textarea>` where every `Enter` created a visible break. Landing GFM-only rendering without single-newline handling makes existing content look broken on day one — this belongs in the initial phase, not a "nice to have" backlog item.
- **One shared `MarkdownField` component, 4 usage sites:** matches how `RichTextEditor.jsx` is already reused once for Session Log rather than reimplemented per field — keep the same "build once, wire four times" shape for consistency and to avoid four slightly-divergent edit/preview implementations.
- **One shared `ImageCropModal` component, 3 usage sites:** explicitly named as the intent in PROJECT.md's Key Decisions ("consolidates on one crop implementation instead of a hand-rolled one") — the output contract (`onSave(dataURL)`) is what makes this swap non-invasive to the three surrounding upload flows.
- **EXIF correction is decomposable from the core crop swap:** it fixes a real (if latent) bug in the current tool, but it's a distinct pre-processing concern from wiring Cropper.js v2 itself, so it can be sequenced as its own step within the phase without blocking the core library swap.

---

## MVP Definition

### Launch With (v1 — this milestone)

- [ ] Edit/Preview tab toggle for all 4 markdown fields — table stakes, matches GitHub baseline convention
- [ ] `remark-gfm` + `remark-breaks` together — table stakes, prevents brownfield content regression
- [ ] Auto-grow via `react-textarea-autosize` on all 4 fields — explicit PROJECT.md Active requirement
- [ ] Dark-theme-matched preview styling — table stakes, otherwise preview looks broken against the app
- [ ] One shared `MarkdownField` component reused across all 4 sites
- [ ] Cropper.js v2 swapped in at all 3 image-upload sites via one shared `ImageCropModal` component
- [ ] Aspect ratio lock, drag-reposition, touch support, rule-of-thirds grid, resize handles — table stakes parity with current `CropModal.jsx`
- [ ] Existing modal chrome/theme reproduced around Cropper.js v2's web components
- [ ] `onSave(dataURL)` contract preserved — zero changes required to the 3 calling components' surrounding logic

### Add After Validation (v1.x, same milestone if time allows)

- [ ] Zoom (mouse wheel / pinch) on the crop tool — real capability gap vs. current tool, low effort given the library provides it
- [ ] EXIF orientation correction before crop — fixes a latent bug, matches the proven quest-board reference pattern, but is a separable pre-processing step
- [ ] Lightweight markdown syntax hint/cheat-sheet text under the toggle — cheap, helps non-developer DMs

### Future Consideration (explicitly not this milestone)

- [ ] Side-by-side split view for markdown fields (start with tab toggle; revisit if user feedback wants it)
- [ ] Any WYSIWYG-style markdown toolbar or inline-render-as-you-type editing — anti-feature, conflicts with keeping this distinct from the existing TipTap `RichTextEditor.jsx`
- [ ] Rotate/flip crop controls, multi-select crop, filters, non-rectangular crop — anti-features, not requested, adds UI clutter to a narrow embedded step

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|----------------------|----------|
| Edit/Preview toggle + GFM rendering | HIGH | LOW | P1 |
| `remark-breaks` (newline preservation) | HIGH | LOW | P1 |
| Auto-grow textarea | HIGH | LOW | P1 |
| Dark-theme preview styling | HIGH | LOW–MEDIUM | P1 |
| Cropper.js v2 swap (aspect lock, drag, touch, grid, handles) | HIGH | LOW–MEDIUM | P1 |
| Modal chrome/theming around Cropper.js v2 | HIGH | MEDIUM | P1 |
| Preserve `onSave(dataURL)` contract | HIGH | LOW | P1 |
| Zoom on crop tool | MEDIUM | LOW | P2 |
| EXIF orientation correction | MEDIUM | MEDIUM | P2 |
| Markdown syntax hint text | LOW–MEDIUM | LOW | P2 |
| Side-by-side split view | LOW | MEDIUM | P3 |
| WYSIWYG toolbar / inline-render editing | — | HIGH | Skip (anti-feature) |
| Rotate/flip, multi-select, filters, non-rect crop | — | MEDIUM–HIGH | Skip (anti-feature) |

**Priority key:**
- P1: Must have — required to avoid a felt regression vs. the current tools, or an explicit PROJECT.md Active requirement
- P2: Should have — real value, low-to-medium cost, reasonable to include in this milestone if time allows
- P3: Nice to have — defer to a future milestone based on user feedback

## Sources

- [react-markdown GitHub repo](https://github.com/remarkjs/react-markdown) — LOW confidence (general web search, not fetched via curated docs provider)
- [Contentful: How to render and edit Markdown in React with react-markdown](https://www.contentful.com/blog/react-markdown/) — LOW confidence
- [GitHub Community Discussion: Side by Side Preview in web based readme.md editor](https://github.com/orgs/community/discussions/89986) — LOW confidence
- [GitHub Changelog: Preview the Markdown rendering of gists](https://github.blog/changelog/2021-11-17-preview-the-markdown-rendering-of-gists/) — LOW confidence
- [Dillinger.io](https://dillinger.io/) (live example of side-by-side markdown preview pattern) — LOW confidence
- [react-textarea-autosize on npm](https://www.npmjs.com/package/react-textarea-autosize) — LOW confidence
- [CKEditor: WYSIWYG vs Markdown comparison](https://ckeditor.com/blog/wysiwyg-vs-markdown-editor-comparison/) — LOW confidence
- [Cropper.js v2 Guide](https://fengyuanchen.github.io/cropperjs/v2/guide.html) — LOW confidence (fetched via WebFetch, not an official curated-docs provider in this session)
- [Cropper.js v2 CropperSelection API](https://fengyuanchen.github.io/cropperjs/v2/api/cropper-selection.html) — LOW confidence
- [Cropper.js v2 Migration Guide](https://fengyuanchen.github.io/cropperjs/v2/migration.html) — LOW confidence
- [dev.to: Building a Modern Image Cropper in React with CropperJS 2.x](https://dev.to/imerljak/building-a-modern-image-cropper-in-react-with-cropperjs-2x-43b1) — LOW confidence
- Direct codebase inspection: `src/client/components/CropModal.jsx`, `src/client/components/RichTextEditor.jsx`, `src/client/components/tabs/SessionPrep.jsx`, `.planning/PROJECT.md` — HIGH confidence (primary source, current repo state)

**Note on confidence:** No context7/curated-docs MCP provider was available in this session, so all web findings are tagged LOW per the `classify-confidence` seam (unverified websearch tier). The Cropper.js v2 API details (aspectRatio, movable/resizable/zoomable, cropper-selection/cropper-grid/cropper-handle element names) were cross-checked against two independent pages on the official `fengyuanchen.github.io/cropperjs` docs site, which raises practical reliability even though the tooling tier is LOW — treat the specific element/property names as directionally reliable but verify against the installed package version during implementation.

---
*Feature research for: Markdown editing + image crop replacement on an existing brownfield React SPA*
*Researched: 2026-07-10*
