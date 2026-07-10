---
phase: 01-session-persistence-reliability
reviewed: 2026-07-10T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - .github/workflows/ci.yml
  - Omphalos.slnx
  - src/Omphalos.IntegrationTests/Omphalos.IntegrationTests.csproj
  - src/Omphalos.IntegrationTests/PostgresFixture.cs
  - src/Omphalos.IntegrationTests/PostgresFixtureSmokeTests.cs
  - src/Omphalos.IntegrationTests/SessionRepositoryTests.cs
  - src/Omphalos.Repository/Repositories/SessionCollectionSync.cs
  - src/Omphalos.Repository/Repositories/SessionRepository.cs
  - src/Omphalos.UnitTests/Omphalos.UnitTests.csproj
  - src/Omphalos.UnitTests/SessionCollectionSyncTests.cs
  - src/client/App.jsx
  - src/client/components/SaveFailureToast.jsx
  - src/client/components/TopBar.jsx
  - src/client/components/tabs/SessionLog.jsx
  - src/client/components/tabs/SessionPrep.jsx
  - src/client/components/tabs/Toolkit.jsx
  - src/client/context/AppContext.jsx
findings:
  critical: 1
  warning: 7
  info: 3
  total: 11
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-07-10T00:00:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

The .NET repository layer (`SessionRepository.cs`, `SessionCollectionSync.cs`) is well built for the "diff-merge" problem it targets: `CopyCharacterFields`/`CopyLocationFields`/`CopyEncounterFields` mirror the exact field sets used in `SessionService.MapToEntity`, so field-loss on collection update (the historical "PERSIST-02" class of bug) looks genuinely fixed at that layer. Test coverage (`SessionCollectionSyncTests.cs`, `SessionRepositoryTests.cs`, `PostgresFixtureSmokeTests.cs`) is solid and exercises the diff/merge path against a real Postgres container.

