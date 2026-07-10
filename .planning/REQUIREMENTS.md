# Requirements: Omphalos

**Defined:** 2026-07-10
**Core Value:** A DM can prep everything needed for a session and reference/edit it live during play without fighting broken editing tools or losing content.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Session Persistence

- [x] **PERSIST-01**: Session Prep content (Overview & Hook, Notes/Callout/Loot blocks) actually persists after save and page reload — fixes `SessionRepository.UpsertAsync` never assigning `PrepData` on update
- [ ] **PERSIST-02**: Session Log, top bar (title/metadata), and Toolkit saves no longer risk silently wiping other session fields (`Title`/`Characters`/`Locations`/`Encounters`) due to partial-payload `UPDATE_SESSION` dispatches being unconditionally overwritten server-side
- [x] **PERSIST-03**: `SessionRepository.UpsertAsync` diffs and merges `Character`/`Location`/`Encounter` child collections by ID instead of deleting and reinserting all rows on every save
- [ ] **PERSIST-04**: DM sees a visible indicator when a session save fails (currently swallowed silently via `.catch(() => {})`), instead of the UI silently showing the change as applied while the server never received it

### Markdown Editing

- [ ] **MDED-01**: DM can write the Session "Overview & Hook" field using markdown syntax with live rendering
- [ ] **MDED-02**: DM can write session-prep block content (Notes, Callout, Loot blocks) using markdown syntax with live rendering
- [ ] **MDED-03**: DM can write character bios/notes using markdown syntax with live rendering
- [ ] **MDED-04**: DM can write location descriptions using markdown syntax with live rendering
- [ ] **MDED-05**: Markdown fields show a side-by-side edit+preview split view on wide viewports, falling back to an Edit/Preview tab toggle on narrow viewports
- [ ] **MDED-06**: Existing plain-text content (typed with literal line breaks) renders correctly without collapsing into run-on paragraphs (`remark-breaks` shipped alongside `remark-gfm`)
- [ ] **MDED-07**: Markdown fields auto-grow to fit their content instead of being fixed-height boxes
- [ ] **MDED-08**: Markdown preview matches the app's dark theme (readable typography for headings, lists, bold/italic, blockquote, code)
- [ ] **MDED-09**: One shared `MarkdownField` component is reused across all 4 field locations rather than four divergent implementations

### Image Cropping

- [ ] **CROP-01**: DM can crop character portraits in the Character Library using Cropper.js v2 instead of the hand-rolled crop tool
- [ ] **CROP-02**: DM can crop in-session character portraits using Cropper.js v2
- [ ] **CROP-03**: DM can crop location images using Cropper.js v2
- [ ] **CROP-04**: Crop tool preserves aspect-ratio lock (configurable per call site), drag-to-reposition, touch/mobile support, rule-of-thirds grid, and corner resize handles matching current behavior
- [ ] **CROP-05**: Crop tool matches the app's existing modal chrome/theme (dark overlay, `bg-[#211b17]` card, amber heading, `×` close, Cancel / "Crop & Save" buttons)
- [ ] **CROP-06**: `ImageCropModal` outputs both the original and cropped image data on save, so callers can upload both (replaces the old single `onSave(dataURL)` contract, which only carried the cropped result)
- [ ] **CROP-07**: One shared `ImageCropModal` component is reused across all 3 usage sites rather than three divergent implementations
- [ ] **CROP-08**: DM can zoom (mouse wheel + pinch) while cropping
- [ ] **CROP-09**: Images are EXIF-orientation-corrected and downscaled before cropping, so phone photos don't crop sideways/upside-down and don't hit the iOS Safari canvas-size ceiling

### Image Storage & Serving

