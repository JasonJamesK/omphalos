# Phase 4: Image Cropping & Storage — Cropper.js v2 Rollout - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-13
**Phase:** 4-Image Cropping & Storage — Cropper.js v2 Rollout
**Areas discussed:** Existing image migration, GIF upload flow, Stored image size limits, Dead code cleanup

---

## Existing Image Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Cropped-only | Existing image becomes CroppedImageData; OriginalImageData stays null | |
| Original-only | Existing image becomes OriginalImageData; CroppedImageData stays null | |
| Both columns get the same value | Copy existing Base64 into both Original and Cropped | |

**User's choice:** Neither of the above as originally framed — user asked Claude to research quest-board's actual migration directly rather than pick abstractly ("please research the quest-board here... something like that is build in questboard").

**Research finding:** Read `C:\Repos\quest-board\QuestBoard.Repository\Migrations\20260707111803_RenameImageColumnsAddCropped.cs` directly. quest-board's actual migration: `RenameColumn` (old single column) → `OriginalImageData` (preserves bytes in place), then `AddColumn` nullable `CroppedImageData` (defaults null on existing rows). Read pattern: `CroppedImageData ?? OriginalImageData`. This is functionally the "Original-only" option, confirmed via primary source rather than inference.

**Follow-up confirmation:** Presented this finding back to the user as a yes/no lock-in. User selected "Yes, exact match (recommended)."

**Notes:** Omphalos's existing columns are Base64 strings, not `byte[]`/`bytea` like quest-board's source — the migration must rename AND convert type (decode Base64 → bytea) in one step, noted as D-02 in CONTEXT.md, since this is the one place the pattern needs Omphalos-specific adaptation.

---

## GIF Upload Flow

**User's choice:** Asked Claude to research quest-board's actual handling rather than choose from abstract framing.

**Research finding:** Read `C:\Repos\quest-board\QuestBoard.Service\wwwroot\js\image-crop.js` directly. On file select, `if (file.type === 'image/gif')` → `resetCropState()` runs and the function returns immediately — the crop modal never opens. The raw GIF submits as-is via the original file input; no `CroppedPictureFile` is generated; server-side `CroppedImageData` stays null, so display falls back to the animated `OriginalImageData` everywhere.

**Follow-up confirmation:** Presented this finding back to the user. User selected "Yes, exact match (recommended)."

**Notes:** Confirmed via grep that Omphalos's 3 current crop sites use `accept="image/*"` with zero GIF-specific handling today — a selected GIF currently gets silently canvas-cropped (killing its animation). This is genuinely new behavior, not an extension of existing partial logic.

---

## Stored Image Size Limits

**User's choice:** Same research-first approach as above.

**Research finding:** Read `image-crop.js`'s `prepareImageForCropper()` and `extractCroppedBlob()`, and `CharactersController.cs`'s upload handling. quest-board's `OriginalImageData` = raw uploaded file bytes, unmodified, capped only by a pre-upload file-size check (5MB default). `CroppedImageData` is derived from a *separate working copy* — `createImageBitmap(file, { imageOrientation: 'from-image' })` (EXIF-correct decode) downscaled to a 2400px longest-edge cap, canvas-drawn, then Cropper.js v2's `$toCanvas()` crop selection is re-encoded as JPEG (~0.9–0.92 quality) regardless of source format. The stored Original is NOT downscaled; only the Cropped derivative is bounded by the 2400px working-copy resolution.

**Follow-up confirmation:** Presented this finding back to the user. User selected "Yes, exact match (recommended)."

**Notes:** This resolves CROP-09 (EXIF-safe, iOS Safari canvas-ceiling-safe) as a *client-side working-copy* concern, distinct from what actually gets persisted as Original.

---

## Dead Code Found — Clean Up Now?

| Option | Description | Selected |
|--------|-------------|----------|
| Remove both now | Delete PortraitCrop.jsx + drop PortraitPanX/PortraitPanY (entities, DTOs, migration) | ✓ |
| Leave both untouched | Matches Phase 2's LocationsLibrary.jsx precedent (flag, don't delete) | |
| Remove component only, keep pan fields | Delete PortraitCrop.jsx but leave pan fields in case they're meant for a future feature | |

**User's choice:** Remove both now.

**Notes:** Found during this session's codebase scout (not previously documented): `src/client/components/PortraitCrop.jsx` is never imported anywhere (confirmed via grep across `src/client`). `Character`/`GlobalCharacter`'s `PortraitPanX`/`PortraitPanY` fields are written on every crop-save and round-tripped through the API, but never read for rendering — every portrait `<img>` hardcodes `objectPosition: 'center top'`. User chose to remove both now rather than follow Phase 2's flag-don't-delete precedent for `LocationsLibrary.jsx`, since this phase's migration already rewrites the exact same tables/DTOs — the marginal removal cost is near zero here, unlike the unrelated-component case in Phase 2.

---

## Claude's Discretion

- Exact binary-endpoint route naming/file structure for Character/Location images (no dedicated `CharacterEndpoints.cs`/`LocationEndpoints.cs` exist today — only nested in `SessionEndpoints.cs`'s session payload)
- HTTP caching mechanism (ETag vs Cache-Control vs both) for the new endpoints — quest-board has zero caching on its equivalent endpoints, so there's no precedent to match; this is Omphalos's own deliberate improvement (IMG-07)
- MIME-type detection approach for the new endpoints' `Content-Type` header — lean toward quest-board's magic-byte-sniffing approach (`DetectImageMimeType`) unless research surfaces a format gap
- Cropper.js v2 Web Component wiring approach in React (HTML-attribute-driven per quest-board's Razor views, vs. a more React-idiomatic ref-driven wrapper) — flagged in STATE.md as the highest-risk pattern in this milestone; squarely a research/planning question

## Deferred Ideas

None raised — discussion stayed within phase scope.
