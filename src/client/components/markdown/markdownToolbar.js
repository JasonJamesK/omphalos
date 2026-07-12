// Replaces the `[start, end)` range of a textarea's text with `replacement` using
// document.execCommand('insertText', ...) rather than setRangeText. setRangeText is
// the newer, spec-recommended API, but in real-browser testing here it did not
// reliably register with the native undo (Ctrl+Z) stack for this toolbar's use case.
// execCommand('insertText') goes through the same editing-command pipeline real
// keystrokes use, which is why battle-tested cross-browser text-editing libraries
// (e.g. https://github.com/fregante/text-field-edit, used across many browser
// extensions specifically for reliable undo-preserving programmatic text insertion)
// use it over setRangeText despite it being marked deprecated in the HTML spec —
// deprecated-in-spec has not meant unreliable-in-practice here. execCommand also
// fires a genuine (non-synthetic) input event as part of its own operation, so no
// manual dispatchEvent call is needed for React's onChange to fire.
//
// execCommand operates on the field's *current selection*, so the range to replace
// is first selected, then execCommand replaces it. The textarea must be focused —
// clicking a toolbar button moves focus to the button first, so focus is restored
// to the textarea before execCommand runs.
function replaceRange(textarea, start, end, replacement) {
  if (!textarea) return
  textarea.setSelectionRange(start, end)
  if (document.activeElement !== textarea) textarea.focus()
  if (replacement === '') {
    document.execCommand('delete')
  } else {
    document.execCommand('insertText', false, replacement)
  }
}

// Wraps the current selection with `before`/`after` markdown syntax (e.g. bold, italic).
export function wrapSelection(textareaRef, before, after = before) {
  const el = textareaRef.current
  if (!el) return
  const { selectionStart: start, selectionEnd: end, value } = el
  const selected = value.slice(start, end)
  replaceRange(el, start, end, before + selected + after)
  // Reselect the originally-selected text, now sitting inside the markers.
  el.selectionStart = start + before.length
  el.selectionEnd = start + before.length + selected.length
}

// Inserts `text` at the start of the current line (e.g. heading, bullet-list prefixes).
export function insertAtCursor(textareaRef, text) {
  const el = textareaRef.current
  if (!el) return
  const { selectionStart: start, value } = el
  const lineStart = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1
  replaceRange(el, lineStart, lineStart, text)
  el.selectionStart = start + text.length
  el.selectionEnd = start + text.length
}
