# Project Research Summary

**Project:** Omphalos - Markdown Editing + Image Cropper Replacement
**Domain:** Brownfield feature addition to an existing React 18 SPA (DM campaign manager); bolt-on editor components, not a green-field product
**Researched:** 2026-07-10
**Confidence:** MEDIUM

## Executive Summary

This milestone adds two reusable "leaf" editing components to an existing React 18 + .NET SPA: a `MarkdownField` (raw markdown textarea + `react-markdown`/`remark-gfm` preview, replacing plain `<textarea>`s in 4 locations) and a `CropperModal` (Cropper.js v2 web components, replacing the hand-rolled `CropModal.jsx` at 3 image-upload sites). Both libraries are already decided in `PROJECT.md`; the research job was to nail down integration shape, feature scope, and brownfield-specific hazards rather than to pick technologies. The dominant theme across all four research files is "this is a swap with an unchanged interface, not a redesign" - both components should be prop-compatible drop-ins so the 7 call sites need near-zero changes beyond an import swap.

The recommended approach: build a shared image-preparation utility (EXIF-correct via `createImageBitmap(file, {imageOrientation: "from-image"})` + downscale to ~2400px long edge) used once by all 3 crop sites, mount Cropper.js v2 custom elements imperatively via refs (never re-render them from React state), and pair `remark-gfm` with `remark-breaks` from day one so single-newline plain text already in the database does not visually collapse into run-on paragraphs the moment markdown rendering ships. Both patterns are directly borrowed from a sibling project (`quest-board`) proven working implementation, which is the highest-confidence source in this research.

The single biggest risk uncovered is not in either new component - it is a pre-existing backend bug discovered during architecture research: `SessionRepository.UpsertAsync` never persists `PrepData` on update, and several existing call sites (`SessionLog.jsx`, `TopBar.jsx`, `Toolkit.jsx`, `SessionPrep.jsx`) send partial `UPDATE_SESSION` payloads that the repository overwrites unconditionally rather than merges. Two of the four target markdown fields (Overview & Hook, prep blocks) sit directly on top of this bug - wiring `MarkdownField` into them without fixing it first will make new markdown content appear to save but silently vanish on reload, which directly contradicts the project stated core value of not losing DM content. This must be treated as a blocking prerequisite, not a nice-to-have cleanup.

## Key Findings

### Recommended Stack

Three packages, all version-verified against the npm registry: `cropperjs@2.1.1` (native Web Components rewrite, no maintained React wrapper for v2 exists - integrate directly, do not use `react-cropper` which is still pinned to v1), `react-markdown@10.1.0`, and `remark-gfm@4.0.1`. No EXIF library is needed (native `createImageBitmap` handles it) and no auto-grow library is required (a ~15-line hand-rolled hook is the primary recommendation, `react-textarea-autosize@8.5.9` is an acceptable alternative). Everything else considered (`@uiw/react-md-editor`, `react-easy-crop`, `blueimp-load-image`, `MDXEditor`) was explicitly rejected as either duplicating an already-made decision or reintroducing complexity/dependency weight the project deliberately avoids.

**Core technologies:**
- `cropperjs@2.1.1` - image cropping (replaces `CropModal.jsx`) - v2 rewrite as native custom elements, matches the proven `quest-board` reference pipeline
- `react-markdown@10.1.0` - renders markdown for preview panes - safe by default (no `dangerouslySetInnerHTML`), ESM-only, Vite 6 handles natively
- `remark-gfm@4.0.1` + `remark-breaks` (new addition surfaced by research, not yet in PROJECT.md) - GFM syntax + single-newline preservation, the latter being critical to avoid a day-one regression on existing plain-text content

### Expected Features

