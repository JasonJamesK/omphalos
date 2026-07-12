---
phase: 02-markdown-editing-character-location-fields
plan: 01
subsystem: ui
tags: [react-markdown, remark-gfm, remark-breaks, strip-markdown, css-container-queries, markdown]

# Dependency graph
requires: []
provides:
  - Shared markdown render-only component (`MarkdownPreview`) with dark-theme scoped CSS
  - Shared markdown edit+preview component (`MarkdownField`) with native-undo-safe toolbar, unbounded auto-grow, and container-query split view
  - AST-based `stripMarkdown()` utility for future card-preview truncation sites
  - Proven end-to-end wiring pattern into a form modal (`CharacterModal.jsx`)
affects: [02-02, 02-03]

# Tech tracking
tech-stack:
  added: [react-markdown@^10.1.0, remark-gfm@^4.0.1, remark-breaks@^4.0.0, strip-markdown@^6.0.0]
  patterns:
    - "Native CSS @container query (container-type: inline-size) drives MarkdownField's split-view vs. tab-toggle switch, not viewport width"
    - "Toolbar mutations use the native HTMLTextAreaElement value setter + dispatched input event to preserve browser Ctrl+Z undo (never a naive setState splice)"
    - "MarkdownPreview owns the single remarkPlugins config so both the live preview pane and read-only Shared Info displays render byte-identically"

key-files:
  created:
    - src/client/components/markdown/MarkdownPreview.jsx
    - src/client/components/markdown/MarkdownField.jsx
    - src/client/components/markdown/markdownToolbar.js
    - src/client/components/markdown/stripMarkdown.js
  modified:
    - package.json
    - src/client/index.css
    - src/client/components/character/CharacterModal.jsx

key-decisions:
  - "Followed PATTERNS.md's exact drop-in call-site shape: unlinked prose fields pass the existing `inp` class through MarkdownField's className; the linked-branch SessionNotes call site matches the plan's literal JSX (no className, since MarkdownField's own wrapper already supplies border/bg/rounded chrome)"

patterns-established:
  - "MarkdownField.jsx: controlled default-export accepting (value, onChange(string), className, placeholder) — a drop-in <textarea> replacement requiring zero parent-state changes"
  - ".markdown-preview / .markdown-field scoped CSS blocks in index.css, mirroring the existing .tiptap-editor .ProseMirror hand-rolled convention (no Tailwind Typography plugin, no container-query plugin)"

requirements-completed: [MDED-03, MDED-05, MDED-06, MDED-07, MDED-08]

coverage:
  - id: D1
    description: "MarkdownPreview.jsx renders markdown via react-markdown + remark-gfm + remark-breaks with no rehype-raw/dangerouslySetInnerHTML, and shows 'Nothing written yet.' empty-state copy instead of returning null"
    requirement: "MDED-08"
    verification:
      - kind: manual_procedural
        ref: "npm run dev — render MarkdownPreview with heading/bold/italic/list/blockquote/code sample; visually confirm dark-theme styling and no raw markup"
        status: unknown
    human_judgment: true
    rationale: "Visual/typography correctness requires human eyes; no frontend test framework exists in this project (manual-UAT-only convention, confirmed in 02-RESEARCH.md)"
  - id: D2
    description: "MarkdownField shows Edit/Preview tabs in narrow (~330px) containers defaulting to Edit, and side-by-side edit+preview in wide (~520-680px) containers, driven by CSS @container not viewport width"
    requirement: "MDED-05"
    verification:
      - kind: manual_procedural
        ref: "npm run dev — mount MarkdownField in a ~330px and a ~560px container; resize browser window alone must NOT flip the layout"
        status: unknown
    human_judgment: true
    rationale: "Container-query-driven responsive layout switching requires visual confirmation across real container widths"
  - id: D3
    description: "MarkdownField auto-grows unbounded with content (no max-height, no internal scrollbar)"
    requirement: "MDED-07"
    verification:
      - kind: manual_procedural
        ref: "npm run dev — type several paragraphs into a MarkdownField textarea and confirm it grows with no internal scrollbar"
        status: unknown
    human_judgment: true
    rationale: "Auto-grow sizing behavior is a visual/DOM-measurement property that automated build checks cannot verify"
  - id: D4
    description: "Toolbar Bold/Italic/Heading/Bulleted-list buttons insert/wrap markdown syntax via the native value setter, preserving native Ctrl+Z undo as a discrete step"
    requirement: "MDED-03"
    verification:
      - kind: manual_procedural
        ref: "npm run dev — click Bold on a selection, type more text, press Ctrl+Z; confirm the Bold insertion undoes as its own step"
        status: unknown
    human_judgment: true
    rationale: "Native browser undo-stack behavior can only be confirmed by interactive keyboard testing, not a build/lint check"
  - id: D5
    description: "Existing single-newline plain text renders with visible line breaks preserved (remark-breaks), not collapsed into a run-on paragraph"
    requirement: "MDED-06"
    verification:
      - kind: manual_procedural
        ref: "npm run dev — type single-Enter line breaks into a MarkdownField and confirm the preview shows them as <br> line breaks"
        status: unknown
    human_judgment: true
    rationale: "Visual line-break rendering requires human confirmation; no automated test harness exists for this frontend"
  - id: D6
    description: "CharacterModal.jsx unlinked-branch PersonalityTraits/Flaw/Description/QuestHooks and linked-branch SessionNotes all use MarkdownField; linked-branch personality Shared Info uses MarkdownPreview; both Inventory textareas remain plain <textarea>"
    verification:
      - kind: other
        ref: "grep count: MarkdownField appears 5 times in CharacterModal.jsx; both Inventory fields confirmed unchanged via grep"
        status: pass
      - kind: other
        ref: "npm run build (module count rose from 396 to 655 transformed modules after wiring, confirming MarkdownField/MarkdownPreview are actually imported and bundled)"
        status: pass
    human_judgment: false

