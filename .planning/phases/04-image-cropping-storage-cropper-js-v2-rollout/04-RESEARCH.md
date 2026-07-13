# Phase 4: Image Cropping & Storage — Cropper.js v2 Rollout - Research

**Researched:** 2026-07-13
**Domain:** React Web-Component integration (Cropper.js v2), EF Core/Npgsql schema migration (text→bytea), ASP.NET Core minimal-API binary responses with HTTP caching
**Confidence:** MEDIUM-HIGH (backend migration mechanics and quest-board precedent: HIGH via direct primary-source read; Cropper.js v2 React wiring and DTO transport design: MEDIUM, resolved via official docs + codebase inspection, flagged as a planning decision point)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Existing Data Migration (confirmed via direct quest-board migration read)**
- **D-01:** Follow quest-board's `20260707111803_RenameImageColumnsAddCropped.cs` migration exactly: for each of the 4 entities, **rename** the existing single image column to `OriginalImageData` (preserves bytes in place, no data-copy step), then **add** a new nullable `CroppedImageData` column (defaults to `null` on every existing row). Read/serve pattern: `CroppedImageData ?? OriginalImageData`.
- **D-02 (Omphalos-specific adaptation, not literally in quest-board):** Omphalos's existing columns (`PortraitBase64`, `ImageBase64`) are Base64 **strings**, not `byte[]`/`bytea` — quest-board's source columns were already `varbinary(max)`. The Omphalos migration must both rename *and* convert type (e.g. `ALTER COLUMN ... TYPE bytea USING decode(existing_column, 'base64')`) in the same migration step, so existing images decode correctly into the new `bytea` `OriginalImageData` column rather than double-encoding. This is the one place Phase 4's migration diverges from a literal quest-board copy.
- **D-03:** Consequence of D-01: existing images become **Original-only** after migration (not Cropped-only, not both). A DM re-cropping an existing image crops from the original upload; nothing "looks different" immediately after migration since the fallback read path resolves to the same bytes that display today.

**GIF Upload Flow (confirmed via direct quest-board client-code read, `image-crop.js`)**
- **D-04:** On file selection, if `file.type === 'image/gif'`, the crop modal (`ImageCropModal`) never opens — skip the crop flow entirely. The original GIF file is saved as `OriginalImageData` with `CroppedImageData` left `null`; display everywhere falls back to the animated original via `Cropped ?? Original`.
- **D-05:** This is **new behavior** — Omphalos's current 3 crop sites all use `accept="image/*"` and today would silently run a selected GIF through the canvas-based `CropModal`, destroying its animation. No GIF-detection/skip logic exists anywhere in the current codebase.

**Stored Image Sizing (confirmed via direct quest-board client-code read)**
- **D-06:** `OriginalImageData` = the raw uploaded file's bytes, unmodified, beyond the existing 5MB pre-upload size gate (`MAX_IMAGE_MB` in `src/client/utils/imageUpload.js`).
- **D-07:** Before Cropper.js ever touches the image, the frontend prepares a **working copy only** (not what gets stored as Original) via `createImageBitmap(file, { imageOrientation: 'from-image' })` (bakes in EXIF rotation) downscaled to a **2400px longest-edge cap**, canvas-drawn, and blobbed (PNG stays PNG, everything else becomes JPEG at ~0.92 quality). This satisfies CROP-09.
- **D-08:** `CroppedImageData` = Cropper.js v2's `$toCanvas()` output of the user's crop selection **against the D-07 working copy**, always re-encoded as JPEG (~0.9 quality) regardless of source format.
- **D-09 (Claude's discretion, quest-board precedent to follow unless awkward):** Detect image MIME type for the binary-endpoint `Content-Type` header via magic-byte sniffing (`DetectImageMimeType`: PNG/GIF signature check, else assume JPEG) rather than storing a separate content-type column.

**Dead Code Cleanup**
- **D-10:** Delete `src/client/components/PortraitCrop.jsx` — dead code, never imported anywhere.
- **D-11:** Remove `PortraitPanX`/`PortraitPanY` from `Character`/`GlobalCharacter` (entities, DTOs, request/create shapes) — write-only fields, never read for rendering (every portrait `<img>` hardcodes `objectPosition: 'center top'`).

### Claude's Discretion
- Exact naming for Character/Location's new binary endpoint routes (no dedicated endpoint files exist today for these two session-scoped entities — only reachable nested in `SessionEndpoints.cs`'s session payload). Follow the existing per-file `GetUserId(ClaimsPrincipal)` ownership-check convention for these two; `GlobalCharacter`/`GlobalLocation` need no ownership check (not user-scoped).
- Exact HTTP caching mechanism (ETag vs Cache-Control vs both) — quest-board has zero caching on its equivalent endpoints, so there is no precedent; this is Omphalos's own deliberate improvement (IMG-07).
- Whether Cropper.js v2's aspect-ratio/zoom/touch/rule-of-thirds/corner-handle configuration is wired via HTML attributes vs. a more React-idiomatic ref-driven wrapper — flagged in STATE.md as the "highest-risk pattern" in this milestone.

### Deferred Ideas (OUT OF SCOPE)
None raised in discussion. Also explicitly out of scope per REQUIREMENTS.md: rotate/flip, multi-select crop, filters, non-rectangular crop, unlocked/user-toggleable aspect ratio, full quest-board code-sharing.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CROP-01 | Crop character portraits (Library) via Cropper.js v2 | Standard Stack (cropperjs v2.1.1); Architecture Patterns → `ImageCropModal` |
| CROP-02 | Crop in-session character portraits via Cropper.js v2 | Same `ImageCropModal`, mounted in `CharacterModal.jsx` |
| CROP-03 | Crop location images via Cropper.js v2 | Same `ImageCropModal`, mounted in `AddLocationModal.jsx`, aspect 4:3 |
| CROP-04 | Preserve aspect-lock, drag-reposition, touch, rule-of-thirds, corner handles | Code Examples → CropperSelection API surface; UI-SPEC's exact spacing/theming values |
| CROP-05 | Match existing modal chrome | UI-SPEC (locked, not re-derived here) |
| CROP-06 | `ImageCropModal` outputs both original + cropped data on save | Architecture Patterns → onSave contract; Open Questions → read/write DTO transport |
| CROP-07 | One shared `ImageCropModal` reused at all 3 sites | Architecture Patterns → component design |
| CROP-08 | Zoom via wheel + pinch | Cropper.js v2 built-in `<cropper-image>` scalable/zoomable behavior — Common Pitfalls (React 18 attribute binding) |
| CROP-09 | EXIF-safe + downscaled before crop | D-07 (`createImageBitmap` + 2400px cap) — Don't Hand-Roll |
| IMG-01 | Dual original/cropped columns per entity | D-01/D-02 migration pattern — Code Examples |
| IMG-02 | Re-crop without re-upload | D-03 (Original retained separately) |
| IMG-03 | GIFs display via `Cropped ?? Original` fallback | D-04/D-05 — Code Examples (repository query pattern) |
| IMG-04 | Dedicated binary endpoints, not embedded base64 in JSON | Architecture Patterns → endpoint design; Open Questions (read/write DTO split) |
| IMG-05 | `HasImage` bool replaces embedded bytes in read DTOs | Architecture Patterns → DTO split; quest-board `HasProfilePicture` EXISTS-query pattern |
| IMG-06 | List/detail pages don't wait on image bytes | Architecture Patterns → lazy `<img src>` loading |
| IMG-07 | HTTP caching (ETag/Cache-Control) on image endpoints | Code Examples → `TypedResults.File` with `entityTag`/`lastModified` |
</phase_requirements>

