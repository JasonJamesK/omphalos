# Phase 4: Image Cropping & Storage — Pattern Map

**Mapped:** 2026-07-13
**Files analyzed:** 20
**Analogs found:** 17 / 20 (3 no-analog, novel-in-codebase items flagged below)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/client/components/ImageCropModal.jsx` (new) | component | transform (client-side canvas/blob) | `src/client/components/CropModal.jsx` | exact (being replaced, same props/chrome contract) |
| `src/client/components/CropModal.jsx` (deleted) | component | transform | — | n/a (deletion) |
| `src/client/components/PortraitCrop.jsx` (deleted, D-10) | component | transform | — | n/a (deletion, dead code) |
| `src/client/utils/imageUpload.js` (extended) | utility | file-I/O / transform | itself (extend in place) | exact |
| `src/client/components/Library.jsx` (modified) | component | request-response | itself (extend in place) | exact |
| `src/client/components/character/CharacterModal.jsx` (modified) | component | request-response | itself (extend in place) | exact |
| `src/client/components/location/AddLocationModal.jsx` (modified) | component | request-response | itself (extend in place) | exact |
| `src/client/components/character/Portrait.jsx` (modified) | component | request-response (img src swap) | itself (extend in place) | exact |
| `src/client/components/character/AddFromLibraryModal.jsx` (modified) | component | request-response | `Portrait.jsx` pattern | role-match |
| `src/client/components/session/NpcQuickBar.jsx` (modified, D-11 cleanup) | component | request-response | itself (extend in place) | exact |
| `src/client/components/tabs/Characters.jsx` (modified, D-11 cleanup) | component | request-response | itself (extend in place) | exact |
| `src/client/data/mockData.js` (modified, D-11 cleanup) | config/fixture | batch (static seed data) | itself | exact |
| `src/client/db/index.js` (extended — new image-endpoint fetch helpers) | service | request-response | existing `db.updateSession`/`db.updateGlobalCharacter` fetch calls in same file | exact |
| `src/Omphalos.Repository/Migrations/{ts}_RenameImageColumnsAddCropped.cs` (new) | migration | batch (schema DDL) | `20260709124238_AddNpcStatBlocksAndSessionPrep.cs` (structure) + quest-board's `20260707111803_RenameImageColumnsAddCropped.cs` (semantics) | role-match (structure); exact (semantics, cross-repo) |
| `src/Omphalos.Domain/Entities/Character.cs` (modified) | model | CRUD | itself (rename fields, drop pan) | exact |
| `src/Omphalos.Domain/Entities/GlobalCharacter.cs` (modified) | model | CRUD | itself | exact |
| `src/Omphalos.Domain/Entities/Location.cs` (modified) | model | CRUD | itself | exact |
| `src/Omphalos.Domain/Entities/GlobalLocation.cs` (modified) | model | CRUD | itself | exact |
| `src/Omphalos.Domain/DTOs/CharacterDtos.cs` (modified — add `HasImage`, keep bidirectional write fields per Open Question Option B) | model (DTO) | CRUD | `GlobalCharacterDtos.cs` (for the read/write split precedent) | role-match |
| `src/Omphalos.Domain/DTOs/LocationDtos.cs` (modified) | model (DTO) | CRUD | `GlobalLocationDtos.cs` | role-match |
| `src/Omphalos.Domain/DTOs/GlobalCharacterDtos.cs` (modified — add `HasImage`, byte fields) | model (DTO) | CRUD | itself | exact |
| `src/Omphalos.Domain/DTOs/GlobalLocationDtos.cs` (modified) | model (DTO) | CRUD | itself | exact |
| `src/Omphalos.Web/Endpoints/CharacterImageEndpoints.cs` (new) | route/controller | streaming (binary file response) | `SessionEndpoints.cs` (ownership pattern) | role-match — no existing binary/streaming endpoint analog in repo |
| `src/Omphalos.Web/Endpoints/LocationImageEndpoints.cs` (new) | route/controller | streaming | `SessionEndpoints.cs` (ownership pattern) | role-match |
| `src/Omphalos.Web/Endpoints/GlobalCharacterEndpoints.cs` (extended — add binary routes) | route/controller | streaming | itself (extend in place) + `GlobalLocationEndpoints.cs` (sibling) | exact |
| `src/Omphalos.Web/Endpoints/GlobalLocationEndpoints.cs` (extended — add binary routes) | route/controller | streaming | itself (extend in place) + `GlobalCharacterEndpoints.cs` (sibling) | exact |
| `src/Omphalos.Services/Implementations/SessionService.cs` (modified — `MapToDto`/`MapToEntity` for Character/Location `HasImage`) | service | CRUD | itself (extend in place) | exact |
| `src/Omphalos.Services/Implementations/GlobalCharacterService.cs` (modified — `MapToDto`, image accessor methods) | service | CRUD | itself (extend in place) | exact |
| `src/Omphalos.Services/Implementations/GlobalLocationService.cs` (modified) | service | CRUD | `GlobalCharacterService.cs` (sibling, same shape) | exact |
| `src/Omphalos.Repository/Repositories/SessionRepository.cs` (modified — `CopyCharacterFields`/`CopyLocationFields`, add image scalar-query methods) | repository | CRUD | itself (extend in place) | exact |
| `src/Omphalos.Repository/Repositories/GlobalCharacterRepository.cs`, `GlobalLocationRepository.cs` (modified — add `HasImage`/byte-fetch scalar queries) | repository | CRUD | quest-board `CharacterRepository.cs`'s `HasProfilePicture`/`GetCharacterCroppedPictureAsync` (cross-repo pattern) | role-match (cross-repo) |
| `src/Omphalos.IntegrationTests/ImageMigrationTests.cs` (new, Wave-0 gap per RESEARCH.md) | test | batch/integration | no existing `WebApplicationFactory`/binary-endpoint test precedent in repo | **no analog** |

## Pattern Assignments

### `src/client/components/ImageCropModal.jsx` (component, transform)

**Analog:** `src/client/components/CropModal.jsx` (full file, 200 lines — read in full, small file)

**Props/chrome contract to preserve exactly** (lines 6, 90-97, 185-196):
```jsx
export default function CropModal({ imageData, onSave, onClose, aspectW = 3, aspectH = 4, title = 'Crop Portrait' }) {
  ...
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <div className="bg-[#211b17] rounded-lg p-5 fade-in max-w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-[#d4a574]">{title}</h3>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-[#999999] mb-3">Drag the highlighted box to select your {aspectW}:{aspectH} area</p>
        ...
        <div className="flex gap-3 justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 bg-[#332922] text-[#f0f0f0] rounded hover:bg-[#40332a] transition-colors">Cancel</button>
          <button onClick={handleCrop} disabled={!ready} className="px-5 py-2 bg-[#d4a574] text-[#161310] rounded font-bold hover:bg-[#c49464] transition-colors disabled:opacity-40">Crop & Save</button>
        </div>
      </div>
    </div>
  )
}
```
Per `04-UI-SPEC.md`: keep this exact chrome (overlay `black/85`, card `#211b17` `p-5`), update the caption text to `"Drag to reposition, scroll or pinch to zoom — select your {W}:{H} area."`, update `onSave` to emit `(originalBlob, croppedBlob)` per CROP-06 instead of a single dataURL, and swap the drag/canvas internals (lines 16-88) for Cropper.js v2's Web Components per RESEARCH.md Pattern 1 (full ref-based wiring code is in RESEARCH.md's Architecture Patterns section — copy from there, not from `CropModal.jsx`, for the crop-engine internals).

