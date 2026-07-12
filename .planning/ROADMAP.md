# Roadmap: Omphalos — Markdown Editing + Cropper.js v2

## Overview

This milestone fixes a pre-existing session-persistence bug, then delivers two independent user-facing capabilities: markdown editing (raw syntax + live preview, replacing plain `<textarea>`s) across all four long-text fields, and a Cropper.js v2-based image crop tool (replacing the hand-rolled `CropModal.jsx`) at all three portrait/location upload sites. The persistence fix must land first because two of the four markdown fields (Overview & Hook, session-prep blocks) sit directly on top of the currently-broken `PrepData` save path — wiring markdown into them before the fix would make new content appear to save and then silently vanish on reload. Markdown for character/location fields and the full cropper rollout have no dependency on the persistence fix and can proceed independently. Phase 4's scope was expanded after initial drafting: the crop-tool swap is now paired with a full image storage and serving overhaul (dual original/cropped columns per entity, served via dedicated cached binary endpoints instead of embedded base64) across all four image-bearing entities (Character, GlobalCharacter, Location, GlobalLocation) — see Phase 4 detail below and the roadmap-revision note at the end of this file.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Session Persistence Reliability** - Session prep content, log, top bar, and toolkit saves reliably persist without silently wiping other session data (completed 2026-07-10)
- [ ] **Phase 2: Markdown Editing — Character & Location Fields** - DM writes character bios/notes and location descriptions in markdown with live, auto-growing, dark-themed preview
- [ ] **Phase 3: Markdown Editing — Session Prep Fields** - DM writes the Overview & Hook and Notes/Callout/Loot prep blocks in markdown with live preview, content persists on reload
- [ ] **Phase 4: Image Cropping & Storage — Cropper.js v2 Rollout** - DM crops portraits and location images with Cropper.js v2 (zoom, EXIF-safe, touch) at all three upload sites, backed by a new dual original/cropped storage model served via dedicated cached endpoints

## Phase Details

### Phase 1: Session Persistence Reliability

**Goal**: A DM's session data — prep content, session log, top bar title/metadata, and toolkit — reliably persists across save and reload, with no silent data loss from partial saves.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: PERSIST-01, PERSIST-02, PERSIST-03, PERSIST-04
**Success Criteria** (what must be TRUE):

  1. DM writes Overview & Hook and Notes/Callout/Loot prep-block content, saves, reloads the page, and the content is still present (`SessionRepository.UpsertAsync` now assigns `PrepData` on update).
  2. DM edits the Session Log, top bar title/metadata, or Toolkit independently, and no other session data (Title, Characters, Locations, Encounters) is wiped out as a side effect of that save.
  3. Partial-payload `UPDATE_SESSION` dispatches from any of the existing call sites (`SessionPrep.jsx`, `SessionLog.jsx`, `TopBar.jsx`, `Toolkit.jsx`) no longer unconditionally overwrite unrelated session fields with empty/default values.
  4. `SessionRepository.UpsertAsync` updates a session's Characters/Locations/Encounters by diffing against existing rows (add/update/remove only what changed) instead of deleting and reinserting the full collections on every save.
  5. DM sees a visible indicator (e.g. toast/banner) when a session save request fails, instead of the failure being silently swallowed.

**Plans**: 4/4 plans complete

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Wave 0 test harness: Omphalos.UnitTests + Omphalos.IntegrationTests (Testcontainers Postgres), fixture + smoke test, dotnet test CI gate (D-04, D-05)
- [x] 01-03-PLAN.md — Frontend full-payload UPDATE_SESSION dispatches at the 4 call sites (PERSIST-02, D-01)
- [x] 01-04-PLAN.md — Save-failure toast: SaveFailureToast + AppContext saveError wiring (PERSIST-04, D-03)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Backend persistence fix (TDD): assign PrepData + diff-merge child collections by Id in UpsertAsync (PERSIST-01, PERSIST-03)

### Phase 2: Markdown Editing — Character & Location Fields

