# Stack Research

**Domain:** Adding markdown editing + image cropping to an existing React 18 (no TypeScript) SPA, brownfield milestone
**Researched:** 2026-07-10
**Confidence:** MEDIUM (npm registry version numbers verified directly against `registry.npmjs.org` = HIGH; ecosystem/pattern claims cross-checked across 2+ independent web sources = MEDIUM; single-source claims flagged LOW inline)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `cropperjs` | `2.1.1` | Image cropping (replaces `CropModal.jsx`) | Latest stable v2 (verified via `npm view cropperjs`, published ~3 months ago). v2 is a **complete rewrite as native Web Components** (`<cropper-canvas>`, `<cropper-image>`, `<cropper-selection>`, etc.) — not a JS class you `new` against a `<canvas>` like v1. There is **no maintained official React wrapper for v2** (see "What NOT to Use"), so it must be integrated directly. |
| `react-markdown` | `10.1.0` | Renders markdown → React elements for the preview side of every markdown field | Already decided in `PROJECT.md`. Version verified via `npm view react-markdown`. Requires React 18+, ESM-only (fine — Vite 6 handles ESM natively). Does not use `dangerouslySetInnerHTML`, so no extra XSS surface. |
| `remark-gfm` | `4.0.1` | Adds GitHub-Flavored-Markdown syntax (tables, strikethrough, task lists, autolinks) to `react-markdown` | Already decided in `PROJECT.md`. Version verified via `npm view remark-gfm`. Pass as `remarkPlugins={[remarkGfm]}` — this is the standard, near-universal pairing for `react-markdown`; almost nobody uses `react-markdown` without it. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| *(none — no image-crop wrapper library)* | — | — | Integrate `cropperjs` v2's custom elements directly in a small hand-rolled React component (see Architecture note below). Do **not** add a wrapper package (see "What NOT to Use"). |
| *(none — no EXIF library)* | — | — | Use the native `createImageBitmap(file, { imageOrientation: 'from-image' })` browser API to bake EXIF rotation into pixels before the file ever reaches Cropper.js. This is exactly the pattern already proven in the `quest-board` reference (`wwwroot/js/image-crop.js`) and needs zero new dependency. |
| *(none — no auto-grow library, primary recommendation)* | — | — | Hand-roll a ~15-line `useAutosizeTextArea` hook (`textarea.style.height = 'auto'` then `= scrollHeight + 'px'` on every value change, via `useLayoutEffect`). Zero bundle cost, works in every current browser today, and matches the project's existing "no extra state/UI library" ethos (no Redux, no React Query, hand-rolled `CropModal.jsx`). |
| `react-textarea-autosize` | `8.5.9` | Drop-in autosizing `<textarea>` replacement | **Only if** the team would rather not hand-roll the resize hook. Actively maintained (verified via `npm view`), ~3.9M weekly downloads, handles edge cases (font loading, window resize, paste) that a hand-rolled hook has to be told about explicitly. Reasonable alternative to the hook above, not required. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite 6 dev server + esbuild | Bundles the new custom-element-based crop component and markdown deps | No config changes needed — `cropperjs`, `react-markdown`, `remark-gfm` are all plain ESM npm packages; Vite pre-bundles them via esbuild automatically on first `npm run dev`. |
| Browser DevTools → Elements panel | Verify Cropper.js v2 custom elements registered/rendered | Because v2 elements are real DOM custom elements (not React components), they're inspectable directly in DevTools — useful for debugging layout/attribute issues during integration. |

## Installation

```bash
# Core
npm install cropperjs@2.1.1 react-markdown@10.1.0 remark-gfm@4.0.1

# Optional — only if not hand-rolling the auto-grow hook
npm install react-textarea-autosize@8.5.9
```

No `-D` (dev) dependencies are required for either feature.

## Architecture Notes (Cropper.js v2 + React 18)

Cropper.js v2 ships as **native Web Components**, registered globally via a single side-effect import (`import 'cropperjs'` — or the more granular `import 'cropperjs/dist/cropper.js'`). This changes the integration shape from v1 entirely:

