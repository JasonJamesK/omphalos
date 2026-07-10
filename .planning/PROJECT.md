# Omphalos

## What This Is

Omphalos is a self-hosted DM campaign manager: a React SPA + ASP.NET Core minimal API + PostgreSQL app that lets a Dungeon Master prep and run tabletop RPG sessions — sessions, characters (session-scoped and a cross-session library), locations, encounters, NPC stat blocks, session logs, and media uploads.

## Core Value

A DM can prep everything needed for a session and reference/edit it live during play without fighting broken editing tools or losing content.

## Requirements

### Validated

- ✓ DM can create and manage game sessions containing characters, locations, and encounters — existing
- ✓ DM can maintain a cross-session library of reusable characters and locations, linkable into sessions — existing
- ✓ Session Log entries support rich-text formatting via a TipTap WYSIWYG editor — existing
- ✓ NPC stat blocks and structured session-prep tooling — existing
- ✓ Portrait/location image uploads with a (currently hand-rolled) crop step — existing
- ✓ JWT cookie-based authentication with first-boot admin seeding — existing
- ✓ Self-hosted deployment via Docker Compose (Postgres 17 + single API container) — existing

### Active

- [ ] DM can crop portrait and location images using Cropper.js v2 instead of the current hand-rolled canvas crop tool, across all three usage sites (Character Library portraits, in-session Character portraits, Location images)
- [ ] Both the original upload and the cropped result are stored per image (Character, GlobalCharacter, Location, GlobalLocation), so a DM can re-crop without re-uploading and animated GIFs still display correctly
- [ ] Images are served via dedicated binary endpoints instead of being embedded as base64 in session/character/location JSON payloads, so pages load without waiting on image bytes
- [ ] DM can write the Session "Overview & Hook" field using markdown syntax, with a rendered preview
- [ ] DM can write session-prep block content (Notes, Callout, Loot blocks) using markdown syntax, with a rendered preview
- [ ] DM can write character bios/notes using markdown syntax, with a rendered preview
- [ ] DM can write location descriptions using markdown syntax, with a rendered preview
- [ ] Markdown-enabled fields auto-grow to fit their content instead of being fixed-height boxes

### Out of Scope

- Full integration or shared code between Omphalos and quest-board (a separate repo, separate ASP.NET MVC/Razor stack) — deferred to a future milestone; only the *approach* (Cropper.js v2, markdown-based editing) transfers here, not shared code
- Converting the existing Session Log entries (TipTap WYSIWYG) to markdown — already works and already auto-grows; not broken, not in scope
- Extending auto-grow to textareas that stay plain text (stat blocks, random tables, etc.) — not requested for this milestone

## Context