**Must have (table stakes - parity, not a regression):**
- Edit/Preview tab toggle on all 4 markdown fields (GitHub-baseline convention)
- `remark-gfm` + `remark-breaks` together, shipped in the same phase (not deferred)
- Auto-grow textarea height, matching current fixed-height-but-scrollable behavior at minimum
- Dark-theme-matched preview styling (scoped CSS, not full Tailwind Typography)
- One shared `MarkdownField` component reused across all 4 sites
- Cropper.js v2 parity with current `CropModal.jsx`: locked configurable aspect ratio, drag-to-reposition, touch support, rule-of-thirds grid, corner handles, existing modal chrome/theme, unchanged `onSave(dataURL)` contract
- One shared `ImageCropModal`/`CropperModal` component reused across all 3 sites

**Should have (real value, low-to-medium cost):**
- Zoom (mouse wheel + pinch) on the crop tool - genuine capability gap vs. current tool, cheap since the library provides it
- EXIF orientation correction before crop - fixes a latent bug in the current tool, matches the proven reference pattern
- Lightweight markdown syntax hint/cheat-sheet text for non-developer DMs

**Defer (v2+ / explicit anti-features):**
- Full WYSIWYG toolbar or inline-render-as-you-type editing for markdown - would duplicate the existing TipTap `RichTextEditor.jsx` paradigm
- Side-by-side split view for markdown (start with tab toggle)
- Extended markdown syntax (footnotes, math, Mermaid, wiki-links) - no mapped use case
- Rotate/flip, multi-select crop, filters, non-rectangular crop - UI clutter Cropper.js v2 supports but nothing here requests

### Architecture Approach

Both new components are pure controlled leaf components - no `AppContext`/`dispatch`/`db.*` calls inside either one, matching the existing `RichTextEditor`/`CropModal` pattern exactly. `MarkdownField` takes `value`/`onChange(string)`; `CropperModal` is kept prop-identical to today's `CropModal` (`imageData`/`onSave`/`onClose`/`aspectW`/`aspectH`/`title`) so it is a rename+reimplementation at the 3 crop call sites, not a redesign. The parent component always decides when a new value becomes a `dispatch(...)` call.

**Major components:**
1. `MarkdownField` (new) - controlled edit/preview toggle, owns auto-grow sizing; reused at 4 sites (`SessionPrep.jsx` Overview & Hook + prep blocks, `CharacterModal.jsx` bio/notes, `AddLocationModal.jsx` description)
2. `CropperModal` (new, replaces `CropModal.jsx`) - modal wrapping Cropper.js v2 web components; reused at 3 sites (`Library.jsx`, `CharacterModal.jsx`, `AddLocationModal.jsx`)
3. `SessionRepository.UpsertAsync` (existing, needs a backend fix) - must add `existing.PrepData = session.PrepData;`; this is a hard prerequisite for 2 of the 4 markdown call sites to actually persist

### Critical Pitfalls

1. **Cropper.js v2 web-component ref/re-render mismatch** - binding crop state as JSX props that re-render on every keystroke resets zoom/position mid-drag. Avoid: mount once via `useEffect` keyed by image identity, drive everything imperatively through refs (`$center`, `$toCanvas`, `$initSelection`), never through re-rendered attributes.
2. **EXIF orientation not auto-corrected by Cropper.js v2** - phone photos crop sideways/upside-down and get permanently baked in. Avoid: port `quest-board` `createImageBitmap(file, {imageOrientation: "from-image"})` -> scratch canvas -> blob pipeline as a single shared utility used by all 3 crop sites.
3. **iOS Safari ~16.7M-pixel canvas ceiling** - modern phone photos silently render blank crops on WebKit; does not reproduce in desktop emulation. Avoid: downscale to ~2400px long edge in the same shared prepare-image step, before the image ever reaches Cropper.js v2.
4. **Retroactive markdown rendering breaks existing plain-text content with no migration path** - single newlines collapse, `#`/`*`/`-`/`---` at line-start get reinterpreted. Avoid: ship `remark-breaks` alongside `remark-gfm` from day one (not as a follow-up); do not silently "smart-escape" old content.
5. **`SessionRepository.UpsertAsync` never persists `PrepData`, and multiple existing call sites send partial `UPDATE_SESSION` payloads that get unconditionally overwritten** - new markdown fields wired into `SessionPrep.jsx` will appear to save then silently lose content on reload. This is a pre-existing bug, not something introduced by this milestone, but it sits directly under 2 of the 4 markdown targets and must be fixed first.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Backend prerequisite - session persistence fix
**Rationale:** Blocking dependency for 2 of 4 markdown call sites; must be verified independently before any frontend markdown work can be trusted to actually persist.
**Delivers:** `SessionRepository.UpsertAsync` persists `PrepData` on update; `UPDATE_SESSION` dispatch payloads at `SessionPrep.jsx` (and ideally `SessionLog.jsx`/`TopBar.jsx`/`Toolkit.jsx`, which share the same bug) send full-object payloads instead of partial ones.
**Addresses:** N/A (infrastructure fix, not a FEATURES.md item)
**Avoids:** Pitfall 5 (Anti-Pattern 1/2 in ARCHITECTURE.md) - partial `UPDATE_SESSION` overwrite bug and the never-persisted `PrepData` bug

