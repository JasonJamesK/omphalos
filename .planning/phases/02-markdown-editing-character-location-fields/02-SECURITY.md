---
phase: 2
slug: markdown-editing-character-location-fields
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-12
---

# Phase 2 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| DM-authored text → rendered preview | Markdown source (attacker-controllable only by an already-privileged, trusted admin/DM in this self-hosted single-tenant app) crosses into HTML rendering via `react-markdown` | Character/location prose fields (Description, Notes, PersonalityTraits, Flaw, QuestHooks, SecretsAndHazards, SessionNotes) |
| npm registry → build | New package code enters the build/runtime | `react-markdown`, `remark-gfm`, `remark-breaks`, `strip-markdown`, `unified`, `remark-parse`, `remark-stringify` |
| DM keystroke / toolbar click → textarea value → controlled React state | The toolbar mutates `<textarea>` value via DOM APIs (`document.execCommand('insertText', ...)`, previously `setRangeText`) rather than typing; no new input source or trust boundary — the value is still the same trusted-admin-authored plain text | Markdown syntax characters (`**`, `#`, `-`) spliced into existing field values |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-02-01 | Tampering / Information Disclosure | `MarkdownPreview` / `react-markdown` rendering (used across all 6 usage sites: `CharacterModal.jsx`, `Library.jsx` ×2 forms, `Locations.jsx`, `AddLocationModal.jsx`, `AddFromLibraryModal.jsx`) | medium | mitigate | `react-markdown`'s default rendering (AST → React elements, no `dangerouslySetInnerHTML`) is used unmodified; `rehype-raw` is never enabled. Verified: `grep -rn "rehype-raw\|rehypeRaw\|dangerouslySetInnerHTML" src/client` returns zero matches. | closed |
| T-02-02 | Tampering | Markdown link rendering (`remark-gfm` autolinks) | low | mitigate | `react-markdown`'s default `urlTransform` (neutralizes `javascript:` and other unsafe URL schemes) is never overridden. Verified: `grep -rn "urlTransform" src/client` returns zero matches. | closed |
| T-02-SC | Tampering | npm installs (`react-markdown`, `remark-gfm`, `remark-breaks`, `strip-markdown`, `unified`, `remark-parse`, `remark-stringify`) | high | mitigate | All 7 packages verified via `gsd-tools query package-legitimacy check` (registry existence, publish history, non-deprecated, no suspicious postinstall script, active `remarkjs`/`syntax-tree`-org source repos) during phase research and the WR-05 code-review fix. Pinned `^` ranges to audited majors in `package.json`; confirmed resolved at top level (not just transitively) in `package-lock.json`. | closed |
| T-02-03 | Information Disclosure | `stripMarkdown` card/preview snippets (`Library.jsx`, `Locations.jsx`, `AddFromLibraryModal.jsx`) | low | accept | AST-based strip (`unified` + `remark-parse` + `strip-markdown` + `remark-stringify`) renders only plain text into truncated card previews; no HTML is ever rendered in this path. No additional control needed. | closed |
| T-02-04 | Tampering | `markdownToolbar.js`'s `replaceRange`/`applyRangeEdit` (DOM mutation mechanism, revised twice post-phase-completion: native setter → `setRangeText` → `document.execCommand('insertText', ...)`) | low | accept | Regardless of which DOM API mutates the textarea, only plain-text markdown syntax the DM already had access to type is spliced into the same field; the value is still rendered downstream by the unmodified `MarkdownPreview` (T-02-01's control). No new rendering path, no new sink, no override introduced by any of the three implementations. | closed |
| T-02-04-DoS | Denial of Service | Toolbar caret-restore mechanism (revised from `requestAnimationFrame` to synchronous `setSelectionRange`, then to `execCommand`'s native selection handling) | low | accept | Each toolbar click performs a fixed, small number of DOM operations (one `execCommand` call, one or two selection-range assignments) — no loop, no unbounded work, same cost profile as the originally-assessed `requestAnimationFrame` version. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-03 | Card/preview snippet truncation via `stripMarkdown` renders plain text only (never HTML) — no XSS surface exists in this path regardless of input content | Plan 02-02/02-03 (planner) | 2026-07-12 |
| AR-02-02 | T-02-04 | The toolbar's DOM mutation mechanism (whichever of the three implementations tried) only manipulates plain-text markdown syntax already available to the trusted DM; content still renders through the unmodified, already-mitigated `MarkdownPreview` control | Plan 02-04 (planner) | 2026-07-12 |
| AR-02-03 | T-02-04-DoS | Fixed, small per-click DOM operation cost with no loop or unbounded work — not exploitable as a DoS vector | Plan 02-04 (planner) | 2026-07-12 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-12 | 6 | 6 | 0 | Claude (orchestrator, short-circuit path — ASVS L1, register authored at plan time, threats_open: 0 confirmed via direct grep verification, no auditor spawn required) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-12
