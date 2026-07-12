// Replaces the `[start, end)` range of a textarea's text with `replacement` using
// setRangeText, which routes the edit through the browser's real text-editing
// pipeline (the same pipeline keystrokes, IME, and cut/paste use) so the change is
// recorded on the native undo stack as a discrete, undoable step. The textarea must
// be focused first, since the native editing/undo pipeline only tracks edits on the
// active element.
//
// A synthetic "input" event is dispatched afterward purely so React's controlled
// component reconciliation notices the value change and fires onChange to keep
// React state in sync — setRangeText is not guaranteed to emit an input event on
// its own. This dispatch is only a notification; it does not touch the undo stack.
function applyRangeEdit(textarea, start, end, replacement, selectionStart, selectionEnd) {
  if (!textarea) return
  textarea.focus()
  textarea.setRangeText(replacement, start, end, 'preserve')
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  requestAnimationFrame(() => {
    textarea.focus()
    textarea.setSelectionRange(selectionStart, selectionEnd)
  })
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
