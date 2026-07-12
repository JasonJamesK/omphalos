// Replaces the `[start, end)` range of a textarea's text with `replacement` using
// setRangeText, which routes the edit through the browser's real text-editing
// pipeline (the same pipeline keystrokes, IME, and cut/paste use) so the change is
// recorded on the native undo stack as a discrete, undoable step. The textarea must
// be focused first, since the native editing/undo pipeline only tracks edits on the
// active element.
//
// The caller-supplied selectionStart/selectionEnd are restored synchronously, right
// after setRangeText and before the input event below — not via requestAnimationFrame.
// setRangeText's own 'preserve' select-mode only shifts a selection that sat strictly
// after the edited range; a selection sitting exactly at the edit boundary (e.g. an
// empty cursor at the insertion point) is left untouched, which is wrong for every
// caller here. A requestAnimationFrame-deferred restore doesn't reliably fix this
// either: by the time it runs, React's own re-render (triggered by the dispatched
// input event) has already re-committed the textarea and reset selectionStart/End,
// discarding the deferred restore. Restoring synchronously, before React even knows
// about the change, is what actually sticks.
//
// The synthetic "input" event dispatched afterward exists purely so React's
// controlled-component reconciliation notices the value change and fires onChange to
// keep React state in sync — setRangeText is not guaranteed to emit an input event on
// its own. This dispatch is only a notification; it does not touch the undo stack.
function applyRangeEdit(textarea, start, end, replacement, selectionStart, selectionEnd) {
  if (!textarea) return
  textarea.focus()
  textarea.setRangeText(replacement, start, end, 'preserve')
  textarea.setSelectionRange(selectionStart, selectionEnd)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

// Wraps the current selection with `before`/`after` markdown syntax (e.g. bold, italic).
export function wrapSelection(textareaRef, before, after = before) {
  const el = textareaRef.current
  if (!el) return
  const { selectionStart: start, selectionEnd: end, value } = el
  const selected = value.slice(start, end)
  applyRangeEdit(el, start, end, before + selected + after, start + before.length, start + before.length + selected.length)
}

// Inserts `text` at the start of the current line (e.g. heading, bullet-list prefixes).
export function insertAtCursor(textareaRef, text) {
  const el = textareaRef.current
  if (!el) return
  const { selectionStart: start, value } = el
  const lineStart = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1
  applyRangeEdit(el, lineStart, lineStart, text, start + text.length, start + text.length)
}
