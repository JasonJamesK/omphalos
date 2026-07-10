# Phase 1: Session Persistence Reliability - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers reliable session persistence: a DM's session data (prep content, session log, top bar title/metadata, toolkit) survives save and reload with no silent data loss. It fixes two confirmed bugs (`PrepData` never persisting; partial-payload dispatches unconditionally overwriting unrelated fields), a related performance/correctness issue in the same code path (full collection delete/reinsert on every save), adds visible feedback when a save fails, and establishes the project's first automated test coverage around this fix.

</domain>

<decisions>
## Implementation Decisions

### Partial-Payload Fix Strategy
- **D-01:** Fix the bug at the frontend call sites — `SessionPrep.jsx`, `SessionLog.jsx`, `TopBar.jsx`, `Toolkit.jsx` should dispatch the full current session object instead of a partial `{id, field}` payload, matching the existing safe `dirtySessionRef` pattern already used for character/location/encounter sub-resource saves. No backend DTO/merge-contract change — the backend continues to expect (and can now safely assume) a full session payload.

### Collection Replace Pattern (new — PERSIST-03)
- **D-02:** `SessionRepository.UpsertAsync` should diff and merge `Character`/`Location`/`Encounter` child collections by ID (add/update/remove only what changed) instead of unconditionally deleting and reinserting all rows on every save. This was raised as an adjacent CONCERNS.md item in the same method; user chose to fix it in this phase rather than defer it.

### Save-Failure Feedback (new — PERSIST-04)
- **D-03:** Add a visible indicator (toast/banner — no existing component for this, needs to be built) when a session save request fails, replacing the current silent `.catch(() => {})` swallow in `AppContext.jsx`/`db/index.js`.

### Test Coverage
- **D-04:** Add the project's first test project. Framework: **xUnit** (ASP.NET Core convention; also matches the sibling quest-board repo's own `QuestBoard.UnitTests`/`QuestBoard.IntegrationTests` project split — follow that naming/structuring convention for consistency across the user's repos: e.g. `Omphalos.UnitTests` / `Omphalos.IntegrationTests`).
- **D-05:** Wire the new test project into CI. `.github/workflows/ci.yml` currently only runs `dotnet build` + `npm run build` — add a test-run step so these tests actually guard future PRs, not just exist locally.
- Tests should cover at minimum: `PrepData` persists on update, and the collection diff-merge logic (add/update/remove cases) in `SessionRepository.UpsertAsync`.

### Explicit Scope Boundary
- **D-06:** Debouncing session persistence (every keystroke currently triggers a full `PUT /api/sessions/{id}`) is **explicitly out of scope** for this phase — it's a separate, distinct tech-debt item noted in `CONCERNS.md`, not a data-loss bug like PERSIST-01/02/03.

### Claude's Discretion
- Exact toast/banner component styling and placement (must match the existing dark theme per `CLAUDE.md` — bg1/bg2/bg3/amber/text1/text2 tokens, `SettingsModal.jsx`-style conventions).
- Exact test project structure (single `Omphalos.Tests` vs. split Unit/Integration projects) — lean toward mirroring quest-board's split unless there's a reason not to.
- Whether the collection diff-merge (D-02) is implemented as a change inside `UpsertAsync` itself or extracted to a helper — pattern in `CONCERNS.md`'s "Fix approach" note doesn't mandate either.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Bug details (primary sources — direct code inspection, not inference)
- `.planning/research/ARCHITECTURE.md` — full trace of the `PrepData` bug (`SessionRepository.UpsertAsync` never assigns `PrepData` on update) and the partial-payload `UPDATE_SESSION` dispatch bug (`dispatchWithPersist` sends the raw un-merged `action.payload`; `System.Text.Json` binds partial JSON fine since DTO fields aren't marked `required`), with exact file:line citations for both
- `.planning/research/SUMMARY.md` — Phase 1 rationale, and why it hard-blocks Phase 3 (Session Prep markdown fields sit directly on the broken `PrepData` path)

### Known issues reference
- `.planning/codebase/CONCERNS.md` §"Full session write on every keystroke" and §"No debounce on session persistence" — the adjacent-but-explicitly-deferred debounce issue (D-06)
- `.planning/codebase/CONCERNS.md` §"`SessionRepository.UpsertAsync` deletes and reinserts all child rows on every save" — the collection-replace pattern now in scope via PERSIST-03/D-02, including its suggested "Fix approach"
- `.planning/codebase/CONCERNS.md` §"'Save after next render' persistence pattern in `AppContext`" — the `dirtySessionRef` + `useEffect` pattern the D-01 fix must not break (documented as fragile; a past regression already happened here, see commit `444c048`)
- `.planning/codebase/CONCERNS.md` §"No offline/save-failure feedback to the user" — the silent-failure issue PERSIST-04/D-03 addresses
- `.planning/codebase/CONCERNS.md` §"No automated tests exist anywhere in the repository" — explicitly flags persistence logic as the highest-value initial test target, directly motivating D-04/D-05

### Project requirements
- `.planning/REQUIREMENTS.md` — PERSIST-01 through PERSIST-04 (04 added during this discussion)
- `.planning/PROJECT.md` — Core Value ("...without fighting broken editing tools or losing content")

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `dirtySessionRef` + `useEffect` pattern in `AppContext.jsx` (~lines 243-250) — the existing "safe" full-payload save convention that the 4 call sites (D-01) should be made to match, rather than inventing a new pattern
- quest-board's `QuestBoard.UnitTests`/`QuestBoard.IntegrationTests` project structure — reference for naming/structuring Omphalos's new test project(s) (D-04)

### Established Patterns
- `SessionRepository.UpsertAsync` (`src/Omphalos.Repository/Repositories/SessionRepository.cs:27-58`) is the single method touched by both PERSIST-01 (assign `PrepData`) and PERSIST-03 (diff-merge collections)
- `dispatchWithPersist` in `AppContext.jsx` (258-282) is the single frontend funnel all 4 partial-payload call sites go through
- Current error handling: `db/index.js`'s `request()` throws a generic `Error` for non-2xx responses; save calls in `AppContext.jsx` currently do `.catch(() => {})` — PERSIST-04 needs a new UI surface, since no toast/notification component exists yet in `src/client/components`

### Integration Points
- 4 call sites needing the full-payload fix (D-01): `SessionPrep.jsx`, `SessionLog.jsx`, `TopBar.jsx`, `Toolkit.jsx`
- `.github/workflows/ci.yml` — currently `dotnet build` + `npm run build` only; needs a `dotnet test` step added (D-05)

</code_context>

<specifics>
## Specific Ideas

No additional "I want it like X" references beyond what's captured in Decisions above.

</specifics>

<deferred>
## Deferred Ideas

- **Debounce session persistence** (every keystroke triggers a full session write) — explicitly deferred (D-06); separate tech-debt item per `CONCERNS.md`, not a data-loss bug
- **Full offline/connectivity detection** — PERSIST-04 is scoped to visible save-*failure* feedback only, not general offline-state UX

</deferred>

---

*Phase: 1-Session Persistence Reliability*
*Context gathered: 2026-07-10*
