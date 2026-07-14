# Phase 1: Session Persistence Reliability - Research

**Researched:** 2026-07-10
**Domain:** EF Core collection reconciliation, first-time xUnit test project bootstrap for a Npgsql/JSONB-backed ASP.NET Core 10 minimal API, GitHub Actions `dotnet test` wiring, hand-rolled React save-failure toast
**Confidence:** MEDIUM — the two bug fixes (PERSIST-01/02) are HIGH confidence (already root-caused by direct code inspection in `ARCHITECTURE.md`/`CONCERNS.md`); the collection diff-merge pattern, test-provider choice, and CI wiring are MEDIUM (no first-party EF Core API exists for this, verified via Microsoft docs + community sources, not a single canonical example)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Fix the partial-payload bug at the frontend call sites — `SessionPrep.jsx`, `SessionLog.jsx`, `TopBar.jsx`, `Toolkit.jsx` should dispatch the full current session object instead of a partial `{id, field}` payload, matching the existing safe `dirtySessionRef` pattern already used for character/location/encounter sub-resource saves. No backend DTO/merge-contract change — the backend continues to expect (and can now safely assume) a full session payload.
- **D-02 (PERSIST-03):** `SessionRepository.UpsertAsync` should diff and merge `Character`/`Location`/`Encounter` child collections by ID (add/update/remove only what changed) instead of unconditionally deleting and reinserting all rows on every save.
- **D-03 (PERSIST-04):** Add a visible indicator (toast/banner — no existing component for this, needs to be built) when a session save request fails, replacing the current silent `.catch(() => {})` swallow in `AppContext.jsx`/`db/index.js`.
- **D-04:** Add the project's first test project. Framework: **xUnit** (ASP.NET Core convention; also matches the sibling quest-board repo's own `QuestBoard.UnitTests`/`QuestBoard.IntegrationTests` project split — follow that naming/structuring convention).
- **D-05:** Wire the new test project into CI. `.github/workflows/ci.yml` currently only runs `dotnet build` + `npm run build` — add a test-run step.
- Tests should cover at minimum: `PrepData` persists on update, and the collection diff-merge logic (add/update/remove cases) in `SessionRepository.UpsertAsync`.
- **D-06:** Debouncing session persistence (every keystroke triggers a full `PUT /api/sessions/{id}`) is **explicitly out of scope** for this phase.

### Claude's Discretion

- Exact toast/banner component styling and placement — **already resolved** by `01-UI-SPEC.md` (approved-pending design contract: `SaveFailureToast.jsx`, fixed bottom-right, `bg-[#211b17] border-l-4 border-l-[#b24545]`, no auto-dismiss, no retry button). Research below treats the UI-SPEC as the binding visual contract and focuses only on the *wiring* question (how the toast learns a save failed).
- Exact test project structure (single `Omphalos.Tests` vs. split Unit/Integration projects) — lean toward mirroring quest-board's split unless there's a reason not to. **Research finding below recommends the split**, for a concrete technical reason (see Standard Stack).
- Whether the collection diff-merge (D-02) is implemented as a change inside `UpsertAsync` itself or extracted to a helper — no mandate either way.

### Deferred Ideas (OUT OF SCOPE)

