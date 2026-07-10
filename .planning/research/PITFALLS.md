# Pitfalls Research

**Domain:** Adding Cropper.js v2 image cropping + `react-markdown` editing to an existing React 18 SPA (Omphalos)
**Researched:** 2026-07-10
**Confidence:** MEDIUM (codebase claims verified directly against source; web claims are general-web-knowledge tier — see Sources)

This research covers three sub-domains from the active milestone: (a) Cropper.js v2 in React, (b) markdown rendering of user-generated content, (c) auto-grow textareas in React. Findings are cross-checked against the actual Omphalos codebase (`CropModal.jsx`, `imageUpload.js`, EF Core configurations) and the sibling project's confirmed-working pattern (`quest-board/QuestBoard.Service/wwwroot/js/image-crop.js`), which is authoritative because it's a battle-tested implementation of the same Cropper.js v2 pipeline this milestone is porting.

## Critical Pitfalls

### Pitfall 1: Cropper.js v2 is Web Components, not a plugin — React ref/lifecycle mismatch destroys or misconfigures the cropper

**What goes wrong:**
Cropper.js v2 was rewritten from a canvas-manipulation library (v1, instantiated as `new Cropper(imgEl, options)`) into a set of native custom elements (`<cropper-canvas>`, `<cropper-image>`, `<cropper-selection>`, `<cropper-viewport>`). There is no `react-cropper`-equivalent for v2 in wide use yet (the existing `react-cropper` package only supports v1). Teams either (a) bind the image `src` and selection `aspect-ratio` as JSX props that change on every re-render, which forces React to diff/re-set attributes on a custom element repeatedly and can reset zoom/pan state mid-interaction, or (b) recreate the whole `<cropper-canvas>` subtree on every parent re-render (e.g. because crop state lives in the same component that renders the elements), destroying and reinitializing the cropper instance every keystroke/state change.

**Why it happens:**
React's JSX model assumes a component fully re-renders its subtree on state change; imperative libraries wrapped as custom elements need one-time DOM setup + imperative method calls (`$center()`, `$initSelection()`, `$toCanvas()`) via refs, not prop-driven re-render. This is exactly the class of bug Omphalos's *current* `CropModal.jsx` avoids by being 100% custom (crop box state lives in the same component and drives a plain `<div>`/`<canvas>`, which tolerates re-render because nothing is imperative) — that safety property disappears once an imperative custom-element library is introduced.

**How to avoid:**
- Mount the `<cropper-canvas>`/`<cropper-image>`/`<cropper-selection>` elements once per modal-open (e.g. keyed by the image being cropped, not by ongoing crop state) inside a `useEffect` with an empty (or image-identity-only) dependency array; do not put live crop coordinates in React state that re-renders the elements.
- Access all Cropper.js v2 behavior imperatively via a `ref` to the DOM node (`elRef.current.$center('contain')`, `elRef.current.$toCanvas()`), never through re-rendered JSX attributes for anything that changes during interaction.
- Match quest-board's proven pattern: wire everything through vanilla DOM event listeners registered once (`addEventListener('change', ...)` on `cropper-selection` if live preview is needed) and torn down in the `useEffect` cleanup function.

**Warning signs:**
- Crop box resets to center / zoom resets to 100% while the user is mid-drag.
- Console warnings about custom elements being redefined, or `$center`/`$toCanvas` throwing "not connected" errors.
- The crop modal feels "laggy" or visibly re-paints on every mouse-move during drag (a sign the whole element tree is re-rendering).

**Phase to address:**
Cropper.js v2 integration phase (the one replacing `CropModal.jsx`). This is the highest-risk item in that phase — prototype the mount-once/ref-driven pattern against one usage site (e.g. `AddLocationModal.jsx`) before rolling out to all three sites (`Library.jsx`, `CharacterModal.jsx`, `AddLocationModal.jsx`).

---

### Pitfall 2: EXIF orientation is not auto-corrected by Cropper.js v2 — sideways/upside-down crops get permanently baked into stored images

