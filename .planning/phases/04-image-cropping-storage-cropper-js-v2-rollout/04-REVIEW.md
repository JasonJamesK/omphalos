---
phase: 04-image-cropping-storage-cropper-js-v2-rollout
reviewed: 2026-07-14T00:00:00Z
depth: standard
files_reviewed: 44
files_reviewed_list:
  - src/Omphalos.Domain/DTOs/CharacterDtos.cs
  - src/Omphalos.Domain/DTOs/GlobalCharacterDtos.cs
  - src/Omphalos.Domain/DTOs/GlobalLocationDtos.cs
  - src/Omphalos.Domain/DTOs/LocationDtos.cs
  - src/Omphalos.Domain/Entities/Character.cs
  - src/Omphalos.Domain/Entities/GlobalCharacter.cs
  - src/Omphalos.Domain/Entities/GlobalLocation.cs
  - src/Omphalos.Domain/Entities/Location.cs
  - src/Omphalos.Domain/Interfaces/IGlobalCharacterRepository.cs
  - src/Omphalos.Domain/Interfaces/IGlobalLocationRepository.cs
  - src/Omphalos.Domain/Interfaces/IImageService.cs
  - src/Omphalos.Domain/Interfaces/ISessionRepository.cs
  - src/Omphalos.IntegrationTests/ImageEndpointTests.cs
  - src/Omphalos.IntegrationTests/ImageStorageModelTests.cs
  - src/Omphalos.IntegrationTests/Omphalos.IntegrationTests.csproj
  - src/Omphalos.IntegrationTests/WebAppFactory.cs
  - src/Omphalos.Repository/Configurations/CharacterConfiguration.cs
  - src/Omphalos.Repository/Configurations/GlobalCharacterConfiguration.cs
  - src/Omphalos.Repository/Configurations/GlobalLocationConfiguration.cs
  - src/Omphalos.Repository/Configurations/LocationConfiguration.cs
  - src/Omphalos.Repository/Migrations/20260713134719_RenameImageColumnsAddCropped.cs
  - src/Omphalos.Repository/Repositories/GlobalCharacterRepository.cs
  - src/Omphalos.Repository/Repositories/GlobalLocationRepository.cs
  - src/Omphalos.Repository/Repositories/ImageWriteContract.cs
  - src/Omphalos.Repository/Repositories/SessionRepository.cs
  - src/Omphalos.Services/Implementations/GlobalCharacterService.cs
  - src/Omphalos.Services/Implementations/GlobalLocationService.cs
  - src/Omphalos.Services/Implementations/ImageService.cs
  - src/Omphalos.Services/Implementations/ImageValidation.cs
  - src/Omphalos.Services/Implementations/SessionService.cs
  - src/Omphalos.Web/Endpoints/CharacterImageEndpoints.cs
  - src/Omphalos.Web/Endpoints/GlobalCharacterEndpoints.cs
  - src/Omphalos.Web/Endpoints/GlobalLocationEndpoints.cs
  - src/Omphalos.Web/Endpoints/LocationImageEndpoints.cs
  - src/Omphalos.Web/Endpoints/SessionEndpoints.cs
  - src/Omphalos.Web/Program.cs
  - src/client/components/ImageCropModal.jsx
  - src/client/components/Library.jsx
  - src/client/components/character/AddFromLibraryModal.jsx
  - src/client/components/character/CharacterModal.jsx
  - src/client/components/character/Portrait.jsx
  - src/client/components/location/AddLocationModal.jsx
  - src/client/components/session/NpcQuickBar.jsx
  - src/client/components/session/blocks/LocationsBlock.jsx
  - src/client/components/tabs/Characters.jsx
  - src/client/components/tabs/Locations.jsx
  - src/client/data/mockData.js
  - src/client/utils/imageUpload.js
  - src/client/utils/imageUrls.js
findings:
  critical: 1
  warning: 7
  info: 3
  total: 11
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-07-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 44
**Status:** issues_found

## Summary

