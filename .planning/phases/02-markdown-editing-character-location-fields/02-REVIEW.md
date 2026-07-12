---
phase: 02-markdown-editing-character-location-fields
reviewed: 2026-07-12T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - src/client/components/markdown/MarkdownPreview.jsx
  - src/client/components/markdown/MarkdownField.jsx
  - src/client/components/markdown/markdownToolbar.js
  - src/client/components/markdown/stripMarkdown.js
  - package.json
  - src/client/index.css
  - src/client/components/character/CharacterModal.jsx
  - src/client/components/Library.jsx
  - src/client/components/tabs/Locations.jsx
  - src/client/components/location/AddLocationModal.jsx
  - src/client/components/character/AddFromLibraryModal.jsx
findings:
  critical: 1
  warning: 5
  info: 1
  total: 7
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-07-12T00:00:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

This phase replaces plain `<textarea>` inputs with a new `MarkdownField`/`MarkdownPreview`/`stripMarkdown` trio across character and location editing surfaces, adding a formatting toolbar, an edit/preview split, and consistent markdown-to-plain-text truncation for card summaries. The new markdown primitives (`MarkdownPreview.jsx`, `markdownToolbar.js`, `stripMarkdown.js`) are individually well-written — the native-setter/`dispatchEvent` trick to keep the browser undo stack alive is a nice touch, and `MarkdownPreview` correctly relies on `react-markdown`'s default sanitization rather than enabling raw HTML.

However, the migration was applied mechanically to every consumer without auditing whether the corresponding *read* paths (list/card views) were updated to match, and without giving `MarkdownField` a proper prop surface for styling/behavior that call sites still assume it has (like the old `<textarea className=... autoFocus>` pattern). This produced one functional regression that ships broken output to users (`secretsAndHazards` — Critical) and several consistent, cross-file styling/UX regressions (Warning). `package.json` also picked up a phantom-dependency risk: `stripMarkdown.js` imports packages that were never added as direct dependencies.

## Critical Issues

### CR-01: "Secrets & Hazards" markdown is edited with a full formatting toolbar but never rendered anywhere it's displayed

**File:** `src/client/components/location/AddLocationModal.jsx:219-226` (edit), `src/client/components/Library.jsx:93` (edit), `src/client/components/Library.jsx:122,146-158` (display), `src/client/components/tabs/Locations.jsx:75,120-131` (display), `src/client/components/tabs/Locations.jsx:40-47` (display), `src/client/components/location/AddLocationModal.jsx:256-263` (display)

**Issue:** This phase converted the `secretsAndHazards` field's editor from a plain `<textarea>` to `<MarkdownField>` (in `Library.jsx`'s `GlobalLocationModal` and `AddLocationModal.jsx`'s create step), which gives the user a Bold/Italic/Heading/Bullet-list toolbar and a live "Preview" tab that correctly renders markdown via `MarkdownPreview`. But every place this field is actually *displayed* after saving still uses the pre-migration logic:

```js
// Library.jsx:122, Locations.jsx:75, Locations.jsx:41-47, AddLocationModal.jsx:256-263
const hazardLines = (loc.secretsAndHazards || '').split('\n').filter(Boolean)
...
{hazardLines.map((line, i) => (
  <li key={i} className="text-xs text-[#f0f0f0] flex gap-1.5">
    <span className="text-[#b24545] flex-shrink-0">▸</span>{line}
  </li>
))}
```

`line` is rendered as raw text — it is never passed through `stripMarkdown` or `MarkdownPreview`, unlike every other markdown field touched in this phase (`description`, `personalityTraits`, `flaw`, `questHooks`, `sessionNotes`, `notes`), which are all consistently stripped/rendered wherever they're displayed. Any user who uses the new toolbar to bold a hazard name (`**Trap**: pressure plate`) or add a bullet (`- Poison needle`) will see the literal markdown syntax characters on every location card, the session Locations tab, the "Edit Location" shared-info panel, and the `AddLocationModal` notes-step preview — the feature actively produces garbled output for typical use, and the double-bullet case (`▸` prefix + a `- ` the user typed) is a visible glitch.

