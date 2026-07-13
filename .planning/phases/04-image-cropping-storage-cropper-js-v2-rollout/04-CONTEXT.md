# Phase 4: Image Cropping & Storage — Cropper.js v2 Rollout - Context

**Gathered:** 2026-07-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase replaces the hand-rolled `CropModal.jsx` canvas-crop tool with a Cropper.js v2-based `ImageCropModal` at all three existing usage sites (Character Library portraits in `Library.jsx`, in-session character portraits in `CharacterModal.jsx`, location images in `AddLocationModal.jsx`), and pairs it with a full image storage/serving overhaul across all four image-bearing entities (`Character`, `GlobalCharacter`, `Location`, `GlobalLocation`): dual original/cropped storage, dedicated HTTP-cached binary endpoints, and `HasImage` DTO flags replacing embedded Base64.

The reference implementation is the sibling repo **quest-board** (`C:\Repos\quest-board`) — its Character/Contact/DungeonMasterProfile image pipeline (client-side `image-crop.js` + server-side `OriginalImageData`/`CroppedImageData` columns) was read directly during this discussion (not just recalled from `PROJECT.md`'s prior summary) and is now the confirmed, locked pattern for Phase 4's storage model, migration approach, and GIF handling. quest-board is MVC/Razor — only the *pattern* transfers, not the code; wiring must be adapted to Omphalos's React SPA + minimal-API JSON architecture.

It does not touch: markdown editing (Phases 2/3, complete), Session Log/TipTap (untouched, out of scope for the whole milestone), rotate/flip/multi-select crop/filters (Cropper.js v2 supports these but none are requested), unlocked/user-toggleable aspect ratio (each site keeps its fixed ratio).

</domain>

<decisions>
## Implementation Decisions

### Existing Data Migration (confirmed via direct quest-board migration read)
- **D-01:** Follow quest-board's `20260707111803_RenameImageColumnsAddCropped.cs` migration exactly: for each of the 4 entities, **rename** the existing single image column to `OriginalImageData` (preserves bytes in place, no data-copy step), then **add** a new nullable `CroppedImageData` column (defaults to `null` on every existing row). Read/serve pattern: `CroppedImageData ?? OriginalImageData`.
- **D-02 (Omphalos-specific adaptation, not literally in quest-board):** Omphalos's existing columns (`PortraitBase64`, `ImageBase64`) are Base64 **strings**, not `byte[]`/`bytea` — quest-board's source columns were already `varbinary(max)`. The Omphalos migration must both rename *and* convert type (e.g. `ALTER COLUMN ... TYPE bytea USING decode(existing_column, 'base64')`) in the same migration step, so existing images decode correctly into the new `bytea` `OriginalImageData` column rather than double-encoding. This is the one place Phase 4's migration diverges from a literal quest-board copy — flagged for the researcher/planner to get right.
- **D-03:** Consequence of D-01: existing images become **Original-only** after migration (not Cropped-only, not both). A DM re-cropping an existing image crops from the original upload; nothing "looks different" immediately after migration since the fallback read path resolves to the same bytes that display today.

### GIF Upload Flow (confirmed via direct quest-board client-code read, `image-crop.js`)
- **D-04:** On file selection, if `file.type === 'image/gif'`, the crop modal (`ImageCropModal`) never opens — skip the crop flow entirely. The original GIF file is saved as `OriginalImageData` with `CroppedImageData` left `null`; display everywhere falls back to the animated original via `Cropped ?? Original`. This exactly matches quest-board's `resetCropState()`-on-GIF-select behavior in `initImageCrop`'s file-input change handler.
- **D-05:** This is **new behavior** — Omphalos's current 3 crop sites all use `accept="image/*"` (confirmed via code read) and today would silently run a selected GIF through the canvas-based `CropModal`, destroying its animation. No GIF-detection/skip logic exists anywhere in the current codebase; this is being built from scratch per D-04, not extended from an existing partial implementation.

### Stored Image Sizing (confirmed via direct quest-board client-code read, `image-crop.js` / `CharactersController.cs`)
- **D-06:** `OriginalImageData` = the raw uploaded file's bytes, unmodified, with no server-side or client-side downscaling beyond the existing pre-upload size gate (Omphalos already has `MAX_IMAGE_MB = 5` in `src/client/utils/imageUpload.js`, matching quest-board's `maxFileSizeBytes` default of 5MB).
- **D-07:** Before Cropper.js ever touches the image, the frontend prepares a **working copy only** (not what gets stored as Original) via `createImageBitmap(file, { imageOrientation: 'from-image' })` (bakes in EXIF rotation) downscaled to a **2400px longest-edge cap**, canvas-drawn, and blobbed (PNG stays PNG, everything else becomes JPEG at ~0.92 quality). This working copy is what satisfies CROP-09 (EXIF-safe, iOS Safari canvas-ceiling-safe) and is what the crop selection is drawn against.
- **D-08:** `CroppedImageData` = Cropper.js v2's `$toCanvas()` output of the user's crop selection **against the D-07 working copy**, always re-encoded as JPEG (~0.9 quality) regardless of the source format — so the cropped result is bounded by the 2400px working-copy resolution even though the stored Original is full/uncapped resolution.
- **D-09 (Claude's discretion, quest-board precedent to follow unless it proves awkward):** quest-board detects image MIME type for the binary-endpoint `Content-Type` header via magic-byte sniffing (`DetectImageMimeType`: PNG/GIF signature check, else assumes JPEG) rather than storing a separate content-type column. Follow this approach for Omphalos's new endpoints unless research surfaces a reason not to (e.g. it doesn't handle a format Omphalos needs to support).

### Dead Code Cleanup (new finding from this discussion's codebase scout, not in original requirements)
- **D-10:** Delete `src/client/components/PortraitCrop.jsx` — confirmed via grep that it is never imported anywhere in `src/client` (dead code, ~60 lines, distinct from `CropModal.jsx` which IS used at all 3 sites).
- **D-11:** Remove `PortraitPanX`/`PortraitPanY` from `Character` and `GlobalCharacter` (entities, DTOs, and any request/create-payload shapes) as part of this phase's migration. Confirmed via grep: these fields are written on every crop-save (`set('portraitPanX', 0)` etc.) and round-tripped through the API, but never read anywhere for rendering — every portrait `<img>` across `CharacterModal.jsx`, `Library.jsx`, `AddFromLibraryModal.jsx`, and `Portrait.jsx` hardcodes `objectPosition: 'center top'`, ignoring the stored pan values entirely. Doing this now is free — the migration is already touching these same tables/columns — and prevents write-only dead weight from being carried into the new DTOs/endpoints.
- **Explicitly NOT following Phase 2's precedent here:** Phase 2 found `LocationsLibrary.jsx` dead code and left it untouched (flagged, not deleted) to stay strictly scoped. This phase makes the opposite call for `PortraitCrop.jsx`/pan fields specifically because the migration already rewrites the exact tables/DTOs involved — the marginal cost of removing them now is near zero, unlike `LocationsLibrary.jsx` which sat in an unrelated component with no other reason to be touched.

### Claude's Discretion
- Exact naming for Character/Location's new binary endpoint routes (no `CharacterEndpoints.cs`/`LocationEndpoints.cs` exist today — Character/Location are currently only reachable nested inside `SessionEndpoints.cs`'s session payload, unlike `GlobalCharacterEndpoints.cs`/`GlobalLocationEndpoints.cs` which already have dedicated files). Follow the existing per-file `GetUserId(ClaimsPrincipal)` ownership-check convention (`ARCHITECTURE.md` anti-pattern note) for the two session-scoped entities; `GlobalCharacter`/`GlobalLocation` endpoints need no ownership check (library entities are not user-scoped, confirmed in `ARCHITECTURE.md`).
- Exact HTTP caching mechanism (ETag vs Cache-Control vs both) for the new binary endpoints — quest-board has zero caching on its equivalent endpoints (confirmed via direct code read of `CharactersController.cs`'s `GetProfilePicture`/`GetCroppedPicture`, which return bare `File(bytes, mimeType)` with no cache headers), so there is no precedent to match here; this is Omphalos's own deliberate improvement (IMG-07) and its exact mechanism is left to research/planning.
- Whether Cropper.js v2's aspect-ratio/zoom/touch/rule-of-thirds/corner-handle configuration is wired via HTML attributes on its Web Component elements (as quest-board's Razor views do, e.g. `cropperSelectionEl.setAttribute('aspect-ratio', ...)`) or via a more React-idiomatic ref-driven wrapper — this is the "highest-risk pattern" flagged in `STATE.md` (no maintained React wrapper for Cropper.js v2's Web Components) and is squarely a research/planning question, not a user-vision one.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` §"Image Cropping" — CROP-01 through CROP-09
- `.planning/REQUIREMENTS.md` §"Image Storage & Serving" — IMG-01 through IMG-07
- `.planning/REQUIREMENTS.md` §"Out of Scope" — rotate/flip/multi-select/filters, unlocked aspect ratio
- `.planning/PROJECT.md` §"Key Decisions" — locks Cropper.js v2 + shared `ImageCropModal`, dual original/cropped storage matching quest-board, and the deliberate HTTP-caching improvement over quest-board's uncached reference
- `.planning/ROADMAP.md` §"Phase 4" — goal, success criteria, suggested 5-plan breakdown (migration/DTOs → endpoints → shared crop component → wiring → app-wide `<img>` refactor)
- `.planning/ROADMAP.md` §"Roadmap Revision Log" (2026-07-10 entry) — why Phase 4 is one phase, not split backend/frontend

### quest-board reference implementation (primary source — read directly during this discussion, not just PROJECT.md's summary)
- `C:\Repos\quest-board\QuestBoard.Repository\Migrations\20260304113417_MoveCharacterImagesToSeparateTable.cs` — earlier migration: moves a single image column into a 1:1 `{Entity}Images` table (`CharacterImages`, mirrored by `ContactImages`/`DungeonMasterProfileImages`), FK'd to the owning entity's Id, with a data-copy `INSERT...SELECT` step (this specific copy step is NOT needed for Omphalos since Omphalos's target schema keeps the rename-in-place approach from the *next* migration below — cited for full historical context on how quest-board arrived at its current schema)
- `C:\Repos\quest-board\QuestBoard.Repository\Migrations\20260707111803_RenameImageColumnsAddCropped.cs` — **the migration pattern to replicate** (D-01): `RenameColumn` old→`OriginalImageData`, `AddColumn` nullable `CroppedImageData`, for all 3 of quest-board's image tables
- `C:\Repos\quest-board\QuestBoard.Repository\CharacterRepository.cs` — `GetCharacterOriginalPictureAsync`/`GetCharacterCroppedPictureAsync` (the `CroppedImageData ?? OriginalImageData` fallback query, D-01/D-03), `UpdateWithProfileImageAsync`/`ApplyProfileImage` (how original+cropped bytes are written together in one `SaveChangesAsync`), `HasProfilePicture` computed via an `EXISTS`-style scalar query rather than loading image bytes (informs Omphalos's `HasImage` DTO flag pattern, IMG-05)
- `C:\Repos\quest-board\QuestBoard.Service\Controllers\Characters\CharactersController.cs` — `GetProfilePicture`/`GetCroppedPicture` action pattern (D-09's `DetectImageMimeType` magic-byte sniffing), confirms no cache headers exist on either endpoint (informs the "Claude's Discretion" cache-mechanism note above)
- `C:\Repos\quest-board\QuestBoard.Service\wwwroot\js\image-crop.js` — **the client-side pipeline to replicate**: `prepareImageForCropper()` (D-07, EXIF-correct + 2400px downscale working copy via `createImageBitmap`), `extractCroppedBlob()` (D-08, `$toCanvas()` → JPEG), the `file.type === 'image/gif'` skip-crop branch in `initImageCrop`'s change handler (D-04/D-05)
- `C:\Repos\quest-board\QuestBoard.Domain\Models\Character.cs` — confirms the domain-model shape quest-board settled on (`ProfilePicture` byte[] + `HasProfilePicture` bool at the model layer, image bytes/crop data actually living in the repository-layer `ProfileImage` navigation/entity)

### Component/entity source (primary source — direct code inspection, Omphalos side)
- `src/client/components/CropModal.jsx` — the component being replaced at all 3 sites; current props (`imageData`, `onSave`, `onClose`, `aspectW`/`aspectH`, `title`) and behavior (drag-reposition, rule-of-thirds grid, corner handles, touch support) that CROP-04 requires the replacement to match
- `src/client/components/PortraitCrop.jsx` — dead code to delete (D-10)
- `src/client/utils/imageUpload.js` — existing `MAX_IMAGE_MB`/`MAX_IMAGE_BYTES` (5MB) constant and `readImageFile` file-size gate to reuse/extend for D-06
- `src/Omphalos.Domain/Entities/Character.cs`, `GlobalCharacter.cs`, `Location.cs`, `GlobalLocation.cs` — current single-Base64-column shape being migrated (D-01/D-02); `Character.cs`/`GlobalCharacter.cs` also carry the `PortraitPanX`/`PortraitPanY` fields to remove (D-11)
- `src/Omphalos.Domain/DTOs/CharacterDtos.cs`, `LocationDtos.cs` (and the equivalent `GlobalCharacterDtos.cs`/`GlobalLocationDtos.cs`) — current DTO shapes embedding `PortraitBase64`/`ImageBase64` directly, to be replaced with a `HasImage` bool per IMG-05
- `src/Omphalos.Web/Endpoints/GlobalCharacterEndpoints.cs`, `GlobalLocationEndpoints.cs` — existing endpoint-group pattern for the two library (non-user-scoped) entities, to extend with new binary routes
- `src/Omphalos.Web/Endpoints/SessionEndpoints.cs` — confirms `Character`/`Location` currently have **no dedicated endpoint files** of their own (only reachable nested in the session payload) — new binary endpoints for these two entities need session-ownership-scoped routes, unlike the two Global* entities

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/client/utils/imageUpload.js` — `MAX_IMAGE_MB`/`readImageFile` file-size gate, reusable as-is for the new crop flow's pre-check
- Existing per-site aspect ratios to preserve (CROP-04): `AddLocationModal.jsx` passes `aspectW={4} aspectH={3}`; `CharacterModal.jsx`/`Library.jsx` use `CropModal`'s default (3:4, portrait orientation)

### Established Patterns
- All 3 current crop sites use `<input type="file" accept="image/*" ...>` (confirmed via grep) — no MIME-type filtering exists today beyond the browser's native file picker, and no GIF-specific handling exists anywhere in the current codebase (D-05)
- `GlobalCharacter`/`GlobalLocation` are explicitly **not** user-scoped (shared library, per `ARCHITECTURE.md`); `Character`/`Location` are session-scoped and every session query filters by JWT `userId` via a repeated per-file `GetUserId(ClaimsPrincipal)` helper — new image endpoints must follow whichever ownership model matches their entity
- Backend error-handling convention: services return `null`/result-enums, endpoints translate to `Results.NotFound()`/`Results.Conflict()` — no exceptions, no global exception middleware (`CONVENTIONS.md`) — new image endpoints should follow this, returning `Results.NotFound()` for a missing image rather than throwing

### Integration Points — full usage-site list (confirmed via code read)
- `src/client/components/Library.jsx` — Character Library portrait crop (`CropModal` at 2 call sites: create-flow and edit-flow), plus the Locations tab's global-location image crop
- `src/client/components/character/CharacterModal.jsx` — in-session character portrait crop
- `src/client/components/location/AddLocationModal.jsx` — location image crop (`aspectW={4} aspectH={3}`)
- Portrait rendering sites reading `portraitBase64` with hardcoded `objectPosition: 'center top'` (all need updating to the new binary-endpoint `<img src>` pattern per IMG-04/06): `CharacterModal.jsx`, `Library.jsx`, `character/AddFromLibraryModal.jsx`, `character/Portrait.jsx`
- `src/client/data/mockData.js` — seeds `portraitPanX`/`portraitPanY: 0` on mock characters; needs updating alongside D-11's removal
- `src/client/components/session/NpcQuickBar.jsx`, `src/client/components/tabs/Characters.jsx` — additional call sites round-tripping `portraitPanX`/`portraitPanY` through create/link flows, all needing cleanup per D-11

</code_context>

<specifics>
## Specific Ideas

User directed research into quest-board's actual source rather than accepting abstract options for the migration/GIF/sizing questions ("please research the quest-board here... something like that is build in questboard"). All three areas were resolved by reading quest-board's code directly (see Canonical References above) and confirmed back to the user as exact-match adoptions — this is the strongest possible signal for this phase: default to quest-board's literal implementation wherever it's readable, rather than inventing an independent approach.

</specifics>

<deferred>
## Deferred Ideas

None raised — discussion stayed within phase scope. No pending todos matched this phase (`todo.match-phase` returned 0 matches).

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 4-Image Cropping & Storage — Cropper.js v2 Rollout*
*Context gathered: 2026-07-13*