### Phase 2: MarkdownField component + 2 safe call sites
**Rationale:** Can be built and visually verified in isolation; wiring into the full-object-save call sites (`CharacterModal.jsx`, `AddLocationModal.jsx`) first validates the component with zero persistence risk, independent of Phase 1 backend fix.
**Delivers:** Shared `MarkdownField` component (edit/preview toggle, auto-grow, dark-theme preview styling, `remark-gfm`+`remark-breaks`) wired into character bio/notes and location description fields.
**Addresses:** FEATURES.md table stakes A1 (toggle, GFM, auto-grow, newline preservation, dark theme, no raw HTML)
**Avoids:** Pitfall 4 (retroactive rendering regression), Pitfall 5 (no `rehype-raw`), Pitfall 6/7 (auto-grow async-load + modal overflow)

### Phase 3: CropperModal component + all 3 crop call sites
**Rationale:** Fully independent of Phases 1-2 (different library, different files, no shared code) - can run in parallel. Build the shared EXIF/downscale prepare-image utility once, before wiring any site, to avoid the fix landing on only the first site built.
**Delivers:** Shared `CropperModal` component (prop-identical to `CropModal`) wired into `Library.jsx`, `CharacterModal.jsx`, `AddLocationModal.jsx`; shared prepare-image utility (EXIF-correct + downscale to 2400px).
**Uses:** `cropperjs@2.1.1`
**Implements:** `CropperModal` architecture component

### Phase 4: Remaining markdown call sites (Overview & Hook, prep blocks)
**Rationale:** Gated on Phase 1 backend fix - wiring these before the fix lands would ship a feature that silently loses data on reload.
**Delivers:** `MarkdownField` wired into `SessionPrep.jsx` Overview & Hook and Notes/Callout/Loot blocks, with corrected full-session-object dispatch payloads.
**Addresses:** Completes FEATURES.md MVP scope (all 4 markdown field locations)

### Phase Ordering Rationale

- Phase 1 must precede Phase 4 (hard dependency, confirmed via direct code inspection - not a hypothesis)
- Phases 2 and 3 have no dependency on each other or on Phase 1 and can be built/planned in parallel
- Ordering markdown safe sites (Phase 2) before risky sites (Phase 4) lets the shared component get validated before it is exposed to the pre-existing persistence bug
- Crop work is fully decoupled from markdown work at the architecture level (different libraries, different files, no shared state) - sequencing between Phase 2/3 and Phase 4 is about risk exposure, not technical coupling

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (CropperModal):** Cropper.js v2 imperative ref/lifecycle pattern in React is the single highest-risk integration in this milestone (Pitfall 1) - worth a `--research-phase` pass or at minimum prototyping against one call site before rolling out to all three.
- **Phase 1 (backend fix):** Low research need technically (the bug and fix are already fully diagnosed in ARCHITECTURE.md via direct code read), but worth flagging for careful review since it touches 4+ existing call sites dispatch payloads, not just the new feature.