However, the client still has an open, provable data-loss hole that the in-code comment on `UPDATE_SESSION` (AppContext.jsx:62-63) does not actually close: session summaries returned by `GET /api/sessions` deliberately omit `characters`/`locations`/`encounters`/`prepData`/`sessionLog` (they're `SessionSummaryDto`, not `SessionDto`). Every screen that lets the user edit a session (title, notes, session log, prep, toolkit "Save to notes") spreads `activeSession` unconditionally. If any of these edits fire before the one-time lazy full-session fetch resolves, the outgoing PUT is missing those fields, and the backend (`UpsertSessionRequest` → `MapToEntity`) treats "missing" as "empty/null" — wiping the session's characters, locations, encounters, session log, and prep data server-side. This is exactly the class of bug this phase is named for, and it reproduces on ordinary use (switch to a session, type in the title before the network round-trip completes).

Secondary findings cover a few more robustness gaps in the same area: an unhandled-exception risk in `SessionCollectionSync.Diff` on duplicate child IDs, a non-atomic "upsert" that can race on session creation, weak session-ID generation, and a couple of smaller quality issues.

## Critical Issues

### CR-01: Editing a session before its full detail loads wipes characters/locations/encounters/log/prep server-side

**File:** `src/client/context/AppContext.jsx:243-259`
**Also affects:** `src/client/components/TopBar.jsx:9-16`, `src/client/components/tabs/SessionLog.jsx:41-63`, `src/client/components/tabs/SessionPrep.jsx:26-28`, `src/client/components/tabs/Toolkit.jsx:100-114`

**Issue:**
`GET /api/sessions` returns `SessionSummaryDto` (`Id`, `Title`, `DateCreated`, `DateModified` only — see `src/Omphalos.Domain/DTOs/SessionDtos.cs:5-10` and `SessionService.GetAllAsync`). `AppContext.jsx` loads this list into `state.sessions` via `INIT`, then lazily fetches the full `SessionDto` the first time a session becomes active:

```js
// AppContext.jsx:243-250
useEffect(() => {
  if (!state.loaded || !state.activeSessionId) return
  const session = state.sessions.find(s => s.id === state.activeSessionId)
  if (!session || session.characters !== undefined) return
  db.getSession(state.activeSessionId)
    .then(full => { if (full) dispatch({ type: 'MERGE_SESSION_DETAIL', payload: full }) })
    .catch(() => {})
}, [state.loaded, state.activeSessionId, state.sessions])
```

Until that fetch resolves, `activeSession` is a *summary* object — it has no `characters`, `locations`, `encounters`, `prepData`, or `sessionLog` keys at all (not even `undefined`-valued, simply absent). Every edit surface in scope spreads this object directly into an `UPDATE_SESSION` payload, e.g.:

```js
// TopBar.jsx:9-16
function handleTitleChange(e) {
  if (activeSession) {
    dispatch({ type: 'UPDATE_SESSION', payload: { ...activeSession, title: e.target.value } })
  }
}
```
```js
// SessionLog.jsx:48-53
function updateNotes(e) {
  dispatch({ type: 'UPDATE_SESSION', payload: { ...session, sessionNotes: e.target.value } })
}
```
```js
// SessionPrep.jsx:26-28
function updatePrep(newPrep) {
  dispatch({ type: 'UPDATE_SESSION', payload: { ...activeSession, prepData: newPrep } })
}
```
```js
// Toolkit.jsx:104-114 (SaveBtn, used by every DM-toolkit generator's "★ Save")
dispatch({ type: 'UPDATE_SESSION', payload: { ...activeSession, sessionNotes: ... } })
```

Because the spread source is missing those keys, the resulting payload is missing them too, and `JSON.stringify` drops missing keys entirely. `dispatchWithPersist` (AppContext.jsx:267-291) sends that exact payload straight to `saveSession` → `db.saveSession` → `PUT /api/sessions/{id}`.

On the backend, `UpsertSessionRequest` binds the absent fields to their type defaults (`List<CharacterDto>? Characters` → `null`, `JsonDocument? SessionLog` → `null`, `SessionMetadataDto? Metadata` → `null`, `JsonDocument? PrepData` → `null`). `SessionService.MapToEntity` then does:

```csharp
// SessionService.cs:63, 87, 99, 49, 51-52
Characters = (r.Characters ?? []).Select(...).ToList(),   // null -> empty list
Locations  = (r.Locations  ?? []).Select(...).ToList(),   // null -> empty list
Encounters = (r.Encounters ?? []).Select(...).ToList(),   // null -> empty list
SessionLog = r.SessionLog,                                // null -> wiped
PrepData   = r.PrepData,                                  // null -> wiped
Metadata   = r.Metadata is null ? new() : ...              // null -> blanked
```

`SessionRepository.UpsertAsync` then diffs the (now empty) incoming `Characters`/`Locations`/`Encounters` against the existing DB rows via `SessionCollectionSync.Diff`, and every existing child is classified `ToRemove` and deleted. The net effect: typing a single character into the session title (or any Quick-Notes / prep / log field) immediately after switching to — or loading — a session that hasn't finished its background detail fetch permanently deletes that session's characters, locations, encounters, prep data, and session log on the server.

The comment at AppContext.jsx:62-63 ("Call sites must dispatch the full session object here...") describes exactly this failure mode but the mitigation it documents (spread the full session) is not sufficient — the object being spread is itself incomplete during the race window, and every current call site is affected.

**Fix:** Don't allow persisted mutations to leave the race window open. E.g. track which sessions have loaded full detail and gate `dispatchWithPersist` on it (or disable/hide the editable UI until the fetch resolves):

```js
// AppContext.jsx
const detailLoadedIds = useRef(new Set())

useEffect(() => {
  if (!state.loaded || !state.activeSessionId) return
  const session = state.sessions.find(s => s.id === state.activeSessionId)
  if (!session || session.characters !== undefined) return
  db.getSession(state.activeSessionId).then(full => {
    if (full) {
      detailLoadedIds.current.add(full.id)
      dispatch({ type: 'MERGE_SESSION_DETAIL', payload: full })
    }
  }).catch(() => {})
}, [state.loaded, state.activeSessionId, state.sessions])

const dispatchWithPersist = useCallback((action) => {
  dispatch(action)
  if (!loadedRef.current) return

  const sessionId = action.payload?.id ?? action.sessionId
  // Refuse to persist session-shaped mutations until the full record has loaded —
  // a summary-only session object is missing characters/locations/encounters/
  // prepData/sessionLog, and sending it would wipe those fields server-side.
  if (sessionId && !detailLoadedIds.current.has(sessionId)) return

  switch (action.type) { /* ... existing cases ... */ }
}, [saveSession])
```

A simpler, more defensive alternative: don't render session-editing controls (title input, notes, log editor, prep, toolkit save buttons) until `activeSession.characters !== undefined`, mirroring the existing app-level `!state.loaded` loading screen but scoped per-session.

## Warnings

### WR-01: `SessionCollectionSync.Diff` throws on duplicate child IDs, aborting the whole session save

**File:** `src/Omphalos.Repository/Repositories/SessionCollectionSync.cs:12-13`
**Issue:** `existing.ToDictionary(keySelector)` / `incoming.ToDictionary(keySelector)` throw `ArgumentException` ("An item with the same key has already been added") if two characters/locations/encounters in the incoming payload share an `Id`. There's no global exception-handling middleware registered in `Program.cs` (only CORS/Auth/StaticFiles middleware is wired up), so this surfaces as a bare 500 to the client — the whole `UpsertAsync` call fails (title/notes/log changes bundled in the same PUT are lost too), and the user just sees the generic "Save failed" toast with no indication of the cause. Given client IDs for new characters/locations/encounters are typically timestamp-derived, a double-click or rapid successive "Add" click is a plausible way to trigger this.
**Fix:** Validate for duplicate keys before diffing and reject/deduplicate explicitly, e.g.:
```csharp
var existingByKey = existing
    .GroupBy(keySelector)
    .ToDictionary(g => g.Key, g => g.First()); // or throw a domain-specific validation error
```
Or validate in `SessionService.UpsertAsync` before calling the repository, returning a `400 Bad Request` with a clear message instead of letting `ToDictionary` throw.

### WR-02: `UpsertAsync` is a non-atomic read-then-write "upsert" — concurrent creates for the same session ID race

**File:** `src/Omphalos.Repository/Repositories/SessionRepository.cs:27-55`
**Issue:** `UpsertAsync` checks `existing is null` and then calls `db.GameSessions.Add(session)`. If two PUT requests for the same new session ID arrive concurrently (e.g. duplicate network retry, or React effects double-firing), both can see `existing == null` and both attempt `Add`, causing the second `SaveChangesAsync` to throw a primary-key/unique-constraint violation — again surfaced as an unhandled 500 with no friendly retry/merge behavior.
**Fix:** Use a real upsert (e.g. `ON CONFLICT DO UPDATE` via raw SQL / `ExecuteUpdateAsync` combined with an initial insert attempt caught for the unique-violation case), or wrap the read-then-write in a serializable transaction / retry-on-conflict loop.

### WR-03: Session IDs are generated from `Date.now()` alone — collision risk across concurrent users

**File:** `src/client/App.jsx:51`
**Issue:** `id: \`session-${Date.now()}\`` has millisecond resolution and no per-client entropy. Two different users creating a session in the same millisecond (plausible in a self-hosted multi-DM deployment) generate the same ID, and the second user's create silently fails server-side (see WR-02) rather than being rejected/regenerated client-side.
**Fix:** Use a collision-resistant ID (e.g. `crypto.randomUUID()`), consistent with how `session-${Date.now()}`-style IDs are used elsewhere in the codebase for phases/tables.

### WR-04: `dirtySessionRef` is a single scalar — a second sub-resource mutation for a different session before the flush effect runs silently drops the first save

**File:** `src/client/context/AppContext.jsx:192, 252-259, 286-289`
**Issue:** `dispatchWithPersist` stores the *last* sub-resource-mutated session ID in `dirtySessionRef.current`, and the flush effect only saves that one session, then clears the ref. If two `ADD_CHARACTER`/`UPDATE_LOCATION`/etc. dispatches for two *different* session IDs happen before React re-renders (e.g. future bulk-operation UI, or a mutation queued while switching the active session mid-flight), the first session's change is silently never persisted even though it looks committed in local state. Current call sites all key off `activeSession.id`, so this isn't reachable today, but it's a latent trap for any future feature that mutates a non-active session's sub-resources.
**Fix:** Replace the scalar ref with a `Set`/`Map` of dirty session IDs and flush all of them in the effect:
```js
const dirtySessionIdsRef = useRef(new Set())
...
useEffect(() => {
  if (!state.loaded || dirtySessionIdsRef.current.size === 0) return
  for (const id of dirtySessionIdsRef.current) {
    const session = state.sessions.find(s => s.id === id)
    if (session) saveSession(session)
  }
  dirtySessionIdsRef.current.clear()
}, [state.sessions, state.loaded, saveSession])
```

### WR-05: Gemini API key sent as a URL query parameter

**File:** `src/client/components/tabs/SessionLog.jsx:78-88`
**Issue:** `handleAISummary` calls `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}` — the API key is embedded in the URL. URLs are commonly logged by browsers (history), proxies, and any intermediary that logs full request lines, which is a broader blast radius than sending the same secret in a header.
**Fix:** Use the header form Google's API supports instead of the query string:
```js
fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
  body: JSON.stringify({ ... }),
})
```

### WR-06: `handleLogout` has no error handling — a failed logout request leaves the user thinking they signed out

**File:** `src/client/components/TopBar.jsx:18-20`
**Issue:**
```js
async function handleLogout() {
  await logout()
}
```
`logout()` (`src/client/db/index.js`) doesn't check `res.ok` and fires the `omphalos:unauthorized` event unconditionally after the fetch settles — but if the `fetch` itself rejects (offline, DNS failure, CORS), the promise rejection is unhandled here (no `try/catch`), so the click silently does nothing from the user's perspective (no toast, no redirect) while an unhandled rejection is logged to the console.
**Fix:** Wrap in try/catch and surface failure, or at minimum ensure the local logged-out UI state is forced consistently regardless of network outcome:
```js
async function handleLogout() {
  try { await logout() } catch { /* still treat as logged out locally */ }
}
```

### WR-07: No optimistic concurrency control on session updates — concurrent edits from two tabs/devices silently overwrite each other

**File:** `src/Omphalos.Repository/Repositories/SessionRepository.cs:39-46`
**Issue:** `Title`, `SessionLog`, `SessionNotes`, `PrepData`, and `Metadata` are unconditionally overwritten with whatever the incoming request contains (`existing.Title = session.Title`, etc.), with no version/timestamp check against `DateModified`. Two browser tabs (or a phone + laptop) editing the same session concurrently will silently last-write-wins each other's changes to these fields, inconsistent with the diff/merge approach used for the child collections. Given this phase is specifically about session persistence reliability, this is worth a deliberate decision (accept lost-update risk vs. add a concurrency token), not an implicit gap.
**Fix:** Add a `RowVersion`/`xmin`-based concurrency token to `GameSession`, compare `DateModified` (or a dedicated version) before overwrite, and surface a conflict to the client (`409 Conflict`) instead of silently discarding the other writer's change.

## Info

### IN-01: Dutch placeholder text in an otherwise English UI

**File:** `src/client/components/tabs/Toolkit.jsx:900`
**Issue:** `placeholder="Zoek een tool..."` ("Search for a tool...") is Dutch while every other string in the file (and the app) is English. Looks like an accidental leftover from local dev/testing.
**Fix:** `placeholder="Search tools..."`

### IN-02: `titleRef` in TopBar is created and attached but never read

**File:** `src/client/components/TopBar.jsx:7, 32`
**Issue:** `const titleRef = useRef(null)` is attached via `ref={titleRef}` on the title `<input>` but `titleRef.current` is never accessed anywhere in the component — dead code.
**Fix:** Remove the ref if it's unused, or use it (e.g. `.focus()` on new-session creation) if that was the intent.

### IN-03: No test coverage for the duplicate-child-ID crash path or concurrent-create ID collision

**File:** `src/Omphalos.UnitTests/SessionCollectionSyncTests.cs`, `src/Omphalos.IntegrationTests/SessionRepositoryTests.cs`
**Issue:** Given WR-01 and WR-02 above, there's no test asserting current (crashing) behavior or the desired (validated) behavior for a payload containing two children with the same `Id`, nor for two concurrent `UpsertAsync` calls creating the same new session ID.
**Fix:** Add `SessionCollectionSyncTests.Diff_DuplicateIncomingKey_Throws` (documenting current behavior, or the new validated behavior once WR-01 is fixed) and an integration test that runs two concurrent `UpsertAsync` calls for a brand-new session ID and asserts a clean, non-500 outcome.

---

_Reviewed: 2026-07-10T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