**Goal**: A DM can write character bios/notes and location descriptions using markdown syntax, with a live preview that matches the app's dark theme and grows to fit content.
**Mode:** mvp
**Depends on**: Nothing (independent of Phase 1; can be built/planned in parallel)
**Requirements**: MDED-03, MDED-04, MDED-05, MDED-06, MDED-07, MDED-08
**Success Criteria** (what must be TRUE):

  1. DM types markdown (headings, lists, bold/italic, blockquote, code) into a character's bio/notes field or a location's description field and sees a live rendered preview styled to match the app's dark theme.
  2. On wide viewports the field shows edit and preview side by side; on narrow viewports it falls back to an Edit/Preview tab toggle.
  3. Existing plain-text content typed with literal line breaks still renders with those line breaks preserved, not collapsed into a run-on paragraph.
  4. The field grows taller to fit typed content instead of staying a fixed-height scrollable box.

**Plans**: 1/3 plans executed
**UI hint**: yes

Plans:

**Wave 1**

- [x] 02-01-PLAN.md — Core markdown stack (MarkdownField/MarkdownPreview/markdownToolbar/stripMarkdown + dark-theme CSS + 4 deps) wired end-to-end into the in-session Character modal (MDED-03, MDED-05, MDED-06, MDED-07, MDED-08; D-01, D-02, D-05, D-06, D-07, D-08, D-09, D-10, D-11)

**Wave 2** *(parallel; both depend on 02-01)*

- [ ] 02-02-PLAN.md — Library rollout: GlobalCharacterModal + GlobalLocationModal markdown fields, card previews strip-cleaned (MDED-03, MDED-04; D-01, D-02, D-03, D-04, D-13)
- [ ] 02-03-PLAN.md — In-session location + library-link rollout: Locations tab, AddLocationModal, AddFromLibraryModal (MDED-03, MDED-04; D-04, D-05, D-12, D-13, D-14)

### Phase 3: Markdown Editing — Session Prep Fields

**Goal**: A DM can write the Session Overview & Hook and Notes/Callout/Loot prep-block content using markdown syntax with live preview, reusing the same `MarkdownField` component already proven at the character/location sites, with content that reliably persists.
**Mode:** mvp
**Depends on**: Phase 1 (requires the `PrepData` persistence fix — without it, new markdown content would appear to save and then vanish on reload), Phase 2 (reuses the shared `MarkdownField` component built there)
**Requirements**: MDED-01, MDED-02, MDED-09
**Success Criteria** (what must be TRUE):

  1. DM writes the Overview & Hook field using markdown syntax, sees a live rendered preview, saves, reloads the page, and both the raw markdown and its rendered content are still present.
  2. DM writes content in a Notes, Callout, or Loot prep block using markdown syntax with live preview, saves, reloads, and the content persists.
  3. All four markdown field locations (Overview & Hook, prep blocks, character bio/notes, location description) render through the same shared `MarkdownField` component rather than divergent implementations.

**Plans**: TBD
**UI hint**: yes

Plans:

- [ ] 03-01: TBD

### Phase 4: Image Cropping & Storage — Cropper.js v2 Rollout