## Summary

This phase has two coupled halves: (1) a frontend crop-tool swap from a hand-rolled canvas `CropModal.jsx` to Cropper.js v2's native Web Components, and (2) a backend storage/serving overhaul across 4 entities. CONTEXT.md already resolved the hard backend questions by reading quest-board's actual migration/repository/controller code directly — this research confirms those findings are still accurate against current official sources and npm registry state, and focuses on the three things CONTEXT.md flagged as open: the React-side Web Component wiring pattern (no official v2 wrapper exists), the exact Npgsql migration SQL, and the ASP.NET Core minimal-API caching mechanism.

The single most important finding **not** already covered by CONTEXT.md: Omphalos's session-scoped `Character`/`Location` DTOs (`CharacterDto`/`LocationDto`) are used **bidirectionally** — the same record type appears in both `SessionDto` (read) and `UpsertSessionRequest` (write), unlike `GlobalCharacter`/`GlobalLocation` which already have separate `{Entity}Dto` (read) vs `Create{Entity}Request`/`Update{Entity}Request` (write) shapes. Introducing a `HasImage` bool (IMG-05) on the read side while still needing to accept newly-cropped image bytes on the write side means Character/Location's DTOs need to either split into distinct read/write shapes (matching the Global* precedent) or the write side needs its own dedicated image-upload endpoint. Given the phase is mode:mvp and Global* entities already have this split for free, **the recommended path is to bring Character/Location's write DTOs in line with the Global* pattern** — see Open Questions and Architecture Patterns for the concrete design.

Cropper.js v2 (`cropperjs` on npm, confirmed v2.1.1, published 2026-04-06, ~1.55M weekly downloads) is a set of Web Components (`<cropper-canvas>`, `<cropper-image>`, `<cropper-selection>`, etc.) with **no official React wrapper for v2** (the popular `react-cropper` package only supports the old v1 `Cropper` class API). A community wrapper (`@imerljak/react-cropper-2`) exists but is new (published March 2026) and low-adoption (114 weekly downloads) — package-legitimacy check flags it `SUS`. Given Omphalos has zero UI-library dependencies today and explicitly avoids adding them, the recommended integration is **direct custom-element usage via refs**, not a third-party wrapper. Because Omphalos is on React 18.3.1 (not 19), custom-element boolean/complex attributes and the `change` CustomEvent must be set/bound imperatively via `useRef` + `useEffect` (React 18 cannot bind arbitrary custom-element properties or listen to non-standard DOM events through JSX props) — this is the concrete form of the "highest-risk pattern" STATE.md flagged.

**Primary recommendation:** Wrap Cropper.js v2's custom elements in a single `ImageCropModal.jsx` using refs + imperative calls (mirroring quest-board's vanilla-JS `image-crop.js` almost 1:1, just inside a `useEffect`/`useRef` lifecycle instead of global DOM queries); do the EF Core migration as `RenameColumn` + `AddColumn` + one raw-SQL `Sql()` step for the `USING decode(..., 'base64')` cast (MigrationBuilder cannot express `USING` natively); serve images via `TypedResults.File(bytes, contentType, lastModified, entityTag)` for automatic 304 support plus a manually-set `Cache-Control` header; and resolve the Character/Location DTO split before writing tasks, since it changes the shape of `SessionDtos.cs`/`SessionService.cs`/`SessionRepository.cs` beyond what CONTEXT.md's canonical refs describe.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Crop UI (drag/zoom/touch/grid) | Browser / Client | — | Cropper.js v2 runs entirely client-side against an in-memory working-copy blob; no server round-trip during interactive cropping |
| EXIF correction + downscale (D-07) | Browser / Client | — | `createImageBitmap`/canvas API are browser-only; must happen before Cropper.js ever sees the image |
| Original/cropped blob extraction (D-08) | Browser / Client | — | `$toCanvas()` + `canvas.toBlob()` are Cropper.js v2 client APIs |
| Image byte persistence (write) | API / Backend | Database | Endpoint decodes/validates bytes, repository writes to `bytea` columns |
| Image byte serving (read) | API / Backend | CDN-equivalent (HTTP cache headers) | Dedicated binary endpoints with ETag/Cache-Control — no separate CDN tier exists in this single-container deployment, but cache headers give the browser cache the same effect |
| `HasImage` computed flag | API / Backend | Database | EF Core translates `c.OriginalImageData != null` into a SQL scalar/EXISTS check — never loads bytes for list views |
| Ownership/ACL for image reads | API / Backend | — | Session-scoped entities (Character/Location) need the same `GetUserId(ClaimsPrincipal)` + session-ownership check as every other session sub-resource; Global* entities need none |
| Column rename/type migration | Database | Repository (EF Core migration authoring) | The `USING decode(...)` cast is a Postgres-native operation only expressible via raw SQL in the migration |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `cropperjs` | 2.1.1 `[VERIFIED: npm registry]` | Image cropping engine (Web Components) | Locked by user decision (PROJECT.md/ROADMAP.md); confirmed current npm `latest` dist-tag, published 2026-04-06, ~1.55M weekly downloads, `deprecated: false`, repo `github.com/fengyuanchen/cropperjs` |

