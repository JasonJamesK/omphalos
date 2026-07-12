---
status: complete
phase: 02-markdown-editing-character-location-fields
source: [02-VERIFICATION.md]
started: 2026-07-12T00:00:00Z
updated: 2026-07-12T13:00:00Z
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
result: issue
reported: "ctrl + z doesn't seem to do anything inside a markdown text field"
severity: major

### 4. Legacy plain-text regression + final dark-theme visual sign-off
expected: Existing single-Enter-separated plain-text content still renders those line breaks visibly; headings/lists/emphasis/blockquote/code all read cleanly against the dark background across all 6 usage sites.
result: pass

## Summary

total: 4
passed: 3
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Clicking Bold to wrap a selection, typing more text, then pressing Ctrl+Z undoes the Bold insertion as its own discrete step."
  status: failed
  reason: "User reported: ctrl + z doesn't seem to do anything inside a markdown text field"
  severity: major
  test: 3
  artifacts: []
  missing: []