- **Debounce session persistence** (every keystroke triggers a full session write) — explicitly deferred (D-06); separate tech-debt item.
- **Full offline/connectivity detection** — PERSIST-04 is scoped to visible save-*failure* feedback only, not general offline-state UX.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERSIST-01 | Session Prep content persists after save/reload — fix `SessionRepository.UpsertAsync` never assigning `PrepData` on update | Root cause already confirmed in `ARCHITECTURE.md` (missing `existing.PrepData = session.PrepData;` line). This research confirms the fix is a one-line addition, no migration needed (`PrepData` column and JSONB mapping already exist per `GameSessionConfiguration.cs:14`), and specifies how to test it (Testcontainers-Postgres, see Standard Stack). |
| PERSIST-02 | Session Log / top bar / Toolkit saves no longer silently wipe other session fields via partial `UPDATE_SESSION` dispatches | Confirmed 4 call sites (`SessionPrep.jsx:27`, `SessionLog.jsx:43,50,57`, `TopBar.jsx:12`, `Toolkit.jsx:109`) read directly in this session; exact diffs specified in Code Examples below, matching the `{ ...activeSession, field: value }` pattern `ARCHITECTURE.md` already prescribed. |
| PERSIST-03 | `SessionRepository.UpsertAsync` diffs/merges `Character`/`Location`/`Encounter` collections by ID instead of delete+reinsert | No first-party EF Core API for this (confirmed via `dotnet/efcore` GitHub issues #26830, #9312) — hand-written diff pattern specified in Architecture Patterns/Code Examples below, keyed on each entity's string `Id`. |
| PERSIST-04 | Visible indicator when a session save fails | UI contract fully specified in `01-UI-SPEC.md` (approved-pending). This research supplies the wiring pattern connecting `db/index.js`'s `request()` failures to that component without introducing a new state-management layer. |
</phase_requirements>

## Summary

This phase is ~80% backend (two confirmed, already root-caused bugs in `SessionRepository.UpsertAsync` plus a related collection-replace anti-pattern in the same method) and ~20% frontend (4 one-line dispatch fixes + one new small toast component). It also stands up the project's *first-ever* automated test project — there is currently zero test infrastructure anywhere in the repo (`.planning/codebase/CONCERNS.md`).

The two backend bugs are independent code-level fixes needing no schema migration: `PrepData` already has a JSONB column (`GameSessionConfiguration.cs:14`), it is simply never assigned in the `existing is not null` branch of `UpsertAsync` (`SessionRepository.cs:41-45`). The collection-replace fix (PERSIST-03) requires a hand-written reconciliation loop — EF Core has no built-in "sync this collection by key" API as of EF Core 10 (confirmed via `dotnet/efcore` maintainer-tracked issues, no first-party resolution exists). The frontend fix is four near-identical one-line diffs at already-identified call sites, replacing `{ id, <field> }` partial payloads with `{ ...activeSession, <field>: value }`.

The test project (D-04/D-05) is the highest-uncertainty part of this phase, not because xUnit itself is ambiguous, but because `GameSession.PrepData`/`SessionLog` are `System.Text.Json.JsonDocument` properties mapped to Postgres `jsonb` via the Npgsql-specific `.HasColumnType("jsonb")` configuration (`GameSessionConfiguration.cs:13-14`). Microsoft's own EF Core testing guidance explicitly discourages the EF Core InMemory provider for repository tests, and recommends SQLite in-memory as the default alternative — but neither InMemory nor SQLite understands Npgsql's `jsonb` type mapping or is confirmed to support `JsonDocument` as a mapped CLR type without extra configuration. Since the two bugs this phase must guard against (PrepData never persisting, full collection replace) live entirely inside the repository layer that talks to Npgsql, the highest-fidelity and lowest-risk test double is a **real Postgres instance via Testcontainers.PostgreSql**, run against the exact same `OmphalosDbContext`/`Npgsql.EntityFrameworkCore.PostgreSQL` provider as production.

**Primary recommendation:** Fix `SessionRepository.UpsertAsync` in place (add the missing `PrepData` assignment; replace `RemoveRange`+reassign with a by-ID diff loop for each of the three child collections), fix the 4 frontend call sites to send full-session payloads, wire `SaveFailureToast.jsx` per the approved UI-SPEC through a small addition to `AppContext.jsx`'s existing `useReducer` state (no new state library), and stand up `Omphalos.UnitTests` (pure-logic, no DB — e.g. an extracted diff-merge helper tested with plain xUnit) + `Omphalos.IntegrationTests` (repository tests against Testcontainers.PostgreSql, exercising the real Npgsql/jsonb path) wired into `ci.yml` via a `dotnet test` step after `dotnet build`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `PrepData` persists on update (PERSIST-01) | API / Backend | Database / Storage | Bug is a missing field assignment in `SessionRepository.UpsertAsync`; the JSONB column and Npgsql mapping already exist and are correct — only the C# assignment is missing. |
| Full-payload `UPDATE_SESSION` dispatches (PERSIST-02) | Browser / Client | — | Bug is entirely in the 4 frontend call sites building partial dispatch payloads; no backend contract change needed per D-01 (backend continues to expect, and may now safely assume, a full session payload). |
| Collection diff-merge (PERSIST-03) | API / Backend | Database / Storage | `SessionRepository.UpsertAsync` owns the EF Core change-tracking and `RemoveRange`/add logic against `Character`/`Location`/`Encounter` navigation collections; this is squarely a data-access-layer responsibility, not a service- or DTO-layer one. |
| Save-failure indicator (PERSIST-04) | Browser / Client | — | Purely a UI-state concern — reading the existing `fetch` rejection in `db/index.js`'s `request()` and surfacing it via a new toast component/context field. No backend involvement. |
| Test coverage (D-04/D-05) | API / Backend | CI / Build | Backend-focused given the phase's bugs are backend; CI wiring is a build-pipeline concern (`.github/workflows/ci.yml`), a distinct tier from application code. |

## Package Legitimacy Audit

> This phase adds new NuGet packages (test project). **`gsd-tools query package-legitimacy check` does not support the `nuget` ecosystem** — verification below was performed manually against nuget.org (the authoritative registry) via direct page fetch, not the automated seam. Tag accordingly: `[CITED: nuget.org]`, not `[VERIFIED]` (the provenance rule requires an `OK` verdict from the automated seam for `[VERIFIED]`, which nuget cannot currently produce).

| Package | Registry | Notes | Verdict (manual) | Disposition |
|---------|----------|-------|-------------------|-------------|
| `xunit.v3` | nuget.org | v3.2.2 (2026-01-14); official xunit.net project, the current-generation successor to the now-deprecated `xunit` (v2) package — nuget.org shows `xunit` v2.9.3 marked "deprecated... legacy... no longer maintained" | OK — long-established publisher, high adoption, matches official xunit.net current guidance | Approved |
| `xunit.runner.visualstudio` | nuget.org | v3.1.5 (2025-09-27); VSTest adapter, required for `dotnet test` to discover/run xUnit v3 tests in CI | OK | Approved |
| `Microsoft.NET.Test.Sdk` | nuget.org | v18.7.0 (2026-06-23); official Microsoft package, required for any `dotnet test` project | OK | Approved |
| `coverlet.collector` | nuget.org | v10.0.1 (2026-05-18); standard code-coverage collector, targets net8.0+, compatible net10.0 | OK | Approved (optional — only needed if code-coverage reporting is wanted; not required to satisfy D-04/D-05, which only require tests to run and gate CI) |
| `Testcontainers.PostgreSql` | nuget.org | v4.13.0 (2026-07-02); official Testcontainers-for-.NET org package, explicit net10.0 compatibility listed, depends on `Testcontainers` core (>= same version) | OK | Approved — required for `Omphalos.IntegrationTests` per Standard Stack recommendation below |

**Packages removed due to `[SLOP]` verdict:** none
**Packages flagged as suspicious `[SUS]`:** none — all 5 are extremely well-established, high-download, officially-published packages in the .NET testing ecosystem; no realistic slopsquat risk. Manual nuget.org verification substitutes for the unsupported automated seam; no `checkpoint:human-verify` is warranted given the package identities (xunit.net, Microsoft, Testcontainers org) are unambiguous and long-standing.

*No new npm packages are required for PERSIST-04 — the toast component is hand-rolled Tailwind JSX per `01-UI-SPEC.md` ("Component library: none"), matching every other modal/overlay in `src/client/components`.*

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `xunit.v3` | 3.2.2 [CITED: nuget.org] | Test framework | Current-generation xUnit; the legacy `xunit` (v2) package is marked deprecated on nuget.org as of this research date. `xunit.v3` is what Microsoft's own xunit.net docs recommend pairing with `.NET 10`'s SDK-driven test tooling. |
| `xunit.runner.visualstudio` | 3.1.5 [CITED: nuget.org, xunit.net] | VSTest adapter so `dotnet test` (and CI) can discover/run tests | Confirmed via xunit.net's own "What NuGet packages should I use? [v3]" doc: `xunit.v3` + `xunit.runner.visualstudio` is the explicit recommended pair for `dotnet test`-driven CI. |
| `Microsoft.NET.Test.Sdk` | 18.7.0 [CITED: nuget.org] | MSBuild test-project targets, required by every `dotnet test` project regardless of framework | Standard, non-optional. |
| `Testcontainers.PostgreSql` | 4.13.0 [CITED: nuget.org] | Spins up a real, throwaway Postgres container per test run for `Omphalos.IntegrationTests` | See Architecture Patterns below — this is the recommendation that resolves the JSONB/Npgsql test-fidelity gap that EF Core's built-in test doubles (InMemory, SQLite) can't cover. Docker confirmed available locally (`docker --version` → 29.1.3, daemon running) and is preinstalled on GitHub Actions `ubuntu-latest` runners [CITED: docs.github.com — standard GitHub-hosted runner images ship Docker]. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `coverlet.collector` | 10.0.1 [CITED: nuget.org] | Code-coverage collection via `dotnet test --collect:"XPlat Code Coverage"` | Optional for this phase — D-04/D-05 only require tests to exist and run in CI, not a coverage report/gate. Add if you want a coverage artifact; skip if not asked for. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Testcontainers.PostgreSql for repository/integration tests | EF Core InMemory provider | Microsoft's own docs [CITED: learn.microsoft.com/ef/core/testing/testing-without-the-database] call this "strongly discouraged" for repository tests — no relational constraints, no transactions, and no confirmed handling of the Npgsql-specific `jsonb` column type / `JsonDocument` CLR mapping used by `PrepData`/`SessionLog`. Using it risks a false-positive test (passes against InMemory, still broken against real Postgres) for exactly the bug class this phase must catch. |
| Testcontainers.PostgreSql | SQLite in-memory | Microsoft's recommended *general* alternative to InMemory, and lighter-weight than Testcontainers (no Docker dependency, faster startup). But SQLite has no native concept of Postgres `jsonb`, and `GameSessionConfiguration.cs`'s `.HasColumnType("jsonb")` call is provider-unaware (applies regardless of which provider is active) — whether SQLite tolerates this and correctly round-trips `JsonDocument` is unconfirmed in the sources checked this session [LOW confidence — not verified by direct experiment]. Testcontainers avoids this uncertainty entirely by using the exact same Npgsql provider as production. If Docker is ever unavailable in a future CI environment, SQLite is the documented fallback, but expect to add an explicit `ValueConverter` for `JsonDocument` properties and treat jsonb-specific behavior as untested. |
| Split `Omphalos.UnitTests`/`Omphalos.IntegrationTests` | Single `Omphalos.Tests` project | A single project is simpler for a first test project, but mixing Testcontainers-backed (slow, Docker-dependent) tests with pure-logic (fast, no-dependency) tests in one project means every local `dotnet test` run pays the container-startup cost even when only checking diff-merge logic. The split also matches the explicit sibling-repo precedent cited in D-04 (quest-board's `QuestBoard.UnitTests`/`QuestBoard.IntegrationTests`). |

**Installation:**
```bash
dotnet new xunit3 -o src/Omphalos.UnitTests
dotnet new xunit3 -o src/Omphalos.IntegrationTests
dotnet add src/Omphalos.IntegrationTests package Testcontainers.PostgreSql --version 4.13.0
dotnet add src/Omphalos.IntegrationTests reference src/Omphalos.Repository
dotnet add src/Omphalos.IntegrationTests reference src/Omphalos.Domain
dotnet add src/Omphalos.UnitTests reference src/Omphalos.Repository
dotnet add src/Omphalos.UnitTests reference src/Omphalos.Domain
dotnet sln Omphalos.slnx add src/Omphalos.UnitTests/Omphalos.UnitTests.csproj
dotnet sln Omphalos.slnx add src/Omphalos.IntegrationTests/Omphalos.IntegrationTests.csproj
```

**Version verification:** All 5 package versions above were checked directly against their nuget.org package pages during this research session (2026-07-10) — not training-data recollection. `dotnet --version` on this machine reports `10.0.301`, matching the `net10.0` TFM already used by all 4 existing projects (`Omphalos.Domain.csproj`, `Omphalos.Repository.csproj`, `Omphalos.Services.csproj`, `Omphalos.Web.csproj`).

**Note on `dotnet new xunit3`:** the `xunit3` SDK template is provided by the `xunit.v3.templates` NuGet-installable dotnet tool (`dotnet new install xunit.v3.templates`), not built into the base `dotnet new` template set. If that template isn't installed in the execution environment, `dotnet new xunit` (the classic v2-flavored template) plus manually swapping the `xunit`/`xunit.v3` package reference is an equally valid path — the template choice is a scaffolding convenience, not a hard requirement. [MEDIUM confidence — confirmed via xunit.net docs, not independently executed in this session]

## Architecture Patterns

### System Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend call sites (4, all through dispatchWithPersist)                │
│  SessionPrep.jsx │ SessionLog.jsx │ TopBar.jsx │ Toolkit.jsx              │
│  BEFORE: dispatch({type:'UPDATE_SESSION', payload:{id, <field>}})        │
│  AFTER:  dispatch({type:'UPDATE_SESSION',                                │
│                     payload:{...activeSession, <field>: value}})         │
└───────────────────────────────┬───────────────────────────────────────────┘
                                 │ full session object
                                 ▼
                    dispatchWithPersist (AppContext.jsx:258)
                                 │ saveSession(action.payload)
                                 ▼
                    db.saveSession() → PUT /api/sessions/{id}  ───┐
                                 │ (fetch rejects on !res.ok)      │ on catch
                                 ▼                                 ▼
                    SessionService.UpsertAsync            AppContext dispatches
                                 │                          SAVE_FAILED (new)
                                 ▼                                 │
                    SessionRepository.UpsertAsync                 ▼
                    ┌───────────────────────────┐        SaveFailureToast.jsx
                    │ existing.PrepData = ...    │◄─ FIX 1 (PERSIST-01)   renders
                    │ (currently missing)        │
                    │                             │
                    │ diff-merge Characters by Id │◄─ FIX 2 (PERSIST-03)
                    │ diff-merge Locations by Id  │   (replaces RemoveRange
                    │ diff-merge Encounters by Id │    + full reassign)
                    └───────────────┬─────────────┘
                                    ▼
                         Postgres (jsonb columns for
                         PrepData/SessionLog; relational
                         rows for Characters/Locations/
                         Encounters)
```

### Recommended Project Structure

```
src/
├── Omphalos.Domain/           # unchanged
├── Omphalos.Repository/       # UpsertAsync fixed in place; optional new
│                               # CollectionSync<T,TKey> helper if extracted
├── Omphalos.Services/         # unchanged
├── Omphalos.Web/              # unchanged
├── Omphalos.UnitTests/        # NEW — no DB, no Docker; tests pure logic
│   └── SessionRepositoryDiffMergeTests.cs   # if diff-merge is extracted
│                                              # to a pure helper, test it here
├── Omphalos.IntegrationTests/ # NEW — Testcontainers.PostgreSql-backed
│   ├── PostgresFixture.cs      # ICollectionFixture: starts 1 container,
│   │                            # shared across the test class/collection
│   └── SessionRepositoryTests.cs
│       # - PrepData persists across two UpsertAsync calls (PERSIST-01)
│       # - Character/Location/Encounter add/update/remove (PERSIST-03)
└── client/
    ├── components/
    │   └── SaveFailureToast.jsx   # NEW — per 01-UI-SPEC.md, hand-rolled
    │                                # Tailwind, no component library
    ├── context/AppContext.jsx     # + saveError state field, + SAVE_FAILED
    │                                # action, dispatched from saveSession's
    │                                # existing .catch()
    └── db/index.js                # unchanged — request() already throws;
                                     # no new plumbing needed there
```

### Pattern 1: Diff-merge a tracked EF Core navigation collection by key

**What:** Reconcile an incoming list of child DTOs against an already-`.Include()`d tracked collection, using each entity's string `Id` as the reconciliation key — updating in place, adding new, removing missing — instead of `RemoveRange` + full reassignment.
**When to use:** Any `UpsertAsync`-style method updating a parent aggregate with owned/FK-linked child collections where children have stable client- or server-assigned IDs.
**Example:**
```csharp
// Source: hand-written pattern, synthesized from Microsoft's repository-pattern
// testing docs + community consensus on dotnet/efcore#26830 and #9312
// (no first-party EF Core "sync collection" API exists as of EF Core 10)
private static void SyncCharacters(GameSession existing, GameSession incoming, OmphalosDbContext db)
{
    var incomingById = incoming.Characters.ToDictionary(c => c.Id);
    var existingById = existing.Characters.ToDictionary(c => c.Id);

    // Remove: existing rows not present in the incoming payload
    foreach (var stale in existing.Characters.Where(c => !incomingById.ContainsKey(c.Id)).ToList())
    {
        existing.Characters.Remove(stale);
        db.Characters.Remove(stale);
    }

    // Update: existing rows present in the incoming payload — copy fields onto the tracked entity
    foreach (var current in existing.Characters)
    {
        if (!incomingById.TryGetValue(current.Id, out var updated)) continue;
        // field-by-field copy (mirrors the existing SessionService mapping style —
        // CONCERNS.md already flags this hand-rolled mapping style as fragile;
        // not resolving that broader concern is in scope for a future phase, not this one)
        current.Name = updated.Name;
        current.PortraitBase64 = updated.PortraitBase64;
        // ...remaining Character fields
    }

    // Add: incoming rows not present in existing
    foreach (var added in incoming.Characters.Where(c => !existingById.ContainsKey(c.Id)))
    {
        existing.Characters.Add(added);
    }
}
```
Apply the same shape for `Locations` and `Encounters`. Whether this is 3 near-identical private methods inside `SessionRepository`, or a single generic `SyncCollection<TEntity, TKey>(ICollection<TEntity> existing, ICollection<TEntity> incoming, Func<TEntity,TKey> keySelector, Action<TEntity,TEntity> copyFields, DbSet<TEntity> dbSet)` helper, is Claude's discretion per `01-CONTEXT.md` — a generic helper is more testable in isolation (`Omphalos.UnitTests`, no DB needed) but adds one layer of indirection; 3 explicit methods are more readable but slightly more duplicated. Given this phase explicitly wants both `Omphalos.UnitTests` (fast, no-DB tests) to exist and be meaningful, extracting a pure, DB-agnostic sync function that operates on in-memory lists (not EF-tracked collections) and returns `(toAdd, toUpdate, toRemove)` tuples is the more testable shape — it can be exercised with plain object lists in `Omphalos.UnitTests` without touching EF Core or a database at all, while the thin EF-specific glue (actually calling `db.Characters.Remove`/`.Add`) stays in the repository and is covered by the `Omphalos.IntegrationTests` Testcontainers tests.

### Pattern 2: Testcontainers.PostgreSql fixture shared across a test class

**What:** Start one Postgres container per test collection (not per test) to keep integration test suite runtime reasonable.
**When to use:** `Omphalos.IntegrationTests`.
**Example:**
```csharp
// Source: pattern synthesized from Microsoft Learn's ASP.NET Core integration
// testing docs + Testcontainers.PostgreSql official usage (nuget.org package
// description); xUnit's ICollectionFixture is the standard sharing mechanism
public class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder()
        .WithImage("postgres:17")   // matches docker-compose.yml's Postgres 17
        .Build();

    public string ConnectionString => _container.GetConnectionString();

    public async ValueTask InitializeAsync()
    {
        await _container.StartAsync();
        await using var db = new OmphalosDbContext(
            new DbContextOptionsBuilder<OmphalosDbContext>()
                .UseNpgsql(ConnectionString).Options);
        await db.Database.MigrateAsync(); // reuse existing EF Core migrations
    }

    public async ValueTask DisposeAsync() => await _container.DisposeAsync();
}

[CollectionDefinition("Postgres")]
public class PostgresCollection : ICollectionFixture<PostgresFixture> { }
```
Using `postgres:17` mirrors `docker-compose.yml`'s already-pinned Postgres version, and `db.Database.MigrateAsync()` reuses the project's real EF Core migrations rather than `EnsureCreated()` — this means the integration tests also implicitly verify the migrations themselves apply cleanly, catching a class of bug `EnsureCreated()`-based setups would miss.

### Pattern 3: Save-failure state as a field on the existing reducer, not a new store

**What:** Add a `saveError: string | null` field to `AppContext.jsx`'s existing `initial` state and reducer, with a new `SAVE_FAILED` / `CLEAR_SAVE_ERROR` action pair, rather than introducing Context-per-feature or a toast library.
**When to use:** This exact situation — a single new piece of UI state in an app that already centralizes all state in one `useReducer`.
**Example:**
```javascript
// AppContext.jsx — additive changes only, matches existing reducer style
const initial = {
  // ...existing fields
  saveError: null,
}

function reducer(state, action) {
  switch (action.type) {
    // ...existing cases
    case 'SAVE_FAILED':
      return { ...state, saveError: action.payload }
    case 'CLEAR_SAVE_ERROR':
      return { ...state, saveError: null }
    // ...
  }
}

// saveSession's existing .catch() gains one line:
const saveSession = useCallback((session) => {
  db.saveSession(session).catch(() => dispatch({ type: 'SAVE_FAILED', payload: true }))
}, [])
```
`SaveFailureToast.jsx` then reads `state.saveError` via `useApp()` and calls `dispatch({ type: 'CLEAR_SAVE_ERROR' })` on its `×` click, exactly matching every other component's existing `useApp()`-based read/dispatch pattern — no new Context provider, no prop drilling, no external toast library. This directly satisfies `01-UI-SPEC.md`'s "no auto-dismiss, dismiss via × only" contract, since nothing else clears `saveError` automatically. Per the UI-SPEC's "Multiple failures" rule (replace, don't stack), this single boolean/string field naturally collapses multiple failures into one visible toast — no list/queue needed.

**Important:** the internal `dispatch` used inside `saveSession`/`AppContext`'s own `useEffect`s (e.g. line 228, 239-240, 248) is the *raw* reducer `dispatch` from `useReducer`, not the exported `dispatchWithPersist` — using the raw `dispatch` for `SAVE_FAILED` is correct and required (dispatching `SAVE_FAILED` through `dispatchWithPersist` would incorrectly attempt to route it through the `switch` in `dispatchWithPersist`, which has no case for it and would silently no-op the persist step, which is harmless here but semantically wrong — call the raw `dispatch`).

### Anti-Patterns to Avoid

- **Reintroducing partial `UPDATE_SESSION` payloads for any *new* call site:** Now that `SessionRepository.UpsertAsync` is unconditional-overwrite (unchanged behavior — D-01 explicitly keeps the backend contract as "expects a full payload," it doesn't add merge logic), any future `dispatch({type:'UPDATE_SESSION', payload: {id, ...partial}})` reintroduces exactly this phase's bug. This is worth a code comment at the `UPDATE_SESSION` case in `AppContext.jsx`'s reducer, since nothing in the type system currently prevents it (`payload` is untyped JS).
- **Using `context.SaveChangesAsync()` cascade-delete semantics as a substitute for explicit diffing:** `GameSessionConfiguration.cs` already sets `OnDelete(DeleteBehavior.Cascade)` for all 3 child collections — this cascades from *session* deletion, not from collection-item removal. Don't rely on cascade behavior to handle the "removed from incoming payload" case; it doesn't apply here, explicit removal (`db.Characters.Remove(stale)` / `RemoveRange` on the diffed-out subset only) is required.
- **Testing `PrepData`/`SessionLog` round-tripping against EF Core InMemory:** confirmed [CITED: learn.microsoft.com] to be explicitly discouraged by Microsoft for repository tests generally, and additionally does not exercise the Npgsql-specific `jsonb` mapping this phase's core bug lives in — a passing InMemory test does not prove the Postgres-facing bug is fixed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Spinning up a disposable Postgres for integration tests | A custom Docker Compose–based test harness / manual `docker run` in a CI step | `Testcontainers.PostgreSql` (4.13.0) | Handles container lifecycle, port mapping, readiness polling, and connection-string construction; hand-rolling this in bash/CI YAML duplicates a well-maintained, .NET-native library with first-class xUnit fixture integration. |
| Toast/notification queueing | A generic toast-stack library (react-toastify, react-hot-toast, etc.) | The single `saveError` field pattern above | `01-UI-SPEC.md` explicitly rules out stacking (single toast, replace-on-new-failure) and rules out a component library ("Tool: none" — matches all 15 existing modals). A full toast library is the wrong tool for a single-purpose, single-instance indicator. |
| EF Core collection sync | A generic NuGet "entity graph diff" package (none are well-maintained/standard in this space) | The hand-written by-ID diff pattern above | No widely-adopted, actively-maintained library solves this narrowly-enough-scoped problem better than ~20 lines of hand-written diffing per collection; pulling in a graph-diffing library for 3 simple by-ID collections is disproportionate. |

**Key insight:** Both backend bugs in this phase are simple enough (missing field assignment; missing diff logic) that "don't hand-roll" mostly points *away* from unnecessary abstraction, not toward it — the EF Core ecosystem genuinely has no first-party or well-adopted third-party solution for "sync child collection by key," so hand-writing it, kept small and testable, is the correct call here.

## Common Pitfalls

### Pitfall 1: Testing PERSIST-01/03 against a fake database provider that doesn't share production's JSONB/Npgsql behavior
**What goes wrong:** A test suite built on EF Core InMemory or unconfigured SQLite passes green while the actual bug (or a variant of it) remains present against real Postgres, because the fake provider doesn't apply the same `jsonb` column type mapping, doesn't enforce the same FK/cascade semantics, or silently accepts a `JsonDocument` write/read that would behave differently under Npgsql's actual JSON serialization path.
**Why it happens:** InMemory and SQLite are convenient (no Docker, instant startup) and "just work" for simple relational data, masking the fact that `PrepData`/`SessionLog` are provider-specific JSONB columns, not plain relational columns.
**How to avoid:** Use `Testcontainers.PostgreSql` for any test that exercises `SessionRepository.UpsertAsync`'s `PrepData` or collection-diff behavior (see Standard Stack/Architecture Patterns above). Reserve InMemory/SQLite (if used at all) for `Omphalos.UnitTests` logic that has been extracted to not touch EF Core/`DbContext` directly.
**Warning signs:** A "PrepData persists" test passes without ever spinning up Docker or connecting to a real Postgres.

### Pitfall 2: Forgetting the `dirtySessionRef` timing contract when touching `dispatchWithPersist`
**What goes wrong:** Sub-resource saves (Character/Location/Encounter add/update/delete) rely on `dirtySessionRef.current = action.sessionId` + a `useEffect` keyed on `state.sessions` to flush the *post-render* state, specifically to avoid persisting a stale pre-mutation snapshot (`AppContext.jsx:243-250`, documented in `CONCERNS.md` as a past regression, commit `444c048`). PERSIST-02's fix touches the *same* `dispatchWithPersist` function (just a different `switch` case, `UPDATE_SESSION`, not the sub-resource cases) — it's easy to accidentally "simplify" by making `UPDATE_SESSION` also flow through `dirtySessionRef` instead of its current synchronous `saveSession(action.payload)` call, which would change its timing semantics.
**Why it happens:** Both paths live in the same function and look superficially similar once payloads are fixed to be "the full session either way."
**How to avoid:** Do not change `dispatchWithPersist`'s branching structure — `UPDATE_SESSION` should keep calling `saveSession(action.payload)` synchronously (now with a full payload, per D-01), *not* be rerouted through `dirtySessionRef`. The reducer's `UPDATE_SESSION` case (`AppContext.jsx:55-63`) already merges the full payload into state synchronously in the same tick, so there is no stale-snapshot risk for this path the way there is for sub-resource mutations — leave the existing branching alone.
**Warning signs:** A diff to this phase that touches `dispatchWithPersist`'s control flow (not just the 4 call sites' payload construction) beyond adding the new `SAVE_FAILED` catch-branch.

### Pitfall 3: `SessionLog.jsx`'s `updateLog`/`updateNotes`/`updateMeta` each independently building `{ ...activeSession, field: value }` from a possibly-stale closure
**What goes wrong:** `SessionLog.jsx` destructures `const session = activeSession` once per render and calls 3 separate dispatch-triggering functions (`updateLog`, `updateNotes`, `updateMeta`) from different UI elements. If two of these fire in rapid succession within the same render cycle (e.g. a fast double-edit), the second dispatch could spread a `session` object that doesn't yet reflect the first dispatch's reducer update, because React state updates from the first dispatch haven't re-rendered yet.
**Why it happens:** `UPDATE_SESSION`'s reducer case is synchronous and fast, but `activeSession` is derived once per render (`AppContext.jsx:284`) — rapid sequential dispatches within the same tick (not awaiting a render in between) is a narrower race than the sub-resource case, but not impossible for very fast typing across multiple fields simultaneously (e.g. metadata inputs).
**How to avoid:** This is an existing, low-severity risk shared by all 4 fixed call sites and is not unique to this phase's fix — spreading `{ ...activeSession, field: value }` is still strictly better than the current unconditional-wipe bug, and matches the pattern `ARCHITECTURE.md` already prescribes. Flagging it here so it's not mistaken for a *new* bug introduced by the fix; it is a pre-existing, much less severe edge case that this phase does not need to additionally solve (no CONTEXT.md decision calls for solving it, and D-06 already scopes debouncing/rapid-edit races out of this phase).
**Warning signs:** None expected in normal DM usage (this requires firing 2+ distinct `UPDATE_SESSION` dispatches within the same React batch, which single-field text inputs don't naturally do).

## Code Examples

### Fix 1 — `SessionRepository.UpsertAsync`: PrepData assignment + collection diff-merge (PERSIST-01, PERSIST-03)
```csharp
// Source: hand-written fix based on direct inspection of
// src/Omphalos.Repository/Repositories/SessionRepository.cs:27-58 (this session)
public async Task<GameSession> UpsertAsync(GameSession session, CancellationToken ct = default)
{
    var existing = await db.GameSessions
        .Include(s => s.Characters)
        .Include(s => s.Locations)
        .Include(s => s.Encounters)
        .FirstOrDefaultAsync(s => s.Id == session.Id && s.UserId == session.UserId, ct);

    if (existing is null)
    {
        db.GameSessions.Add(session);
    }
    else
    {
        existing.Title = session.Title;
        existing.DateModified = session.DateModified;
        existing.SessionLog = session.SessionLog;
        existing.SessionNotes = session.SessionNotes;
        existing.PrepData = session.PrepData;      // FIX: was missing entirely (PERSIST-01)
        existing.Metadata = session.Metadata;

        SyncCollection(existing.Characters, session.Characters, c => c.Id, db.Characters, CopyCharacterFields);
        SyncCollection(existing.Locations, session.Locations, l => l.Id, db.Locations, CopyLocationFields);
        SyncCollection(existing.Encounters, session.Encounters, e => e.Id, db.Encounters, CopyEncounterFields);
    }

    await db.SaveChangesAsync(ct);
    return existing ?? session;
}
```

### Fix 2 — 4 frontend call sites: full-payload `UPDATE_SESSION` dispatches (PERSIST-02)
```javascript
// Source: hand-written fix based on direct inspection of the 4 call sites (this session)

// SessionPrep.jsx:26-28 — before → after
function updatePrep(newPrep) {
  dispatch({ type: 'UPDATE_SESSION', payload: { ...activeSession, prepData: newPrep } })
}

// SessionLog.jsx:41-63 — before → after (all 3 functions in this file)
function updateLog(json) {
  dispatch({ type: 'UPDATE_SESSION', payload: { ...session, sessionLog: json } })
}
function updateNotes(e) {
  dispatch({ type: 'UPDATE_SESSION', payload: { ...session, sessionNotes: e.target.value } })
}
function updateMeta(key, value) {
  dispatch({ type: 'UPDATE_SESSION', payload: { ...session, metadata: { ...meta, [key]: value } } })
}

// TopBar.jsx:9-16 — before → after
function handleTitleChange(e) {
  if (activeSession) {
    dispatch({ type: 'UPDATE_SESSION', payload: { ...activeSession, title: e.target.value } })
  }
}

// Toolkit.jsx:100-111 (SaveBtn) — before → after
dispatch({
  type: 'UPDATE_SESSION',
  payload: { ...activeSession, sessionNotes: (activeSession.sessionNotes ? activeSession.sessionNotes + '\n' : '') + line },
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| `xunit` (v2) as the default test package for new .NET projects | `xunit.v3` as the current-generation package, paired with `xunit.runner.visualstudio` for `dotnet test`/CI | nuget.org marks `xunit` (v2.9.3) "deprecated... legacy" as of this research date; xunit.net's own docs now default new-project guidance to v3 | New test projects for this phase should target `xunit.v3`, not the legacy `xunit` package, even though most existing tutorials/StackOverflow content (including some of the training-knowledge baseline) still shows v2-style `xunit` package references. |
| EF Core InMemory provider as "the" default test double | SQLite in-memory as Microsoft's recommended default, with InMemory explicitly discouraged | Documented on the current (2026-06-24-updated) `learn.microsoft.com/ef/core/testing/testing-without-the-database` page | Confirms this phase should not default to InMemory for repository tests; further narrowed to Testcontainers-Postgres specifically because of the Npgsql `jsonb` mapping (see Alternatives Considered above — this narrowing is this research's own reasoning, not an explicit Microsoft recommendation). |

**Deprecated/outdated:**
- `xunit` (v2, plain package name): nuget.org explicitly labels it deprecated/legacy; use `xunit.v3` for new projects.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | GitHub Actions `ubuntu-latest` runners have Docker preinstalled and available without extra setup steps | Standard Stack (Testcontainers row) | If wrong, the `Omphalos.IntegrationTests` CI step would fail outright; this is well-established, widely-documented GitHub Actions behavior, but wasn't independently re-verified by fetching GitHub's runner-image docs in this session — verify via GitHub's own `actions/runner-images` docs or a canary CI run if uncertain. |
| A2 | SQLite in-memory does not cleanly support Npgsql's `jsonb` column type or `JsonDocument` CLR mapping without extra `ValueConverter` configuration | Alternatives Considered | If actually supported out-of-the-box, SQLite would be a lighter-weight (no Docker) alternative to Testcontainers for `Omphalos.IntegrationTests`; this claim was not verified by direct experiment in this session, only inferred from the provider-agnostic nature of `.HasColumnType("jsonb")` in `GameSessionConfiguration.cs` plus the absence of any confirming source. Low risk either way — Testcontainers is strictly higher-fidelity regardless, this assumption only affects whether a lighter-weight alternative was wrongly dismissed. |
| A3 | `dotnet new xunit3` template is available in the execution environment used by whoever plans/executes this phase | Standard Stack | If the `xunit.v3.templates` dotnet tool isn't installed, `dotnet new xunit3` will fail; fallback is `dotnet new xunit` (v2 template) + manual package-reference edit to `xunit.v3`, noted inline in Standard Stack. Low risk — either path reaches the same end state. |
| A4 | Quest-board's actual `QuestBoard.UnitTests`/`QuestBoard.IntegrationTests` structure uses the same Unit/Integration split reasoning (fast-no-DB vs. Testcontainers) recommended here | Standard Stack / Alternatives Considered | quest-board repo was not accessible in this research session (different repo, not checked out locally) — the naming convention is taken as given per `01-CONTEXT.md`'s D-04, but the *reasoning* for splitting (Testcontainers-Postgres fidelity) is this research's own derivation, not confirmed to match quest-board's actual internal test strategy. If quest-board uses a different DB test-double strategy, that's not a correctness risk for Omphalos (this research's reasoning stands on its own merits), only a naming-convention-only match rather than a full strategy match. |

## Open Questions

1. **Should the diff-merge helper be a single generic `SyncCollection<TEntity,TKey>` or 3 explicit per-entity methods?**
   - What we know: No functional difference; `01-CONTEXT.md` explicitly leaves this to Claude's discretion.
   - What's unclear: Whether the planner wants the generic version (more testable in isolation, one extra layer of indirection) or 3 explicit versions (more readable, some duplication) — see Pattern 1 in Architecture Patterns for the reasoning favoring extracting a DB-agnostic pure diff function either way.
   - Recommendation: Extract a pure, DB-agnostic diff function (operating on plain lists, returning add/update/remove sets) regardless of whether the EF-specific glue is 1 generic method or 3 explicit ones — this maximizes what `Omphalos.UnitTests` can cover without touching EF Core/Testcontainers at all.

2. **Does `Omphalos.IntegrationTests` need to run in the *same* CI job as `dotnet build`, or a separate job?**
   - What we know: `ci.yml` currently has 2 parallel jobs (`build-dotnet`, `build-frontend`); Docker is available on `ubuntu-latest`.
   - What's unclear: Whether adding `dotnet test` to the existing `build-dotnet` job (simpler, one job) or a new dedicated job (clearer separation, parallelizable with `build-frontend`) is preferred — no CONTEXT.md decision addresses this, and it has no correctness impact, only CI runtime/clarity tradeoffs.
   - Recommendation: Add `dotnet test` as an additional step in the existing `build-dotnet` job, after the `Build` step — simplest change, matches D-05's framing ("add a test-run step"), doesn't require restructuring the workflow file's job topology.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| .NET SDK | All backend work, tests | ✓ | 10.0.301 | — |
| Docker | `Omphalos.IntegrationTests` (Testcontainers.PostgreSql), local dev | ✓ (daemon running) | 29.1.3 | If unavailable in some future environment: SQLite in-memory (see Alternatives Considered — accept reduced JSONB-path fidelity) |
| Node.js / npm | Frontend build, no new deps needed for PERSIST-04 | ✓ | Node v22.16.0 / npm 11.6.2 | — |
| GitHub Actions `ubuntu-latest` Docker availability | CI-run `Omphalos.IntegrationTests` | Assumed ✓ [ASSUMED — see A1] | — | — |

**Missing dependencies with no fallback:** none identified.
**Missing dependencies with fallback:** none currently missing — Docker fallback (SQLite) documented above in case a future environment lacks Docker.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | xUnit v3 (`xunit.v3` 3.2.2 + `xunit.runner.visualstudio` 3.1.5) — **new, Wave 0 setup required, zero test infrastructure exists today** |
| Config file | none yet — `Omphalos.slnx` currently references only the 4 app projects; new `.csproj` files needed for `Omphalos.UnitTests`/`Omphalos.IntegrationTests` |
| Quick run command | `dotnet test src/Omphalos.UnitTests` (no Docker dependency, fast) |
| Full suite command | `dotnet test` (solution-level — runs both `Omphalos.UnitTests` and `Omphalos.IntegrationTests`; the latter requires Docker) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|-------------|
| PERSIST-01 | `PrepData` persists across two `UpsertAsync` calls (insert then update) | integration | `dotnet test src/Omphalos.IntegrationTests --filter FullyQualifiedName~PrepDataPersistsOnUpdate` | ❌ Wave 0 |
| PERSIST-02 | Frontend call sites send full-session payloads (not directly unit-testable without a frontend test harness, which doesn't exist and isn't requested) | manual-only | N/A — verify via manual reload check per phase Success Criteria #2/#3 | manual-only, justified: no frontend test runner (Vitest/Jest) exists in this repo and adding one is out of scope for this phase (not in D-04/D-05, which scope test infra to the *backend* only) |
| PERSIST-03 | Character/Location/Encounter add/update/remove reconciled correctly across two `UpsertAsync` calls | integration | `dotnet test src/Omphalos.IntegrationTests --filter FullyQualifiedName~CollectionDiffMerge` | ❌ Wave 0 |
| PERSIST-03 (pure logic, if extracted) | Diff function correctly classifies add/update/remove sets from two plain lists | unit | `dotnet test src/Omphalos.UnitTests --filter FullyQualifiedName~SyncCollection` | ❌ Wave 0 |
| PERSIST-04 | Save-failure toast appears when `db.saveSession()` rejects, dismissible via × | manual-only | N/A — verify via manual UAT (simulate a failed save, e.g. stop the API container mid-edit) | manual-only, justified: same reasoning as PERSIST-02 — no frontend test runner in this repo |

### Sampling Rate

- **Per task commit:** `dotnet test src/Omphalos.UnitTests` (fast, no Docker required — run after every backend logic change)
- **Per wave merge:** `dotnet test` (full suite, including Testcontainers-backed integration tests)
- **Phase gate:** Full suite green before `/gsd-verify-work`, plus the 2 manual-only UAT checks above (PERSIST-02 full reload check, PERSIST-04 simulated-failure check)

### Wave 0 Gaps

- [ ] `src/Omphalos.UnitTests/Omphalos.UnitTests.csproj` — new project, no DB dependency
- [ ] `src/Omphalos.IntegrationTests/Omphalos.IntegrationTests.csproj` — new project, `Testcontainers.PostgreSql` reference
- [ ] `src/Omphalos.IntegrationTests/PostgresFixture.cs` — shared container fixture (see Architecture Patterns, Pattern 2)
- [ ] Both new projects added to `Omphalos.slnx`
- [ ] `.github/workflows/ci.yml` — `dotnet test` step added to `build-dotnet` job
- [ ] Framework install: `dotnet new xunit3 -o src/Omphalos.UnitTests` (or `dotnet new xunit` + package-reference edit, see Standard Stack note)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|--------------------|
| V2 Authentication | No | Phase does not touch auth; `SessionRepository.UpsertAsync` already scopes all queries by `UserId` (`s.UserId == session.UserId`), unchanged by this phase's fixes. |
| V3 Session Management | No | Not touched — "session" here means DM game-session data, not auth session/JWT. |
| V4 Access Control | Marginal — verify, don't newly implement | The diff-merge fix (PERSIST-03) must preserve the existing implicit access-control invariant: a `Character`/`Location`/`Encounter` `Id` collision across two different users' sessions must not let one user's diff-merge logic touch another user's rows. This is already guarded structurally (`existing` is loaded scoped to `session.Id && session.UserId`, and children are loaded via `.Include()` off that scoped parent — an incoming child ID that doesn't belong to *this* session's existing children is always treated as "add new," never as "update someone else's row"), but the diff-merge implementation must not introduce a global (cross-session) lookup by child `Id` alone. |
| V5 Input Validation | Yes, pre-existing gap, not newly introduced | `CONCERNS.md` already documents "No server-side request validation" as a standing gap (no `[Required]`/FluentValidation anywhere in `Omphalos.Domain/DTOs`). This phase does not need to add general request validation (out of scope, not in PERSIST-01..04), but the diff-merge logic should not crash/500 on a null or empty `Characters`/`Locations`/`Encounters` list in the incoming payload — `SessionService.MapToEntity` already defensively does `(r.Characters ?? [])`, so this is already handled upstream of the repository. |
| V6 Cryptography | No | Not touched by this phase. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Cross-user data leakage via child-entity ID reuse in diff-merge | Tampering / Elevation of Privilege | Confirmed already mitigated structurally (see V4 row above) — the diff-merge fix must preserve, not weaken, the `existing.Characters`/`Locations`/`Encounters` scoping that flows from the session-scoped `.Include()` query in `UpsertAsync`. No new endpoint or query surface is introduced by this phase. |
| Save-failure toast leaking internal error detail to the DM | Information Disclosure | `01-UI-SPEC.md` already specifies fixed copy ("Your last change wasn't saved. Edit again to retry, or check your connection.") rather than echoing the raw `Error` message/stack from `db/index.js`'s `request()` — this is already the correct, safe design per the approved UI-SPEC; do not "improve" it by surfacing raw exception text. |

## Sources

### Primary (HIGH confidence)
- Direct code inspection this session: `src/Omphalos.Repository/Repositories/SessionRepository.cs`, `src/Omphalos.Repository/Configurations/GameSessionConfiguration.cs`, `src/Omphalos.Domain/Entities/GameSession.cs`, `Character.cs`, `Location.cs`, `Encounter.cs`, `src/Omphalos.Domain/DTOs/SessionDtos.cs`, `src/Omphalos.Services/Implementations/SessionService.cs`, `src/Omphalos.Domain/Interfaces/ISessionRepository.cs`, `src/client/context/AppContext.jsx`, `src/client/db/index.js`, `src/client/components/tabs/SessionPrep.jsx`, `SessionLog.jsx`, `Toolkit.jsx`, `src/client/components/TopBar.jsx`, `.github/workflows/ci.yml`, `Omphalos.slnx`, all 4 `.csproj` files, `package.json`, `src/client/index.css`
- `.planning/research/ARCHITECTURE.md` — prior project-level research with exact file:line citations for both confirmed bugs
- `.planning/codebase/CONCERNS.md` — documents the delete/reinsert pattern's suggested fix approach and the zero-test-coverage state
- `.planning/phases/01-session-persistence-reliability/01-UI-SPEC.md` — approved-pending design contract for `SaveFailureToast.jsx`
- `docker --version` / `docker info`, `dotnet --version`, `node --version`, `npm --version` — run directly this session

### Secondary (MEDIUM confidence)
- learn.microsoft.com/aspnet/core/fundamentals/minimal-apis/test-min-api (aspnetcore-10.0 moniker, updated 2025-09-15) — fetched directly this session [CITED]
- learn.microsoft.com/ef/core/testing/testing-without-the-database (updated 2026-06-24) — fetched directly this session [CITED]
- xunit.net/docs/getting-started/v3/getting-started and xunit.net/docs/nuget-packages-v3 — fetched directly this session [CITED]
- nuget.org package pages for `xunit.v3`, `xunit`, `Microsoft.NET.Test.Sdk`, `coverlet.collector`, `xunit.runner.visualstudio`, `Testcontainers.PostgreSql` — fetched directly this session [CITED]

### Tertiary (LOW confidence)
- WebSearch results (not followed to a primary source) on: EF Core child-collection diff patterns (dotnet/efcore issues #26830, #9312 — referenced via search snippet, not directly fetched), GitHub Actions dotnet-test-coverage patterns, React toast/context patterns — all [ASSUMED]/LOW confidence, standard/uncontroversial patterns but not independently verified against a single authoritative source this session

## Metadata

**Confidence breakdown:**
- Standard stack (test packages): MEDIUM — versions verified directly against nuget.org this session, but package *choice* (xUnit v3 vs sticking with v2, Testcontainers vs SQLite) required synthesis across multiple sources rather than one canonical recommendation
- Architecture (diff-merge pattern, toast wiring): MEDIUM — no first-party EF Core API exists for collection sync (confirmed absence, not confirmed presence of one correct pattern); toast wiring is straightforward given `01-UI-SPEC.md` already locks the visual contract
- Pitfalls: HIGH for Pitfalls 1-2 (directly grounded in code read this session + `CONCERNS.md`'s documented past regression), MEDIUM for Pitfall 3 (reasoned from code, not independently reproduced)
- The two root-caused bugs themselves (PERSIST-01, PERSIST-02): HIGH — already directly verified via code inspection in this session and in the prior `ARCHITECTURE.md` research pass, not inferred

**Research date:** 2026-07-10
**Valid until:** 2026-08-09 (30 days — stable domain: internal codebase bugs plus mainstream .NET/EF Core tooling, not a fast-moving ecosystem; re-verify nuget package versions if planning is delayed materially past this window since coverlet/Testcontainers/Test.Sdk ship frequently)