1. **No `new Cropper(canvasEl)` call anymore.** You render the custom element tags directly in JSX — `<cropper-canvas>`, `<cropper-image src={...}>`, `<cropper-shade>`, `<cropper-handle>`, `<cropper-selection aspect-ratio="0.75">`, `<cropper-grid>`, `<cropper-crosshair>`. React 18 passes unrecognized props on hyphenated (custom-element) tag names through as plain HTML attributes rather than DOM properties — which is exactly what Cropper.js v2's configuration surface expects (all its config, e.g. `aspect-ratio`, `initial-coverage`, `background`, is attribute-driven), so plain JSX attributes work without a wrapper.
2. **Imperative methods need a raw DOM ref, not a React ref to a component.** `useRef(null)` attached to `<cropper-selection ref={selectionRef}>` gives you the actual custom element instance, on which you call methods like `selectionRef.current.$toCanvas()` (returns the cropped-region canvas) or `selectionRef.current.$initSelection()`. There's no React-idiomatic prop-based API for these — this is standard "escape hatch to the DOM" territory, same category as how `CropModal.jsx` already uses `canvasRef`/`imgRef` today.
3. **Known modal-visibility timing gotcha (confirmed in the `quest-board` reference implementation, `wwwroot/js/image-crop.js:216-247`):** Cropper.js v2's auto-fit (`cropperImageEl.$center('contain')`) and initial-selection sizing (`cropperSelectionEl.$initSelection(true, true)`) both run against the DOM's *current* layout size. If the crop modal is still transitioning in (e.g. `display:none` → visible, or a fade-in animation not yet complete) when these run, the canvas has 0×0 dimensions, and the image renders unscaled while the selection box collapses to a zero-size box at (0,0). **Port this to React as:** don't call `$center`/`$initSelection` in the same tick the modal mounts — defer to a `useLayoutEffect` gated on the modal container actually having non-zero `getBoundingClientRect()` dimensions (poll via `requestAnimationFrame` once, or use a `ResizeObserver` on the container and run the fit/init calls on its first non-zero-size callback, then disconnect). This is the single most important integration gotcha to plan for explicitly in the phase that replaces `CropModal.jsx`.
4. **Object URL / memory cleanup on unmount:** the `quest-board` pattern uses `URL.createObjectURL()` for the corrected/downscaled image blob and explicitly `URL.revokeObjectURL()`s the previous one whenever a new file is chosen or the modal closes. Port this as a `useEffect` cleanup (or explicit call in the modal's close/cancel handler) — don't rely on GC; unrevoked object URLs pin the decoded bitmap in memory, which matters more on mobile Safari given its documented low canvas-memory ceiling (see Pitfalls below).
5. **Downscale before crop, always** — the `quest-board` reference caps the image at a 2400px long edge (well under Safari's 16.78M px canvas-area ceiling even at 2400×2400) using `createImageBitmap` → draw to an off-screen `<canvas>` → `canvas.toBlob()`, then feeds that blob's object URL into `<cropper-image src>`. This step is what makes both the EXIF-orientation fix and the mobile-memory fix work simultaneously — do this once, upstream of Cropper.js, rather than trying to configure Cropper.js itself to handle either concern. It replaces `readImageFile()`'s current raw base64 pass-through in `src/client/utils/imageUpload.js` — that function will need to become async (`createImageBitmap` and `canvas.toBlob` are both promise/callback-based) and produce a `Blob`/object-URL instead of (or in addition to) a base64 string, since the final crop output still needs to become a data URL or blob to send to the existing base64-based upload API.
6. **StrictMode double-invoke is safe** — Cropper.js's own module-level custom-element registration (`customElements.define(...)`) is idempotent (guards against re-registering an already-defined tag), so React 18 `StrictMode`'s double-effect-invocation in dev does not cause a "already defined" crash. No special guard needed on the Omphalos side.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `cropperjs` v2, integrated directly (no wrapper) | `react-easy-crop` | If the team decides matching `quest-board`'s proven crop pipeline is *not* a hard requirement. `react-easy-crop` is purpose-built for React (hooks-based, not custom elements), ships built-in pinch-zoom/touch, and is a much smaller integration surface (~6.7KB). It was explicitly **not** chosen here because `PROJECT.md`'s Key Decisions state the goal is to match `quest-board`'s Cropper.js v2 pipeline, not to pick the objectively-easiest React-native crop library. |
| Hand-rolled `useAutosizeTextArea` hook | `react-textarea-autosize` (8.5.9) | If the team wants a battle-tested library handling edge cases (font-loading reflow, window resize, IME composition) rather than maintaining ~15 lines of hook code themselves. Both are legitimate; the hook keeps the dependency count at zero, matching the project's existing minimal-dependency posture. |
| Hand-rolled plain `<textarea>` + Write/Preview tab toggle, styled to match the dark gothic theme, feeding `react-markdown`+`remark-gfm` for the preview pane | `@uiw/react-md-editor` (4.1.1) | If the team wants a built-in formatting toolbar (bold/italic/heading/link buttons) without hand-building one. It's small (~4.6KB gzip per vendor docs — **LOW confidence, single source, not independently re-verified**), textarea-based (no CodeMirror/Monaco dependency pulled in), and its preview is itself built on `react-markdown`, so it can be configured with `previewOptions={{ remarkPlugins: [remarkGfm] }}` to match the already-decided render stack exactly. Its own bundled CSS theme would need overriding to match Omphalos's amber/brown palette (same restyling burden `RichTextEditor.jsx`'s TipTap toolbar already took on) — this is the main reason a hand-rolled toggle is the primary recommendation instead: it avoids fighting a second component's default styling on top of Tailwind. |
| `@uiw/react-md-editor` | `MDXEditor` | Never for this project — MDXEditor is a full WYSIWYG rich-text-over-markdown editor (~851KB gzip per vendor docs, **LOW confidence, single source**) aimed at Notion/Google-Docs-style editing with JSX component embedding. Omphalos already has a WYSIWYG editor (TipTap, for Session Log) and explicitly chose *raw markdown syntax + rendered preview* instead for these new fields (per `PROJECT.md` Key Decisions) — MDXEditor would reintroduce the WYSIWYG pattern the project deliberately avoided here, at 100x+ the bundle cost of the alternatives. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-cropper` (any version) | Its latest release (`2.3.3`, verified via `npm view`) still depends on `cropperjs@^1.5.13` — it has **never been updated to wrap Cropper.js v2**. Using it would silently pull in the old v1 canvas-based API, defeating the entire point of this migration. | `cropperjs@2.1.1` integrated directly as custom elements (see Architecture Notes). |
| `@imerljak/react-cropper-2` (or any other early third-party "Cropper.js v2 for React" wrapper) | This is exactly the "wrapper library going stale" risk the project wants to avoid. Verified via `npm view`: version `0.2.1`, only 4 published versions, first published ~4 months ago, single maintainer, near-zero ecosystem track record. A single-maintainer wrapper this young around a library that itself only recently stabilized (v2 hit non-`-rc`/`-alpha` stable status recently) is a poor foundation for a self-hosted app with no dedicated maintenance bandwidth. | Skip the wrapper layer entirely — Cropper.js v2's own custom elements + a thin, project-owned React component (in the same spirit as the existing hand-rolled `CropModal.jsx`) is *more* future-proof, not less, since it has one fewer point of abandonment risk. |
| `blueimp-load-image` or other dedicated EXIF-parsing libraries | Solves a problem the native `createImageBitmap(file, { imageOrientation: 'from-image' })` API already solves for free, in every browser Omphalos needs to support, with zero added dependency weight. Adding a parsing library here would be solving an already-solved problem. | `createImageBitmap` with `imageOrientation: 'from-image'` (already proven in the `quest-board` reference). |
| CSS `field-sizing: content` as the *sole* auto-grow mechanism, today | Verified via caniuse.com: Chrome/Edge have supported it since March 2024, but Safari only gained support in version 26.2 (December 2025) and Firefox only in version 152 (June 2026) — i.e. as of this research date (July 2026), meaningful numbers of real-world users can still be on pre-support Safari/Firefox builds, especially since Omphalos is self-hosted for a small group whose browser versions aren't centrally managed. Relying on it alone means the auto-grow feature silently regresses to fixed-height on any un-updated browser. | The hand-rolled `useAutosizeTextArea` hook (or `react-textarea-autosize`) as the primary mechanism today. `field-sizing: content` is worth revisiting as a zero-JS replacement once support is universal for the actual DMs using this instance — not a blocker for this milestone either way. |
| Continuing to read/store images as raw base64 data URLs *without* the downscale step | The current `readImageFile()` (`src/client/utils/imageUpload.js`) reads files straight to base64 up to 5MB with no dimension cap. Feeding a large (e.g. 4000×6000, ~24MP) phone photo straight into Cropper.js v2's canvas-based elements risks hitting mobile Safari's ~16.78M px canvas-area ceiling and its total-canvas-memory ceiling, both of which fail *silently* (black/blank canvas, not an error) — verified across multiple Safari-canvas-limit sources. | Insert the downscale-to-~2400px-long-edge step (via `createImageBitmap` → offscreen `<canvas>` → `toBlob`) between file-read and handing the image to Cropper.js, exactly as `quest-board`'s reference does. |

## Stack Patterns by Variant

**If the team wants a formatting toolbar (bold/italic/heading buttons) on markdown fields without building one:**
- Use `@uiw/react-md-editor` (4.1.1) configured with `preview="edit"` split off from its default side-by-side layout, and pass `previewOptions={{ remarkPlugins: [remarkGfm] }}` so its internal preview renderer matches the already-decided `remark-gfm` config.
- Because it's the smallest maintained "batteries included" markdown editor option and avoids hand-building toolbar buttons — accept the cost of restyling its default CSS to match the amber/brown dark theme.

**If the team wants full visual control and zero restyling burden (the primary recommendation):**
- Use a plain `<textarea>` + a small "Write / Preview" tab toggle component (two buttons, conditional render), feeding the raw text into `react-markdown`+`remark-gfm` for the Preview tab. No formatting toolbar; users type raw markdown (`**bold**`, `- list`, etc.) directly.
- Because this matches `SettingsModal.jsx`'s existing UI-pattern convention (plain Tailwind-styled elements, no third-party component CSS to override) and keeps the new dependency surface to exactly the two packages already decided (`react-markdown`, `remark-gfm`).

**If a target string column in the database has a length cap too small for markdown-formatted long text (per `PROJECT.md` Constraints):**
- Widen the column via an EF Core migration (`dotnet ef migrations add WidenXForMarkdown ...`) rather than truncating or stripping markdown syntax client-side — markdown syntax characters (`**`, `#`, backticks, etc.) add overhead on top of the plain-text length a DM might already be entering, and this is exactly the kind of edge case worth catching before it silently truncates a DM's session notes mid-play.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `cropperjs@2.1.1` | React 18.3.1, Vite 6.0.7 | No React-specific compatibility concerns — it's framework-agnostic Web Components; verify only that Vite's dev-server pre-bundling doesn't choke on the package's ESM+custom-elements side-effect import (uncommon issue, but worth a quick smoke test in `npm run dev` before relying on it across all 3 usage sites). |
| `react-markdown@10.1.0` | `remark-gfm@4.0.1` | Standard, most-common pairing; `remark-gfm@4.x` requires `remark-parse@11+`/`remark@15+`, which `react-markdown@10.x` already pulls in transitively — no manual pinning needed. |
| `react-markdown@10.1.0` | React 18.3.1 | ESM-only package; Vite 6 handles this natively (no CJS interop issues), no changes needed to `vite.config.js`. |
| `@uiw/react-md-editor@4.1.1` (if chosen over hand-rolled toggle) | `remark-gfm@4.0.1` | Exposes `previewOptions.remarkPlugins` specifically so its internal `react-markdown` instance can be configured to match the project's chosen plugin set. |

## Sources

- `registry.npmjs.org` (via `npm view <pkg> version` / `npm view <pkg>`) — **HIGH confidence**, primary source, used to verify: `cropperjs` (2.1.1), `react-markdown` (10.1.0), `remark-gfm` (4.0.1), `react-textarea-autosize` (8.5.9), `@uiw/react-md-editor` (4.1.1), `blueimp-load-image` (5.16.0), `react-cropper` (2.3.3, still on `cropperjs@^1.5.13`), `@imerljak/react-cropper-2` (0.2.1, 4 versions, ~4 months old, single maintainer)
- `C:\Repos\quest-board\QuestBoard.Service\wwwroot\js\image-crop.js` — **HIGH confidence**, direct read of the user's own confirmed-working reference implementation; source of the `createImageBitmap`+downscale EXIF pipeline, the modal-visibility timing gotcha, the GIF-skip behavior, and the object-URL cleanup pattern documented above
- `caniuse.com` (`mdn-css_properties_field-sizing_content`) — **MEDIUM confidence**, cross-checked via two separate fetches, both agreeing on Safari 26.2 / Firefox 152 support timing
- GitHub issues on `fengyuanchen/cropper` and `fengyuanchen/cropperjs` (EXIF orientation reports, e.g. issues #120, #764, #685) — **MEDIUM confidence**, web search summary of multiple issue threads, not individually re-fetched in full
- `pqina.nl` blog posts on canvas area/memory limits, `longviewcoder.com` Konva iOS Safari canvas explainer — **MEDIUM confidence**, web search summary, consistent across sources on the 16,777,216px area ceiling
- `dev.to/imerljak/building-a-modern-image-cropper-in-react-with-cropperjs-2x` — **LOW confidence**, single blog-post source for the `getCroppedCanvas()`/ref-based integration shape; used only to corroborate the general "ref to raw custom element, call methods imperatively" pattern, not relied on for any specific claim in this document
- `fengyuanchen.github.io/cropperjs/v2/guide.html` — **MEDIUM confidence**, official docs, confirmed element tag names (`cropper-canvas`, `cropper-image`, `cropper-shade`, `cropper-handle`, `cropper-selection`, `cropper-grid`, `cropper-crosshair`, `cropper-viewer`) and the `import 'cropperjs'` side-effect registration pattern; full API method reference not present in the fetched section (site is JS-rendered/paginated) — **treat exact method names (`$toCanvas`, `$center`, `$initSelection`) as verified instead via the `quest-board` reference file, which uses them directly against a real Cropper.js v2 install**
- npm package pages (via web search, cross-checked against `npm view` where possible) for `@uiw/react-md-editor` bundle-size claim (~4.6KB gzip) and `MDXEditor` bundle-size claim (~851KB gzip) — **LOW confidence**, single-source vendor/blog figures, not independently re-measured

---
*Stack research for: Cropper.js v2 image cropping + markdown editing integration into an existing React 18 SPA*
*Researched: 2026-07-10*
