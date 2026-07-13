---
phase: 3
slug: markdown-editing-session-prep-fields
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-13
---

# Phase 3 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| DM browser (client) → API | The DM's typed markdown crosses from the React client to the backend via the existing `PUT /api/sessions/{id}` endpoint. Unchanged by this phase — same endpoint, same authorization, same `PrepData` JSON column that already accepted plain-textarea content. | Session prep markdown text (Overview & Hook, Notes/Callout/Loot block bodies) |
| Persisted markdown → rendered preview (client) | Markdown source read back from the session payload is rendered to React elements by `MarkdownPreview` (`react-markdown`). This is where output-encoding safety matters. | Persisted markdown string → rendered DOM |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-03-01 | Tampering / Information Disclosure (stored-XSS-adjacent) | `MarkdownPreview` / `react-markdown` rendering at the 4 new call sites (SessionPrep, Notes, Callout, Loot) | low | mitigate | Reuses `react-markdown`'s default AST→React-element rendering exactly as Phase 2 shipped it — no `dangerouslySetInnerHTML`, no `rehype-raw` (or any raw-HTML passthrough). Verified via `grep -rn "dangerouslySetInnerHTML\|rehype-raw\|rehypeRaw"` across all 4 new call sites plus `MarkdownPreview.jsx` — zero matches. | closed |
| T-03-02 | Information Disclosure (content-in-transit / at-rest) | Persisted markdown source in the existing `PrepData` JSON column, written via the existing full-session PUT | low | accept | Same trust boundary and same data path as the plain `<textarea>` being replaced — no new endpoint, no new authorization surface, no schema change. All content is authored by trusted DM/admin-level users who already have full CRUD access to these exact fields. This phase changes rendering, not the trust boundary. | closed |
| T-03-SC | Tampering (supply chain) | npm dependency installs | low | accept | No new package added this phase. Confirmed via `git diff` across the phase's commit range: `package.json` unchanged; the only `package-lock.json` change (`dcddf96`) is peer-dependency metadata from a plain `npm install` (no new `"resolved"`/`"version"` entries) to sync a pre-existing `node_modules` staleness, not a new dependency. All markdown deps (`react-markdown@10.1.0`, `remark-gfm@4.0.1`, `remark-breaks@4.0.0`, `strip-markdown@6.0.0`) were already verified OK in Phase 2. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-02 | Persisted markdown at-rest/in-transit risk is identical to the pre-existing plain-textarea trust boundary this phase replaces — same authenticated DM/admin users, same endpoint, same authorization. No new control warranted for a rendering-only change. | Claude (gsd-secure-phase, plan-time disposition from 03-01-PLAN.md) | 2026-07-13 |
| AR-03-02 | T-03-SC | Zero new npm packages installed this phase; all markdown dependencies were already verified legitimate in Phase 2's package-legitimacy audit. | Claude (gsd-secure-phase, plan-time disposition from 03-01-PLAN.md) | 2026-07-13 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-13 | 3 | 3 | 0 | Claude (gsd-secure-phase, orchestrator-verified — L1 grep-depth, ASVS level 1, register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-13