- [ ] **IMG-01**: Each image-bearing entity (Character, GlobalCharacter, Location, GlobalLocation) stores both the original uploaded image and the cropped result as separate columns, replacing the current single base64 field
- [ ] **IMG-02**: DM can re-crop an existing image without re-uploading, since the original is retained separately from the cropped result
- [ ] **IMG-03**: Animated GIFs (which skip cropping entirely) still display correctly via a cropped-or-original fallback (`CroppedImage ?? OriginalImage`)
- [ ] **IMG-04**: Images are served via dedicated binary endpoints (one route for the original, one for the cropped result, per entity type) instead of being embedded as base64 in the session/character/location JSON payloads
- [ ] **IMG-05**: Session/character/location DTOs expose a `HasImage` boolean instead of embedded image bytes, so list/detail views can show a placeholder-or-photo state without pulling image data
- [ ] **IMG-06**: Pages that list or display characters/locations load without waiting on image bytes — images load asynchronously via their own endpoint requests
- [ ] **IMG-07**: Image endpoints include HTTP caching (ETag or Cache-Control), since cropped/original images are immutable once saved — a deliberate improvement over quest-board's uncached reference implementation

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Markdown Editing

- **MDED-10**: Lightweight markdown syntax hint/cheat-sheet text under the editor toggle, for non-developer DMs

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Full integration or shared code with quest-board | Separate repo, separate ASP.NET MVC/Razor stack — deferred to a future milestone; only the *approach* transfers here |
| Converting existing Session Log entries (TipTap WYSIWYG) to markdown | Already works, already auto-grows, not broken — not requested |
| Full WYSIWYG markdown toolbar / inline-render-as-you-type editing | Would duplicate the existing TipTap `RichTextEditor.jsx` paradigm; raw typing + preview is sufficient for this user base |
| Extended markdown syntax (footnotes, math/LaTeX, Mermaid, wiki-links) | No mapped use case for DM session prep content |
| Rich-paste conversion (Word/Google Docs → markdown) | Adds a whole dependency and edge-case surface for a typed-not-pasted workflow |
| Draft history / version diffing for markdown fields | No existing versioning infrastructure to hook into; own future milestone if ever wanted |
| Server-side markdown rendering pipeline (Markdig) | No Razor/server-rendering pipeline exists in Omphalos's minimal-API backend; client-side rendering already decided |
| Rotate/flip controls, multi-select crop, filters, non-rectangular crop | Cropper.js v2 supports these but none are requested — UI clutter for a simple embedded crop step |
| Unlocked/user-toggleable crop aspect ratio | All 3 usage sites have a product-defined fixed ratio matching their display slots |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PERSIST-01 | Phase 1 | Complete |
| PERSIST-02 | Phase 1 | Pending |
| PERSIST-03 | Phase 1 | Complete |
| PERSIST-04 | Phase 1 | Pending |
| MDED-01 | Phase 3 | Pending |
| MDED-02 | Phase 3 | Pending |
| MDED-03 | Phase 2 | Pending |
| MDED-04 | Phase 2 | Pending |
| MDED-05 | Phase 2 | Pending |
| MDED-06 | Phase 2 | Pending |
| MDED-07 | Phase 2 | Pending |
| MDED-08 | Phase 2 | Pending |
| MDED-09 | Phase 3 | Pending |
| CROP-01 | Phase 4 | Pending |
| CROP-02 | Phase 4 | Pending |
| CROP-03 | Phase 4 | Pending |
| CROP-04 | Phase 4 | Pending |
| CROP-05 | Phase 4 | Pending |
| CROP-06 | Phase 4 | Pending |
| CROP-07 | Phase 4 | Pending |
| CROP-08 | Phase 4 | Pending |
| CROP-09 | Phase 4 | Pending |
| IMG-01 | Phase 4 | Pending |
| IMG-02 | Phase 4 | Pending |
| IMG-03 | Phase 4 | Pending |
| IMG-04 | Phase 4 | Pending |
| IMG-05 | Phase 4 | Pending |
| IMG-06 | Phase 4 | Pending |
| IMG-07 | Phase 4 | Pending |

**Coverage:**

- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-10*
*Last updated: 2026-07-10 after roadmap creation*
