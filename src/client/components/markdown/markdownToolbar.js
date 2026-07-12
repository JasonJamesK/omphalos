// Sets a textarea's value through the native property setter and dispatches a
// real DOM "input" event, so the browser's native undo stack (Ctrl+Z) tracks
// the change as a discrete step. A plain React setState splice updates what
// the user sees but leaves the DOM's internal value tracker out of sync,
// silently breaking undo for that keystroke.
export function setNativeTextareaValue(textarea, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
  setter.call(textarea, value)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

// Wraps the current selection with `before`/`after` markdown syntax (e.g. bold, italic).
export function wrapSelection(textareaRef, before, after = before) {
  const el = textareaRef.current
  if (!el) return
  const { selectionStart: start, selectionEnd: end, value } = el
  const selected = value.slice(start, end)
  const next = value.slice(0, start) + before + selected + after + value.slice(end)
  setNativeTextareaValue(el, next)
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(start + before.length, start + before.length + selected.length)
  })
}

// Inserts `text` at the start of the current line (e.g. heading, bullet-list prefixes).
export function insertAtCursor(textareaRef, text) {
  const el = textareaRef.current
  if (!el) return
  const { selectionStart: start, value } = el
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const next = value.slice(0, lineStart) + text + value.slice(lineStart)
  setNativeTextareaValue(el, next)
  requestAnimationFrame(() => {
    el.focus()
    const cursor = start + text.length
    el.setSelectionRange(cursor, cursor)
  })
}