Reviewed the full dual-column image storage model (migration, EF configurations, repositories, `ImageWriteContract`), the binary image-serving endpoints (caching/ETag/validation), and the Cropper.js v2 rollout across all three crop sites (Character Library, in-session Character portraits, Locations). The backend write-contract and IDOR-safe read paths are well designed and covered by real integration tests against Postgres/Testcontainers. However, the front-end re-crop flow has a genuine data-loss-class defect: none of the four "Re-crop" entry points guard against the image currently being an animated GIF, directly contradicting the explicit invariant documented in `ImageCropModal.jsx` ("this component ... must never be mounted for `file.type === 'image/gif'`"). Clicking Re-crop on a GIF-holding character/location silently bakes the GIF down to a single static JPEG frame. Several secondary issues were found: the image write-contract's "clear on HasImage=false" rule is only enforced on update paths and not on any create path, GIF uploads show a broken/stale preview until save, and a few smaller robustness/consistency gaps in caching headers, migration null-handling, and error handling.

## Critical Issues

### CR-01: Re-crop flow never checks for animated GIFs — cropping a GIF silently destroys its animation

**File:** `src/client/components/character/CharacterModal.jsx:82-95`
**Issue:** `ImageCropModal.jsx` documents an explicit invariant (lines 40-42): "GIF handling is the caller's responsibility: this component assumes a non-GIF, croppable image and must never be mounted for `file.type === 'image/gif'`." GIF-ness is only checked once, at initial upload time (`isGifFile(f)` in `handlePortrait`). It is never re-checked when the user clicks **Re-crop** on an image that is currently a GIF (either a GIF just uploaded this session, or a pre-existing stored GIF fetched back via `/original`).

`handleRecrop()` unconditionally feeds whatever bytes are currently stored (local base64 or a fetched `/original` blob) into `ImageCropModal`, with no `isGifFile`/magic-byte check:
```js
async function handleRecrop() {
    setUploadError('')
    setGifNotice(false)
    let source = null
    if (form.originalImageData) {
      source = base64ToBlob(form.originalImageData)   // could be GIF bytes
    } else {
      const url = sessionCharacterImageUrl(form, sessionId, 'original')
      if (url) source = await fetchImageBlob(url)      // could be a stored GIF
    }
    if (!source) return
    setCropMode('re-crop')
    setCropFile(source)   // mounts ImageCropModal with GIF bytes — violates its own invariant
  }
```
The "Re-crop" button is rendered unconditionally whenever a preview URL/image exists (lines 271-280), with no gating on the image being a GIF. `ImageCropModal` then runs the GIF through `prepareWorkingCopy` → `createImageBitmap` → draws a single frame to canvas → `canvas.toBlob(..., 'image/jpeg', 0.9)`, producing a static JPEG that becomes the new `croppedImageData`. Because the app's default display variant is `cropped` (`sessionCharacterImageUrl`/`sessionLocationImageUrl` default `variant='cropped'`), every card/grid/preview in the app will now show the static frame instead of the animation — the user's animated GIF is silently converted to a dead single frame with no warning, and there is no "revert to just the original" UI action (Remove clears both original and cropped).

The identical gap exists at all four crop sites reviewed in this phase:
- `src/client/components/character/CharacterModal.jsx:82-95` (session character portrait)
- `src/client/components/location/AddLocationModal.jsx:88-101` (new shared location, create step)
- `src/client/components/Library.jsx:92-103` (`GlobalLocationModal.handleRecrop`)
- `src/client/components/Library.jsx:398-409` (`GlobalCharacterModal.handleRecrop`)

**Fix:** Track the current image's format (e.g., store a lightweight `isGif`/`mimeType` flag alongside `hasImage` in the session/global DTOs, or sniff the fetched blob's magic bytes before opening the crop modal) and short-circuit `handleRecrop` with the same "Animated GIFs are saved as-is" notice instead of opening `ImageCropModal`, e.g.:
```js
async function handleRecrop() {
  setUploadError('')
  setGifNotice(false)
  let source = null
  if (form.originalImageData) {
    source = base64ToBlob(form.originalImageData)
  } else {
    const url = sessionCharacterImageUrl(form, sessionId, 'original')
    if (url) source = await fetchImageBlob(url)
  }
  if (!source) return
  if (await isGifBlob(source)) {   // sniff first two bytes: 0x47 0x49
    setGifNotice(true)
    return
  }
  setCropMode('re-crop')
  setCropFile(source)
}
```
Apply the same guard in `AddLocationModal.jsx` and both `Library.jsx` modals.

