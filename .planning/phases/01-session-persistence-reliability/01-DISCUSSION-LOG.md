# Phase 1: Session Persistence Reliability - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-10
**Phase:** 1-Session Persistence Reliability
**Areas discussed:** Partial-payload fix strategy, Full collection replace boundary, Save-failure user feedback, Regression test coverage

---

## Partial-Payload Fix Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Frontend: send full session object | Change SessionPrep/SessionLog/TopBar/Toolkit to dispatch the full current session, matching the existing safe dirtySessionRef pattern. Smaller, consistent fix — no backend contract change. | ✓ |
| Backend: merge instead of overwrite | Make SessionService/UpsertAsync only apply fields present in the incoming request. Fixes it for any future partial-payload caller too, but bigger change to code with zero test coverage. | |
| Both | Frontend sends full payloads AND backend defensively merges. | |

**User's choice:** Frontend: send full session object
**Notes:** None.

---

## Full Collection Replace Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Out of scope | Leave the delete/reinsert pattern alone — separate performance/tech-debt concern per CONCERNS.md. | |
| Fix it too while we're in there | Rework UpsertAsync to diff-and-merge child collections instead of full replace, since we're already touching this method. | ✓ |

**User's choice:** Fix it too while we're in there
**Notes:** Added as new requirement PERSIST-03 in REQUIREMENTS.md and ROADMAP.md Phase 1 (was not part of the original phase scope — flagged and confirmed as a deliberate scope addition, not silently folded in).

---

## Save-Failure User Feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add a simple failure indicator | A small toast/banner when a save request fails — serves the core value directly. | ✓ |
| Out of scope | Leave silent failure as-is — this phase only fixes the two specific data-loss bugs. | |

**User's choice:** Yes, add a simple failure indicator
**Notes:** Added as new requirement PERSIST-04 in REQUIREMENTS.md and ROADMAP.md Phase 1, same reasoning as above.

---

## Regression Test Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add backend tests for this fix | Focused test coverage for PrepData persistence + collection diff-merge — first backend logic fix in the project. | ✓ |
| Manual verification only | Matches existing zero-test convention. | |

**User's choice:** Yes, add backend tests for this fix
**Notes:** Follow-up questions asked since this establishes the project's first test project:

**Test framework:**

| Option | Selected |
|--------|----------|
| xUnit | ✓ |
| Other (NUnit/MSTest) | |

**CI wiring:**

| Option | Selected |
|--------|----------|
| Yes, add a test step to CI | ✓ |
| Not yet | |

---

## Claude's Discretion

- Toast/banner styling and placement (must match existing dark theme conventions)
- Exact test project structure (single project vs. Unit/Integration split — lean toward mirroring quest-board's split)
- Whether the collection diff-merge is implemented inline in `UpsertAsync` or extracted to a helper

## Deferred Ideas

- Debounce on session persistence (every keystroke triggers a full session write) — separate tech-debt item, not part of this phase
- Full offline/connectivity detection — out of scope; only save-failure feedback is in scope