**Fix:** Either (a) route each hazard line through `stripMarkdown` (or render the raw block through `MarkdownPreview` instead of manual line-splitting) at every display site, or (b) revert `secretsAndHazards` to a plain `<textarea>` since its "one item per line" semantics don't compose with free-form markdown/bullet syntax in the first place:

```js
const hazardLines = stripMarkdown(loc.secretsAndHazards || '').split('\n').filter(Boolean)
```

## Warnings

### WR-01: `MarkdownField`'s `className` prop is applied to the outer wrapper, not the textarea — regresses padding/border/focus styling on nearly every consumer

**File:** `src/client/components/markdown/MarkdownField.jsx:18,23` (root cause); reproduced at `src/client/components/character/CharacterModal.jsx:185,189,196`, `src/client/components/Library.jsx:89,90,93,346,350,376,380`, `src/client/components/tabs/Locations.jsx:52`, `src/client/components/location/AddLocationModal.jsx:212-235,267-271`, `src/client/components/character/AddFromLibraryModal.jsx:183`

**Issue:** Before this phase, every one of these fields was a plain `<textarea className={inputCls}>`, so `inputCls` (`w-full bg-[#161310] border border-[#332922] rounded px-3 py-2 ... focus:border-[#d4a574] resize-none`) styled the actual input directly. The migration kept passing the exact same `inputCls`/`inp` string as `className` to `<MarkdownField>`, but `MarkdownField` applies `className` to its *outer container* div (`markdown-field border ... ${className}`), not to the inner `<textarea>` (which only ever gets the fixed `markdown-field-textarea` class):