### Supporting
None — no additional runtime dependency is needed. Do **not** add `@imerljak/react-cropper-2` or `react-cropper` (see Package Legitimacy Audit).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct ref-based custom-element wiring | `@imerljak/react-cropper-2` | Would save some boilerplate, but it's a 4-month-old package with 114 weekly downloads (`SUS` verdict) — unacceptable risk to depend on for a core UI feature, and contradicts this codebase's "no UI-library dependency" convention (`04-UI-SPEC.md`'s shadcn-gate note applies the same reasoning here) |
| Cropper.js v2 | Keep hand-rolled `CropModal.jsx`, add zoom manually | Rejected by locked project decision (ROADMAP.md); would also require hand-building EXIF correction, which `createImageBitmap` already solves for free |

**Installation:**
```bash
npm install cropperjs@2.1.1
```

**Version verification:** `npm view cropperjs version` → `2.1.1`; `npm view cropperjs dist-tags --json` → `{"latest":"2.1.1"}`; `npm view cropperjs time.modified` → `2026-04-06T13:02:31.987Z`. Confirmed directly against the npm registry in this research session.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `cropperjs` | npm | published 2026-04-06 (v2.1.1); package itself has years of history (v1.x since ~2015) | ~1,553,162/wk | github.com/fengyuanchen/cropperjs | OK | Approved |
| `@imerljak/react-cropper-2` | npm | published 2026-03-04 (~4 months old) | 114/wk | github.com/imerljak/react-cropper-2 | SUS (low-downloads) | **Not recommended** — do not add. If a future maintainer insists on a React wrapper, gate behind `checkpoint:human-verify` and re-check its adoption/maintenance signals at that time. |

**Packages removed due to `[SLOP]` verdict:** none
**Packages flagged as suspicious `[SUS]`:** `@imerljak/react-cropper-2` — not being added to `package.json`; listed here only because it surfaced during research as the "obvious" search result and must not be picked by mistake during planning/execution.

## Architecture Patterns

### System Architecture Diagram

```text
┌───────────────────────────────────────────────────────────────────────┐
│ Browser (React 18 SPA)                                                │
│                                                                         │
│  <input type=file> ──change──▶ file.type check                        │
│                                    │                                   │
│                     ┌──────────────┴───────────────┐                  │
│                     ▼ (image/gif)                  ▼ (jpg/png/webp/…) │
│              skip crop entirely           createImageBitmap()          │
│              save file bytes as-is        (EXIF-safe) + downscale      │
│              (Original only)              to 2400px working copy       │
│                     │                              │                   │
│                     │                     ImageCropModal mounts:       │
│                     │                     <cropper-canvas>             │
│                     │                       <cropper-image src=blob>  │
│                     │                       <cropper-selection         │
│                     │                         aspect-ratio="W/H">     │
│                     │                     user drags/zooms/pinches     │
│                     │                              │                   │
│                     │                     $toCanvas() → JPEG blob      │
│                     │                     (Cropped, from working copy) │
│                     └──────────────┬───────────────┘                  │
│                                    ▼                                   │
│                     onSave(originalBlob, croppedBlob)                  │
│                                    │                                   │
│         ┌──────────────────────────┴──────────────────────────┐       │
│         ▼ GlobalCharacter/GlobalLocation (Library.jsx)          ▼ Character/Location (session-scoped)
│  db.createX()/updateX() — image bytes ride in the              image bytes ride in the SAME
│  same Create/Update JSON request (base64 auto via              session-level PUT payload
│  System.Text.Json byte[] handling) — entity already             (matches today's behavior for
│  has a client-generated id, dedicated endpoint exists           every other field; row may not
│                                                                  exist server-side yet)
└───────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTPS (same-origin, cookie auto-attached)
┌───────────────────────────────────────────────────────────────────────┐
│ ASP.NET Core Minimal API                                               │
│                                                                         │
│  Write path:                                                           │
│   MapPost/MapPut (existing Create/Update or session-upsert routes)     │
│     → Service decodes byte[] (auto via JSON) → Repository writes       │
│       OriginalImageData/CroppedImageData bytea columns                │
│                                                                         │
│  Read path (NEW — IMG-04):                                             │
│   GET /api/characters/{id}/portrait/original                          │
│   GET /api/characters/{id}/portrait/cropped                           │
│   GET /api/locations/{id}/image/original|cropped                       │
│   GET /api/sessions/{sid}/characters/{id}/portrait/original|cropped   │
│   GET /api/sessions/{sid}/locations/{id}/image/original|cropped       │
│     → ownership check (session-scoped only) → repository scalar        │
│       query `Cropped ?? Original` → magic-byte MIME sniff →            │
│       TypedResults.File(bytes, mime, lastModified, entityTag) +        │
│       manual Cache-Control header                                     │
│                                                                         │
│  List/detail JSON responses (SessionDto/GlobalCharacterDto/…):         │
│     HasImage bool only — no bytes                                     │
└───────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│ PostgreSQL 17 — Characters/GlobalCharacters/Locations/GlobalLocations  │
│   OriginalImageData bytea, CroppedImageData bytea NULL                │
└───────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
src/client/components/
├── ImageCropModal.jsx         # NEW — replaces CropModal.jsx at all 3 sites (CROP-07)
├── CropModal.jsx              # DELETED after rollout
├── PortraitCrop.jsx           # DELETED (D-10, dead code)
src/client/utils/
├── imageUpload.js             # EXTENDED — add prepareImageForCropper()-equivalent (EXIF+downscale) and GIF-type check
src/Omphalos.Web/Endpoints/
├── CharacterImageEndpoints.cs # NEW — session-ownership-scoped binary routes for Character
├── LocationImageEndpoints.cs  # NEW — session-ownership-scoped binary routes for Location
├── GlobalCharacterEndpoints.cs# EXTENDED — add binary routes (no ownership check)
├── GlobalLocationEndpoints.cs # EXTENDED — add binary routes (no ownership check)
src/Omphalos.Repository/Migrations/
├── {timestamp}_RenameImageColumnsAddCropped.cs  # NEW — RenameColumn + AddColumn + raw-SQL cast
```

### Pattern 1: Direct Web-Component wiring via refs (React 18)

**What:** Cropper.js v2 registers real custom elements when imported (`import 'cropperjs'`). React 18 can render them as lowercase JSX tags, but cannot bind arbitrary non-standard properties/attributes (e.g. numeric `aspect-ratio`, boolean `movable`) or listen for the `change` CustomEvent through JSX props — these must be set imperatively via a ref in a `useEffect`, exactly like quest-board's vanilla-JS `initImageCrop()` does with `document.getElementById(...)`.

**When to use:** Every mount of `ImageCropModal`.

**Example:**
```jsx
// Source: fengyuanchen.github.io/cropperjs/v2/guide.html (official docs) +
// fengyuanchen.github.io/cropperjs/v2/api/cropper-selection.html (official API docs)
import { useRef, useEffect, useState } from 'react'
import 'cropperjs' // registers <cropper-canvas>, <cropper-image>, <cropper-selection>, etc.

export default function ImageCropModal({ imageBlobUrl, aspectW, aspectH, onSave, onClose, title }) {
  const imageElRef = useRef(null)
  const selectionElRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const selectionEl = selectionElRef.current
    if (!selectionEl) return
    // Numeric/attribute config must be set imperatively — JSX props don't reach
    // custom-element internals reliably pre-React-19.
    selectionEl.setAttribute('aspect-ratio', String(aspectW / aspectH))
  }, [aspectW, aspectH])

  useEffect(() => {
    const imageEl = imageElRef.current
    const selectionEl = selectionElRef.current
    if (!imageEl || !selectionEl) return

    function onImageReady() {
      // Mirrors quest-board's fitImageAndSelectionToVisibleCanvas(): both calls must
      // run AFTER the modal has real layout dimensions, not on the image's load event
      // alone, or the canvas is still 0x0 and the selection collapses to a point.
      imageEl.$center('contain')
      selectionEl.$initSelection(true, true)
      setReady(true)
    }
    imageEl.addEventListener('load', onImageReady) // <cropper-image> fires a plain 'load'
    return () => imageEl.removeEventListener('load', onImageReady)
  }, [])

  async function handleCropAndSave() {
    const canvas = await selectionElRef.current.$toCanvas()
    canvas.toBlob(blob => onSave(blob), 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <div className="bg-[#211b17] rounded-lg p-5 fade-in max-w-full" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-[#d4a574]">{title}</h3>
        <p className="text-xs text-[#999999] mb-3">Drag to reposition, scroll or pinch to zoom — select your {aspectW}:{aspectH} area.</p>
        <cropper-canvas background style={{ width: '100%', maxWidth: 600, height: 400, display: 'block' }}>
          <cropper-image ref={imageElRef} src={imageBlobUrl} alt="crop source" />
          <cropper-shade hidden />
          <cropper-handle action="select" plain />
          <cropper-selection ref={selectionElRef} initial-coverage="0.85" movable resizable outlined>
            <cropper-grid role="grid" covered />
            <cropper-crosshair centered />
            <cropper-handle action="move" theme-color="rgba(0,0,0,0)" />
            {['n-resize', 's-resize', 'e-resize', 'w-resize', 'ne-resize', 'nw-resize', 'se-resize', 'sw-resize']
              .map(action => <cropper-handle key={action} action={action} />)}
          </cropper-selection>
        </cropper-canvas>
        {/* Cancel / Crop & Save buttons per UI-SPEC */}
      </div>
    </div>
  )
}
```

**Known v2 caveat (verified via `github.com/fengyuanchen/cropperjs` issue #1124, `[CITED]`):** changing `aspectRatio` on an *existing* `<cropper-selection>` does not immediately resize the current selection box — only new selections respect it. Since this phase's aspect ratio is fixed per call site and set once at mount (not toggled at runtime), this bug does not affect CROP-04/CROP-08, but do not build a runtime aspect-ratio switcher expecting live resize.

### Pattern 2: EF Core migration with raw-SQL type cast (D-01/D-02)

**What:** `MigrationBuilder.AlterColumn<byte[]>` cannot express PostgreSQL's `USING` clause — Npgsql needs a raw `Sql()` call for any type change PostgreSQL can't auto-cast (`text` → `bytea` is one of these).

**When to use:** The single migration covering all 4 entities' image columns.

**Example:**
```csharp
// Source: quest-board's 20260707111803_RenameImageColumnsAddCropped.cs (RenameColumn/AddColumn
// shape) + Npgsql/PostgreSQL documentation for the USING-clause requirement (dotnet/efcore#25369)
protected override void Up(MigrationBuilder migrationBuilder)
{
    // Character.PortraitBase64 (text) -> OriginalImageData (bytea)
    migrationBuilder.RenameColumn(name: "PortraitBase64", table: "Characters", newName: "OriginalImageData");
    migrationBuilder.Sql(
        "ALTER TABLE \"Characters\" ALTER COLUMN \"OriginalImageData\" TYPE bytea " +
        "USING CASE WHEN \"OriginalImageData\" IS NULL THEN NULL ELSE decode(\"OriginalImageData\", 'base64') END;");
    migrationBuilder.AddColumn<byte[]>(name: "CroppedImageData", table: "Characters", type: "bytea", nullable: true);

    // Repeat the same 3 statements for GlobalCharacters.PortraitBase64, Locations.ImageBase64,
    // GlobalLocations.ImageBase64.
}

protected override void Down(MigrationBuilder migrationBuilder)
{
    migrationBuilder.DropColumn(name: "CroppedImageData", table: "Characters");
    migrationBuilder.Sql(
        "ALTER TABLE \"Characters\" ALTER COLUMN \"OriginalImageData\" TYPE text " +
        "USING CASE WHEN \"OriginalImageData\" IS NULL THEN NULL ELSE encode(\"OriginalImageData\", 'base64') END;");
    migrationBuilder.RenameColumn(name: "OriginalImageData", table: "Characters", newName: "PortraitBase64");
}
```

**Why the `CASE WHEN ... IS NULL` guard:** `decode(NULL, 'base64')` returns `NULL` safely in Postgres, but being explicit avoids relying on that implicit null-propagation behavior across a schema-critical migration — cheap insurance, not required.

### Pattern 3: Cached binary endpoint (IMG-04/IMG-07)

**What:** `TypedResults.File` natively supports conditional requests (`If-None-Match`/`If-Modified-Since` → `304`) when given `entityTag`/`lastModified`; `Cache-Control` still needs to be set manually since minimal APIs have no declarative `[ResponseCache]`/`[OutputCache]` equivalent for this.

**Example:**
```csharp
// Source: learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/responses (official docs, .NET 10)
group.MapGet("/{id}/portrait/original", async (string id, ClaimsPrincipal user, ICharacterImageService images, HttpContext http, CancellationToken ct) =>
{
    var userId = GetUserId(user);
    var bytes = await images.GetOriginalAsync(id, userId, ct); // null if not found OR not owned
    if (bytes is null) return Results.NotFound();

    var mime = DetectImageMimeType(bytes); // magic-byte sniff, D-09
    var etag = new EntityTagHeaderValue($"\"{Convert.ToHexString(SHA256.HashData(bytes))}\"");
    http.Response.Headers.CacheControl = "private, max-age=31536000, immutable"; // images never change once saved (IMG-02 re-crop writes a NEW blob, doesn't mutate in place from the client's perspective)
    return TypedResults.File(bytes, mime, entityTag: etag);
});

private static string DetectImageMimeType(byte[] data) =>
    data.Length >= 4 && data[0] == 0x89 && data[1] == 0x50 ? "image/png" :
    data.Length >= 6 && data[0] == 0x47 && data[1] == 0x49 ? "image/gif" :
    "image/jpeg";
```

Note `private` (not `public`) `Cache-Control` since these are per-user/session-owned images, not shared public assets — `GlobalCharacter`/`GlobalLocation` images (not user-scoped) may reasonably use `public` instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Crop-box drag/resize/zoom/touch interaction | Custom mouse/touch event math (the exact thing `CropModal.jsx` does today) | Cropper.js v2's `<cropper-selection>`/`<cropper-handle>` | Locked project decision; also handles pinch-zoom and keyboard nudging for free |
| EXIF orientation correction | Manual EXIF byte parsing + canvas rotation matrix | `createImageBitmap(file, { imageOrientation: 'from-image' })` | Native browser API, zero dependencies, exactly what quest-board already validated works |
| Image MIME detection for serving | Storing a separate `ContentType` column | Magic-byte sniff (D-09) | One less migration column, one less place for stored/served MIME to drift out of sync with actual bytes |
| ETag generation | Ad-hoc hash or version counter | `SHA256.HashData(bytes)` → `EntityTagHeaderValue` | Content-addressed, correct-by-construction (identical bytes always produce identical ETag; changed bytes always produce a different one) |
| byte[] ↔ JSON transport | Manual Base64 encode/decode in request/response bodies | Plain `byte[]` properties on DTOs | `System.Text.Json` auto-encodes/decodes `byte[]` as Base64 strings on the wire — no custom converter needed `[ASSUMED — standard .NET behavior since .NET Core 3.0, not verified this session against .NET 10 specifically, but has been stable/unchanged for many major versions]` |

**Key insight:** Every piece of this phase that looks like it needs custom code (crop interaction, EXIF handling, cache validation) already has a first-class platform or library primitive — the only genuinely novel work is the *wiring* (React refs around Web Components, the DTO read/write split, the raw-SQL migration cast), not the underlying mechanics.

## Runtime State Inventory

> Rename/migration phase — Runtime State Inventory required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | 4 Postgres columns (`Characters.PortraitBase64`, `GlobalCharacters.PortraitBase64`, `Locations.ImageBase64`, `GlobalLocations.ImageBase64`) hold live Base64-encoded image data in production-shaped rows once deployed. `Characters`/`GlobalCharacters` also carry `PortraitPanX`/`PortraitPanY` (D-11, to be dropped). | Data migration (rename + cast, D-01/D-02) for image columns; column drop for pan fields (safe — write-only, never read) |
| Live service config | None — no external service (n8n-equivalent) holds a reference to these column/field names. | None |
| OS-registered state | None — no OS-level task/service registration references these fields. | None |
| Secrets/env vars | None — no env var or secret name references `PortraitBase64`/`ImageBase64`/`PortraitPanX`/`PortraitPanY`. | None |
| Build artifacts | None found. `src/client/data/mockData.js` seeds `portraitPanX`/`portraitPanY: 0` on mock characters (confirmed via CONTEXT.md's codebase scout) — this is seed/reference **source data**, not a build artifact, but must be updated alongside D-11's entity/DTO changes or the mock data will reference removed fields. No compiled/installed-package artifacts reference these names (verified: no `localStorage`/`sessionStorage`/`indexedDB` usage anywhere in `src/client`, so no client-side cached state carries the old field shape either). | Source edit to `mockData.js`; no reinstall/rebuild-artifact action needed |

**Additional finding beyond CONTEXT.md's scout:** `src/Omphalos.Repository/Repositories/SessionRepository.cs`'s `CopyCharacterFields`/`CopyLocationFields` (used by the session-upsert diff-merge, `ApplyDiff`) directly assign `existing.PortraitBase64 = incoming.PortraitBase64` / `existing.ImageBase64 = incoming.ImageBase64` (and the pan fields) on **every session save**, independent of whether the image actually changed. This method must be updated in the same migration-adjacent commit as the entity/column rename, or the session-upsert path will fail to compile/will silently stop persisting new image bytes. This is exactly the kind of "runtime write path" a grep-only audit misses — it was found by reading `SessionRepository.cs` directly during this research pass, not flagged in CONTEXT.md's canonical refs.

## Common Pitfalls

### Pitfall 1: React 18 cannot bind custom-element props/events through JSX
**What goes wrong:** Setting `aspectRatio={3/4}` or `onChange={...}` as a JSX prop on `<cropper-selection>` silently does nothing (React 18 either stringifies it as an HTML attribute, which the element may not read as configuration, or drops it because it doesn't recognize the event name).
**Why it happens:** React 18 predates its own custom-element property/event reconciliation (added in React 19) — see `aleks-elkin.github.io/posts/2024-12-06-react-19` `[CITED]` and `blog.logrocket.com/working-custom-elements-react` `[CITED]`. Omphalos is pinned to React 18.3.1.
**How to avoid:** Attach a `ref`, then in `useEffect` call `el.setAttribute('aspect-ratio', ...)` (or set the element's own JS property directly, e.g. `el.aspectRatio = ...`) and `el.addEventListener('change', handler)` — exactly as shown in Pattern 1.
**Warning signs:** Aspect ratio doesn't lock; zoom/selection-change handlers never fire; the crop selection renders at the element's default size regardless of JSX props passed.

### Pitfall 2: Modal not yet laid out when Cropper.js initializes
**What goes wrong:** If `$center('contain')`/`$initSelection()` run while the modal container still has `display:none` or zero dimensions (common with fade-in/transition-based modals), the image renders unscaled at native pixel size and the selection box collapses to a zero-size box pinned at (0,0).
**Why it happens:** Cropper.js v2 measures the actual rendered canvas size at the moment these methods are called — quest-board hit this exact bug with Bootstrap's modal fade transition (`image-crop.js`'s `fitImageAndSelectionToVisibleCanvas` comment, read directly this session).
**How to avoid:** Omphalos's modals are not transition-gated the same way (no Bootstrap `shown.bs.modal` equivalent — CSS-only, no JS-driven show/hide sequencing), but the underlying risk is identical: don't call `$center()`/`$initSelection()` until after the `<cropper-image>`'s own `load` event fires AND the surrounding DOM has committed layout (React's synchronous render doesn't guarantee the browser has painted). Bind to the `<cropper-image>` `load` event (Pattern 1) rather than firing these calls from a `useEffect` with an empty dependency array on mount.
**Warning signs:** Crop selection appears as a 1x1 dot in the top-left corner; image appears larger than the visible canvas with no auto-fit.

### Pitfall 3: Session-scoped Character/Location DTOs currently serve double duty (read + write)
**What goes wrong:** `CharacterDto`/`LocationDto` are used as both the read shape (inside `SessionDto`) and the write shape (inside `UpsertSessionRequest`) — confirmed via direct read of `SessionDtos.cs` and `SessionService.cs`. Simply adding `HasImage` to these records without also deciding how new crop bytes travel on write will either (a) silently break the write path (no field to carry new bytes) or (b) leave a meaningless `HasImage` field on the write side that the client can't usefully populate.
**Why it happens:** Unlike `GlobalCharacter`/`GlobalLocation` (which already have `{Entity}Dto` read shapes separate from `Create{Entity}Request`/`Update{Entity}Request` write shapes), session-scoped Character/Location never needed this split before because they had no `HasX`-style computed field.
**How to avoid:** See Open Questions for the two viable resolutions; the recommended one (Option B, below) requires the least new plumbing and is safe to default to unless the planner has a strong reason to introduce the extra endpoints of Option A.
**Warning signs:** `dotnet build` failure in `SessionService.MapToEntity`/`MapToDto` after adding `HasImage`; or a working build that silently never persists new session-scoped character/location images.

### Pitfall 4: GIF detection by `file.type` is spoofable but matches quest-board's own precedent
**What goes wrong:** `file.type` is the browser-reported MIME type from the OS/file extension, not a verified magic-byte check — a file renamed `photo.gif` containing JPEG bytes would report `image/gif` (or nothing, if the OS doesn't recognize the extension) and skip cropping when it shouldn't (or vice versa).
**Why it happens:** This is exactly quest-board's own implementation (`file.type === 'image/gif'` check in `initImageCrop`) — D-04 explicitly locks matching this behavior.
**How to avoid:** Accept this as the locked behavior (D-04) since it matches the precedent the user directed research to follow, but consider (as a low-cost addition, not required by any locked decision) also sniffing the first bytes of the working-copy blob server-side before persisting, so a mislabeled file at least gets stored/served with a MIME type matching its real bytes (D-09's magic-byte detection already does this on the *read* path — it does not need new work, it already self-corrects any `file.type` mismatch by the time the image is served back).
**Warning signs:** A GIF renamed with a non-`.gif`-recognized MIME type gets cropped and loses animation; conversely a non-GIF file with a spoofed `image/gif` type skips cropping unexpectedly.

## Code Examples

Verified patterns from official sources (see also Architecture Patterns above for the fuller versions):

### Cropper.js v2 npm install + web-component registration
```bash
# Source: fengyuanchen.github.io/cropperjs/v2/guide.html (official docs)
npm install cropperjs
```
```js
// Source: fengyuanchen.github.io/cropperjs/v2/guide.html (official docs)
import 'cropperjs' // registers <cropper-canvas>, <cropper-image>, <cropper-shade>,
                    // <cropper-handle>, <cropper-selection>, <cropper-grid>, <cropper-crosshair>
```

### Repository read pattern with fallback (IMG-02/IMG-03)
```csharp
// Source: quest-board's CharacterRepository.cs GetCharacterCroppedPictureAsync (read directly this session)
public async Task<byte[]?> GetCroppedOrOriginalAsync(string characterId, Guid userId, CancellationToken ct = default) =>
    await db.Characters
        .Where(c => c.Id == characterId && c.Session.UserId == userId) // session-ownership check, not a
                                                                         // direct Character.UserId column —
                                                                         // Character has no owner FK of its own
        .Select(c => c.CroppedImageData ?? c.OriginalImageData)
        .FirstOrDefaultAsync(ct);
```

### `HasImage` scalar query (IMG-05, avoids loading bytes)
```csharp
// Source: quest-board's CharacterRepository.cs HasProfilePicture pattern (read directly this session)
var hasImage = await db.Characters
    .Where(c => c.Id == characterId)
    .Select(c => c.OriginalImageData != null)
    .FirstOrDefaultAsync(ct);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| Hand-rolled canvas drag/crop (`CropModal.jsx`) | Cropper.js v2 Web Components | This phase | Zoom (CROP-08), better touch support, standardized crop-selection behavior; costs the React-18-custom-element wiring complexity documented above |
| Single Base64 `text` column per entity | Dual `bytea` columns (`OriginalImageData`/`CroppedImageData`) | This phase | Enables re-crop-without-re-upload (IMG-02); requires a one-time data migration |
| Image bytes embedded in every session/character/location JSON response | `HasImage` bool + dedicated binary GET endpoints | This phase | Faster list/detail loads (IMG-06); requires resolving the read/write DTO split for session-scoped entities (see Open Questions) |
| No image endpoint caching | ETag + Cache-Control via `TypedResults.File` | This phase | Deliberate improvement over quest-board's own (uncached) reference implementation (IMG-07) |

**Deprecated/outdated:**
- `react-cropper` (npm): still maintained for Cropper.js **v1**, but does not support v2's Web-Component API — do not install expecting v2 compatibility.
- Cropper.js v1's `new Cropper(imgElement, options)` class-based API: superseded by v2's Web Components for any new integration; quest-board itself is already on v2.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `System.Text.Json` auto-encodes/decodes `byte[]` DTO properties as Base64 strings on the wire without a custom converter, on .NET 10 specifically | Don't Hand-Roll, Architecture Patterns | If wrong, write-path image uploads (Global* Create/Update requests, session-upsert payload) would need an explicit `[JsonConverter]`/manual encode step — low risk, this behavior has been stable across every .NET Core/.NET version since 3.0 and is not version-specific |
| A2 | `<cropper-image>` fires a plain (bubbling) `load` DOM event usable via `addEventListener('load', ...)` the same way a native `<img>` would | Architecture Patterns Pattern 1, Pitfall 2 | If the actual event name/timing differs in v2.1.1, the auto-fit/auto-select sequencing (`$center('contain')`/`$initSelection()`) would need to bind to a different lifecycle hook — verify against the live library during Wave 0/first implementation task, not just docs, since this specific event name was not explicitly confirmed in the fetched official-docs excerpt |
| A3 | The recommended DTO read/write split (Option B in Open Questions) is the right MVP-mode default for session-scoped Character/Location | Open Questions, Pitfall 3 | If wrong, the planner may need to introduce dedicated write-side image endpoints for Character/Location (Option A) instead, which changes several tasks' shape — flagged explicitly as a decision point, not a locked recommendation |

**If this table is empty:** N/A — see above.

## Open Questions

1. **How should new crop bytes travel on the WRITE side for session-scoped Character/Location, given `CharacterDto`/`LocationDto` are used bidirectionally in `SessionDto`/`UpsertSessionRequest`?**
   - What we know: `GlobalCharacter`/`GlobalLocation` already have separate read (`GlobalCharacterDto`/`GlobalLocationDto`) and write (`Create.../Update...Request`) shapes — adding `HasImage` to the read side and `OriginalImageData`/`CroppedImageData` (`byte[]?`) to the write side is a drop-in, zero-refactor change for these two entities. Character/Location do not have this split today.
   - What's unclear: whether to (Option A) split `CharacterDto`/`LocationDto` into distinct read/write records and add dedicated write-side image endpoints so Character/Location's write path fully matches the new dedicated-GET-endpoint pattern, or (Option B) keep the single bidirectional DTO shape and simply add `byte[]? OriginalImageData`/`byte[]? CroppedImageData` fields alongside the new `HasImage` bool (server populates `HasImage` on read and ignores/leaves-null the byte fields on read responses; client populates the byte fields only when uploading a new crop, and the existing session-upsert flow persists them exactly like every other field today).
   - Recommendation: **Option B** for this phase. It requires no new endpoint routes for the write direction, needs no change to `dispatchWithPersist`'s architecture, and solves the "character not yet persisted server-side" sequencing problem for free (image bytes ride along in the very same upsert call that first creates the row) — Cropper.js v2 wiring and the backend migration are already substantial scope for one MVP-mode phase; Option A's stricter read/write separation can be a follow-up hardening pass once the vertical slice ships. Flag this recommendation to the user/planner explicitly rather than silently deciding — it is a genuine architecture fork CONTEXT.md did not address.

2. **Exact `<cropper-image>` ready/load event name and timing in cropperjs 2.1.1**
   - What we know: Official v2 docs confirm `$center()`/`$toCanvas()` exist and how `CropperSelection`'s properties/methods behave; quest-board's vanilla-JS code binds to `modalEl`'s own `shown.bs.modal` event (Bootstrap-specific) rather than a Cropper.js-native "image ready" event, so quest-board's own code doesn't establish precedent for the exact custom-element event name.
   - What's unclear: whether `<cropper-image>` emits a standard `load` event, a custom `ready`/`load`-prefixed CustomEvent, or requires polling `naturalWidth`/similar.
   - Recommendation: Verify directly against the installed `cropperjs@2.1.1` package (check its TypeScript definitions or source in `node_modules/cropperjs`) as the first sub-task of implementation, before writing the full `ImageCropModal` — this is a 5-minute check that removes real risk from the highest-flagged-risk part of this phase.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | `docker compose up -d --build` full-stack manual verification; `Omphalos.IntegrationTests`' Testcontainers-based Postgres fixture | ✓ | 29.1.3, daemon running | — |
| .NET SDK | Backend build, migrations, xUnit test run | ✓ | 10.0.301 | — |
| Node.js | Frontend build (`npm install`/`npm run build`/`npm run dev`) | ✓ | v22.16.0 | — |
| npm | Package install (`cropperjs`) | ✓ | 11.6.2 | — |
| PostgreSQL 17 | Runtime database; also pinned inside `PostgresFixture`'s Testcontainers image | ✓ (via Docker) | matches `docker-compose.yml` pin | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — full environment available for both manual verification and automated (Testcontainers) integration testing in this session.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | xUnit v3 (`xunit.v3` 3.2.2) — **note:** `.planning/codebase/TESTING.md` (dated 2026-07-10) states "no test infrastructure exists"; this is now stale. `src/Omphalos.UnitTests` and `src/Omphalos.IntegrationTests` projects exist (added in Phase 1 per STATE.md), with `Testcontainers.PostgreSql` 4.13.0 wired into `src/Omphalos.IntegrationTests/PostgresFixture.cs` |
| Config file | `src/Omphalos.UnitTests/Omphalos.UnitTests.csproj`, `src/Omphalos.IntegrationTests/Omphalos.IntegrationTests.csproj` — no separate config file, standard SDK-style test projects |
| Quick run command | `dotnet test src/Omphalos.UnitTests` |
| Full suite command | `dotnet test` (solution-wide; the `Omphalos.IntegrationTests` project requires Docker to be running, which is confirmed available) |

No frontend test framework exists yet (`package.json` has no `vitest`/`jest`/`@testing-library/*`) — this phase's frontend crop UI has no automated test coverage path without first standing up Vitest, which is out of scope to introduce unilaterally; flag as a Wave 0 gap only if the planner decides frontend automated coverage is required for this phase (manual/UAT verification is the existing de facto process per `TESTING.md`'s "Manual Verification" section).

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IMG-01 | Migration renames + retypes columns without data loss | integration | `dotnet test src/Omphalos.IntegrationTests --filter FullyQualifiedName~ImageColumnMigration` | ❌ Wave 0 |
| IMG-02 | Re-crop reads back Original bytes correctly (`Cropped ?? Original` fallback) | integration | `dotnet test src/Omphalos.IntegrationTests --filter FullyQualifiedName~ImageFallback` | ❌ Wave 0 |
| IMG-03 | GIF fallback: `CroppedImageData == null` still serves `OriginalImageData` | integration | same fixture as IMG-02 | ❌ Wave 0 |
| IMG-05 | `HasImage` scalar query never selects byte columns (translated as EXISTS/scalar, not a full row load) | integration (assert via EF Core query log / generated SQL, or assert absence of bytes in the DTO) | `dotnet test src/Omphalos.IntegrationTests --filter FullyQualifiedName~HasImage` | ❌ Wave 0 |
| IMG-07 | Binary endpoint returns `304` on matching `If-None-Match` | integration (`WebApplicationFactory`-based, not yet used anywhere in this codebase) | new test class | ❌ Wave 0 — this is a new test *pattern* for the repo, not just a new file (no existing `WebApplicationFactory` endpoint test precedent) |
| CROP-01..09 | Frontend crop behavior (drag, zoom, touch, EXIF, aspect lock) | manual/UAT only | — | N/A — no frontend test framework exists; matches existing project convention of manual verification for UI behavior |

### Sampling Rate
- **Per task commit:** `dotnet test src/Omphalos.UnitTests` (fast, no Docker dependency)
- **Per wave merge:** `dotnet test` (full suite, requires Docker for `Omphalos.IntegrationTests`)
- **Phase gate:** Full suite green before `/gsd-verify-work`, plus manual UAT for all CROP-01..09 frontend behaviors (no automated frontend coverage exists)

### Wave 0 Gaps
- [ ] `src/Omphalos.IntegrationTests/ImageMigrationTests.cs` (or similar) — covers IMG-01/IMG-02/IMG-03; **important:** `PostgresFixture` currently runs `db.Database.MigrateAsync()` which applies ALL migrations in one shot against a fresh container, so it cannot directly exercise "existing Base64 data surviving the rename+cast migration" the way a real production upgrade would (there's no pre-migration data to migrate in a fresh Testcontainers instance). To actually test the `USING decode(...)` cast logic, either (a) seed a row via raw SQL against the OLD schema before applying just the new migration (requires migrating up to N-1, seeding, then migrating to N — more involved fixture work), or (b) treat this as a unit-level SQL-string test only (assert the migration's `Up()` produces expected SQL) and rely on manual verification against a real pre-migration Docker volume for the actual data-preservation guarantee. Flag this gap explicitly for the planner — it's a real testing limitation, not an oversight to silently paper over.
- [ ] A `WebApplicationFactory<Program>`-based endpoint test harness — this repo has zero precedent for testing minimal-API endpoints end-to-end (all existing coverage is repository-level via `Omphalos.IntegrationTests`). IMG-07's caching behavior (`304` on matching ETag) can only be verified this way or via manual `curl`/browser dev-tools inspection.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | no (new endpoints only) | Existing JWT-cookie auth applies unchanged; no new auth mechanism introduced |
| V3 Session Management | no | Unchanged — same `omphalos_token` cookie, same `SameSite=Lax` |
| V4 Access Control | yes | New Character/Location image endpoints MUST apply the same session-ownership check as every other session sub-resource (`GetUserId(ClaimsPrincipal)` + `.Where(c => c.Session.UserId == userId)`), not just `.Where(c => c.Id == id)` — a bare id-only lookup on these new endpoints would let any authenticated user read/overwrite any other user's character/location image by guessing/enumerating ids |
| V5 Input Validation | yes | Server-side file-size and content-type validation on any new/changed upload path — the existing `MAX_IMAGE_MB` check in `imageUpload.js` is **client-side only** and trivially bypassable (a direct API call skips the browser). Recommend an explicit server-side max-byte-length check on `OriginalImageData`/`CroppedImageData` before `SaveChangesAsync`, and rejecting `image/svg+xml` explicitly if any future call site widens the accepted-type list (SVG can embed `<script>`, a stored-XSS vector if ever rendered inline rather than via `<img>` — not currently a risk since `accept="image/*"` plus the fixed magic-byte sniff only recognizes PNG/GIF/JPEG, but worth noting as a boundary not to cross) |
| V6 Cryptography | no | ETag generation via `SHA256.HashData` is a content hash for cache validation, not a security control — no cryptographic secrecy/integrity requirement here |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| IDOR (Insecure Direct Object Reference) on new image GET/PUT endpoints | Elevation of Privilege / Information Disclosure | Session-ownership filter in the repository query itself (not just an endpoint-level `if` check that can be forgotten) — mirror `SessionRepository.GetByIdAsync`'s `.Where(s => s.Id == id && s.UserId == userId)` pattern exactly |
| Oversized upload / DoS via large Base64 payload | Denial of Service | Client-side `MAX_IMAGE_MB` (existing) is not sufficient alone; add a server-side length check on decoded bytes before persisting. Also note: ASP.NET Core Kestrel's default max request body size (`30MB`) already bounds worst-case JSON payload size even without an explicit application-level check, but an explicit check gives a clean 4xx instead of a raw connection-level rejection |
| MIME-type spoofing (client-declared `Content-Type` vs actual bytes) | Tampering | Magic-byte sniff (D-09) on both write validation (reject non-image bytes even if the client claims `image/jpeg`) and read serving (`Content-Type` reflects real bytes, not client-declared type) |
| Cross-user cache poisoning via shared Cache-Control | Information Disclosure | Use `private` (not `public`) `Cache-Control` for session-scoped Character/Location images (per-user data); `public` is acceptable only for `GlobalCharacter`/`GlobalLocation` images, which are explicitly shared/non-user-scoped |

## Sources

### Primary (HIGH confidence)
- `C:\Repos\quest-board\QuestBoard.Repository\Migrations\20260707111803_RenameImageColumnsAddCropped.cs` — direct read, migration shape
- `C:\Repos\quest-board\QuestBoard.Repository\CharacterRepository.cs` — direct read, fallback query + `HasProfilePicture` scalar pattern
- `C:\Repos\quest-board\QuestBoard.Service\Controllers\Characters\CharactersController.cs` — direct read, `DetectImageMimeType` magic-byte sniff, confirms no cache headers in quest-board's reference
- `C:\Repos\quest-board\QuestBoard.Service\wwwroot\js\image-crop.js` — direct read, `prepareImageForCropper`/`extractCroppedBlob`/GIF-skip logic
- `C:\Repos\omphalos\src\Omphalos.Repository\Repositories\SessionRepository.cs` — direct read, discovered the bidirectional `CharacterDto`/`LocationDto` write-path coupling (this session's key new finding)
- `C:\Repos\omphalos\src\Omphalos.Domain\DTOs\SessionDtos.cs`, `CharacterDtos.cs`, `LocationDtos.cs`, `GlobalCharacterDtos.cs`, `GlobalLocationDtos.cs` — direct read, confirmed Global* already has read/write DTO split, Character/Location does not
- `C:\Repos\omphalos\src\Omphalos.Web\Program.cs`, `AuthEndpoints.cs` — direct read, confirmed `SameSite=Lax` httpOnly cookie auth covers plain `<img src>` requests without special handling (same-origin, cookie auto-attached by browser regardless of SameSite=Lax for same-site requests)
- npm registry (`npm view cropperjs ...`) — confirmed v2.1.1, `latest` dist-tag, publish date, weekly downloads, no postinstall script
- `gsd-tools query package-legitimacy check` — `cropperjs` OK, `@imerljak/react-cropper-2` SUS (low-downloads)

### Secondary (MEDIUM confidence)
- `https://fengyuanchen.github.io/cropperjs/v2/guide.html` (official Cropper.js v2 docs, fetched this session) `[CITED]`
- `https://fengyuanchen.github.io/cropperjs/v2/api/cropper-selection.html` (official Cropper.js v2 API docs, fetched this session) `[CITED]`
- `https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/responses?view=aspnetcore-10.0` (official ASP.NET Core 10 docs, fetched this session) `[CITED]`
- `https://github.com/fengyuanchen/cropperjs/issues/1124` — v2 aspect-ratio-not-reactive bug `[CITED]`
- `https://github.com/dotnet/efcore/issues/25369` — confirms `USING` clause requires raw SQL in EF Core migrations `[CITED]`

### Tertiary (LOW confidence)
- WebSearch summaries (not independently fetched) on React 18 vs 19 custom-element handling — directionally correct and consistent with well-known React community knowledge, but not fetched from a single authoritative source in this session `[ASSUMED, cross-checked across multiple search results → MEDIUM per classify-confidence]`
- `https://dev.to/imerljak/building-a-modern-image-cropper-in-react-with-cropperjs-2x-43b1` — community blog post, used only to confirm the general shape of ref-based wiring, not as an authoritative API reference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `cropperjs` version/legitimacy directly verified against npm registry and `package-legitimacy` seam
- Architecture (backend migration/endpoints): HIGH — primary-source quest-board reads plus official Microsoft docs for the ASP.NET Core caching mechanism; MEDIUM on the DTO-split recommendation specifically, since it is a judgment call flagged as an Open Question, not a verified fact
- Architecture (frontend Cropper.js v2 wiring): MEDIUM — official docs confirm the API surface, but the exact React-integration wiring (event names, timing) was not verified against the live installed package in this session (see Assumption A2) — first implementation task should do a 5-minute sanity check against `node_modules/cropperjs` before building the full modal
- Pitfalls: HIGH for the migration/DTO-split pitfalls (grounded in direct code reads); MEDIUM for the React-18-custom-element pitfall (grounded in official React 19 release notes + multiple corroborating community sources, not a single authoritative "React 18 cannot do X" statement)

**Research date:** 2026-07-13
**Valid until:** 2026-08-12 (30 days — `cropperjs` is actively released, currently HIGH confidence at v2.1.1; re-verify version if planning is delayed)