**What goes wrong:**
Cropper.js v1 had a `checkOrientation` option that auto-rotated based on EXIF data. Cropper.js v2 does not do this for you — if a photo is loaded directly into a `<cropper-image>` (or into a `<canvas>`, as the current hand-rolled tool does via `ctx.drawImage(img, ...)`), phone-camera photos with EXIF orientation tags (extremely common — most phone cameras never physically rotate pixels, they just set an orientation tag) render sideways or upside-down in the crop UI. Because the final crop is baked to pixels via `canvas.toDataURL(...)` (or Cropper v2's `$toCanvas()`), the EXIF tag is discarded and the wrong orientation is permanently stored — there's no way to "fix it later" without re-uploading.

**Why it happens:**
Browsers render `<img src>` with EXIF orientation applied automatically (mostly), but raw `<canvas>` drawing (`drawImage`) and `createImageBitmap()` without `imageOrientation: 'from-image'` do NOT apply it by default in all engines — this is a longstanding, easy-to-miss inconsistency between how an `<img>` tag displays a file and how canvas-based tools read the same file's pixels.

**How to avoid:**
Port quest-board's `prepareImageForCropper()` pattern exactly: decode the source `File` via `createImageBitmap(file, { imageOrientation: 'from-image' })` (which bakes EXIF rotation into the resulting bitmap), draw that bitmap onto a scratch canvas, and hand the *resulting blob* (via `URL.createObjectURL`) to the Cropper.js v2 elements — never point Cropper directly at the raw uploaded `File`/data URL.

**Warning signs:**
- Manual test: crop a photo taken directly on a phone held in portrait orientation with the front or rear camera (not a pre-rotated file from an image editor) — if the crop preview or final saved image is sideways, this pitfall is live.
- Any bug report where portraits/location images "look fine in the file picker thumbnail but wrong in the app."

**Phase to address:**
Cropper.js v2 integration phase. This must be solved once, in a shared crop-preparation utility used by all three usage sites — not per-site, or it will be fixed in one place and missed in the other two (a real risk given 3 separate modals wire the current hand-rolled tool independently today).

---

### Pitfall 3: iOS Safari's ~16.7M-pixel canvas ceiling silently produces a blank crop from modern phone photos

**What goes wrong:**
WebKit (iOS Safari, and Safari on macOS) enforces a canvas area limit of 16,777,216 pixels (`width * height`, roughly 4096×4096). Exceeding it doesn't throw a catchable error — the canvas silently renders black/blank. Modern phone cameras routinely produce images well above this (a 12MP photo is ~4032×3024 ≈ 12.2M pixels, already close to the edge with any extra scratch-canvas overhead; 48MP modes on recent iPhones are ~48M pixels, nearly 3× over the ceiling). Since Omphalos's only current client-side guard (`MAX_IMAGE_BYTES` in `imageUpload.js`) caps *file size* (5MB), not *pixel dimensions*, a small/compressed but high-resolution JPEG easily passes the existing check and then produces a blank crop on an iPhone.

**Why it happens:**
File-size caps and pixel-dimension caps are unrelated — a well-compressed 48MP JPEG can be well under 5MB. Teams porting a crop tool from desktop-only testing don't hit this until someone tests on an actual iPhone with a modern camera.

**How to avoid:**
Downscale every image to a fixed max long-edge (quest-board uses 2400px) via the same `createImageBitmap` + scratch-canvas step used for EXIF correction (Pitfall 2 — this is the same code path, do both in one pass) *before* it ever reaches a Cropper.js v2 canvas-backed element. This single step also caps the eventual base64 payload size stored in Postgres (see Pitfall 6).

**Warning signs:**
- Crop modal shows a blank/black image on a real iPhone (won't reproduce in desktop Chrome DevTools device emulation — pixel-count limits are WebKit-specific and not emulated).
- Any "works on my Android/desktop, broken on my iPhone" bug report tied to the new crop tool.

**Phase to address:**
Cropper.js v2 integration phase, same shared prepare-image utility as Pitfall 2. Explicitly include an iPhone (or iOS Simulator/real device) manual test in that phase's verification, since desktop testing will not surface this.

---

### Pitfall 4: Switching existing plain-text fields to markdown rendering retroactively changes how already-written campaign content displays — no migration path, no opt-in flag

**What goes wrong:**
Four field locations (Session Overview & Hook, session-prep blocks, character bios/notes, location descriptions) currently store and display raw plain text typed into a `<textarea>`. The moment `react-markdown` starts rendering these same stored strings, **all pre-existing content re-renders as markdown with no migration step and no per-field "is this markdown" flag** — this is a rendering-layer change applied retroactively to every row already in the database. Concretely, existing DM notes are likely to contain:
- Single newlines used as paragraph/line breaks (very common in freeform notes) — CommonMark collapses single newlines within a block into a single space, so multi-paragraph notes visually run together into one paragraph once rendered as markdown. This is the single most likely and most visible regression, because nearly every existing multi-line field will be affected, not just ones with special characters.
- A literal `*` used for emphasis-like flourish or a bullet-style list improvised with `-` at line start — GFM/CommonMark now treats these as italic markers or list items.
- A line starting with `#` (a shorthand tag, a room number like `#3`, etc.) — renders as a heading.
- A paragraph immediately followed by a `---`/`===` separator line (a common ad hoc way to visually break up notes) — CommonMark's setext-heading rule turns the *preceding paragraph* into an oversized `<h2>`/`<h1>`, not just the separator line. This is a genuinely surprising failure mode because the visual damage lands on the paragraph *before* the character that "caused" it.
- `remark-gfm` specifically adds table parsing — any improvised ASCII-table-like text using `|` and `-` in alignment could get mis-parsed into a malformed GFM table.

**Why it happens:**
Markdown syntax overlaps with characters DMs plausibly already use in freeform prose, and there is no way to distinguish "text written before markdown rendering existed" from "text intentionally written as markdown" once both are stored in the same untyped string column.

**How to avoid:**
- Treat this as an expected, one-time visual behavior change and communicate it to both users (the solo DM and the collaborator per PR history) before shipping — this is a product decision, not purely technical, but the roadmap should flag it explicitly rather than let it surprise users.
- Prefer `remark-breaks` (or equivalent) so single newlines render as line breaks, matching the pre-existing plain-`<textarea>` visual behavior as closely as possible — this alone neutralizes the single biggest regression (paragraph run-together) with no user-visible tradeoff.
- Do **not** silently "smart-escape" existing content (e.g., auto-escaping `*`/`#` on read) — that's a worse footgun than the rendering change itself, since it would also escape genuinely-intended markdown typed after the feature ships, and there's no reliable way to tell old content from new content in an untyped string column.
- Verified via `CharacterConfiguration.cs`/`GlobalCharacterConfiguration.cs`/`GameSessionConfiguration.cs`/etc.: the target fields (`Description`, `QuestHooks`, `NextSessionHooks`, `SessionNotes`) have **no `HasMaxLength`** set, so they map to unconstrained Postgres `text` columns — the "may need a migration for column length" risk flagged in `PROJECT.md`'s constraints is **not actually present**; no DB migration is needed for markdown syntax overhead. This can be dropped from planning risk.

**Warning signs:**
- QA pass: open a handful of pre-existing sessions/characters/locations created before this milestone and visually diff old plain-text rendering vs. new markdown rendering — do this deliberately, don't rely on incidental discovery.
- Any existing content containing a line of `---`, `===`, or lines starting with `#`/`*`/`-`/`>`/`|` is a specific manual test case to check.

**Phase to address:**
The markdown-fields phase (all four field locations), not the Cropper.js phase. This is purely a rendering/content concern with zero overlap with image handling. Recommend this be called out as its own verification checklist item in that phase's plan (spot-check real pre-existing data, not just newly-typed test strings).

---

### Pitfall 5: Reaching for `rehype-raw` (raw HTML support) reintroduces the XSS risk `react-markdown` is specifically designed to avoid

**What goes wrong:**
`react-markdown` is safe by default — it converts markdown to React elements directly and never uses `dangerouslySetInnerHTML`, so it doesn't execute embedded `<script>`, doesn't honor `javascript:` URLs (blocked by its `defaultUrlTransform`), and can't be used to inject arbitrary HTML. That safety property is *specifically* what `rehype-raw` removes: it exists to let literal HTML embedded in markdown source render as live DOM. If a future request ("let me embed a raw `<img>` tag" or "let me add a `<br>`") leads someone to bolt on `rehype-raw` without also adding `rehype-sanitize`, any user-entered field with `<script>`, an `onerror` attribute, or an `<iframe>` becomes a stored/self-XSS vector — and because Omphalos's fields are freeform DM notes (not fixed structured data), an attacker doesn't need a separate "input" vector; they just type it into any bio/description field.

**Why it happens:**
`rehype-raw` looks like the obvious answer to "why isn't my `<br>` working" or "can I paste some HTML," and its risk isn't obvious from the package name alone.

**How to avoid:**
Do not add `rehype-raw` for this milestone — nothing in `PROJECT.md`'s requirements calls for raw HTML support (only markdown syntax + `remark-gfm`). If a future milestone genuinely needs raw HTML, it must ship paired with `rehype-sanitize` (with an explicit allow-list schema) in the same change, never alone.
Given Omphalos is self-hosted and single/few-user today, the practical severity is lower than a multi-tenant SaaS (self-XSS against your own campaign notes is a much smaller blast radius than XSS against arbitrary other users) — but this shouldn't be used as a reason to skip the guard, since the app is explicitly described as having "at least one collaborator," i.e. multiple people already share the same instance and could view each other's rendered content (shared library entities are cross-user by design per `ARCHITECTURE.md`).

**Warning signs:**
- Any PR diff that adds `rehype-raw` to the `react-markdown` `rehypePlugins` array without `rehype-sanitize` alongside it.
- A markdown field that visibly renders an embedded `<img>`/`<iframe>`/`<script>` tag as live HTML instead of literal text.

**Phase to address:**
Markdown-fields phase, as an explicit non-goal / guardrail in the plan (call out "no `rehype-raw`" as a decision, not just an omission, so a future contributor doesn't add it casually).

---

### Pitfall 6: Auto-grow textarea doesn't run on async-loaded content, only on keystrokes — existing long text renders collapsed until the user types

**What goes wrong:**
The standard auto-grow pattern (`textarea.style.height = 'auto'; textarea.style.height = textarea.scrollHeight + 'px'` on `onChange`) only fires on user input. Omphalos loads session detail lazily — `GET /api/sessions` returns summaries only, and full field content (including these very bio/description/notes fields) arrives later via a separate fetch merged in via `MERGE_SESSION_DETAIL` (`AppContext.jsx`) *after* the component has already mounted and rendered once with `undefined`/short content. If the auto-grow effect is wired only to the textarea's `onChange` handler and not to the field's `value` prop changing from an external/async source, a long pre-existing bio/description renders at default single-line height until the user clicks in and types a character — at which point it suddenly jumps to full height. This is a real, codebase-specific gotcha, not a generic textarea bug.

**Why it happens:**
Tutorials for auto-grow textareas almost universally assume synchronous, locally-typed content and wire the resize logic to `onChange` only; they don't account for controlled `value` changing out from under the component due to an async parent-state update.

**How to avoid:**
Drive the resize `useEffect` off the textarea's `value` (or a ref to it), not off the `onChange`/keystroke event — e.g. `useLayoutEffect(() => resize(), [value])` so it re-measures both on user input and whenever the prop value changes for any reason (including the async session-detail merge, and also including switching between two different sessions/characters that reuse the same mounted component instance).
Use `useLayoutEffect` rather than `useEffect` for the resize so the height adjustment happens before paint, avoiding a visible flash-then-snap.

**Warning signs:**
- Open a session with a long pre-existing Overview & Hook / bio / description and observe the field at initial render — if it's a single collapsed line until you click into it, this bug is present.
- Switching between two characters/locations with different content lengths without the field visibly resizing until you type.

**Phase to address:**
The auto-grow behavior is described in `PROJECT.md` as "bundled with the new markdown editor component," so this belongs in the markdown-fields phase alongside Pitfalls 4/5, specifically in whatever shared `MarkdownField`/`AutoGrowTextarea` component gets built — fix it once there rather than per usage site.

---

### Pitfall 7: `scrollHeight`-based resize is off by border width and causes reflow thrash/flicker inside the app's fixed-size modal shells

**What goes wrong:**
Two related, well-documented issues with the naive `scrollHeight` resize pattern apply directly to this codebase's UI conventions:
1. `element.scrollHeight` includes padding but excludes border width. Tailwind's preflight sets `box-sizing: border-box` globally (Omphalos uses Tailwind per `CLAUDE.md`), and the existing dark-theme convention uses visible borders on inputs (`bg3`/`#332922` borders per the styling table). If the resize code sets `height = scrollHeight + 'px'` without accounting for `offsetHeight - clientHeight` (the border+scrollbar delta), the textarea ends up perpetually a couple pixels short of fitting its own content, causing a persistent inner scrollbar flicker or a 1-frame content clip on every resize.
2. Resetting `height` to `'auto'` before re-measuring `scrollHeight` (necessary to get an accurate shrink-on-delete measurement) forces a synchronous layout recalculation; doing this unconditionally on every keystroke across multiple auto-grow fields on screen at once (e.g. several session-prep blocks each with their own markdown field) compounds into visible jank, especially since a markdown preview may also be re-parsing on the same keystroke (see Pitfall 4's rendering step) — two expensive operations stacked on one keystroke.
3. Omphalos's modals follow a fixed-card pattern (`bg-[#2d2d2d]` card, per `CLAUDE.md`'s `SettingsModal.jsx` convention) rather than a full-viewport scroll surface. An auto-grow textarea with no `max-height` cap inside such a modal can grow the modal itself taller than the viewport, pushing the Save/Cancel buttons below the fold with no way to reach them (no built-in modal-body scroll region observed in the existing pattern) — this is a UX regression risk distinct from the pure JS resize bugs above.

**Why it happens:**
Most auto-grow tutorials/snippets are written against full-page or unconstrained layouts, not fixed-size modal cards; the border-width offset is a subtle CSS box-model detail that only manifests with visible borders + `border-box`.

**How to avoid:**
- Only reassign `height` when the newly-measured value actually differs from the current one (skip the `height='auto'` reset on renders where content hasn't shrunk, e.g. via comparing against a stored previous scrollHeight) to reduce forced-layout frequency.
- Account for the border delta explicitly, or set `box-sizing: content-box` deliberately for these specific fields and compensate padding, whichever is more consistent with the rest of the input styling.
- Give the modal shell (or a wrapping container) an explicit `max-height` + `overflow-y: auto` so an auto-growing field is capped by a scrollable region rather than growing the whole modal past the viewport — this needs to be a conscious layout decision in the new `MarkdownField` component's design, not left to emerge from testing.

**Warning signs:**
- Visible micro-flicker of an inner scrollbar appearing/disappearing while typing at the end of a growing textarea.
- On a shorter viewport (laptop, or a maximized-but-not-fullscreen browser window), typing enough content into a bio/description field pushes the modal's Save button out of the visible area.

**Phase to address:**
Markdown-fields phase, in the shared auto-grow implementation and in the modal layout it's embedded into (verify against at least one modal per usage site: session prep, character bio, location description).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Skip the shared EXIF/downscale prepare-image step and wire Cropper.js v2 directly to the raw uploaded `File`/data URL per usage site | Faster to ship one of the three crop sites first | Sideways photos (Pitfall 2) and blank iOS crops (Pitfall 3) reproduce independently per site, and get fixed inconsistently | Never — build the shared utility once, before wiring any of the three sites |
| Render markdown with default paragraph-per-blank-line behavior instead of adding `remark-breaks` | One fewer dependency | Every pre-existing multi-line field visually "runs together" the moment this ships (Pitfall 4) — high-visibility regression on day one | Only acceptable if the team has explicitly decided to accept and communicate that visual change; not a good default |
| Add `rehype-raw` "just to unblock" one edge case (e.g. someone wants a manual line break) | Solves the immediate ask in minutes | Reopens the exact XSS class `react-markdown` exists to prevent, across a shared multi-user instance | Never without `rehype-sanitize` alongside it in the same change |
| Store cropped images at Cropper.js v2's native/full downscaled resolution (2400px long edge) instead of matching the old tool's smaller fixed output (400×300 / 300×400) | Sharper images | Meaningfully larger base64 payloads sent on every session save, compounding the already-known full delete-then-reinsert anti-pattern on `SessionRepository.UpsertAsync` | Acceptable only if the crop output is explicitly re-encoded/resized down to a fixed target size close to the old tool's output before storage — don't let "downscale for the cropper's canvas limits" (2400px, Pitfall 3) become the final stored resolution by accident |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|------------------|-------------------|
| Cropper.js v2 (web components) in React | Binding crop state (x/y/zoom) as JSX props that re-render the custom elements every frame | Mount once via `useEffect`+`ref`, drive all interaction through imperative methods (`$center`, `$toCanvas`, `$initSelection`) |
| Cropper.js v2 modal timing | Calling `$center('contain')`/`$initSelection()` immediately after opening a modal, before the modal's CSS transition finishes and the canvas has real (non-zero) layout dimensions | Wait for the modal's "shown"/fully-visible signal (quest-board explicitly re-runs both calls on the modal's `shown` event, not on `show()` return) before fitting the image/selection |
| `react-markdown` + `remark-gfm` | Assuming default rendering preserves plain-`<textarea>` line-break behavior | Add `remark-breaks` (or accept and communicate the change) so single newlines still render as breaks |
| `react-markdown` HTML support | Adding `rehype-raw` to "just make one tag work" | Don't, unless paired with `rehype-sanitize` and an explicit allow-list |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Auto-grow resize + markdown re-parse both running unthrottled on every keystroke across several fields on one screen (e.g. multiple session-prep blocks) | Typing lag, visible jank, especially on longer notes | Only recompute `scrollHeight`/re-render markdown when the field's content actually changed (not on unrelated re-renders); consider whether preview needs to be live vs. a separate "Preview" tab (avoids double per-keystroke cost entirely) | Noticeable once a field's content exceeds a few paragraphs, or when 3+ auto-grow fields are visible at once (e.g. a prep-blocks list) |
| Base64 image payload growth from higher-resolution Cropper.js v2 output feeding into the existing full delete-then-reinsert session save | Slower session saves, larger network payloads, more Postgres churn on every character/location edit | Re-encode/resize the final crop to a fixed, small target resolution before storing (see Technical Debt table) | Compounds with the count of images per session (multiple characters/locations each with a portrait) |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Adding `rehype-raw` without `rehype-sanitize` to a markdown field editable by any authenticated user | Stored XSS executable against any user (including the collaborator) who views the same shared/library content | Don't add `rehype-raw` for this milestone; if ever needed, always pair with `rehype-sanitize` |
| Trusting client-side EXIF-correction/downscale as the only line of defense against oversized/malformed images reaching storage | No server-side image validation exists today (per `PROJECT.md` context) — a malicious or buggy client could still post an unprocessed, huge, or non-image payload directly to the session save endpoint, since the crop pipeline is entirely client-side | Out of scope to fully solve in this milestone (no server-side image processing is being added), but worth flagging as a known gap consistent with the existing `imageUpload.js` client-only size cap — not a regression introduced by this milestone, just not improved by it either |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Markdown fields render pre-existing plain-text content with unintended formatting the moment the feature ships (Pitfall 4) | DM opens an old session and their notes look visibly "broken" (giant headings, italicized fragments, run-together paragraphs) with no warning | Communicate the change ahead of shipping; use `remark-breaks` to minimize the most common regression |
| Auto-grow textarea with no `max-height` inside a fixed-card modal | Save/Cancel buttons pushed off-screen on long content, especially on smaller viewports | Cap the modal body's growth with `max-height` + internal scroll, not the textarea's growth itself |
| No visual distinction between "write" and "preview" modes if a live side-by-side or toggle isn't clearly signposted | DM unsure why their typed `*text*` shows as `*text*` (raw view) vs `text` in italics (rendered view), thinks the feature isn't working | Whatever UI pattern is chosen (tab toggle vs. live split view — not yet decided per `PROJECT.md`), make the current mode unambiguous, matching the existing `RichTextEditor.jsx`/`SettingsModal.jsx` visual conventions |

## "Looks Done But Isn't" Checklist

- [ ] **Cropper.js v2 crop flow:** Tested only on desktop Chrome — verify it also works on an actual iOS device (Pitfall 3's canvas ceiling doesn't reproduce in desktop emulation).
- [ ] **Cropper.js v2 crop flow:** Tested only with pre-rotated/desktop-sourced test images — verify with a photo taken directly on a phone in portrait orientation (Pitfall 2's EXIF bug won't show up with already-correctly-oriented test assets).
- [ ] **Markdown fields:** Tested only by typing new content — verify by opening several pre-existing sessions/characters/locations created before this milestone shipped (Pitfall 4 only shows up against real old data, not fresh test strings).
- [ ] **Auto-grow textareas:** Tested only by typing — verify a long field loads at full height immediately on session open, not just after the first keystroke (Pitfall 6).
- [ ] **Auto-grow textareas in modals:** Tested only with short content — verify behavior when a field's content is long enough to threaten pushing modal action buttons off-screen (Pitfall 7).
- [ ] **All three crop usage sites:** Verify the shared prepare-image (EXIF + downscale) step is actually shared/reused, not reimplemented three times with the fix only applied to the first site built.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|-------------------|
| Sideways-cropped images already saved (Pitfall 2) before the EXIF fix shipped | MEDIUM | Affected images must be re-uploaded/re-cropped by the user — the orientation data is unrecoverable once baked to a data URL; no way to "fix in place" server-side without the original file |
| Markdown rendering regression discovered after shipping (Pitfall 4) | LOW | Add `remark-breaks` and/or communicate the change after the fact; since content is stored as plain text (not migrated/transformed), no data recovery is needed — only a rendering-config fix |
| `rehype-raw` added without sanitization, later discovered (Pitfall 5) | MEDIUM–HIGH | Remove `rehype-raw` (or add `rehype-sanitize` immediately) and audit stored field content for any embedded `<script>`/event-handler HTML that may already have been entered while the gap existed |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|-----------------|
| Web-component ref/re-render thrashing (1) | Cropper.js v2 integration phase | Manual test: drag a crop selection while triggering unrelated parent re-renders (e.g. typing in an adjacent field, if any); crop position/zoom must not reset |
| EXIF orientation (2) | Cropper.js v2 integration phase | Manual test with a real phone-camera portrait-orientation photo, checked against all three usage sites |
| iOS canvas pixel ceiling (3) | Cropper.js v2 integration phase | Manual test on a real iOS device/Simulator with a modern (12MP+) photo |
| Retroactive markdown rendering of existing content (4) | Markdown-fields phase | Spot-check several pre-existing sessions/characters/locations for visual regressions before/after |
| `rehype-raw` XSS reintroduction (5) | Markdown-fields phase | Code review guardrail: confirm `rehypePlugins` config in the shipped component excludes `rehype-raw` (or pairs it with `rehype-sanitize` if a future milestone adds it) |
| Auto-grow not firing on async-loaded content (6) | Markdown-fields phase | Manual test: open a session with pre-existing long field content and confirm correct height on first paint, not after first keystroke |
| Auto-grow border-offset/modal-overflow (7) | Markdown-fields phase | Manual test: type enough content to threaten viewport overflow inside each of the four field locations' modals |

## Sources

- `C:\Repos\omphalos\src\client\components\CropModal.jsx` — current hand-rolled crop implementation (verified directly)
- `C:\Repos\omphalos\src\client\utils\imageUpload.js` — current client-side size cap, no pixel-dimension guard (verified directly)
- `C:\Repos\omphalos\src\Omphalos.Repository\Configurations\*.cs` — verified no `HasMaxLength` on target markdown-field columns (Description, QuestHooks, NextSessionHooks, SessionNotes), so the length-migration risk flagged in `PROJECT.md` is not actually present
- `C:\Repos\quest-board\QuestBoard.Service\wwwroot\js\image-crop.js` — sibling project's confirmed-working Cropper.js v2 pipeline (EXIF correction via `createImageBitmap(file, { imageOrientation: 'from-image' })`, 2400px downscale, modal-visibility timing fix, GIF-animation caveat) — HIGH confidence, verified working reference implementation, not a general web claim
- WebSearch: "Cropper.js v2 React integration custom elements web components memory leak unmount" — LOW confidence, general web knowledge
- WebSearch / fengyuanchen.github.io/cropperjs/v2 guide + API docs (CropperCanvas, CropperImage, CropperSelection) — LOW confidence (fetched via search summary, not direct doc read)
- WebSearch + WebFetch of `raw.githubusercontent.com/remarkjs/react-markdown/main/readme.md` — LOW confidence, but readme content is close to primary-source (official project readme)
- WebSearch: "auto-resize textarea React scrollHeight cursor jump bug" — LOW confidence, general web knowledge
- WebSearch: "iOS Safari canvas max size limit image cropping pixel" (16,777,216px ceiling, corroborated independently by quest-board's own code comment citing the same figure) — LOW confidence per-source, but cross-checked against the quest-board reference implementation's own comment, raising practical confidence

---
*Pitfalls research for: React SPA image-cropping (Cropper.js v2) + markdown-editing (react-markdown/remark-gfm) integration*
*Researched: 2026-07-10*