```jsx
// MarkdownField.jsx:23
<div className={`markdown-field border border-[#332922] rounded-lg bg-[#161310] ${className}`}>
```

Concretely this means: the `px-3 py-2` padding meant for a text input is now applied around the *entire widget* (toolbar + tabs + textarea/preview), pushing the toolbar bar inward from the card's rounded border and creating a visible extra inset that wasn't there before or in the fields that don't pass a className (e.g. the linked-character "Session Notes" field in `CharacterModal.jsx:100`, which was left without a className and looks correct). Worse, `focus:border-[#d4a574]` — the amber focus ring every other input in the app shows — is now attached to a plain, non-focusable `<div>` and will never fire, so the textarea silently lost its focus indicator across every markdown field in the app.

**Fix:** Give `MarkdownField` a distinct prop for the textarea itself (or drop styling responsibility for callers entirely, since the component already owns fixed styling via `markdown-field-textarea`):

```jsx
export default function MarkdownField({ value, onChange, className = '', textareaClassName = '', placeholder = '' }) {
  ...
  <textarea ref={textareaRef} className={`markdown-field-textarea ${textareaClassName} ...`} .../>
```

and update call sites to stop passing input-styled classes as the container `className`.

### WR-02: Session-notes fields lost `autoFocus` when migrated to `MarkdownField`

**File:** `src/client/components/location/AddLocationModal.jsx:265-273`, `src/client/components/character/AddFromLibraryModal.jsx:178-186`, `src/client/components/tabs/Locations.jsx:49-57`

**Issue:** All three "Session Notes" textareas previously had `autoFocus` so the field was focused the moment the notes step/modal opened. `MarkdownField` doesn't accept or forward an `autoFocus` prop, so the `autoFocus` attribute was simply dropped during the migration (confirmed in the diff — each of these three call sites explicitly removed `autoFocus` when switching to `<MarkdownField>`). Users must now click into the field manually.

**Fix:** Add `autoFocus` support to `MarkdownField` and forward it to the textarea:

```jsx
export default function MarkdownField({ value, onChange, className = '', placeholder = '', autoFocus = false }) {
  ...
  <textarea ref={textareaRef} autoFocus={autoFocus} .../>
```

### WR-03: Formatting toolbar stays active while the "Preview" tab is selected, silently mutating a hidden textarea

**File:** `src/client/components/markdown/MarkdownField.jsx:24-39` (toolbar), `src/client/index.css:79-85` (`.markdown-field-pane-hidden` / container query), `src/client/components/markdown/markdownToolbar.js:13-24,27-39` (`wrapSelection`/`insertAtCursor`)

**Issue:** In the narrow/mobile layout (viewport under the `480px` container-query breakpoint), the Edit/Preview tabs are shown and only one pane is visible at a time via `markdown-field-pane-hidden { display: none }`. The Bold/Italic/Heading/Bullet toolbar buttons, however, are rendered unconditionally above the tabs and are not disabled or hidden when `activeTab === 'preview'`. Clicking one while on the Preview tab calls `wrapSelection`/`insertAtCursor`, which read `el.selectionStart`/`el.selectionEnd` off the textarea and insert text there — but the textarea is `display:none` and not focused, so `selectionStart`/`selectionEnd` hold a stale value (often `0`) with no visual feedback. The user sees no change in the Preview pane (it just re-renders the mutated markdown), then is surprised to find unexpected `**`/`## `/`- ` markers inserted at an arbitrary position when they switch back to Edit.

**Fix:** Disable the toolbar buttons (or force-switch to the Edit tab) when `activeTab !== 'edit'`:

```jsx
<button type="button" disabled={activeTab !== 'edit'} onClick={() => wrapSelection(textareaRef, '**')} ...>
```

### WR-04: `AddLocationModal`'s "pick" step shows raw, unstripped markdown in the description snippet

**File:** `src/client/components/location/AddLocationModal.jsx:147-149`

**Issue:** Every other truncated-description preview touched by this phase (`GlobalLocationCard` in `Library.jsx`, `LocationCard` in `Locations.jsx`, and even `AddLocationModal`'s own "notes" step shared-info panel a few lines later) strips markdown before rendering. The library picker list item does not:

```jsx
{loc.description && (
  <p className="text-xs text-[#999999] mt-0.5 truncate">{loc.description}</p>
)}
```

Since `description` can now legitimately contain markdown syntax (that's the point of this phase), users browsing the picker will see literal `**`/`#`/`- ` characters in the truncated preview, inconsistent with the rest of the UI.

**Fix:**
```jsx
{loc.description && (
  <p className="text-xs text-[#999999] mt-0.5 truncate">{stripMarkdown(loc.description)}</p>
)}
```
(requires importing `stripMarkdown` in this file, which it currently does not).

### WR-05: `stripMarkdown.js` imports undeclared transitive dependencies

**File:** `package.json:10-26`, `src/client/components/markdown/stripMarkdown.js:1-4`

**Issue:** `stripMarkdown.js` directly imports `unified`, `remark-parse`, and `remark-stringify`:

```js
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import stripMarkdownPlugin from 'strip-markdown'
```

`package.json` only declares `react-markdown`, `remark-gfm`, `remark-breaks`, and `strip-markdown` as dependencies. `unified`, `remark-parse`, and `remark-stringify` are not listed — they currently resolve only because they happen to be hoisted transitive dependencies of `react-markdown`/`strip-markdown` (confirmed present in `package-lock.json` only as nested deps, not top-level). This is a phantom-dependency: `stripMarkdown` is used by `Library.jsx`, `Locations.jsx`, `CharacterModal.jsx`(indirectly via `MarkdownPreview`), and `AddFromLibraryModal.jsx` — a routine dependency bump, `npm install` with a different resolution order, or a switch to a stricter package manager (pnpm, Yarn PnP) could silently break these imports with no warning from `package.json` itself.

**Fix:** Add the packages actually imported to `dependencies` explicitly:
```json
"remark-parse": "^11.0.0",
"remark-stringify": "^11.0.0",
"unified": "^11.0.0"
```

## Info

### IN-01: Unused variable `roInp` in `CharacterModal.jsx`

**File:** `src/client/components/character/CharacterModal.jsx:41`

**Issue:** `const roInp = 'w-full bg-[#222] border border-[#332922]/50 rounded px-3 py-2 text-[#999999] text-sm cursor-not-allowed'` is declared but never referenced anywhere else in the file (pre-existing, not introduced by this phase, but present in a file this phase modified).

**Fix:** Remove the unused declaration, or use it for the read-only "Shared Info" fields in the `isLinked` branch if that was the original intent.

---

_Reviewed: 2026-07-12T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
