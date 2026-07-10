# Architecture Patterns

**Domain:** Reusable editing components (markdown field, image cropper) grafted into an existing single-`useReducer` React SPA with an auto-persist-on-dirty backend sync layer
**Researched:** 2026-07-10

## Recommended Architecture

Two new **leaf, presentation-only components** — no new global state, no router, no component library dependency beyond what's already in the app (Tailwind + one editor-style library each). Both are drop-in replacements for existing components, so the *call sites* barely change; almost all new code lives in the two components themselves.

```text
┌───────────────────────────────────────────────────────────────────┐
│  Call sites (7 total, unchanged responsibility)                     │
│                                                                       │
│  Markdown (4):                        Cropper (3):                  │
│  - SessionPrep.jsx (Overview & Hook)  - Library.jsx (char portrait)  │
│  - SessionPrep blocks (Notes/         - CharacterModal.jsx           │
│    Callout/Loot, via block components)  (char portrait)              │
│  - CharacterModal.jsx (bio/desc)      - AddLocationModal.jsx         │
│  - AddLocationModal.jsx (description)   (location image)             │
└───────────────┬───────────────────────────────┬─────────────────────┘
                │ value / onChange               │ imageData / onSave / onClose
                ▼                                ▼
     ┌─────────────────────┐          ┌──────────────────────────┐
     │   MarkdownField      │          │   CropperModal            │
     │ (new, src/client/     │          │ (new, src/client/          │
     │  components/)         │          │  components/, replaces     │
     │ controlled string      │          │  CropModal.jsx)            │
     │ in/out — no fetch,      │          │ same prop contract as      │
     │ no dispatch inside      │          │ CropModal — no fetch,      │
     │ react-markdown +         │          │ no dispatch inside          │
     │ remark-gfm (preview)     │          │ cropperjs v2 (crop UI)       │
     └─────────────────────┘          └──────────────────────────┘
                │ plain string (unchanged storage shape)
                ▼
     existing parent state (local useState form, or activeSession field)
                │
                ▼
     dispatch(...) → dispatchWithPersist → db.saveSession() → PUT /api/sessions/{id}
```

Neither component talks to `AppContext`, `dispatchWithPersist`, or `db/index.js` directly — that would break the "components never call `db.*` directly for session data" rule already documented in the codebase's own `ARCHITECTURE.md`. Both are pure controlled components: they receive a value and an `onChange`/`onSave` callback, and the *parent* (the existing call-site component) decides how and when to fold that value into `dispatch(...)`, exactly as `RichTextEditor` and `CropModal` already do today.

### Component Boundaries

| Component | Responsibility | Talks to |
|-----------|-----------------|----------|
| `MarkdownField` | Controlled edit/preview toggle for a markdown string; owns auto-grow sizing and the edit↔preview toolbar | Parent via `value`/`onChange` props only |
| `CropperModal` | Modal crop UI wrapping Cropper.js v2; takes a source image, returns a cropped base64 JPEG | Parent via `imageData`/`onSave`/`onClose` props only |
| Call-site components (`SessionPrep.jsx`, `CharacterModal.jsx`, `AddLocationModal.jsx`, block components) | Own the field's storage location (local form state vs. `activeSession`), decide when/how to call `dispatch` | `useApp()` (`dispatch`, `activeSession`) — unchanged from today |
| `AppContext` (`dispatchWithPersist`) | Persistence funnel — unchanged responsibility, but see **Critical Constraint** below for a pre-existing gap this milestone will expose | `db.saveSession()` |

## Prop Contracts

### `MarkdownField`

Modeled directly on the existing `RichTextEditor` signature (`content`/`onChange`/`placeholder`/`fill`) so it reads as "the same kind of component, different storage format" to anyone touching both:

```jsx
<MarkdownField
  value={string}                // raw markdown source — same plain string the <textarea> held
  onChange={(next: string) => void}   // fires on every keystroke, like textarea's onChange
  placeholder={string}          // optional, passed to the underlying <textarea>
  fill={boolean}                 // optional, mirrors RichTextEditor's fill prop for tab-height contexts
  minRows={number}               // optional, default ~3 — auto-grow floor so it doesn't collapse to 1 line
/>
```

