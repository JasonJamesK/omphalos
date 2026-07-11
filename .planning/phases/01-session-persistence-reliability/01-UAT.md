---
status: testing
phase: 01-session-persistence-reliability
source: [01-VERIFICATION.md]
started: 2026-07-11T00:00:00Z
updated: 2026-07-11T00:00:00Z
---

## Current Test

number: 1
name: Session Log / Top-bar title / Toolkit save — no cross-field wipe (normal case)
expected: |
  Edit ONLY the Session Log, save, reload — confirm Title/Characters/Locations/Encounters/PrepData are unchanged.
  Repeat editing only the top-bar title, then only a Toolkit "★ Save". No unrelated field is ever wiped.
awaiting: user response

## Tests

### 1. Session Log / Top-bar title / Toolkit save — no cross-field wipe (normal case)
expected: Edit ONLY the Session Log, save, reload — confirm Title/Characters/Locations/Encounters/PrepData are unchanged. Repeat editing only the top-bar title, then only a Toolkit "★ Save". No unrelated field is ever wiped.
result: [pending]

### 2. CR-01 race window — no data loss when editing before full session detail loads
expected: Reload the app (or switch to a session whose full detail hasn't loaded yet — visible as `session.characters === undefined`) and immediately edit a field (e.g. type in the title) before the background `db.getSession` fetch resolves. No partial-payload save reaches the server during the race window (characters/locations/encounters/prepData/sessionLog are never wiped), and the edit is not silently lost — either it applies once detail loads, or the UI does not misrepresent it as saved.
result: [pending]

### 3. Save-failure toast
expected: Stop the API container mid-edit (or otherwise force a save to fail), make an edit, and confirm the bottom-right "Save failed" toast appears with the exact UI-SPEC copy ("Your last change wasn't saved. Edit again to retry, or check your connection."), renders above an open modal, and dismisses only when × is clicked (no auto-dismiss).
result: [pending]

### 4. Full test suite on a Docker-capable machine
expected: Run `dotnet test` (full solution) on a machine with Docker available — 7/7 tests pass (4 unit + 3 integration: PostgresFixtureSmokeTests, PrepDataPersistsOnUpdate, CollectionDiffMerge).
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