## Warnings

### WR-01: Image write-contract's "clear on HasImage=false" rule is not enforced on any create path

**File:** `src/Omphalos.Repository/Repositories/SessionRepository.cs:35-38`
**Issue:** `ImageWriteContract.Apply` (Rule 1: `HasImage=false` ⇒ null out both byte columns) is only invoked from the *update* paths (`CopyCharacterFields`, `CopyLocationFields`, and `GlobalCharacterRepository.UpdateAsync` / `GlobalLocationRepository.UpdateAsync`). It is never invoked when a row is first inserted:
- `SessionRepository.UpsertAsync`, `existing is null` branch: `db.GameSessions.Add(session)` adds the whole session graph (including all Characters/Locations) with whatever bytes `SessionService.MapToEntity` copied straight from the request, with no contract applied.
- `GlobalCharacterRepository.CreateAsync` (lines 15-20) and `GlobalLocationRepository.CreateAsync` (lines 15-20) likewise persist `character.OriginalImageData`/`CroppedImageData` verbatim.

If a client ever submits `hasImage: false` together with non-null image bytes for a brand-new session/character/location (e.g. a stale form state bug), those bytes are persisted unmodified, and the next `GET` will report `HasImage: true` (computed as `OriginalImageData != null` in `SessionService.MapToDto`/`GlobalCharacterService.MapToDto`/`GlobalLocationService.MapToDto`) even though the client asked for no image. Byte format/size is still validated by `ImageValidation.IsInvalidUpload` on these paths, so this is a consistency gap rather than an injection/size-limit bypass.

**Fix:** Route all three create paths through `ImageWriteContract.Apply` with `existingOriginal`/`existingCropped` as `null`, e.g. in `GlobalCharacterRepository.CreateAsync`:
```csharp
var (original, cropped) = ImageWriteContract.Apply(
    character.HasImage, character.OriginalImageData, character.CroppedImageData, null, null);
character.OriginalImageData = original;
character.CroppedImageData = cropped;
```
and equivalently for `GlobalLocationRepository.CreateAsync` and the new-session branch of `SessionRepository.UpsertAsync`.

### WR-02: GIF upload shows a broken or stale preview until the record is saved