Phases with standard patterns (skip research-phase):
- **Phase 2 (MarkdownField):** `react-markdown`+`remark-gfm`+`remark-breaks` is a well-documented, extremely common pairing; the auto-grow hook is a standard, well-understood pattern with known gotchas already documented in PITFALLS.md.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Package versions verified directly against `registry.npmjs.org` (HIGH); ecosystem/integration-pattern claims cross-checked across 2+ sources (MEDIUM); a few bundle-size claims are single-source LOW |
| Features | MEDIUM | Codebase inspection of current `CropModal.jsx`/fields is HIGH confidence (primary source); UX-convention claims (GitHub editor pattern, etc.) are LOW-confidence web search, though directionally uncontroversial |
| Architecture | HIGH | Nearly entirely derived from direct reads of the actual Omphalos and quest-board source files, including the critical `PrepData` persistence bug, which was confirmed by reading `SessionRepository.UpsertAsync` directly, not inferred |
| Pitfalls | MEDIUM-HIGH | Codebase-specific claims (current `CropModal.jsx`, `imageUpload.js`, EF configs) verified directly = HIGH; the `quest-board` reference implementation is a proven working pattern = HIGH; general web claims (iOS canvas ceiling, scrollHeight border offset) are LOW per-source but cross-checked against the quest-board code comment, raising practical confidence |

**Overall confidence:** MEDIUM-HIGH - the two riskiest findings (the `PrepData` persistence bug and the Cropper.js v2 ref/lifecycle pattern) are both grounded in direct source inspection or a proven working reference implementation, not speculation.

### Gaps to Address

- No official Cropper.js v2 API reference was fetched via a curated docs provider (context7 unavailable this session) - element/method names (`$toCanvas`, `$center`, `$initSelection`, `cropper-selection`, etc.) were cross-checked against 2 pages of official docs plus the working `quest-board` reference, but should be re-verified against the installed package version during Phase 3 implementation.
- Whether to expose a markdown syntax hint/cheat-sheet and whether to pursue side-by-side split view are left as should-have/nice-to-have decisions for planning, not resolved by research - low cost either way, can be decided at phase-planning time.
- Whether `SessionLog.jsx`/`TopBar.jsx`/`Toolkit.jsx` partial-payload bug should be fixed as part of Phase 1 or deferred - they share the exact same bug as `SessionPrep.jsx` but are outside this milestone explicit scope; flag for a scoping decision during roadmap/phase planning rather than assuming inclusion.

## Sources

### Primary (HIGH confidence)
- `registry.npmjs.org` (via `npm view`) - verified all recommended package versions
- Direct codebase reads: `CropModal.jsx`, `RichTextEditor.jsx`, `imageUpload.js`, `AppContext.jsx`, `db/index.js`, `SessionPrep.jsx`, `SessionLog.jsx`, `Toolkit.jsx`, `TopBar.jsx`, `CharacterModal.jsx`, `Library.jsx`, `AddLocationModal.jsx`, `SessionEndpoints.cs`, `SessionService.cs`, `SessionRepository.cs`, `SessionDtos.cs`, EF Core `Configurations/*.cs`
- `quest-board/QuestBoard.Service/wwwroot/js/image-crop.js` - proven working Cropper.js v2 pipeline (EXIF correction, downscale, modal timing fix)

### Secondary (MEDIUM confidence)
- `fengyuanchen.github.io/cropperjs/v2/guide.html` and API docs - element/method names cross-checked against 2 pages
- `caniuse.com` - `field-sizing: content` browser support timing
- Microsoft Learn - `System.Text.Json` required-property behavior, confirming the partial-payload bug root cause

### Tertiary (LOW confidence)
- General web search on Cropper.js v2 React integration patterns, auto-resize textarea gotchas, iOS Safari canvas limits, bundle-size figures for `@uiw/react-md-editor`/`MDXEditor` - used for corroboration and framing, not relied on as sole evidence for any specific claim

---
*Research completed: 2026-07-10*
*Ready for roadmap: yes*
