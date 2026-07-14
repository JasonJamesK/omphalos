---
status: testing
phase: 02-markdown-editing-character-location-fields
source: [02-VERIFICATION.md]
started: 2026-07-12T00:00:00Z
updated: 2026-07-12T15:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Container-query split view at both breakpoints
expected: Narrow character fields (~330px) show Edit/Preview tabs defaulting to Edit; wide location fields (~540px) show side-by-side split with no tabs; browser-window resizing alone never flips the mode.
result: pass

### 2. Unbounded auto-grow, no internal scrollbar
expected: Typing several paragraphs into any MarkdownField grows the textarea taller; no internal scrollbar appears; the containing modal scrolls instead.
result: pass

### 3. Native Ctrl+Z undo after toolbar insertion
expected: Clicking Bold to wrap a selection, typing more text, then pressing Ctrl+Z undoes the Bold insertion as its own discrete step.
result: pass
note: Confirmed working by user against the rebuilt app after the execCommand rewrite (commit 92e4370). Took 3 attempts to land: (1) setNativeTextareaValue → setRangeText fix (plan 02-04, commit 527a4ad) plus a line-start off-by-one fix (commit 3428e0c) — still failed live. (2) Fixed a separate rAF-timing selection-restore race (commit 528c6c9) — still failed live. (3) Replaced setRangeText with document.execCommand('insertText', ...), matching the proven text-field-edit library's approach (commit 92e4370) — this one worked. Original report preserved below for history.
previously_reported: "ctrl + z doesn't seem to do anything inside a markdown text field"
previous_severity: major

### 4. Legacy plain-text regression + final dark-theme visual sign-off
expected: Existing single-Enter-separated plain-text content still renders those line breaks visibly; headings/lists/emphasis/blockquote/code all read cleanly against the dark background across all 6 usage sites.
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Clicking Bold to wrap a selection, typing more text, then pressing Ctrl+Z undoes the Bold insertion as its own discrete step."
  status: resolved
  reason: "User reported: ctrl + z doesn't seem to do anything inside a markdown text field"
  severity: major
  test: 3
  root_cause: "markdownToolbar.js's setNativeTextareaValue() mutated the textarea via the native HTMLTextAreaElement.prototype.value setter + dispatchEvent(new Event('input')). This satisfies React's controlled-input reconciliation but does NOT preserve the browser's native undo stack. The first replacement attempt (textarea.setRangeText(...), matching Mozilla/MDN guidance and Mozilla Bugzilla #1523270's framing of the problem) also failed live user re-testing — setRangeText did not reliably register with the undo manager for this scenario either, despite being the commonly-recommended modern API. The working fix was document.execCommand('insertText', ...), matching the approach used by text-field-edit (github.com/fregante/text-field-edit), a cross-browser library maintained specifically for reliable undo-preserving programmatic text insertion — execCommand goes through the same editing-command pipeline real keystrokes use, unlike setRangeText."
  artifacts:
    - path: "src/client/components/markdown/markdownToolbar.js"
      issue: "Rewritten twice: setNativeTextareaValue() -> setRangeText() (commit 527a4ad, insufficient) -> document.execCommand('insertText', ...) (commit 92e4370, confirmed working)"
    - path: ".planning/phases/02-markdown-editing-character-location-fields/02-RESEARCH.md"
      issue: "Pattern 4 / Pitfall 1 corrected once (commit d3cba1f) to describe setRangeText as the fix; that correction is now itself superseded by the execCommand switch and should be corrected again in a follow-up pass"
  missing: []
  debug_session: .planning/debug/DEBUG-markdown-toolbar-undo.md
  resolution_commits: [527a4ad, 3428e0c, d3cba1f, 528c6c9, 92e4370]