**GIF-skip entry point (new logic, no existing analog — D-04):** the caller (`Library.jsx`/`CharacterModal.jsx`/`AddLocationModal.jsx`'s file-input `onChange`) must check `file.type === 'image/gif'` **before** ever mounting `ImageCropModal`, matching quest-board's `initImageCrop` change-handler branch (RESEARCH.md Architecture Patterns diagram, "skip crop entirely" branch).

---

### `src/client/utils/imageUpload.js` (utility, file-I/O/transform)

**Analog:** itself, full file (16 lines, read in full)

**Existing gate to reuse as-is** (lines 1-16):
```js
export const MAX_IMAGE_MB = 5
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024

export function readImageFile(file, onLoad, onError) {
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    onError(`Image is ${mb} MB — max allowed size is ${MAX_IMAGE_MB} MB.`)
    return
  }
  const reader = new FileReader()
  reader.onload = e => onLoad(e.target.result)
  reader.onerror = () => onError('Could not read that file.')
  reader.readAsDataURL(file)
}
```
Add a new exported function (e.g. `prepareWorkingCopy(file)`) implementing D-07's `createImageBitmap(file, { imageOrientation: 'from-image' })` → 2400px-cap canvas draw → blob, following the same file-scoped-function, no-class-wrapper style as `readImageFile`. Reuse `MAX_IMAGE_MB`/`MAX_IMAGE_BYTES` unchanged; do not duplicate the size-gate logic elsewhere.

---

### `src/Omphalos.Web/Endpoints/CharacterImageEndpoints.cs` / `LocationImageEndpoints.cs` (new, route/controller, streaming)

**Analog (ownership + group convention):** `src/Omphalos.Web/Endpoints/SessionEndpoints.cs` (full file, 54 lines, read in full)

**Group + auth + ownership-helper pattern to copy** (lines 7-17, 51-52):
```csharp
public static class SessionEndpoints
{
    public static IEndpointRouteBuilder MapSessionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/sessions").RequireAuthorization();

        group.MapGet("/{id}", async (string id, ClaimsPrincipal user, ISessionService sessions, CancellationToken ct) =>
        {
            var userId = GetUserId(user);
            var session = await sessions.GetByIdAsync(id, userId, ct);
            return session is null ? Results.NotFound() : Results.Ok(session);
        });
        ...
    }

    private static Guid GetUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
```
`CharacterImageEndpoints`/`LocationImageEndpoints` must repeat this exact `GetUserId` helper (per-file convention, confirmed duplicated across endpoint files — not shared) and route ownership must be enforced in the **repository query itself** (`.Where(c => c.Session.UserId == userId)`), not just the endpoint layer, per RESEARCH.md's V4 Access Control note.

**No existing binary/streaming-response analog exists in this repo** — every current endpoint returns `Results.Ok(dto)`/`Results.NotFound()`/`Results.Created(...)` JSON. Use RESEARCH.md's Pattern 3 (`TypedResults.File` + ETag + `Cache-Control`) verbatim as the primary source for the binary-response shape:
```csharp
group.MapGet("/{id}/portrait/original", async (string id, ClaimsPrincipal user, ICharacterImageService images, HttpContext http, CancellationToken ct) =>
{
    var userId = GetUserId(user);
    var bytes = await images.GetOriginalAsync(id, userId, ct);
    if (bytes is null) return Results.NotFound();

    var mime = DetectImageMimeType(bytes);
    var etag = new EntityTagHeaderValue($"\"{Convert.ToHexString(SHA256.HashData(bytes))}\"");
    http.Response.Headers.CacheControl = "private, max-age=31536000, immutable";
    return TypedResults.File(bytes, mime, entityTag: etag);
});
```
Use `public, max-age=31536000, immutable` (no `private`) for the equivalent routes added to `GlobalCharacterEndpoints.cs`/`GlobalLocationEndpoints.cs` since those entities are not user-scoped (per RESEARCH.md Pattern 3 note).

---

### `src/Omphalos.Web/Endpoints/GlobalCharacterEndpoints.cs` / `GlobalLocationEndpoints.cs` (extended)

**Analog:** each other (sibling files, identical shape) — both read in full (52 lines each)

**Existing CRUD shape to extend, not replace** (`GlobalCharacterEndpoints.cs` lines 7-51):
```csharp
public static class GlobalCharacterEndpoints
{
    public static IEndpointRouteBuilder MapGlobalCharacterEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/characters").RequireAuthorization();

        group.MapGet("/{id}", async (string id, IGlobalCharacterService service, CancellationToken ct) =>
        {
            var result = await service.GetByIdAsync(id, ct);
            return result is null ? Results.NotFound() : Results.Ok(result);
        });
        ...
        return app;
    }
}
```
Add new `group.MapGet("/{id}/portrait/original", ...)` / `.../portrait/cropped` routes inside this same `group` (no ownership check needed — confirmed in CONTEXT.md/ARCHITECTURE.md, Global* entities are library-shared). Mirror `LocationImageEndpoints`'s route naming (`/image/original`, `/image/cropped`) for the location sibling.

---

### `src/Omphalos.Domain/Entities/Character.cs`, `GlobalCharacter.cs`, `Location.cs`, `GlobalLocation.cs` (modified)

**Analog:** each other + itself (all 4 read directly or via grep; `Character.cs` and `GlobalCharacter.cs` read in full)

**Current shape** (`Character.cs` lines 1-33):
```csharp
public class Character
{
    public string Id { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? PortraitBase64 { get; set; }
    public double PortraitPanX { get; set; }
    public double PortraitPanY { get; set; }
    ...
}
```
Change to: rename `PortraitBase64` (`string?`) → `OriginalImageData` (`byte[]?`), add `CroppedImageData` (`byte[]?`), **delete** `PortraitPanX`/`PortraitPanY` (D-11). Apply identically to `GlobalCharacter.cs` (`PortraitBase64`→`OriginalImageData`/`CroppedImageData`, drop pan fields) and to `Location.cs`/`GlobalLocation.cs` (`ImageBase64`→`OriginalImageData`/`CroppedImageData`, no pan fields to drop there — confirmed only Character/GlobalCharacter carry pan fields).

---

### `src/Omphalos.Domain/DTOs/CharacterDtos.cs` / `GlobalCharacterDtos.cs` (modified)

**Analog for the read/write split precedent:** `GlobalCharacterDtos.cs` (full file, 57 lines, read in full) — already has separate `GlobalCharacterDto` (read) vs `CreateGlobalCharacterRequest`/`UpdateGlobalCharacterRequest` (write):
```csharp
public record GlobalCharacterDto(
    string Id, string Name, ..., string? PortraitBase64, double PortraitPanX, double PortraitPanY, ...);

public record CreateGlobalCharacterRequest(
    string Id, string Name, ..., string? PortraitBase64, double PortraitPanX, double PortraitPanY, ...);
```
For `GlobalCharacterDto`/`CreateGlobalCharacterRequest`/`UpdateGlobalCharacterRequest`: replace `PortraitBase64`/`PortraitPanX`/`PortraitPanY` with `bool HasImage` (read-only, on `GlobalCharacterDto`) and `byte[]? OriginalImageData, byte[]? CroppedImageData` (write-only, on the two `Request` records).

For `CharacterDto`(currently bidirectional per RESEARCH.md's Pitfall 3/Open Question) — **apply Open Question's recommended Option B**: keep `CharacterDto` as a single bidirectional record, add `bool HasImage` alongside `byte[]? OriginalImageData`/`byte[]? CroppedImageData` (server populates `HasImage` on read, ignores/nulls the byte fields on read responses; client populates byte fields only when uploading a new crop via the existing session-upsert flow). Current shape (`CharacterDtos.cs` lines 5-26, read in full):
```csharp
public record CharacterDto(
    string Id, string Name, string? PortraitBase64, double PortraitPanX, double PortraitPanY,
    string? Tagline, string? Class, string? Race, int Level, ...);
```
Remove `PortraitPanX`/`PortraitPanY` (D-11) in the same edit. Apply the identical Option-B approach to `LocationDtos.cs`'s `LocationDto` (mirrors `CharacterDto`'s bidirectional-in-`SessionDto` shape — confirmed via RESEARCH.md's direct read of `SessionDtos.cs`).

---

### `src/Omphalos.Repository/Repositories/SessionRepository.cs` (modified)

**Analog:** itself, `CopyCharacterFields`/`CopyLocationFields` (lines 94-126, read via targeted grep+context)

**Current field-copy shape that MUST be updated in the same commit as the entity rename** (lines 94-115):
```csharp
private static void CopyCharacterFields(Character existing, Character incoming)
{
    existing.Name = incoming.Name;
    existing.PortraitBase64 = incoming.PortraitBase64;
    existing.PortraitPanX = incoming.PortraitPanX;
    existing.PortraitPanY = incoming.PortraitPanY;
    ...
}

private static void CopyLocationFields(Location existing, Location incoming)
{
    existing.Name = incoming.Name;
    ...
    existing.ImageBase64 = incoming.ImageBase64;
    ...
}
```
Replace `PortraitBase64 = incoming.PortraitBase64` with `existing.OriginalImageData = incoming.OriginalImageData; existing.CroppedImageData = incoming.CroppedImageData;` (only when the incoming request actually supplied new bytes — see Open Question Option B's "ignores/nulls on read" note, meaning the service-layer mapping from `CharacterDto`→`Character` entity must not stomp existing bytes with `null` on every save when the client didn't intend to change the image). Drop the two `PortraitPanX`/`PortraitPanY` copy lines entirely (D-11). Add new scalar-query methods here (or on a new `ICharacterImageRepository` if the planner prefers a dedicated seam) following quest-board's `GetCroppedOrOriginalAsync`/`HasProfilePicture` shape from RESEARCH.md's Code Examples section:
```csharp
public async Task<byte[]?> GetCroppedOrOriginalAsync(string characterId, Guid userId, CancellationToken ct = default) =>
    await db.Characters
        .Where(c => c.Id == characterId && c.Session.UserId == userId)
        .Select(c => c.CroppedImageData ?? c.OriginalImageData)
        .FirstOrDefaultAsync(ct);
```

---

### `src/Omphalos.Repository/Migrations/{ts}_RenameImageColumnsAddCropped.cs` (new)

**Analog (structure/style, same repo):** `20260709124238_AddNpcStatBlocksAndSessionPrep.cs` (full file, 72 lines, read in full) — confirms this repo's migration file shape: `#nullable disable`, `partial class : Migration`, `Up`/`Down` pairs, `migrationBuilder.AddColumn<T>(name:, table:, type:, nullable:, ...)` fluent style.

**Analog (semantics, cross-repo):** quest-board's `20260707111803_RenameImageColumnsAddCropped.cs` for the `RenameColumn`+`AddColumn` shape (cited in CONTEXT.md/RESEARCH.md, not re-read here — already extracted into RESEARCH.md's Pattern 2 with the required Postgres `USING decode(...)` raw-SQL addition, which is the one place this migration must diverge from quest-board's literal `byte[]`-to-`byte[]` rename). Use RESEARCH.md's Pattern 2 code block verbatim as the primary source for the `Up()`/`Down()` bodies — it already accounts for D-01/D-02's text→bytea cast requirement that this repo's existing migrations (all of which only `AddColumn`, never `RenameColumn`+retype) have no precedent for.

---

## Shared Patterns

### Endpoint group + auth + per-file ownership helper
**Source:** `src/Omphalos.Web/Endpoints/SessionEndpoints.cs` lines 7-17, 51-52
**Apply to:** `CharacterImageEndpoints.cs`, `LocationImageEndpoints.cs` (new session-ownership-scoped files); `GlobalCharacterEndpoints.cs`/`GlobalLocationEndpoints.cs` extensions need no `GetUserId` (not session-scoped).
```csharp
var group = app.MapGroup("/api/sessions").RequireAuthorization();
...
private static Guid GetUserId(ClaimsPrincipal user) =>
    Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
```

### No-exceptions error handling
**Source:** `GlobalCharacterEndpoints.cs` lines 16-20 (`result is null ? Results.NotFound() : Results.Ok(result)`), `SessionEndpoints.cs` line 23 (identical shape)
**Apply to:** All new/extended endpoint files — services return `null` for "not found", endpoints translate to `Results.NotFound()`. No `try/catch`, no exception middleware exists in this codebase (confirmed via `CONVENTIONS.md` reference in CONTEXT.md and consistent with every endpoint file read this session).

### Binary/cached-file response (NEW pattern for this repo — no in-repo precedent)
**Source:** RESEARCH.md Architecture Patterns → Pattern 3 (derived from quest-board + official ASP.NET Core 10 docs, not from an existing Omphalos file)
**Apply to:** All 4 new binary GET routes (`CharacterImageEndpoints.cs`, `LocationImageEndpoints.cs`, plus extensions to both Global* endpoint files).
```csharp
var etag = new EntityTagHeaderValue($"\"{Convert.ToHexString(SHA256.HashData(bytes))}\"");
http.Response.Headers.CacheControl = "private, max-age=31536000, immutable"; // "public, ..." for Global* entities
return TypedResults.File(bytes, mime, entityTag: etag);
```

### Cropper.js v2 ref-based Web Component wiring (NEW pattern for this repo)
**Source:** RESEARCH.md Architecture Patterns → Pattern 1 (full `ImageCropModal.jsx` skeleton with `useRef`/`useEffect` wiring, official Cropper.js v2 docs)
**Apply to:** `ImageCropModal.jsx` only (single shared component, CROP-07).

### Dark-theme modal chrome
**Source:** `CropModal.jsx` lines 90-97, 185-196 (also confirmed matching `SettingsModal.jsx`'s general modal-chrome convention, but CROP-05 requires matching `CropModal.jsx` specifically — darker `black/85` overlay, not `SettingsModal.jsx`'s `black/70`)
**Apply to:** `ImageCropModal.jsx`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/Omphalos.IntegrationTests/ImageMigrationTests.cs` (or equivalent) | test | batch/integration | No existing `WebApplicationFactory`-based endpoint test exists in this repo (confirmed in RESEARCH.md's Wave 0 Gaps) — all current `Omphalos.IntegrationTests` coverage is repository-level via `Testcontainers.PostgreSql`, not endpoint-level. Planner should follow RESEARCH.md's Validation Architecture section (test map + Wave 0 gap notes) rather than an in-repo analog. |
| Binary/streaming HTTP response endpoints (all 4 new/extended files) | route/controller | streaming | No existing Omphalos endpoint returns anything but `Results.Ok(dto)`/`NotFound()`/`Created()` JSON. Use RESEARCH.md's Pattern 3 as the primary source instead of an in-repo analog (see Shared Patterns above). |
| ETag/Cache-Control generation | cross-cutting | — | No caching exists anywhere in the current codebase (confirmed: no `[ResponseCache]`, no `Cache-Control` header set anywhere). Source entirely from RESEARCH.md Pattern 3 / official ASP.NET Core 10 docs. |

## Metadata

**Analog search scope:** `src/client/components/`, `src/client/utils/`, `src/client/db/`, `src/Omphalos.Web/Endpoints/`, `src/Omphalos.Domain/Entities/`, `src/Omphalos.Domain/DTOs/`, `src/Omphalos.Services/Implementations/`, `src/Omphalos.Repository/Repositories/`, `src/Omphalos.Repository/Migrations/`
**Files scanned:** CropModal.jsx, PortraitCrop.jsx (referenced only), imageUpload.js, Portrait.jsx, GlobalCharacterEndpoints.cs, GlobalLocationEndpoints.cs, SessionEndpoints.cs, Character.cs, GlobalCharacter.cs, CharacterDtos.cs, GlobalCharacterDtos.cs, GlobalCharacterService.cs, SessionRepository.cs (targeted grep+context), 20260709124238_AddNpcStatBlocksAndSessionPrep.cs — plus quest-board files already extracted into RESEARCH.md/CONTEXT.md (not re-read directly in this pass; their extracted excerpts are treated as primary source per CONTEXT.md's canonical refs).
**Pattern extraction date:** 2026-07-13
