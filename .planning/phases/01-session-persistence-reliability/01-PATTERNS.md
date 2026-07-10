# Phase 1: Session Persistence Reliability - Pattern Map

**Mapped:** 2026-07-10
**Files analyzed:** 12 (2 modified existing + 4 frontend call-site fixes + 1 new component + 5 new test/CI infra files)
**Analogs found:** 10 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/Omphalos.Repository/Repositories/SessionRepository.cs` (modify) | repository | CRUD | itself (in-place fix) | exact — self-modification |
| `src/client/components/tabs/SessionPrep.jsx` (modify) | component | request-response | `src/client/context/AppContext.jsx` sub-resource dispatch pattern | role-match |
| `src/client/components/tabs/SessionLog.jsx` (modify) | component | request-response | same as above | role-match |
| `src/client/components/TopBar.jsx` (modify) | component | request-response | same as above | role-match |
| `src/client/components/tabs/Toolkit.jsx` (modify) | component | request-response | same as above | role-match |
| `src/client/context/AppContext.jsx` (modify — add `saveError`/`SAVE_FAILED`) | store/provider | event-driven | itself (in-place addition) | exact — self-modification |
| `src/client/components/SaveFailureToast.jsx` (new) | component | event-driven | `src/client/components/SettingsModal.jsx` (overlay/dismiss chrome) + `src/client/index.css` `.fade-in` | role-match |
| `src/Omphalos.UnitTests/*.csproj` + `SyncCollectionTests.cs` (new) | test | transform | `src/Omphalos.Repository/Repositories/SessionRepository.cs` (logic under test) + sibling repo convention (no local analog) | no analog (new infra) |
| `src/Omphalos.IntegrationTests/*.csproj` + `PostgresFixture.cs` + `SessionRepositoryTests.cs` (new) | test | CRUD | `src/Omphalos.Repository/OmphalosDbContext.cs` (DbContext under test) | no analog (new infra) |
| `.github/workflows/ci.yml` (modify — add `dotnet test` step) | config | batch | itself (in-place addition) | exact — self-modification |
| `Omphalos.slnx` (modify — add 2 new projects) | config | batch | itself (in-place addition) | exact — self-modification |

## Pattern Assignments

### `src/Omphalos.Repository/Repositories/SessionRepository.cs` (repository, CRUD)

**Analog:** itself — full file already read (68 lines, in-place fix, no external analog needed since the fix is scoped entirely to this one method).

**Current buggy code** (lines 27-58):
```csharp
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
        existing.Metadata = session.Metadata;
        // BUG (PERSIST-01): existing.PrepData is never assigned here

        // BUG (PERSIST-03): unconditional delete + full reassignment on every save
        db.Characters.RemoveRange(existing.Characters);
        db.Locations.RemoveRange(existing.Locations);
        db.Encounters.RemoveRange(existing.Encounters);

        existing.Characters = session.Characters;
        existing.Locations = session.Locations;
        existing.Encounters = session.Encounters;
    }

    await db.SaveChangesAsync(ct);
    return existing ?? session;
}
```

**Fix pattern** (from RESEARCH.md Code Examples, validated against actual entity shapes in `GameSession.cs`/`Character.cs`/`Location.cs`/`Encounter.cs`):
```csharp
existing.PrepData = session.PrepData;      // FIX PERSIST-01: was missing entirely

SyncCollection(existing.Characters, session.Characters, c => c.Id, db.Characters, CopyCharacterFields);
SyncCollection(existing.Locations, session.Locations, l => l.Id, db.Locations, CopyLocationFields);
SyncCollection(existing.Encounters, session.Encounters, e => e.Id, db.Encounters, CopyEncounterFields);
```
Constructor param is `OmphalosDbContext db` via primary constructor (`class SessionRepository(OmphalosDbContext db) : ISessionRepository`, line 7) — any new private helper methods (`SyncCollection`, `CopyCharacterFields`, etc.) go in this same class, using the same `db` field reference already in scope. No new imports needed beyond what's already present (`Microsoft.EntityFrameworkCore`, `Omphalos.Domain.Entities`, `Omphalos.Domain.Interfaces`).

**Existing scoping invariant to preserve** (line 33): `FirstOrDefaultAsync(s => s.Id == session.Id && s.UserId == session.UserId, ct)` — the diff-merge must operate only on `existing.Characters/Locations/Encounters` already loaded off this user-scoped query; do not add any global lookup by child `Id` alone (see Security Domain note in RESEARCH.md).

**Entity shape reference** (`src/Omphalos.Domain/Entities/GameSession.cs:1-23`):
```csharp
public class GameSession
{
    public string Id { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public JsonDocument? SessionLog { get; set; }
    public string? SessionNotes { get; set; }
    public JsonDocument? PrepData { get; set; }
    public SessionMetadata Metadata { get; set; } = new();
    public ICollection<Character> Characters { get; set; } = [];
    public ICollection<Location> Locations { get; set; } = [];
    public ICollection<Encounter> Encounters { get; set; } = [];
}
```
All 3 child collections use `Id` as their key type (confirmed via `SessionRepository`'s existing `.Include()` usage) — `Character`/`Location`/`Encounter` entities were not fully read this pass (not needed — RESEARCH.md's Code Example already confirms `c.Id`/`l.Id`/`e.Id` field-copy shape); read them directly if exact field lists are needed during implementation.

---

### 4 frontend call sites (component, request-response) — PERSIST-02

**Analog:** `src/client/context/AppContext.jsx`'s existing `dirtySessionRef` safe-save convention (lines 243-250, 279) — the pattern these 4 sites should converge toward conceptually (always send full current state), though the *mechanism* stays different (see Pitfall 2 below — do NOT reroute these through `dirtySessionRef`).

**Current buggy pattern** — `SessionPrep.jsx:26-28` (read in full, file is small):
```javascript
function updatePrep(newPrep) {
  dispatch({ type: 'UPDATE_SESSION', payload: { id: activeSession.id, prepData: newPrep } })
}
```

**Current buggy pattern** — `TopBar.jsx:9-16` (read in full):
```javascript
function handleTitleChange(e) {
  if (activeSession) {
    dispatch({
      type: 'UPDATE_SESSION',
      payload: { id: activeSession.id, title: e.target.value },
    })
  }
}
```

**Fix pattern (apply to all 4 files)** — spread the full current session, override only the changed field:
```javascript
// SessionPrep.jsx
function updatePrep(newPrep) {
  dispatch({ type: 'UPDATE_SESSION', payload: { ...activeSession, prepData: newPrep } })
}

// TopBar.jsx
function handleTitleChange(e) {
  if (activeSession) {
    dispatch({ type: 'UPDATE_SESSION', payload: { ...activeSession, title: e.target.value } })
  }
}
```
`SessionLog.jsx` (3 functions: `updateLog`, `updateNotes`, `updateMeta` at lines 43/50/57 per CONTEXT.md) and `Toolkit.jsx` (`SaveBtn` handler, line 109) follow the identical spread pattern — see RESEARCH.md "Fix 2" code block for the exact 4-file diff set (already verified against live file contents this session for `SessionPrep.jsx` and `TopBar.jsx`).

**Reducer merge these payloads land in** (`AppContext.jsx:55-63`):
```javascript
case 'UPDATE_SESSION':
  return {
    ...state,
    sessions: state.sessions.map(s =>
      s.id === action.payload.id
        ? { ...s, ...action.payload, dateModified: Date.now() }
        : s
    ),
  }
```
This case is unchanged by the fix — it already merges whatever payload shape it receives; the fix is entirely about what the 4 call sites *send*, not this reducer case.

**Import pattern** (both files use):
```javascript
import { useApp } from '../../context/AppContext'   // tabs/ subfolder — two levels up
import { useApp } from '../context/AppContext'       // TopBar.jsx — one level up (not in tabs/)
```
`const { activeSession, dispatch } = useApp()` is the standard destructure (TopBar.jsx also pulls `state`).

---

### `src/client/context/AppContext.jsx` (store/provider, event-driven) — PERSIST-04 wiring

**Analog:** itself — full file read (296 lines). Additive-only changes per RESEARCH.md Pattern 3.

**State shape to extend** (line 6-17):
```javascript
const initial = {
  sessions: [],
  // ...existing fields
  loaded: false,
  user: null,
  authChecked: false,
  saveError: null,   // ADD
}
```

**Reducer cases to add** (alongside existing switch, e.g. after `SET_SETTINGS` line 44-45):
```javascript
case 'SAVE_FAILED':
  return { ...state, saveError: action.payload }
case 'CLEAR_SAVE_ERROR':
  return { ...state, saveError: null }
```

**`saveSession` catch to wire up** (currently line 227-229):
```javascript
// BEFORE
const saveSession = useCallback((session) => {
  db.saveSession(session).catch(() => {})
}, [])

// AFTER
const saveSession = useCallback((session) => {
  db.saveSession(session).catch(() => dispatch({ type: 'SAVE_FAILED', payload: true }))
}, [])
```
**Critical:** use the raw `dispatch` from `useReducer` (line 179: `const [state, dispatch] = useReducer(reducer, initial)`), NOT `dispatchWithPersist` — `saveSession` is defined inside `AppProvider` where the raw `dispatch` is already in scope by that name. Do not confuse with the exported `dispatchWithPersist` (aliased to `dispatch` in the context value at line 287) that consuming components use via `useApp()`.

**Provider value to expose `saveError`/clear action** (line 286-290, currently):
```javascript
return (
  <AppContext.Provider value={{ state, dispatch: dispatchWithPersist, activeSession }}>
    {children}
  </AppContext.Provider>
)
```
No change needed here — `state.saveError` is already exposed via `state`, and `SaveFailureToast.jsx` dispatches `CLEAR_SAVE_ERROR` through the existing exported `dispatch` (which is `dispatchWithPersist`; since `CLEAR_SAVE_ERROR`/`SAVE_FAILED` have no case in `dispatchWithPersist`'s switch at lines 262-281, they safely no-op the persist step and only run the inner `dispatch(action)` at line 259 — harmless, matches RESEARCH.md's noted caveat).

---

### `src/client/components/SaveFailureToast.jsx` (component, event-driven) — new file

**Analog:** `src/client/components/SettingsModal.jsx` (dismiss-button chrome, dark-theme card conventions) — full analog file read (lines 1-60).

**Imports pattern** (`SettingsModal.jsx:1-2`):
```javascript
import { useState } from 'react'
import { useApp } from '../context/AppContext'
```
`SaveFailureToast.jsx` needs only `useApp` (no local `useState` needed — state lives in `AppContext`).

**Dismiss `×` button convention** (`SettingsModal.jsx:23`):
```javascript
<button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-2xl leading-none">×</button>
```

**Card chrome convention** (`SettingsModal.jsx:16-20`, adapted per UI-SPEC's exact contract):
```javascript
// SettingsModal reference shape (full-screen overlay + centered card):
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
  <div className="bg-[#211b17] rounded-lg w-[480px] p-6 fade-in" onClick={e => e.stopPropagation()}>
```

**Required shape per `01-UI-SPEC.md` (binding contract — differs from SettingsModal's centered-overlay shape; this is a corner toast, no backdrop):**
```javascript
export default function SaveFailureToast() {
  const { state, dispatch } = useApp()
  if (!state.saveError) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] max-w-sm bg-[#211b17] border-l-4 border-l-[#b24545] rounded-lg shadow-2xl p-4 fade-in">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1 text-sm font-semibold text-[#b24545]">
            <span>⚠️</span>
            <span>Save failed</span>
          </div>
          <p className="text-sm text-[#999999] mt-2 leading-normal">
            Your last change wasn't saved. Edit again to retry, or check your connection.
          </p>
        </div>
        <button
          onClick={() => dispatch({ type: 'CLEAR_SAVE_ERROR' })}
          className="text-[#999999] hover:text-[#f0f0f0] text-2xl leading-none flex-shrink-0"
        >
          ×
        </button>
      </div>
    </div>
  )
}
```
`.fade-in` class already exists at `src/client/index.css:64-68` — reuse verbatim, do not add a new keyframe (per UI-SPEC). Mount this component once near the app root (sibling to other top-level overlays) — check `App.jsx`/root layout file for where `TopBar`/modals are currently rendered to place it consistently (not read this pass; low-risk, single mount point).

---

### Test projects (new — `Omphalos.UnitTests`, `Omphalos.IntegrationTests`)

**Analog:** No local analog exists (first test project in repo, per CONCERNS.md). Use `src/Omphalos.Repository/Omphalos.Repository.csproj` as the `.csproj` conventions analog (TFM, nullable, implicit usings):

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <ItemGroup>
    <ProjectReference Include="..\Omphalos.Domain\Omphalos.Domain.csproj" />
  </ItemGroup>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
```
New test `.csproj` files should match this `net10.0` / `ImplicitUsings enable` / `Nullable enable` shape, per RESEARCH.md's Standard Stack `dotnet new xunit3` scaffolding commands (already itemized in RESEARCH.md lines 105-116 — use verbatim).

**Full scaffolding + fixture patterns:** already fully specified in RESEARCH.md's "Standard Stack: Installation" block and "Architecture Patterns: Pattern 2" (`PostgresFixture.cs` using `Testcontainers.PostgreSql`, `postgres:17` image matching `docker-compose.yml`, `db.Database.MigrateAsync()` reusing real EF Core migrations). Planner should reference those blocks directly — reproduced in full there, not duplicated here to avoid drift.

---

### `.github/workflows/ci.yml` (config, batch) — modify

**Analog:** itself — full file read (30 lines).

**Current `build-dotnet` job** (lines 9-22):
```yaml
build-dotnet:
  name: Build .NET solution
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-dotnet@v4
      with:
        dotnet-version: '10.x'
    - name: Restore
      run: dotnet restore
    - name: Build
      run: dotnet build --no-restore --configuration Release
```

**Fix — add `dotnet test` step after `Build`** (per RESEARCH.md Open Question 2's recommendation: same job, not a new one):
```yaml
    - name: Test
      run: dotnet test --no-build --configuration Release
```
Note: `--no-build` requires `dotnet build` to have used a matching configuration (`Release`, already the case) and requires Docker to be available on `ubuntu-latest` for the `Testcontainers.PostgreSql`-backed `Omphalos.IntegrationTests` project to pass (Docker is preinstalled on GitHub-hosted `ubuntu-latest` runners — RESEARCH.md Assumption A1).

---

## Shared Patterns

### Dark theme dismiss/overlay chrome
**Source:** `src/client/components/SettingsModal.jsx:16-23`
**Apply to:** `SaveFailureToast.jsx`
```javascript
<button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-2xl leading-none">×</button>
```
Colour tokens per `CLAUDE.md`: `bg2` = `#211b17` (panel bg), `text2` = `#999999` (muted text), `text1` = `#f0f0f0` (primary text hover), danger red = `#b24545`. **Do not use** `tailwind.config.js`'s named `bg1`/`bg2`/`bg3`/`amber` tokens — they resolve to different (wrong) hex values than `CLAUDE.md`'s documented palette; every existing component uses arbitrary-value classes (`bg-[#211b17]`) directly, per UI-SPEC's explicit token-discrepancy flag.

### Full-payload session dispatch (anti-regression guard)
**Source:** `src/client/context/AppContext.jsx:55-63` (`UPDATE_SESSION` reducer case, unchanged) + `279` (`dirtySessionRef` pattern for sub-resources, NOT to be reused for `UPDATE_SESSION`)
**Apply to:** All 4 fixed call sites (`SessionPrep.jsx`, `SessionLog.jsx`, `TopBar.jsx`, `Toolkit.jsx`)
- Always spread `{ ...activeSession, <changedField>: value }`, never `{ id, <changedField>: value }`.
- `UPDATE_SESSION` must keep flowing through `dispatchWithPersist`'s synchronous `saveSession(action.payload)` branch (`AppContext.jsx:264-266`) — do not reroute it through `dirtySessionRef`/the post-render `useEffect` flush (that mechanism exists solely for sub-resource mutations where `action.payload` doesn't carry the full post-mutation session state; `UPDATE_SESSION`'s payload already will, once fixed).

### EF Core session-scoped child collection loading (security invariant)
**Source:** `src/Omphalos.Repository/Repositories/SessionRepository.cs:29-33`
**Apply to:** The new `SyncCollection` diff-merge helper(s)
```csharp
var existing = await db.GameSessions
    .Include(s => s.Characters)
    .Include(s => s.Locations)
    .Include(s => s.Encounters)
    .FirstOrDefaultAsync(s => s.Id == session.Id && s.UserId == session.UserId, ct);
```
All diff-merge operations must operate only on children loaded off this `UserId`-scoped query — never introduce a global `db.Characters`/`db.Locations`/`db.Encounters` lookup by child `Id` alone, which would allow cross-user ID-collision tampering.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/Omphalos.UnitTests/*` | test | transform | First-ever test project in the repo (confirmed via `CONCERNS.md` — zero test infrastructure exists). No local analog; RESEARCH.md's Standard Stack + Architecture Patterns sections are the canonical scaffolding source instead. |
| `src/Omphalos.IntegrationTests/*` | test | CRUD | Same as above — no local analog; use RESEARCH.md's `PostgresFixture.cs` pattern (Pattern 2) verbatim. |

## Metadata

**Analog search scope:** `src/Omphalos.Repository/Repositories/`, `src/Omphalos.Domain/Entities/`, `src/client/context/`, `src/client/components/`, `src/client/components/tabs/`, `src/client/db/`, `.github/workflows/`, project root `.csproj` files
**Files read directly this pass:** `SessionRepository.cs`, `AppContext.jsx`, `SessionPrep.jsx` (partial), `TopBar.jsx`, `db/index.js`, `SettingsModal.jsx` (partial), `ci.yml`, `Omphalos.Repository.csproj`, `GameSession.cs`
**Files relied on via RESEARCH.md's already-confirmed direct-inspection citations (not re-read this pass, to avoid duplicate reads):** `SessionLog.jsx`, `Toolkit.jsx`, `GameSessionConfiguration.cs`, `Character.cs`/`Location.cs`/`Encounter.cs`, `SessionService.cs`, `ISessionRepository.cs`
**Pattern extraction date:** 2026-07-10
