---
status: testing
phase: 02-markdown-editing-character-location-fields
source: [02-VERIFICATION.md]
started: 2026-07-12T00:00:00Z
updated: 2026-07-12T15:10:00Z
---

## Current Test

number: 3
name: Native Ctrl+Z undo after toolbar insertion (RE-TEST after gap-closure fix)
expected: |
  Clicking Bold to wrap a selection, typing more text, then pressing Ctrl+Z undoes the Bold insertion as its own discrete step. This was previously reported as not working (see prior report below); plan 02-04 replaced the mutation mechanism with `textarea.setRangeText(...)` specifically to fix this. A follow-up fix (commit 528c6c9) also changed the selection-restore from requestAnimationFrame to synchronous, since the async version was silently losing a race against React's own re-render — this was found while investigating a separate reported caret-position bug, and it means Bold/Italic wrapping now also correctly re-selects just the wrapped text (e.g. "hello" inside "**hello**"), not the whole "**hello**" span as before. Requires a rebuild (`start.bat`) to pick up the fix before testing.
awaiting: user response

## Tests

### 1. Container-query split view at both breakpoints
expected: Narrow character fields (~330px) show Edit/Preview tabs defaulting to Edit; wide location fields (~540px) show side-by-side split with no tabs; browser-window resizing alone never flips the mode.
result: pass

### 2. Unbounded auto-grow, no internal scrollbar
expected: Typing several paragraphs into any MarkdownField grows the textarea taller; no internal scrollbar appears; the containing modal scrolls instead.
result: pass

### 3. Native Ctrl+Z undo after toolbar insertion
expected: Clicking Bold to wrap a selection, typing more text, then pressing Ctrl+Z undoes the Bold insertion as its own discrete step.
result: [pending]
note: RE-TEST after gap-closure fix (plan 02-04, commit 527a4ad + follow-up WR-01 fix in commit 3428e0c). Original report below is preserved for history.
previously_reported: "ctrl + z doesn't seem to do anything inside a markdown text field"
previous_severity: major

### 4. Legacy plain-text regression + final dark-theme visual sign-off
expected: Existing single-Enter-separated plain-text content still renders those line breaks visibly; headings/lists/emphasis/blockquote/code all read cleanly against the dark background across all 6 usage sites.
result: pass

## Summary

total: 4
passed: 3
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

- truth: "Clicking Bold to wrap a selection, typing more text, then pressing Ctrl+Z undoes the Bold insertion as its own discrete step."
  status: fix_applied_pending_reconfirmation
  reason: "User reported: ctrl + z doesn't seem to do anything inside a markdown text field"
  severity: major
  test: 3
  root_cause: "markdownToolbar.js's setNativeTextareaValue() mutates the textarea via the native HTMLTextAreaElement.prototype.value setter + dispatchEvent(new Event('input')). This fixes React's controlled-input reconciliation but does NOT preserve the browser's native undo stack — browsers only track undo history through the real editing pipeline (keystrokes, IME, cut/paste, execCommand), not synthetic 'input' events. Confirmed via Mozilla Bugzilla #1523270 and code inspection: the pattern documented in 02-RESEARCH.md Pattern 4 / 02-CONTEXT.md D-08 as 'preserving native undo' does not actually do so. Not a global keyboard-shortcut interception issue (ruled out: no onKeyDown/preventDefault/stopPropagation anywhere in MarkdownField.jsx, markdownToolbar.js, or App.jsx's global shortcut handler). Plain typing is unaffected since it never calls setNativeTextareaValue."
  artifacts:
    - path: "src/client/components/markdown/markdownToolbar.js"
      issue: "setNativeTextareaValue() (native setter + dispatchEvent) does not register with the browser's native undo manager"
    - path: "src/client/components/markdown/MarkdownField.jsx"
      issue: "Wires all 4 toolbar buttons to the flawed wrapSelection()/insertAtCursor() functions — no bug here itself, but this is where the fix's call sites live"
    - path: ".planning/phases/02-markdown-editing-character-location-fields/02-RESEARCH.md"
      issue: "Pattern 4 / Pitfall 1 contains the incorrect undo-preservation rationale — should be corrected alongside the code fix"
  missing:
    - "Replace the native-setter + dispatchEvent approach in wrapSelection()/insertAtCursor() with textarea.setRangeText(replacement, start, end, selectMode) — goes through the browser's real editing pipeline, is undo-tracked, and still fires a genuine 'input' event React's reconciliation picks up naturally (supported in all modern evergreen browsers including Safari 14.1+)"
  debug_session: .planning/debug/DEBUG-markdown-toolbar-undo.md
