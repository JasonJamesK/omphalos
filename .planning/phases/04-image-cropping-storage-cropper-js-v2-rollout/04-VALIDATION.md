---
phase: 4
slug: image-cropping-storage-cropper-js-v2-rollout
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-13
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | xUnit v3 (`xunit.v3` 3.2.2). Note: `.planning/codebase/TESTING.md` (dated 2026-07-10) says "no test infrastructure exists" — that is stale. `src/Omphalos.UnitTests` and `src/Omphalos.IntegrationTests` exist since Phase 1, with `Testcontainers.PostgreSql` 4.13.0 wired into `PostgresFixture.cs`. No frontend test framework exists (no vitest/jest) — frontend crop UI has manual/UAT verification only, matching existing project convention. |
| **Config file** | `src/Omphalos.UnitTests/Omphalos.UnitTests.csproj`, `src/Omphalos.IntegrationTests/Omphalos.IntegrationTests.csproj` — standard SDK-style test projects, no separate config file |
| **Quick run command** | `dotnet test src/Omphalos.UnitTests` |
| **Full suite command** | `dotnet test` (solution-wide; `Omphalos.IntegrationTests` requires Docker, confirmed available this session) |
| **Estimated runtime** | ~30-60 seconds (unit) / ~2-4 minutes (full suite incl. Testcontainers Postgres spin-up) |

---

## Sampling Rate

- **After every task commit:** Run `dotnet test src/Omphalos.UnitTests`
- **After every plan wave:** Run `dotnet test` (full suite, requires Docker)
- **Before `/gsd-verify-work`:** Full suite must be green, plus manual UAT for all CROP-01..09 frontend crop behaviors (no automated frontend coverage exists — matches existing project convention)
- **Max feedback latency:** ~4 minutes (bounded by Testcontainers Postgres container startup)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-* | 01 | 1 | IMG-01 | — | Migration renames + retypes columns without data loss | integration | `dotnet test src/Omphalos.IntegrationTests --filter FullyQualifiedName~ImageColumnMigration` | ❌ W0 | ⬜ pending |
| 04-01-* | 01 | 1 | IMG-02, IMG-03 | — | `Cropped ?? Original` fallback read (re-crop + GIF display) | integration | `dotnet test src/Omphalos.IntegrationTests --filter FullyQualifiedName~ImageFallback` | ❌ W0 | ⬜ pending |
| 04-02-* | 02 | — | IMG-04, V4 Access Control | T-04-01 | New Character/Location image endpoints filter by session ownership (`GetUserId` + `.Where(c => c.Session.UserId == userId)`), not id-only lookup | integration | new `WebApplicationFactory`-based endpoint test class | ❌ W0 (new test pattern — no precedent in this repo) | ⬜ pending |
| 04-02-* | 02 | — | IMG-05 | — | `HasImage` scalar query never selects byte columns (EXISTS/scalar translation, not full-row load) | integration | `dotnet test src/Omphalos.IntegrationTests --filter FullyQualifiedName~HasImage` | ❌ W0 | ⬜ pending |
| 04-02-* | 02 | — | IMG-07 | — | Binary endpoint returns `304` on matching `If-None-Match`; `Cache-Control: private` for session-scoped Character/Location images, `public` acceptable only for GlobalCharacter/GlobalLocation | integration (`WebApplicationFactory`) | new test class | ❌ W0 (new test pattern) | ⬜ pending |
| 04-02-* | 02 | — | V5 Input Validation | T-04-02 | Server-side max-byte-length + magic-byte content-type check on upload, rejecting non-image bytes even if client claims `image/jpeg` | integration | new test class | ❌ W0 | ⬜ pending |
| 04-0N-* | 03-05 | — | CROP-01..09 | — | Frontend crop behavior (drag, zoom, touch, EXIF, aspect lock, GIF skip) | manual/UAT | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Exact task IDs (04-01-01, 04-02-01, etc.) will be finalized by the planner; requirement→test mapping above is req-level, planner should thread it into the actual task IDs it creates.*

---

## Wave 0 Requirements

- [ ] `src/Omphalos.IntegrationTests/ImageMigrationTests.cs` (or similar) — covers IMG-01/IMG-02/IMG-03. **Known limitation:** `PostgresFixture` runs `db.Database.MigrateAsync()` applying ALL migrations at once against a fresh container, so it cannot directly exercise "existing Base64 data surviving the rename+cast migration" the way a real production upgrade would (no pre-migration data exists in a fresh Testcontainers instance). Two options: (a) seed a row via raw SQL against the pre-migration schema, migrate up to N-1, seed, then migrate to N (more fixture work), or (b) treat this as a unit-level SQL-string assertion on the migration's `Up()` output only, relying on manual verification against a real pre-migration Docker volume for the actual data-preservation guarantee. This is a real testing limitation the planner must account for explicitly, not paper over.
- [ ] A `WebApplicationFactory<Program>`-based endpoint test harness — zero precedent in this repo (all existing coverage is repository-level via `Omphalos.IntegrationTests`). Required for IMG-07's caching behavior (`304` on matching ETag) and the V4 access-control ownership checks on the new image endpoints; the alternative is manual `curl`/browser-devtools inspection only.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cropper.js v2 drag-to-reposition, rule-of-thirds grid, corner resize handles, mouse-wheel/pinch zoom | CROP-01, CROP-02, CROP-03, CROP-04, CROP-08 | No frontend test framework exists (no vitest/jest/@testing-library in package.json); matches existing project convention of manual UI verification | Open each of the 3 crop sites (Character Library, in-session character, location) in a real browser; drag the crop box, zoom via wheel/pinch, confirm rule-of-thirds grid and corner handles render and resize correctly |
| EXIF-safe crop on a phone photo (right-side-up, not sideways/upside-down); no blank canvas on iOS Safari | CROP-09 | Requires a real EXIF-rotated photo and ideally an actual iOS Safari session; no automated way to assert visual pixel orientation in this test suite | Upload a phone photo known to carry EXIF rotation data; confirm the crop preview shows it right-side-up. Test on iOS Safari if a device is available (or note as best-effort desktop-only verification if not) |
| Modal chrome match (dark overlay, `bg-[#211b17]` card, amber heading, `×` close, Cancel/"Crop & Save" buttons) | CROP-05 | Visual/styling assertion — no visual regression tooling in this repo | Screenshot comparison against `04-UI-SPEC.md`'s documented chrome; visually confirm on all 3 call sites |
| GIF upload skips crop modal entirely, displays as animated original everywhere | CROP-04 (behavior), IMG-03 | Requires an actual animated GIF file and visual confirmation the animation still plays post-upload | Upload a small animated GIF at each of the 3 sites; confirm the crop modal never opens and the GIF still animates in every place its portrait/image renders |
| Re-crop of an existing (pre-migration or newly uploaded) image without re-upload | IMG-02 | End-to-end UX flow spanning frontend + backend + DB state, best verified live | Crop-save an image, then re-open the crop modal for the same character/location without picking a new file; confirm the original (not the previously-cropped result) is presented as the crop source |
| Character/location list pages render without waiting on image bytes | IMG-06 | Requires observing network waterfall / perceived load timing, not a unit-testable assertion | Open browser DevTools Network tab, load the Character Library / Locations list, confirm the initial page JSON response excludes image bytes and image `<img>` requests fire as separate, later requests |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`ImageMigrationTests.cs`, `WebApplicationFactory` harness)
- [ ] No watch-mode flags
- [ ] Feedback latency < ~4 minutes (Testcontainers Postgres startup bound)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
