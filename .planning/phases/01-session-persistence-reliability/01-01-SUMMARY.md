---
phase: 01-session-persistence-reliability
plan: 01
subsystem: testing
tags: [xunit, xunit-v3, testcontainers, postgres, efcore, npgsql, dotnet-test, ci]

# Dependency graph
requires: []
provides:
  - Omphalos.UnitTests project (net10.0, xUnit v3) — fast, no-DB test project for Plan 02's pure diff-merge logic tests
  - Omphalos.IntegrationTests project (net10.0, xUnit v3, Testcontainers.PostgreSql) — real-Postgres repository test project
  - PostgresFixture / PostgresCollection — shared Testcontainers Postgres 17 fixture, applies real EF Core migrations via MigrateAsync
  - Green smoke test proving the Docker -> Npgsql -> EF Core migrations -> OmphalosDbContext path works end-to-end
  - dotnet test CI gate in build-dotnet job
affects: [01-02, 01-session-persistence-reliability]

# Tech tracking
tech-stack:
  added: [xunit.v3@3.2.2, xunit.runner.visualstudio@3.1.5, Microsoft.NET.Test.Sdk@18.7.0, Testcontainers.PostgreSql@4.13.0]
  patterns:
    - "IAsyncLifetime + ICollectionFixture<PostgresFixture> shared-container-per-collection pattern for integration tests"
    - "MigrateAsync() (not EnsureCreated()) in test fixtures, so tests also verify migrations apply cleanly"
    - "Split Unit/Integration test projects so fast no-DB tests don't pay container-startup cost"

key-files:
  created:
    - src/Omphalos.UnitTests/Omphalos.UnitTests.csproj
    - src/Omphalos.IntegrationTests/Omphalos.IntegrationTests.csproj
    - src/Omphalos.IntegrationTests/PostgresFixture.cs
    - src/Omphalos.IntegrationTests/PostgresFixtureSmokeTests.cs
  modified:
    - Omphalos.slnx
    - .github/workflows/ci.yml

key-decisions:
  - "Used classic xunit.v3 + xunit.runner.visualstudio + Microsoft.NET.Test.Sdk package trio (VSTest-driven dotnet test) instead of the dotnet new xunit3 template's default Microsoft Testing Platform (xunit.v3.mtp-v2 + OutputType Exe) setup, to match RESEARCH.md's Standard Stack exactly"
  - "Deleted the dotnet new xunit3 template's placeholder UnitTest1.cs/xunit.runner.json files from both projects — not part of the plan's deliverables, and the real smoke test in Omphalos.IntegrationTests satisfies the must_haves truth about a green test existing"
  - "Deleted the global.json the template auto-created (test.runner: Microsoft.Testing.Platform) since the classic VSTest-based package set was substituted instead"

patterns-established:
  - "Pattern 2 from RESEARCH.md (Testcontainers Postgres fixture shared across a collection) is now the canonical integration-test setup for this repo"

requirements-completed: [PERSIST-01, PERSIST-03]

coverage:
  - id: D1
    description: "dotnet test discovers and runs at least one green test from the solution"
    requirement: "PERSIST-01"
    verification:
      - kind: integration
        ref: "src/Omphalos.IntegrationTests/PostgresFixtureSmokeTests.cs#GameSession_RoundTrips_Through_RealNpgsqlProvider"
        status: pass
    human_judgment: false
  - id: D2
    description: "A Testcontainers-backed Postgres fixture starts a real postgres:17 container and applies the project's EF Core migrations"
    verification:
      - kind: integration
        ref: "src/Omphalos.IntegrationTests/PostgresFixture.cs — db.Database.MigrateAsync() confirmed via grep, no EnsureCreated"
        status: pass
    human_judgment: false
  - id: D3
    description: "A smoke test round-trips a GameSession through the real Npgsql provider, proving Docker + migrations + OmphalosDbContext all work in the test harness"
    requirement: "PERSIST-03"
    verification:
      - kind: integration
        ref: "dotnet test src/Omphalos.IntegrationTests --configuration Release -> Passed! Failed: 0, Passed: 1, Total: 1"
        status: pass
    human_judgment: false
  - id: D4
    description: "CI runs dotnet test as a gating step in the build-dotnet job, after Build"
    verification:
      - kind: other
        ref: "grep -c 'dotnet test' .github/workflows/ci.yml -> 1"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-10
status: complete
---

# Phase 1 Plan 01: Test Infrastructure Bootstrap Summary

**Stood up the project's first-ever automated test infrastructure — xUnit v3 Unit/Integration split, a Testcontainers-backed real-Postgres fixture with a green smoke test, and a `dotnet test` CI gate.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-10T13:48Z
- **Tasks:** 3/3 completed
- **Files modified:** 6 (4 created, 2 modified)

## Accomplishments

- Scaffolded `Omphalos.UnitTests` and `Omphalos.IntegrationTests` (net10.0, xUnit v3), both registered in `Omphalos.slnx` inside the existing `/src/` folder
- Built `PostgresFixture` — an `IAsyncLifetime`-based Testcontainers Postgres 17 container fixture shared across the integration test collection, applying the project's real EF Core migrations via `MigrateAsync()`
- Wrote `PostgresFixtureSmokeTests`, which inserts a `GameSession` (plus its required `User` FK row) and reads it back on a fresh `OmphalosDbContext` instance, proving the full Docker → Npgsql → migrations → `OmphalosDbContext` path works
- Added a `Test` step to `.github/workflows/ci.yml`'s `build-dotnet` job, running `dotnet test --no-build --configuration Release` after `Build`

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold both test projects, add packages, references, and register in the solution** - `2ef8ad7` (feat)
2. **Task 2: Create the shared Postgres container fixture and a harness smoke test** - `fa6dd31` (feat)
3. **Task 3: Add a dotnet test gate to CI** - `5533ae8` (chore)

