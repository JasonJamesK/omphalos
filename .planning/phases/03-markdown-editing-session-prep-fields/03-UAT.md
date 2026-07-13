---
status: testing
phase: 03-markdown-editing-session-prep-fields
source: [03-VERIFICATION.md]
started: 2026-07-13T07:59:40Z
updated: 2026-07-13T07:59:40Z
---

## Current Test

number: 1
name: Overview & Hook — markdown write, live preview, save/reload persistence
expected: |
  Live preview renders correctly as markdown is typed; both raw markdown and rendered preview survive a page reload.
awaiting: user response

## Tests

### 1. Overview & Hook — markdown write, live preview, save/reload persistence
expected: Live preview renders correctly as markdown is typed (side-by-side on a normal desktop window; Edit/Preview tab toggle on a narrow window); both raw markdown and rendered preview survive a page reload.
result: [pending]

### 2. Notes, Callout, and Loot description — markdown write, live preview, save/reload persistence
expected: Live preview renders for Notes body, Callout body, and Loot item description; content persists across reload for all three.
result: [pending]

### 3. Callout border-color distinction under the new nested chrome
expected: Amber/green border remains an unambiguous semantic marker; no forced-italic styling anywhere on the Callout body.
result: [pending]

### 4. Loot list key-stability — Edit/Preview tab state survives delete/reorder
expected: Edit/Preview tab state (and MarkdownField's internal auto-grow height) stays attached to its logical item after delete/reorder, not to its list position.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