# Metrics
duration: ~20min
completed: 2026-07-12
status: complete
---

# Phase 2 Plan 1: Markdown Editing Foundation + Character Modal Summary

**Shared react-markdown/remark-gfm/remark-breaks rendering stack plus a native-undo-safe, container-query-responsive MarkdownField editor, proven end-to-end by wiring it into the in-session CharacterModal's four prose fields and the linked-character Shared Info summary**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-12T12:13:38Z
- **Tasks:** 3
- **Files modified:** 7 (4 created, 3 modified)

## Accomplishments
- Installed and locked `react-markdown`, `remark-gfm`, `remark-breaks`, `strip-markdown` — all four verified OK in RESEARCH.md's package legitimacy audit, no legitimacy checkpoint needed
- Built `MarkdownPreview.jsx`, a shared render-only component with no `rehype-raw`/`dangerouslySetInnerHTML` (the XSS control per the threat model) and a "Nothing written yet." empty-state instead of returning `null`
- Built `MarkdownField.jsx` — a controlled edit+preview field with a Bold/Italic/Heading/Bulleted-list toolbar (native-undo-safe via `markdownToolbar.js`'s value-setter + dispatched `input` event), unbounded auto-grow, and a native CSS `@container mdfield (min-width: 480px)` rule that switches between an Edit/Preview tab strip (narrow, opens on Edit) and a side-by-side grid split (wide)
- Wired the full stack into `CharacterModal.jsx`: unlinked-branch `PersonalityTraits`/`Flaw`/`Description`/`QuestHooks` and linked-branch `SessionNotes` now use `MarkdownField`; the linked-branch read-only personality "Shared Info" summary now renders through `MarkdownPreview` instead of raw string interpolation; both `Inventory` textareas were deliberately left untouched (structured list, not prose)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install markdown stack + build render-only preview and strip-markdown utility** - `11db01d` (feat)
2. **Task 2: Build MarkdownField (edit+preview) with toolbar, auto-grow, and container-query split view** - `c0249d7` (feat)
3. **Task 3: Wire MarkdownField + MarkdownPreview into the in-session Character modal** - `29c033b` (feat)

_Note: worktree/parallel-execution mode — the plan-completion metadata commit (STATE.md/ROADMAP.md) is owned by the orchestrator after wave merge, not this executor._

## Files Created/Modified
- `package.json` / `package-lock.json` - Added the 4 locked markdown dependencies
- `src/client/components/markdown/MarkdownPreview.jsx` - Render-only markdown component, default export `MarkdownPreview({ value, className, emptyText })`
- `src/client/components/markdown/MarkdownField.jsx` - Controlled edit+preview field, default export `MarkdownField({ value, onChange, className, placeholder })`
- `src/client/components/markdown/markdownToolbar.js` - Pure functions `setNativeTextareaValue`, `wrapSelection`, `insertAtCursor`
- `src/client/components/markdown/stripMarkdown.js` - `stripMarkdown(source)` AST-based plain-text reducer (unused by this plan; ships for Plan 02/03's card-preview sites)
- `src/client/index.css` - Added `.markdown-preview` and `.markdown-field` scoped CSS blocks (dark-theme typography + `@container mdfield` split-view rule)
- `src/client/components/character/CharacterModal.jsx` - Swapped 4 unlinked-branch textareas + 1 linked-branch textarea to `MarkdownField`, 1 read-only display to `MarkdownPreview`

## Decisions Made
- For the linked-branch `SessionNotes` `MarkdownField` call site, followed the plan's literal example JSX exactly (no `className` prop) since `MarkdownField`'s own wrapper already supplies the border/background/rounded chrome; the four unlinked-branch prose fields pass the existing `inp` class through `className` per the plan's explicit instruction (matches `02-PATTERNS.md`'s drop-in-replacement example).
- `stripMarkdown.js` was built per Task 1's scope but has no call site in this plan — it exists for Plan 02/03's card-preview truncation sites (D-13), consistent with the phase's stated multi-plan rollout.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `MarkdownPreview` and `MarkdownField` are proven end-to-end at one real usage site and ready for Plan 02/03 to roll out to the Library forms and remaining Location/SessionNotes sites without further foundational work.
- `stripMarkdown.js` is built and ready for the card-preview truncation sites named in `02-PATTERNS.md` (D-13) — not consumed by this plan.
- All manual UAT items (D1-D5 in the coverage table above) are `status: unknown` pending human verification per this project's manual-UAT-only convention (no frontend test framework); the phase-level `gsd-verify-work` pass should exercise these against the running `npm run dev` server.

---
*Phase: 02-markdown-editing-character-location-fields*
*Completed: 2026-07-12*

## Self-Check: PASSED

- FOUND: src/client/components/markdown/MarkdownPreview.jsx
- FOUND: src/client/components/markdown/MarkdownField.jsx
- FOUND: src/client/components/markdown/markdownToolbar.js
- FOUND: src/client/components/markdown/stripMarkdown.js
- FOUND: .planning/phases/02-markdown-editing-character-location-fields/02-01-SUMMARY.md
- FOUND: commit 11db01d
- FOUND: commit c0249d7
- FOUND: commit 29c033b