- Omphalos is developed with at least one collaborator (see PR history from JasonJamesK); this is not a solo-only tool.
- The current image crop tool (`src/client/components/CropModal.jsx`) is a hand-rolled canvas-based drag-crop with no external library. It's used in three places: `Library.jsx` (Character Library portraits), `CharacterModal.jsx` (in-session character portraits), and `AddLocationModal.jsx` (location images).
- No markdown library exists in the frontend today. Every long-text field outside Session Log (Overview & Hook, session-prep blocks, character bios, location descriptions) is a plain fixed-height `<textarea>`.
- Omphalos already has a WYSIWYG rich-text editor (`RichTextEditor.jsx`, built on `@tiptap/react`) used only for Session Log entries, storing content as TipTap JSON. That component and its storage format are untouched by this milestone — it already auto-grows and isn't broken.
- Reference implementation: the sibling project **quest-board** (`C:\Repos\quest-board`, the user's own repo) has a confirmed-working pattern for both features — Cropper.js v2 client-side (EXIF-safe downscale before crop, `wwwroot/js/image-crop.js`) and Markdig server-side markdown rendering. quest-board is ASP.NET MVC/Razor (server-rendered views), so only the pattern transfers — the wiring must be adapted to Omphalos's React SPA + JSON API architecture, not copied.
- Chosen rendering approach: client-side markdown rendering (`react-markdown` + `remark-gfm`) rather than adding a server-side Markdig dependency, since Omphalos's ASP.NET Core backend is minimal-API/JSON-only with no server-rendering pipeline to hook into. Markdown text stored in existing string fields stays portable regardless of which library renders it, so this doesn't block sharing content with quest-board in a future milestone.
- Image storage today is a single nullable base64 string column per entity — `Character.PortraitBase64`, `GlobalCharacter.PortraitBase64`, `Location.ImageBase64`, `GlobalLocation.ImageBase64` — embedded inline in the DTOs and returned as part of the main session/library JSON payloads.
- quest-board's proven image pattern (confirmed by reading its source): a 1:1 image table per owning entity with `OriginalImageData`/`CroppedImageData` (both `byte[]`, cropped nullable), served via two separate binary endpoints per entity (e.g. `GetProfilePicture` for the original, `GetCroppedPicture` for the cropped result), with view models carrying only a `HasProfilePicture` bool — image bytes never touch the initial page/JSON payload. Read pattern is `CroppedImageData ?? OriginalImageData`. The user wants this pattern (both the dual-storage model and the separate-endpoint serving) ported to all 4 of Omphalos's image fields, for the same reasons quest-board has it: re-crop without re-upload, animated GIFs (which skip cropping) still display, and pages load without waiting on inline image bytes.
- Unlike quest-board (no caching on its image endpoints), Omphalos's new image endpoints will add basic HTTP caching (ETag or Cache-Control) since cropped/original images are immutable once saved — a deliberate improvement over the reference implementation, not parity.

## Constraints

- **Architecture**: This milestone is no longer frontend-only — the image storage/serving change requires a migration (new columns replacing the single base64 field), new DTO shapes (`HasImage` flag instead of embedded bytes), and new endpoint groups across all 4 image-bearing entities. Markdown editing itself still stays frontend-only (plain text storage in existing string fields, no migration needed there).
- **Tech stack**: React 18 (no TypeScript) + Vite, Tailwind CSS, dark gothic/fantasy theme (amber/brown palette per `CLAUDE.md`) — new components must match existing conventions (see `SettingsModal.jsx` modal pattern, `RichTextEditor.jsx` toolbar styling).
- **Cross-repo boundary**: quest-board is a separate git repository with a different architecture (MVC/Razor vs. React SPA) and no shared build/deploy pipeline with Omphalos — treat it strictly as reference/inspiration, not a dependency.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| True markdown editing (raw syntax + render) rather than extending the existing TipTap WYSIWYG to new fields | Matches quest-board's proven, working pattern the user wants to bring over; keeps stored content as portable plain text | — Pending |
| Client-side markdown rendering (`react-markdown` + `remark-gfm`) over server-side Markdig | No Razor/server-rendering pipeline exists in Omphalos; avoids a new backend dependency and endpoint changes; markdown source stays portable either way | — Pending |
| Replace `CropModal.jsx` with Cropper.js v2 at all three existing usage sites | Matches quest-board's proven, EXIF-safe crop pipeline; consolidates on one crop implementation instead of a hand-rolled one | — Pending |
| Store both original and cropped image per entity, served via dedicated binary endpoints (all 4 image fields: Character, GlobalCharacter, Location, GlobalLocation) | Matches quest-board's proven pattern exactly; enables re-crop without re-upload, GIF fallback, and instant page loads (images load async instead of blocking on inline base64 in the JSON payload) | — Pending |
| Add HTTP caching (ETag/Cache-Control) to the new image endpoints | quest-board has none; images are immutable once saved so caching is a safe, cheap improvement over the reference implementation | — Pending |
| Auto-grow scoped to the new markdown fields only, not app-wide | Auto-grow comes bundled with the new markdown editor component; avoids unrelated scope creep into stat blocks/random tables | — Pending |
| Session Log (TipTap WYSIWYG) left untouched | Already works and already auto-grows; converting it wasn't requested and isn't broken | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-10 after initialization*
