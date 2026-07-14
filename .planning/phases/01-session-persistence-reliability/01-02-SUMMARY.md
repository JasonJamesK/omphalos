---
phase: 01-session-persistence-reliability
plan: 02
subsystem: database
tags: [efcore, npgsql, postgres, jsonb, xunit, tdd, session-persistence]

# Dependency graph
requires:
  - phase: 01-session-persistence-reliability (plan 01)
    provides: Omphalos.UnitTests / Omphalos.IntegrationTests projects, PostgresFixture (Testcontainers Postgres 17, real EF Core migrations)
provides:
  - "SessionRepository.UpsertAsync assigns existing.PrepData on update (PERSIST-01 fix)"
  - "SessionCollectionSync.Diff<T> — pure, DB-agnostic add/update/remove classification by string Id key"
  - "SessionRepository child-collection reconciliation (Characters/Locations/Encounters) by Id instead of delete+reinsert (PERSIST-03 fix)"
  - "SessionCollectionSyncTests (Omphalos.UnitTests) — no-DB coverage of Diff edge cases"
  - "SessionRepositoryTests (Omphalos.IntegrationTests) — PrepDataPersistsOnUpdate, CollectionDiffMerge real-Postgres coverage"
affects: [01-session-persistence-reliability, 03-session-prep-markdown]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure diff-classification (SessionCollectionSync.Diff<T>) kept EF-free so it's unit-testable with plain in-memory lists; EF-specific glue (ApplyDiff, CopyXFields) stays in the repository and is covered by Testcontainers integration tests"
    - "UserId-scoped session query is the sole source of truth for which child rows a diff-merge may touch — no global DbSet lookup by child Id"

key-files:
  created:
    - src/Omphalos.Repository/Repositories/SessionCollectionSync.cs
    - src/Omphalos.UnitTests/SessionCollectionSyncTests.cs
    - src/Omphalos.IntegrationTests/SessionRepositoryTests.cs
  modified:
    - src/Omphalos.Repository/Repositories/SessionRepository.cs

key-decisions:
  - "Used a single generic ApplyDiff<T> private helper (DbSet<T> + Action<T,T> copyFields) shared across Characters/Locations/Encounters instead of 3 near-duplicate explicit blocks — the pure Diff<T> stays testable either way per 01-PATTERNS.md's explicit discretion note; the generic helper reduces duplication."
  - "CopyCharacterFields/CopyLocationFields/CopyEncounterFields copy every scalar and JSONB-backed field except Id, SessionId, and navigation properties, matching the plan's explicit field-copy contract."

patterns-established:
  - "SessionCollectionSync.Diff<T>(existing, incoming, keySelector) is now the canonical shape for any future session-scoped child-collection reconciliation in this repo."

requirements-completed: [PERSIST-01, PERSIST-03]

coverage:
  - id: D1
    description: "PrepData (Session Prep content) survives an insert-then-update round-trip through SessionRepository.UpsertAsync against real Postgres"
    requirement: "PERSIST-01"
    verification:
      - kind: integration
        ref: "src/Omphalos.IntegrationTests/SessionRepositoryTests.cs#PrepDataPersistsOnUpdate"
        status: pass
    human_judgment: false
  - id: D2
    description: "Character/Location/Encounter child collections are reconciled by Id on save (added, updated in place, removed) rather than deleted and reinserted wholesale, verified against real Postgres"
    requirement: "PERSIST-03"
    verification:
      - kind: integration
        ref: "src/Omphalos.IntegrationTests/SessionRepositoryTests.cs#CollectionDiffMerge"
        status: pass
    human_judgment: false
  - id: D3
    description: "The pure diff-classification logic (SessionCollectionSync.Diff<T>) is unit-tested against plain in-memory lists with no database, covering add/update/remove classification plus empty-existing, empty-incoming, and identical-list edge cases"
    requirement: "PERSIST-03"
    verification:
      - kind: unit
        ref: "src/Omphalos.UnitTests/SessionCollectionSyncTests.cs#Diff_ClassifiesAddUpdateRemove_ByKey"
        status: pass
      - kind: unit
        ref: "src/Omphalos.UnitTests/SessionCollectionSyncTests.cs#Diff_EmptyExisting_AllIncomingAreAdds"
        status: pass
      - kind: unit
        ref: "src/Omphalos.UnitTests/SessionCollectionSyncTests.cs#Diff_EmptyIncoming_AllExistingAreRemoves"
        status: pass
      - kind: unit
        ref: "src/Omphalos.UnitTests/SessionCollectionSyncTests.cs#Diff_IdenticalKeys_NoAddsOrRemoves"
        status: pass
    human_judgment: false
  - id: D4
    description: "Diff-merge only ever touches child rows loaded off the UserId-scoped session query, never a global lookup by child Id"
    requirement: "PERSIST-03"
    verification:
      - kind: other
        ref: "grep -n 'db\\.\\(Characters\\|Locations\\|Encounters\\)' src/Omphalos.Repository/Repositories/SessionRepository.cs -> only ApplyDiff(...) calls passing existing.Characters/Locations/Encounters + the corresponding DbSet<T> for tracking, no global lookup by Id introduced"
        status: pass
    human_judgment: false

duration: 11min
completed: 2026-07-10
status: complete
---

# Phase 1 Plan 02: PrepData Persistence + Collection Diff-Merge Summary