- **In:** `value` (string) — never TipTap JSON, never HTML. Markdown source text stored exactly as today's plain string fields are.
- **Out:** `onChange(next: string)` — same shape a `<textarea onChange={e => set('field', e.target.value)}>` produces today, just pre-extracted to a string instead of an event. This is the one deliberate deviation from `RichTextEditor` (which passes back TipTap JSON) — it keeps every call site's existing `set('field', value)` / `updatePrep({...prep, field: value})` helper working with a one-line signature change (`e => set(...)` → `v => set('field', v)`).
- Internally: a small toolbar (Edit / Preview, matching `RichTextEditor`'s `btnCls` styling) toggles between a raw `<textarea>` (auto-grow via scrollHeight, same dark-theme input classes already used everywhere) and a `react-markdown` + `remark-gfm` render pane. No WYSIWYG, no toolbar buttons for bold/italic — this is deliberately simpler than `RichTextEditor` per the "true markdown, not WYSIWYG" decision in `PROJECT.md`.
- No debouncing needed inside the component — it stays a pure controlled input; if debouncing the *save* is ever wanted, that belongs in the parent/persistence layer, not here.

### `CropperModal` (replaces `CropModal`)

Kept **prop-identical** to today's `CropModal` on purpose — this is what makes the 3 call sites near-zero-diff:

```jsx
<CropperModal
  imageData={string}    // data URL of the source image — unchanged
  onSave={(dataUrl: string) => void}   // cropped result as base64 JPEG data URL — unchanged
  onClose={() => void}
  aspectW={number}      // default 3
  aspectH={number}      // default 4
  title={string}        // default 'Crop Portrait'
/>
```

- **In:** `imageData` — identical to today (a data URL from `readImageFile()` in `utils/imageUpload.js`, itself untouched).
- **Out:** `onSave(dataUrl)` — identical contract to today's `canvas.toDataURL('image/jpeg', 0.92)` output. Every call site's `onSave` callback (`cropped => { set('portraitBase64', cropped); ... }`) needs **zero changes**.
- Internally: Cropper.js v2 owns the crop UI (drag/resize box, aspect-ratio lock) instead of the hand-rolled `onMouseMove`/canvas math in the current file; EXIF-safe orientation and downscale (the quest-board reference behavior) become an internal implementation detail of this component, not something call sites or `imageUpload.js` need to know about.
- Because the prop names and output format are unchanged, **this is a rename+reimplementation, not a redesign** — `import CropModal from './CropModal'` becomes `import CropperModal from './CropperModal'` and nothing else changes at any of the 3 call sites (`Library.jsx`, `CharacterModal.jsx`, `AddLocationModal.jsx`).

## Data Flow

### Cropper flow (unchanged end-to-end shape)

```
file input → readImageFile() → imageData (data URL)
  → <CropperModal imageData onSave onClose>
  → onSave(dataUrl) → parent's set('portraitBase64'|'imageBase64', dataUrl)
  → local form state (CharacterModal/AddLocationModal) or session state (Library.jsx)
  → existing Save button → dispatch(ADD_*/UPDATE_*) → dirtySessionRef / dedicated endpoint
```

This flow is entirely unaffected by the persistence-layer concerns below — all 3 crop call sites already save through **full-object** dispatches (`onSave(form)` from `CharacterModal`, `dispatch({type:'ADD_GLOBAL_LOCATION', payload: created})` from `AddLocationModal`'s `db.createGlobalLocation()`), not the partial-field pattern. Swapping `CropModal` → `CropperModal` is purely a UI/library change with no data-flow implications.

### Markdown flow — two different persistence paths exist today, and they matter

The 4 markdown call sites split across **two structurally different save paths** already present in the codebase. This is the crux of the architecture risk for this milestone:

**Path A — full-object save (safe today):**
- Character bios/notes (`CharacterModal.jsx`): text lives in local `form` state (`useState`), edited via `set('description', v)`. On Save, the *entire* `form` object is passed to the parent's `onSave(form)`, which dispatches `ADD_CHARACTER`/`UPDATE_CHARACTER` with the full character object. `dispatchWithPersist` routes this through `dirtySessionRef` + the post-render `useEffect` flush, which sends the **complete, freshly-merged session object** to `PUT /api/sessions/{id}`.
- Location descriptions (`AddLocationModal.jsx`): text lives in local `createForm` state, saved via a dedicated `db.createGlobalLocation()` / (presumed) `db.updateGlobalLocation()` call — a separate REST resource entirely, unrelated to session upsert.
- **`MarkdownField` slots into these two sites with zero persistence risk** — swap `<textarea value={form.x} onChange={e => set('x', e.target.value)}>` for `<MarkdownField value={form.x} onChange={v => set('x', v)}>`. Nothing about the save path changes.

**Path B — partial top-level session field save (currently broken/lossy — read before wiring):**
- Session "Overview & Hook" and the prep blocks (Notes/Callout/Loot) live inside `activeSession.prepData` and are edited via `SessionPrep.jsx`'s `updatePrep(newPrep)`, which calls `dispatch({ type: 'UPDATE_SESSION', payload: { id: activeSession.id, prepData: newPrep } })` — a **partial** payload containing only `id` and `prepData`.
- `dispatchWithPersist`'s `UPDATE_SESSION` case calls `saveSession(action.payload)` **immediately, using the raw un-merged payload** — unlike the sub-resource actions, it does not wait for the reducer to merge and does not read back from `state`. This is a structural difference from the `dirtySessionRef` path, and it is why Path B is risky where Path A is not.
- `UpsertSessionRequest.Title` (and `DateCreated`/`DateModified`/`Characters`/`Locations`/`Encounters`) have no `required` C# modifier and no `[JsonRequired]` attribute, so `System.Text.Json` does **not** reject the partial JSON at the API boundary (verified — non-nullable-without-`required` record parameters only become mandatory under either the `required` keyword/`JsonRequiredAttribute`, or the opt-in `RespectNullableAnnotations`/`RespectRequiredConstructorParameters` flags, none of which this project's `Program.cs` enables). The request binds successfully with the missing fields defaulted to `null`/`0`/`[]`.
- `SessionRepository.UpsertAsync` then does an **unconditional field-by-field overwrite** on the existing entity (`existing.Title = session.Title`, `existing.Characters = session.Characters`, …) — it does not merge, it replaces. Any field genuinely absent from the incoming partial payload gets written as its JSON-default.

**Confirmed, currently-shipping consequences of Path B, independent of this milestone:**
1. Saving the Overview & Hook field (or any prep block) via `SessionPrep.jsx` sends `{id, prepData}` only. `SessionRepository.UpsertAsync` **never assigns `existing.PrepData = session.PrepData` at all** (it is simply missing from that method's field list, verified by reading the repository) — so **prep data writes never persist past a session's very first insert**, regardless of payload completeness. This is a standalone, more severe bug than the partial-payload issue and sits directly under 2 of the 4 markdown targets for this milestone.
2. `SessionLog.jsx` (notes/log/metadata edits), `TopBar.jsx` (title edit), and `Toolkit.jsx` (`SaveBtn`, session-notes append) all dispatch the same kind of partial `UPDATE_SESSION` payload. Because the repository does unconditional overwrite, each of these calls — as currently written — sends a JSON body missing `Title`/`Characters`/`Locations`/`Encounters`, which get bound to `null`/`[]` and then blindly written over the existing row's title and sub-resource collections. This matches (and sharpens) the "Full collection replace on session upsert" anti-pattern already flagged in the codebase's own `ARCHITECTURE.md`, which explicitly says new consumers of `PUT /api/sessions/{id}` must "keep sending the complete parent session payload" — several existing call sites do not follow that rule today.

**Implication for `MarkdownField`'s `onChange` wiring:** do not replicate `SessionPrep.jsx`'s current pattern verbatim. The safe contract for any *new* markdown field that lives at the top level of a session (Overview & Hook, prep blocks) is: build the `dispatch({ type: 'UPDATE_SESSION', payload })` call with `payload` = the **full current session object with only the target field replaced** (`{ ...activeSession, prepData: newPrep }`), not a two-key partial object — mirroring what `dirtySessionRef`'s flush effect already does correctly for sub-resources. This is a one-line change at each of the 4 `dispatch({type:'UPDATE_SESSION', ...})` call sites (`SessionPrep.jsx`, and ideally `SessionLog.jsx`/`TopBar.jsx`/`Toolkit.jsx` too, since they share the same bug) and requires no backend change. The `PrepData`-never-persists gap, however, **is** a backend fix (`SessionRepository.UpsertAsync` must add `existing.PrepData = session.PrepData;` alongside the other field assignments) and is a hard prerequisite — without it, the Overview & Hook and prep-block markdown fields will appear to work in-session but silently lose all content on reload, which is precisely the "editing tools that lose content" failure mode `PROJECT.md`'s Core Value statement calls out.

## Patterns to Follow

### Pattern 1: Controlled leaf component, parent owns persistence timing

**What:** `MarkdownField` and `CropperModal` never call `dispatch` or `db.*` themselves. They take a value in and hand a new value back via a callback; the call site decides when that becomes a `dispatch(...)`.
**When:** Any new reusable editing widget in this codebase.
**Example:** `RichTextEditor` already does this (`content`/`onChange` → `onUpdate({editor}) { onChange?.(editor.getJSON()) }`), and both new components should match it exactly in spirit, differing only in payload shape (string vs. TipTap JSON vs. cropped data URL).

### Pattern 2: Full-object writes for anything touching `PUT /api/sessions/{id}`

**What:** Whenever a `dispatch` call's payload will be sent to `db.saveSession()` — whether via the `dirtySessionRef` sub-resource path or a direct `UPDATE_SESSION` — the payload sent to the backend must be the complete session object (or the repository must switch to a merge/patch model, which is out of scope here).
**When:** Any `dispatch({ type: 'UPDATE_SESSION', ... })` call, now or in the future.
**Example:** `{ ...activeSession, prepData: newPrep }` instead of `{ id: activeSession.id, prepData: newPrep }`.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Partial `UPDATE_SESSION` payloads (pre-existing, do not extend)

**What:** Dispatching `{ id, <single field> }` to `UPDATE_SESSION` and trusting the backend to merge.
**Why bad:** `SessionRepository.UpsertAsync` does unconditional field overwrite, not a merge — missing fields get written as `null`/`0`/`[]`, silently destroying `Title` and every `Character`/`Location`/`Encounter` in the session on the next save. Confirmed present today in `SessionLog.jsx`, `TopBar.jsx`, `Toolkit.jsx`, `SessionPrep.jsx`.
**Instead:** Spread the full `activeSession` object and override only the changed key before dispatching `UPDATE_SESSION`. Flag this as a fix candidate for this milestone (touches exactly the 2 of 4 markdown call sites owned by `SessionPrep.jsx`, plus 3 adjacent pre-existing call sites sharing the same bug).

### Anti-Pattern 2: Assuming `prepData` persistence already works

**What:** Building/wiring the Overview & Hook and prep-block `MarkdownField`s against the assumption that saves already round-trip correctly, because the feature reads as "existing" (the fields render and hold state in the running tab).
**Why bad:** `SessionRepository.UpsertAsync`'s update branch never assigns `existing.PrepData`, so this data currently survives only until the next full page reload / session refetch pulls the stale (or empty) value back from Postgres. This is invisible during a single editing session and only surfaces on reload — exactly the kind of bug easy to ship unnoticed.
**Instead:** Add `existing.PrepData = session.PrepData;` to `SessionRepository.UpsertAsync`'s existing-session branch as a prerequisite task before or alongside wiring `MarkdownField` into `SessionPrep.jsx`.

### Anti-Pattern 3: Building a new prop contract for the cropper

**What:** Designing `CropperModal`'s props from scratch (e.g. matching Cropper.js v2's own React-wrapper API surface) instead of matching `CropModal`'s existing contract.
**Why bad:** Forces edits at all 3 call sites beyond the crop-library swap itself, increasing surface area for regressions in unrelated form logic (`Library.jsx`, `CharacterModal.jsx`, `AddLocationModal.jsx` all have surrounding form state this shouldn't need to touch).
**Instead:** Keep `imageData`/`onSave`/`onClose`/`aspectW`/`aspectH`/`title` exactly as-is; the component is a reimplementation behind an unchanged interface.

## Suggested Build Order

1. **Backend prerequisite (blocking):** Fix `SessionRepository.UpsertAsync` to persist `PrepData` on update. Without this, 2 of the 4 markdown call sites cannot be verified to work at all — build/test this first and independently of any frontend component work.
2. **`MarkdownField` component, built and visually verified in isolation** (e.g. against one throwaway call site or a Storybook-less manual smoke test) — no call-site wiring yet. Establishes the edit/preview toggle, auto-grow, and dark-theme styling once.
3. **`CropperModal` component, built and visually verified in isolation** against `CropModal`'s exact prop contract, including EXIF-safe downscale behavior — independent of and parallelizable with step 2 (different library, different files, no shared code).
4. **Wire the 3 crop call sites** (`Library.jsx`, `CharacterModal.jsx`, `AddLocationModal.jsx`) — low-risk, near-mechanical import swap since the prop contract is unchanged; can be done in any order, together, in one pass.
5. **Wire the 2 "safe" markdown call sites first** (`CharacterModal.jsx` bio/notes fields, `AddLocationModal.jsx` description field) — these use the already-correct full-object save path, so they validate the component with zero persistence risk before touching the riskier path.
6. **Wire the 2 `SessionPrep.jsx` markdown call sites last** (Overview & Hook, prep blocks) — only after step 1's backend fix has landed, and update `updatePrep`/`updateOverview`/`updatePhase` to dispatch full-session payloads (Anti-Pattern 1 fix) as part of this same step, not deferred.

Steps 2–3 have no dependency on each other or on the backend fix and can run fully in parallel. Steps 4 and 5 have no dependency on step 1 and can run in parallel with it. Step 6 is the only step gated on another step's completion.

## Sources

- `C:\Repos\omphalos\.planning\codebase\ARCHITECTURE.md` (existing codebase architecture map) — HIGH confidence, curated first-party source
- `C:\Repos\omphalos\src\client\context\AppContext.jsx` — read directly, HIGH confidence
- `C:\Repos\omphalos\src\client\db\index.js` — read directly, HIGH confidence
- `C:\Repos\omphalos\src\client\components\RichTextEditor.jsx`, `CropModal.jsx` — read directly, HIGH confidence
- `C:\Repos\omphalos\src\client\components\tabs\SessionPrep.jsx`, `SessionLog.jsx`, `Toolkit.jsx`, `TopBar.jsx`, `session\blocks\*.jsx` — read directly, HIGH confidence
- `C:\Repos\omphalos\src\client\components\character\CharacterModal.jsx`, `Library.jsx`, `location\AddLocationModal.jsx`, `tabs\Locations.jsx` — read directly, HIGH confidence
- `C:\Repos\omphalos\src\Omphalos.Web\Endpoints\SessionEndpoints.cs`, `src\Omphalos.Services\Implementations\SessionService.cs`, `src\Omphalos.Repository\Repositories\SessionRepository.cs`, `src\Omphalos.Domain\DTOs\SessionDtos.cs` — read directly, HIGH confidence; the `PrepData`-never-persisted finding and the partial-payload overwrite finding are both derived from direct code inspection, not inference
- `C:\Repos\omphalos\src\Omphalos.Repository\Configurations\*.cs` — read directly to confirm no `HasMaxLength` on description/notes/bio fields (Postgres `text`, unbounded) — HIGH confidence, supports "no migration needed for markdown length" conclusion
- Microsoft Learn — "Require properties for deserialization", "RespectNullableAnnotations Property" — WebSearch, MEDIUM confidence, used to confirm `System.Text.Json` does not enforce non-nullable-without-`required` constructor parameters as mandatory by default (https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/required-properties, https://learn.microsoft.com/en-us/dotnet/api/system.text.json.jsonserializeroptions.respectnullableannotations)
