---
status: testing
phase: 02-markdown-editing-character-location-fields
source: [02-VERIFICATION.md]
started: 2026-07-12T00:00:00Z
updated: 2026-07-12T00:00:00Z
---

## Current Test

number: 1
name: Container-query split view at both breakpoints
expected: |
  Narrow character fields (~330px, CharacterModal) show an Edit/Preview tab toggle defaulting to Edit. Wide location fields (~540px, Library/AddLocationModal) show side-by-side edit+preview with no tab strip. Resizing the browser window alone does not flip either mode — the switch is container-driven, not viewport-driven.
awaiting: user response

## Tests

### 1. Container-query split view at both breakpoints
expected: Narrow character fields (~330px) show Edit/Preview tabs defaulting to Edit; wide location fields (~540px) show side-by-side split with no tabs; browser-window resizing alone never flips the mode.
result: [pending]
note: Orchestrator pre-verified this programmatically via computed styles in a live dev-server browser session — confirmed 327px-wide character fields render `display:flex` with visible tab buttons, and 534px-wide location fields render `display:grid; grid-template-columns:258px 258px` with tabs at `display:none`. High confidence this passes; a quick visual glance is still worth doing since this only checked computed CSS, not final pixel appearance.

### 2. Unbounded auto-grow, no internal scrollbar
expected: Typing several paragraphs into any MarkdownField grows the textarea taller; no internal scrollbar appears; the containing modal scrolls instead.
result: [pending]
note: Orchestrator pre-verified this directly — grew a textarea from 69px to 2241px by injecting ~20 paragraphs, confirmed `offsetHeight === scrollHeight` (no internal scroll) and `max-height: none`. High confidence this passes.

### 3. Native Ctrl+Z undo after toolbar insertion
expected: Clicking Bold to wrap a selection, typing more text, then pressing Ctrl+Z undoes the Bold insertion as its own discrete step.
result: [pending]
note: Orchestrator attempted this via browser automation and could NOT confirm — but also could not get Ctrl+Z to undo a plain, unmodified, genuinely-typed baseline ("abc" → Ctrl+Z did not revert to empty either), indicating the automated browser environment does not reliably deliver undo-stack keypresses at all (a tooling limitation, not evidence of an app bug). This item was NOT resolved either way and genuinely needs your real keyboard.

### 4. Legacy plain-text regression + final dark-theme visual sign-off
expected: Existing single-Enter-separated plain-text content still renders those line breaks visibly; headings/lists/emphasis/blockquote/code all read cleanly against the dark background across all 6 usage sites.
result: [pending]
note: Orchestrator pre-verified the mechanical part — injected 3-line plain text with single `\n` separators into a live field and confirmed the rendered preview HTML contains `<br>` between each line (`<p>First line...<br>\nSecond line...<br>\nThird line...</p>`). The remaining part — final aesthetic/visual polish across all 6 usage sites — is a genuine human judgment call and was not attempted by the orchestrator.

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