**Fixed `SessionRepository.UpsertAsync` to persist `PrepData` on update and to reconcile Character/Location/Encounter child collections by Id (add/update/remove) instead of delete-and-reinsert, via a new pure `SessionCollectionSync.Diff<T>` helper — test-first (RED unit + integration tests, then GREEN implementation).**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-07-10T13:52:00Z (approx, per prior wave's base commit)
- **Completed:** 2026-07-10T14:03:02Z
- **Tasks:** 2/2 completed (RED, GREEN)
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- Fixed the PERSIST-01 bug: `existing.PrepData = session.PrepData;` is now assigned in `UpsertAsync`'s update branch — Session Prep content no longer silently vanishes on reload.
- Fixed the PERSIST-03 bug: Character/Location/Encounter child collections are now reconciled by Id (added, updated in place, removed) via a new `SessionCollectionSync.Diff<T>` pure helper + `ApplyDiff`/`CopyXFields` EF glue, replacing the prior unconditional `RemoveRange` + full reassignment.
- Extracted `SessionCollectionSync.Diff<T>` as a pure, DB-agnostic static method — unit-tested with plain in-memory `Character` lists, no Docker or DbContext required.
- Preserved the UserId-scoped ownership invariant: diff-merge only ever operates on `existing.Characters/Locations/Encounters` already loaded off the `s.Id == session.Id && s.UserId == session.UserId` query — no global child lookup by Id was introduced.
- Followed strict RED→GREEN TDD: failing unit tests (`NotImplementedException`) and a failing `PrepDataPersistsOnUpdate` integration test were committed first, then the implementation made all 7 tests (4 unit + 3 integration) green.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Write failing unit + integration tests for PrepData persistence and collection diff-merge** - `8601f70` (test)
2. **Task 2 (GREEN): Implement the PrepData assignment + pure diff helper + EF glue in UpsertAsync** - `34f9f46` (fix)

_Note: this SUMMARY commit is added separately in the plan-completion metadata commit._

## Files Created/Modified

- `src/Omphalos.Repository/Repositories/SessionCollectionSync.cs` - New pure static class; `Diff<T>(existing, incoming, keySelector)` classifies ToAdd/ToUpdate/ToRemove by string Id key, no EF Core dependency.
- `src/Omphalos.Repository/Repositories/SessionRepository.cs` - `UpsertAsync` now assigns `existing.PrepData`; child collections reconciled via a new `ApplyDiff<T>` private generic helper + `CopyCharacterFields`/`CopyLocationFields`/`CopyEncounterFields` in-place field copy methods, replacing `RemoveRange` + reassignment.
- `src/Omphalos.UnitTests/SessionCollectionSyncTests.cs` - 4 tests exercising `Diff` against plain `Character` lists: classify add/update/remove, empty existing, empty incoming, identical keys.
- `src/Omphalos.IntegrationTests/SessionRepositoryTests.cs` - `[Collection("Postgres")]` tests reusing Plan 01's `PostgresFixture`: `PrepDataPersistsOnUpdate` (insert-then-update PrepData round-trip) and `CollectionDiffMerge` (Characters/Locations/Encounters add/update/remove across two `UpsertAsync` calls), both asserting from a freshly-opened `OmphalosDbContext`.

## Decisions Made

- Chose one generic `ApplyDiff<T>` private helper (parameterized by `DbSet<T>` and an `Action<T,T> copyFields` delegate) shared across all 3 child collections, rather than 3 near-duplicate explicit blocks — the plan left this as Claude's discretion, and the generic helper reduces duplication while keeping `SessionCollectionSync.Diff<T>` itself fully pure and independently unit-tested.
- `CopyCharacterFields`/`CopyLocationFields`/`CopyEncounterFields` copy every scalar and JSONB-backed field (including `Relationships`/`StatBlock` on `Character` and `Enemies` on `Encounter`) except `Id`, `SessionId`, and navigation properties, per the plan's explicit field-copy contract.

## Deviations from Plan

None - plan executed exactly as written. The RED task's `<verify>` step only requires `PrepDataPersistsOnUpdate` to be confirmed failing (not `CollectionDiffMerge`); as expected, `CollectionDiffMerge` happened to already pass under the old delete-and-reinsert code because its assertions only check final DB state, not in-place-update identity — this is consistent with the plan's acceptance criteria, which only requires the unit suite and `PrepDataPersistsOnUpdate` to be RED.

## Issues Encountered

None. Both `dotnet build --configuration Release` and `dotnet test --configuration Release` were clean (0 errors; the one pre-existing `NU1903` NuGet advisory warning on `Omphalos.Web`'s `Microsoft.OpenApi` dependency is unrelated to this plan's changes and out of scope).

## User Setup Required

None - no external service configuration required. Docker was already running locally and used by the `Omphalos.IntegrationTests` Testcontainers-backed Postgres fixture from Plan 01.

## Next Phase Readiness

- `dotnet test` is fully green across `Omphalos.UnitTests` (4/4) and `Omphalos.IntegrationTests` (3/3, including Plan 01's pre-existing smoke test).
- PERSIST-01 and PERSIST-03 are both verified against a real Postgres JSONB round-trip, not a fake provider.
- Phase 3 (Session Prep markdown editing), which was hard-gated on this plan's `PrepData` persistence fix, is now unblocked.
- No blockers for the remaining Phase 1 plans (frontend full-payload dispatch fixes and save-failure toast).

---
*Phase: 01-session-persistence-reliability*
*Completed: 2026-07-10*

## Self-Check: PASSED

All created files verified present on disk (`SessionCollectionSync.cs`, `SessionCollectionSyncTests.cs`, `SessionRepositoryTests.cs`, this SUMMARY.md); both task commits (`8601f70`, `34f9f46`) verified present in git log.