**File:** `src/client/components/character/CharacterModal.jsx:104-106`
**Issue:** For non-GIF uploads, a fresh crop always produces `croppedImageData`, so the preview renders from the local base64 data URL. For GIFs, `croppedImageData` is deliberately left `null` (animation must not be baked to a single frame), so the preview falls back to the server binary endpoint:
```js
const portraitPreviewUrl = form.croppedImageData
    ? `data:image/jpeg;base64,${form.croppedImageData}`
    : sessionCharacterImageUrl(form, sessionId)
```
- For a brand-new (not-yet-saved) character/location, this URL 404s — the user sees a broken-image icon immediately after uploading their GIF, with no indication the upload actually succeeded locally.
- For an existing character/location that already has a saved image, uploading a *replacement* GIF shows the **old** stored image (server hasn't received the new bytes yet), which looks like the upload was silently ignored.

Same pattern in `src/client/components/location/AddLocationModal.jsx:161-163`, `src/client/components/Library.jsx:125` (`GlobalLocationModal`), and `src/client/components/Library.jsx:477` (`GlobalCharacterModal`).

**Fix:** When `isGifFile(f)` is true, build a local `URL.createObjectURL(f)` preview (the same way `ImageCropModal` previews the working copy) instead of relying on the server binary endpoint before the entity is persisted.

### WR-03: `ImageCropModal.handleCropAndSave` has no error handling

**File:** `src/client/components/ImageCropModal.jsx:112-115`
**Issue:**
```js
async function handleCropAndSave() {
    const canvas = await selectionElRef.current.$toCanvas()
    canvas.toBlob(blob => onSave(file, blob), 'image/jpeg', 0.9)
}
```
`$toCanvas()` can reject (e.g. on a tainted/oversized canvas) and `canvas.toBlob` can invoke its callback with `blob === null` on encoder failure. Neither case is handled: a rejected promise becomes an unhandled rejection with no user feedback, and a `null` blob is passed straight into `onSave`, where every caller's `handleCropSave` calls `blobToBase64(croppedBlob)` — `FileReader.readAsDataURL(null)` throws synchronously, leaving the modal open with `ready` never reset and no error surfaced to the user.

**Fix:**
```js
async function handleCropAndSave() {
  try {
    const canvas = await selectionElRef.current.$toCanvas()
    canvas.toBlob(blob => {
      if (!blob) { setError('Could not export the cropped image.'); return }
      onSave(file, blob)
    }, 'image/jpeg', 0.9)
  } catch {
    setError('Could not export the cropped image.')
  }
}
```

### WR-04: `Cache-Control: public` on authorization-gated image endpoints

**File:** `src/Omphalos.Web/Endpoints/GlobalCharacterEndpoints.cs:36`
**Issue:** The Global Character/Location portrait endpoints are mounted under groups that call `.RequireAuthorization()` (every request needs a valid `omphalos_token`), yet the response explicitly sets `Cache-Control: public, max-age=31536000, immutable`. Per CLAUDE.md, TLS is terminated at a reverse proxy in production; if that proxy (or any intermediary/CDN) is configured to honor `Cache-Control: public` for shared caching, a response fetched by one authenticated user could be served from cache to a different, unauthenticated request for the same URL, bypassing the `RequireAuthorization()` check at the origin. Same pattern in `src/Omphalos.Web/Endpoints/GlobalLocationEndpoints.cs:36`.
**Fix:** If shared/proxy caching of these images is intended, add `Vary: Cookie` (or move auth to a query-string token that participates in the cache key) so a shared cache cannot conflate requests from different principals; otherwise use `private` here too, consistent with the session-scoped endpoints.

### WR-05: Migration only guards `IS NULL`, not empty string, when casting legacy base64 columns

**File:** `src/Omphalos.Repository/Migrations/20260713134719_RenameImageColumnsAddCropped.cs:15-17`
**Issue:**
```sql
ALTER TABLE "Characters" ALTER COLUMN "OriginalImageData" TYPE bytea
USING CASE WHEN "OriginalImageData" IS NULL THEN NULL ELSE decode("OriginalImageData", 'base64') END;
```
If any pre-migration row ever stored an empty string (`''`) rather than `NULL` to represent "no image" (a plausible pattern from the deleted pre-Phase-4 client code, which is not available to verify here), `decode('', 'base64')` yields a non-null, zero-length `bytea` rather than `NULL`. Post-migration, `HasImage` (computed everywhere as `OriginalImageData != null`) would report `true` for that row, and the binary endpoints would serve a 0-byte body with `Content-Type: image/jpeg` (see IN-01) — a "phantom" broken image where there should be none. The same pattern repeats for `GlobalCharacters`, `Locations`, and `GlobalLocations`.
**Fix:** Broaden the guard to also treat empty string as "no image": `CASE WHEN "OriginalImageData" IS NULL OR "OriginalImageData" = '' THEN NULL ELSE decode(...) END`.

### WR-06: `LocationConfiguration` omits the `Name` constraints its sibling entities declare

**File:** `src/Omphalos.Repository/Configurations/LocationConfiguration.cs:9-13`
**Issue:** `CharacterConfiguration`, `GlobalCharacterConfiguration`, and `GlobalLocationConfiguration` all explicitly declare `builder.Property(x => x.Name).IsRequired().HasMaxLength(...)`. `LocationConfiguration` configures only `Ignore(l => l.HasImage)` and leaves `Name` unconfigured, so it has no explicit max-length (relies on EF Core's provider default, effectively unbounded `text`) and no explicit required-ness, unlike every other entity touched in this phase.
**Fix:** Add the same declaration for consistency:
```csharp
builder.Property(l => l.Name).IsRequired().HasMaxLength(500);
```

### WR-07: `base64ToBlob` helpers default to the wrong MIME type, dropping alpha in the crop-stage working copy

**File:** `src/client/components/character/CharacterModal.jsx:15-20`
**Issue:** Three near-identical `base64ToBlob` helpers exist (`CharacterModal.jsx:15-20`, `AddLocationModal.jsx:13-18`, `Library.jsx:24-29`), used to feed a not-yet-saved original back into `ImageCropModal` for a re-crop. Two default `mimeType` to `'image/jpeg'`; `Library.jsx`'s version passes no type at all (`new Blob([bytes])`, `type` defaults to `''`). `prepareWorkingCopy` in `imageUpload.js` picks the working-copy output format from `fileOrBlob.type === 'image/png'`, so whenever the source is a not-yet-persisted (local) PNG being re-cropped, the working copy is always re-encoded as JPEG (background composited to opaque), discarding any transparency in the crop-stage preview. This does not affect already-saved images (those are re-fetched from the server's `/original` endpoint, whose actual decode is content-sniffed and unaffected), only the "re-crop before first save" path.
**Fix:** Track and pass the real MIME type through (e.g. store it alongside `originalImageData` in local form state, or sniff the first bytes) instead of hardcoding/defaulting to JPEG.

## Info

### IN-01: `DetectImageMimeType` silently defaults to `image/jpeg` for unrecognized byte sequences

**File:** `src/Omphalos.Services/Implementations/ImageValidation.cs:14-17`
**Issue:** `DetectImageMimeType` has no "unknown" case — any bytes that aren't PNG/GIF/JPEG (e.g. corrupt data, or the 0-byte case from WR-05) are labeled `image/jpeg` by the trailing unconditional branch. New uploads are always validated via `IsInvalidUpload` before storage, but this method is also used to serve rows written before that validation existed (or via direct DB manipulation), so a non-image byte string can be served with a misleading `Content-Type`.
**Fix:** Return `application/octet-stream` (or throw/404) when none of `IsPng/IsGif/IsJpeg` match, rather than assuming JPEG.

### IN-02: `GetUserId` claim-parsing helper duplicated across three endpoint files with a fragile null-forgiving parse

**File:** `src/Omphalos.Web/Endpoints/CharacterImageEndpoints.cs:34-35`
**Issue:** The identical private helper `Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!)` is copy-pasted in `CharacterImageEndpoints.cs:34-35`, `LocationImageEndpoints.cs:34-35`, and `SessionEndpoints.cs:54-55`. The `!` null-forgiving operator means a missing claim throws `NullReferenceException`/`FormatException` (surfacing as an unhandled 500) rather than a clean 401, and any future change to claim shape needs to be made in three places.
**Fix:** Extract to a single shared extension method (e.g. `ClaimsPrincipalExtensions.GetUserId()`) that returns a `Guid?` or throws a well-defined exception the middleware maps to 401.

### IN-03: Invalid `variant` route segment returns 404 instead of 400

**File:** `src/Omphalos.Web/Endpoints/CharacterImageEndpoints.cs:18`
**Issue:** All four binary image endpoints (`CharacterImageEndpoints.cs:18`, `GlobalCharacterEndpoints.cs:28`, `GlobalLocationEndpoints.cs:28`, `LocationImageEndpoints.cs:18`) return `Results.NotFound()` when `variant` is anything other than `"original"`/`"cropped"`. This conflates "the requested variant string is malformed" with "the resource doesn't exist," which makes client-side debugging harder (a typo'd variant looks identical to a genuinely missing character/location).
**Fix:** Return `Results.BadRequest()` for an unrecognized `variant` value, reserving 404 for a genuinely missing/unowned resource.

---

_Reviewed: 2026-07-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
