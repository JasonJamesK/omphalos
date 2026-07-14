---
phase: 1
slug: session-persistence-reliability
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-10
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | xUnit v3 (`xunit.v3` 3.2.2 + `xunit.runner.visualstudio` 3.1.5) — new, Wave 0 setup required, zero test infrastructure exists today |
| **Config file** | none yet — `Omphalos.slnx` currently references only the 4 app projects; new `.csproj` files needed for `Omphalos.UnitTests`/`Omphalos.IntegrationTests` |
| **Quick run command** | `dotnet test src/Omphalos.UnitTests` |
| **Full suite command** | `dotnet test` |
| **Estimated runtime** | ~30 seconds (unit tests fast; integration tests pay Testcontainers Postgres startup cost) |

---

## Sampling Rate

- **After every task commit:** Run `dotnet test src/Omphalos.UnitTests`
- **After every plan wave:** Run `dotnet test` (full suite, including Testcontainers-backed integration tests)
- **Before `/gsd-verify-work`:** Full suite must be green, plus the 2 manual-only UAT checks below
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | — | — | Wave 0 test infrastructure scaffolding | n/a | n/a | ❌ W0 | ⬜ pending |
| 1-0X-0X | TBD | TBD | PERSIST-01 | — | `PrepData` persists across insert-then-update `UpsertAsync` calls | integration | `dotnet test src/Omphalos.IntegrationTests --filter FullyQualifiedName~PrepDataPersistsOnUpdate` | ❌ W0 | ⬜ pending |
| 1-0X-0X | TBD | TBD | PERSIST-02 | — | Frontend call sites send full-session payloads | manual-only | N/A — manual reload check | manual-only | ⬜ pending |
| 1-0X-0X | TBD | TBD | PERSIST-03 | T-1-01 | Character/Location/Encounter add/update/remove reconciled correctly across two `UpsertAsync` calls, preserving session-scoped ownership | integration | `dotnet test src/Omphalos.IntegrationTests --filter FullyQualifiedName~CollectionDiffMerge` | ❌ W0 | ⬜ pending |
| 1-0X-0X | TBD | TBD | PERSIST-03 (pure logic) | — | Diff function correctly classifies add/update/remove sets from two plain lists | unit | `dotnet test src/Omphalos.UnitTests --filter FullyQualifiedName~SyncCollection` | ❌ W0 | ⬜ pending |
| 1-0X-0X | TBD | TBD | PERSIST-04 | T-1-02 | Save-failure toast appears with fixed, non-leaking copy when `db.saveSession()` rejects, dismissible via × | manual-only | N/A — manual UAT (simulate failed save) | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs are placeholders (TBD) until the planner assigns final plan/task numbering — update this table after `/gsd-plan-phase 1` completes plan creation.*

---

## Wave 0 Requirements

- [ ] `src/Omphalos.UnitTests/Omphalos.UnitTests.csproj` — new project, no DB dependency
- [ ] `src/Omphalos.IntegrationTests/Omphalos.IntegrationTests.csproj` — new project, `Testcontainers.PostgreSql` reference
- [ ] `src/Omphalos.IntegrationTests/PostgresFixture.cs` — shared container fixture
- [ ] Both new projects added to `Omphalos.slnx`
- [ ] `.github/workflows/ci.yml` — `dotnet test` step added to the existing `build-dotnet` job
- [ ] Framework install: `dotnet new xunit3 -o src/Omphalos.UnitTests` (or `dotnet new xunit` + package-reference edit to `xunit.v3`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Editing Session Log/top bar/Toolkit independently doesn't wipe other session fields | PERSIST-02 | No frontend test runner (Vitest/Jest) exists in this repo; adding one is out of scope for this phase (not covered by D-04/D-05, which scope test infra to the backend only) | Edit Session Log only, save, reload — confirm Title/Characters/Locations/Encounters unchanged. Repeat for top bar and Toolkit edits. |
| Save-failure toast appears and is dismissible | PERSIST-04 | Same reasoning — no frontend test runner in this repo | Simulate a failed save (e.g. stop the API container mid-edit), confirm toast per `01-UI-SPEC.md` appears with fixed copy, dismiss via ×. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