_Note: this SUMMARY commit is added separately in the plan-completion metadata commit._

## Files Created/Modified

- `src/Omphalos.UnitTests/Omphalos.UnitTests.csproj` - net10.0 xUnit v3 project, no DB dependency, references Repository+Domain
- `src/Omphalos.IntegrationTests/Omphalos.IntegrationTests.csproj` - net10.0 xUnit v3 project with `Testcontainers.PostgreSql`, references Repository+Domain
- `src/Omphalos.IntegrationTests/PostgresFixture.cs` - `IAsyncLifetime` Postgres 17 Testcontainers fixture + `[CollectionDefinition("Postgres")]`
- `src/Omphalos.IntegrationTests/PostgresFixtureSmokeTests.cs` - green smoke test round-tripping a `GameSession` through the real Npgsql provider
- `Omphalos.slnx` - added both new test projects inside the `/src/` folder
- `.github/workflows/ci.yml` - added a `Test` step (`dotnet test --no-build --configuration Release`) to the `build-dotnet` job

## Decisions Made

- Chose the classic `xunit.v3` + `xunit.runner.visualstudio` + `Microsoft.NET.Test.Sdk` package trio over the `dotnet new xunit3` template's default Microsoft Testing Platform setup (`xunit.v3.mtp-v2`, `OutputType Exe`), to match the exact package versions and VSTest-driven `dotnet test` flow specified in `01-RESEARCH.md`'s Standard Stack.
- Removed the template-generated placeholder `UnitTest1.cs`/`xunit.runner.json` files and the auto-created `global.json` (which pinned `test.runner: Microsoft.Testing.Platform`, incompatible with the classic package set chosen above) — these were scaffolding artifacts, not plan deliverables.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed obsolete `PostgreSqlBuilder()` parameterless constructor warning**
- **Found during:** Task 2 (Postgres fixture build)
- **Issue:** `new PostgreSqlBuilder().WithImage("postgres:17")` (the exact pattern quoted in `01-RESEARCH.md`'s Pattern 2) triggers a `CS0618` obsolete warning in `Testcontainers.PostgreSql` 4.13.0 — the parameterless constructor is deprecated in favor of `PostgreSqlBuilder(string image)`.
- **Fix:** Changed to `new PostgreSqlBuilder("postgres:17")`, dropping the now-redundant `.WithImage(...)` call. Same behavior (pins `postgres:17`, matching `docker-compose.yml`), zero warnings.
- **Files modified:** `src/Omphalos.IntegrationTests/PostgresFixture.cs`
- **Verification:** `dotnet build src/Omphalos.IntegrationTests --configuration Release` — 0 warnings after the fix
- **Committed in:** `fa6dd31` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed `xUnit1051` analyzer warnings for missing `CancellationToken` propagation**
- **Found during:** Task 2 (smoke test build)
- **Issue:** `SaveChangesAsync()` and `FirstOrDefaultAsync(...)` calls in `PostgresFixtureSmokeTests` didn't pass `TestContext.Current.CancellationToken`, triggering xUnit v3's analyzer warning about test-cancellation responsiveness.
- **Fix:** Passed `TestContext.Current.CancellationToken` to both async EF Core calls.
- **Files modified:** `src/Omphalos.IntegrationTests/PostgresFixtureSmokeTests.cs`
- **Verification:** `dotnet build src/Omphalos.IntegrationTests --configuration Release` — 0 warnings after the fix
- **Committed in:** `fa6dd31` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bug/warning fixes surfaced by the compiler/analyzer while implementing Task 2)
**Impact on plan:** Both fixes are zero-behavior-change cleanups of warnings introduced by following the plan's reference code verbatim against the actual installed package version. No scope creep.

## Issues Encountered

None beyond the two auto-fixed warnings above.

## User Setup Required

None - no external service configuration required. Docker was already running locally (confirmed via `docker --version`/`docker info` prior to execution) and is preinstalled on GitHub Actions `ubuntu-latest` runners per `01-RESEARCH.md` Assumption A1.

## Next Phase Readiness

- The test harness is fully operational: `dotnet test src/Omphalos.IntegrationTests --configuration Release` passes 1/1 green, confirming Docker → Testcontainers → Npgsql → EF Core migrations → `OmphalosDbContext` all work together.
- `Omphalos.UnitTests` currently has zero test files (its placeholder was intentionally removed) — Plan 02 is expected to add the pure diff-merge logic tests here per `01-RESEARCH.md`'s "Pattern 1" recommendation (extract a DB-agnostic `SyncCollection` diff function, test it in `Omphalos.UnitTests` with plain in-memory lists).
- CI now gates every push/PR on `dotnet test`, so Plan 02's PERSIST-01/PERSIST-03 RED→GREEN tests will run in CI automatically once added.
- No blockers for Plan 02.

---
*Phase: 01-session-persistence-reliability*
*Completed: 2026-07-10*

## Self-Check: PASSED

All created files verified present on disk; all 4 task/plan commits (`2ef8ad7`, `fa6dd31`, `5533ae8`, `fb70c98`) verified present in git log.
