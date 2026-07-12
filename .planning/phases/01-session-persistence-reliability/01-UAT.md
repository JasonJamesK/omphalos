---
status: resolved
phase: 01-session-persistence-reliability
source: [01-VERIFICATION.md]
started: 2026-07-11T00:00:00Z
updated: 2026-07-12T00:00:00Z
---

## Current Test

number: 4
name: Full test suite on a Docker-capable machine
expected: 7/7 tests pass (4 unit + 3 integration)
awaiting: none — all tests complete

## Tests

### 1. Session Log / Top-bar title / Toolkit save — no cross-field wipe (normal case)
expected: Edit ONLY the Session Log, save, reload — confirm Title/Characters/Locations/Encounters/PrepData are unchanged. Repeat editing only the top-bar title, then only a Toolkit "★ Save". No unrelated field is ever wiped.
result: PASS — Created a live session with a character, location, encounter, Overview & Hook text, session log entry, and a Toolkit dice-roll saved to Quick Notes. Reloaded: `GET /api/sessions/{id}` response showed every field intact. Then edited ONLY the top-bar title in isolation, reloaded again: title changed, everything else (sessionLog, sessionNotes, characters, locations, encounters, prepData) byte-for-byte identical to before.

### 2. CR-01 race window — no data loss when editing before full session detail loads
expected: Reload the app (or switch to a session whose full detail hasn't loaded yet — visible as `session.characters === undefined`) and immediately edit a field (e.g. type in the title) before the background `db.getSession` fetch resolves. No partial-payload save reaches the server during the race window (characters/locations/encounters/prepData/sessionLog are never wiped), and the edit is not silently lost — either it applies once detail loads, or the UI does not misrepresent it as saved.
result: PASS — Reproduced the race window deliberately: patched `window.fetch` in the live page to delay the target session's `GET /api/sessions/{id}` by 8s, then switched to that (not-yet-detail-loaded) session and immediately typed into the title field. Confirmed via network log: **zero PUT requests fired during the entire race window** (before the fix, this same sequence would have fired a partial-payload PUT and wiped the session's characters/locations/encounters/prepData/sessionLog server-side). Once the delayed fetch resolved, the race-window edit was discarded from the UI (title reverted to its pre-edit value) rather than persisted or misrepresented as saved. A clean reload confirmed server-side state was 100% unchanged — title, sessionLog, sessionNotes, characters, locations, encounters, prepData all identical to before the race-window edit attempt. No data loss occurred.
note: Secondary, non-blocking finding — an edit made during the race window is silently discarded (reverted client-side) with no toast/warning once the delayed full-detail merge lands, rather than being retried or flagged to the user. Not a CR-01 regression (no data loss, nothing corrupted), but worth a follow-up UX polish item: warn or defer edits during the initial detail-load window instead of silently reverting them.

### 3. Save-failure toast
expected: Stop the API container mid-edit (or otherwise force a save to fail), make an edit, and confirm the bottom-right "Save failed" toast appears with the exact UI-SPEC copy ("Your last change wasn't saved. Edit again to retry, or check your connection."), renders above an open modal, and dismisses only when × is clicked (no auto-dismiss).
result: PASS — Stopped the `api` container via `docker compose stop api`, edited the session title, confirmed the toast appeared with the exact copy, dark-theme styling (red left border, warning icon), positioned bottom-right. Waited 7s with no auto-dismiss. Opened the "New Character" modal and confirmed the toast still rendered above it (correct z-index). Dismissed via × and confirmed it cleared. Restarted the API container afterward.

### 4. Full test suite on a Docker-capable machine
expected: Run `dotnet test` (full solution) on a machine with Docker available — 7/7 tests pass (4 unit + 3 integration: PostgresFixtureSmokeTests, PrepDataPersistsOnUpdate, CollectionDiffMerge).
result: PASS — User installed Docker Desktop mid-session. `dotnet test` (full solution): 4/4 unit + 3/3 integration = 7/7 green.

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

None. All 4 items pass.

**Unplanned fix discovered and applied during verification:** `docker compose up --build` (via `start.bat`) failed entirely — Plan 01-01 added `Omphalos.UnitTests`/`Omphalos.IntegrationTests` to the solution, but `Dockerfile`'s backend-build stage only copied the 4 production projects' `.csproj` files before running a whole-solution `dotnet restore`, so restore failed on the two missing test projects' `.csproj` files. This broke the documented `start.bat` / `docker compose up -d --build` deployment path for anyone building the image after 01-01 merged, and was never caught because Docker wasn't available during Phase 1's original execution session. Fixed by scoping the restore to `Omphalos.Web.csproj` (commit `e2fb0a2`) — the runtime image never needs the test projects. Rebuilt successfully afterward; all UAT testing above was performed against the rebuilt stack.
