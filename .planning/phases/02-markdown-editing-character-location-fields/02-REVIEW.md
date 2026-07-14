---
phase: 02-markdown-editing-character-location-fields
reviewed: 2026-07-12T15:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - src/client/components/markdown/markdownToolbar.js
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-07-12T15:00:00Z
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Reviewed `src/client/components/markdown/markdownToolbar.js`, rewritten by gap-closure plan 02-04 to fix a UAT-reported bug where Ctrl+Z didn't undo toolbar insertions. The rewrite replaces the previous native-setter + `dispatchEvent` mutation path with `textarea.setRangeText(...)`, which is the correct fix per the root-cause diagnosis in `.planning/debug/DEBUG-markdown-toolbar-undo.md` (native `.value` assignment does not route through the browser's real text-editing pipeline and therefore breaks native undo history; `setRangeText` does).

The core fix is sound and the undo-preservation rationale documented in the comments is accurate. However, `insertAtCursor`'s line-start calculation has a genuine off-by-one edge case triggered when the cursor sits at absolute position 0 of a value whose first character is a newline (e.g. a leading blank line) — reproduced independently below. A few minor code-quality nits round out the findings; none are security-relevant since all mutated text originates from hardcoded toolbar syntax, not user-controlled markup.

## Warnings

### WR-01: `insertAtCursor` misplaces the line-start when cursor is at position 0 and the field starts with a newline

**File:** `src/client/components/markdown/markdownToolbar.js:37`
**Issue:**
```js
const lineStart = value.lastIndexOf('\n', start - 1) + 1
```
This idiom assumes `String.prototype.lastIndexOf(searchValue, negativeIndex)` behaves like "not found" (returns `-1`), which would make `lineStart` correctly resolve to `0` when the cursor is at the very start of the field. That assumption is wrong: per spec, a negative `fromIndex` is clamped to `0`, not treated as "no match possible" — `lastIndexOf` still checks index `0` for a match.

Concretely, when `start === 0` and `value[0] === '\n'` (cursor on an empty first line, with more content below), `value.lastIndexOf('\n', -1)` returns `0` (matching the newline that is actually *after* the cursor), so `lineStart` becomes `1` instead of the correct `0`. The inserted heading/bullet prefix ends up on the wrong line — attached to the start of line 2's content instead of the empty line 1 where the cursor actually was.

Reproduced directly:
```
$ node -e "console.log('\nSecond line'.lastIndexOf('\n', -1))"
0   // expected -1 (no newline before position 0)
```
So for `MarkdownField`'s Heading button (`insertAtCursor(textareaRef, '## ')`) on a field whose content is `"\nSecond line"` with the cursor at position 0, the result is `"\n## Second line"` (prefix applied to line 2) instead of the expected `"## \nSecond line"` (prefix applied to the empty line 1).

**Fix:** Guard the `start === 0` case explicitly, since it's the one case where "no preceding newline" must not be confused with "there happens to be a newline at index 0":
```js
export function insertAtCursor(textareaRef, text) {
  const el = textareaRef.current
  if (!el) return
  const { selectionStart: start, value } = el
  const lineStart = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1
  applyRangeEdit(el, lineStart, lineStart, text, start + text.length, start + text.length)
}
```

## Info

### IN-01: Redundant double `focus()` call

**File:** `src/client/components/markdown/markdownToolbar.js:14,18`
**Issue:** `applyRangeEdit` calls `textarea.focus()` synchronously at the top of the function, then calls it again inside the `requestAnimationFrame` callback a few lines later. The comment block only explains why focus is needed before `setRangeText` (line 4-6); it doesn't explain why a second focus call is needed afterward. If it's defensive (e.g. guarding against focus being stolen by the React re-render triggered by the dispatched `input` event), that reasoning isn't stated and is worth a one-line comment; otherwise it's dead redundancy.
**Fix:** Either remove the second `textarea.focus()` call if it's provably unnecessary, or add a short comment explaining what re-render/timing hazard it guards against, e.g.:
```js
requestAnimationFrame(() => {
  // React's controlled-component re-render (triggered by the dispatched
  // input event above) can occur between the calls above and this frame;
  // re-focus defensively before restoring the selection.
  textarea.focus()
  textarea.setSelectionRange(selectionStart, selectionEnd)
})
```

### IN-02: Forced re-focus in `requestAnimationFrame` can steal focus from the user

**File:** `src/client/components/markdown/markdownToolbar.js:17-20`
**Issue:** The `requestAnimationFrame` callback unconditionally calls `textarea.focus()` before restoring the selection. If the user manages to click into a different field (or tab away) in the brief window between the toolbar click and the next animation frame (~16ms, but not impossible with fast keyboard nav or scripted/automated interaction), this forcibly yanks focus back to the textarea, discarding the user's newer focus target.
**Fix:** Consider guarding the re-focus so it only fires if nothing else has claimed focus in the interim, e.g.:
```js
requestAnimationFrame(() => {
  if (document.activeElement !== textarea) return
  textarea.setSelectionRange(selectionStart, selectionEnd)
})
```
(Note: this changes the double-focus behavior noted in IN-01 too — resolve both together.)

### IN-03: `insertAtCursor` only applies the line-prefix to the line containing `selectionStart`, silently ignoring multi-line selections

**File:** `src/client/components/markdown/markdownToolbar.js:33-39`
**Issue:** When the user selects text spanning multiple lines and clicks Heading or Bulleted-list, only the line containing `selectionStart` gets the prefix; the rest of the selected lines are left untouched with no indication to the user that the action only affected one line. This isn't a regression introduced by this rewrite (the same single-line behavior existed before), but it's worth flagging since it's easy to misread as "apply to all selected lines" given how list/heading toolbar buttons typically behave in other markdown editors.
**Fix:** Out of scope for this bug-fix pass, but worth a follow-up ticket if multi-line prefixing is desired: iterate over each line boundary between `selectionStart` and `selectionEnd` and prefix each one, building a single combined replacement range and passing it through `applyRangeEdit` once.

---

_Reviewed: 2026-07-12T15:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