**Goal**: A DM can crop portrait and location images end-to-end using a Cropper.js v2-based `ImageCropModal` — with zoom, EXIF-safe handling, and touch support — at all three existing upload sites, backed by a new image storage and serving model: both the original and cropped image are stored per entity (Character, GlobalCharacter, Location, GlobalLocation) and served via dedicated, HTTP-cached binary endpoints instead of embedded base64 in JSON payloads, so a DM can re-crop without re-uploading, animated GIFs still display, and character/location pages load without waiting on image bytes.
**Mode:** mvp
**Depends on**: Nothing (independent of Phases 1-3; different library, different files/entities, can be built/planned in parallel)
**Requirements**: CROP-01, CROP-02, CROP-03, CROP-04, CROP-05, CROP-06, CROP-07, CROP-08, CROP-09, IMG-01, IMG-02, IMG-03, IMG-04, IMG-05, IMG-06, IMG-07
**Success Criteria** (what must be TRUE):

  1. DM crops a character portrait in the Character Library, an in-session character portrait, and a location image, all using the same shared `ImageCropModal` component, with matching aspect-ratio lock, drag-to-reposition, touch support, rule-of-thirds grid, and corner resize handles.
  2. DM can zoom in/out with the mouse wheel (desktop) or a pinch gesture (mobile) while cropping, and a phone photo with EXIF rotation crops right-side-up (not sideways/upside-down) and doesn't render blank on iOS Safari, because images are EXIF-corrected and downscaled before cropping.
  3. The crop modal matches the app's existing modal chrome (dark overlay, `bg-[#211b17]` card, amber heading, `×` close, Cancel/"Crop & Save" buttons), and on save it hands the caller both the original and cropped image data (the `ImageCropModal` output contract carries both, replacing the old single-`dataURL` `onSave` shape).
  4. DM re-crops an existing character portrait or location image without re-uploading the source file, because the original upload is retained separately from the cropped result.
  5. An animated GIF uploaded without going through the crop step (GIFs skip cropping) still displays correctly everywhere its portrait/image appears, via a cropped-or-original fallback.
  6. Character/location list and detail pages render immediately without waiting on embedded image bytes — images load asynchronously from dedicated, HTTP-cached (ETag/Cache-Control) binary endpoints, and the DTOs expose only a `HasImage` flag until an image is actually requested.

**Plans**: TBD — expect this phase to need more internal structure than a single plan given the added storage/serving scope. Likely breakdown (finalized during `/gsd-plan-phase 4`): (1) EF Core migration + DTO changes (`HasImage` flag) across all 4 entities, (2) new endpoint groups — original + cropped binary routes per entity with HTTP caching, (3) shared `ImageCropModal` component + EXIF-correct/downscale prepare-image utility, (4) wire the 3 crop call sites end-to-end against the new save/serve model, (5) refactor existing `<img src={base64}>` usages app-wide (list/detail views, not just the 3 crop sites) to the new binary endpoints.
**UI hint**: yes

Plans:

- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4
(Phase 2 and Phase 4 have no dependency on Phase 1 and may be planned/executed in parallel if desired; Phase 3 requires both Phase 1 and Phase 2 complete.)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Session Persistence Reliability | 4/4 | Complete    | 2026-07-10 |
| 2. Markdown Editing — Character & Location Fields | 1/3 | In Progress|  |
| 3. Markdown Editing — Session Prep Fields | 0/TBD | Not started | - |
| 4. Image Cropping & Storage — Cropper.js v2 Rollout | 0/TBD | Not started | - |

## Roadmap Revision Log

**2026-07-10 — Phase 4 scope expanded (pre-approval revision):** Phase 4 was widened from a frontend-only crop-library swap to include a full image storage/serving overhaul (IMG-01..07), after the user added those requirements and revised CROP-06 (the `ImageCropModal` output contract now carries both original and cropped image data, not just a single cropped `dataURL`). Phases 1-3 are unaffected — the new requirements are scoped entirely to Phase 4's four image-bearing entities and endpoints.

**Split-vs-single-phase decision:** Kept as one phase rather than splitting into "Image Storage Backend" + "Cropper.js v2 Rollout". Reasoning:

- The IMG-01..07 requirements have no independently observable, DM-facing value on their own — a migrated column and a binary endpoint nobody calls isn't a verifiable outcome. They only become observable (re-crop without re-upload, GIF fallback, fast page loads) once the frontend crop UI is wired to write/read through them. Splitting would recreate the "all backend, then all frontend" horizontal-layer anti-pattern the roadmapping process explicitly avoids, and the follow-up "frontend" phase would end up 100%-dependent on the "backend" phase with no parallelization benefit (unlike Phase 2/Phase 4 today, which genuinely can run in parallel).
- All 16 requirements in this phase converge on one user story: "DM crops a portrait/location image end-to-end," now with a storage model underneath it. That's a single vertical MVP slice, not two.
- The real risk of the expanded scope isn't phase boundaries, it's plan-level granularity — flagged above via a suggested 5-plan breakdown to be finalized in `/gsd-plan-phase 4`, so the phase is still checkpointed and verifiable in stages even though it stays one phase.
