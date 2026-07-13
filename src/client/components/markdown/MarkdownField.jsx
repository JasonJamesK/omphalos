import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import MarkdownPreview from './MarkdownPreview'
import { wrapSelection, insertAtCursor } from './markdownToolbar'

const btnCls = 'px-2 py-1 text-xs rounded transition-colors bg-[#332922] text-[#f0f0f0] hover:bg-[#40332a]'

function useAutoGrow(value) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || el.offsetParent === null) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return ref
}

// Tracks whether the field is currently rendering as a side-by-side split
// view (edit + preview both visible), which the `@container mdfield`
// query switches on at 480px regardless of `activeTab`. Toolbar-disabled
// state should follow actual pane visibility, not raw tab state.
function useIsSplitView(containerRef, forceTabs) {
  const [isSplitView, setIsSplitView] = useState(false)
  useEffect(() => {
    if (forceTabs) {
      setIsSplitView(false)
      return
    }
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setIsSplitView(entry.contentRect.width >= 480)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [containerRef, forceTabs])
  return isSplitView
}

export default function MarkdownField({ value, onChange, className = '', textareaClassName = '', placeholder = '', autoFocus = false, forceTabs = false }) {
  const [activeTab, setActiveTab] = useState('edit')
  const textareaRef = useAutoGrow(value)
  const containerRef = useRef(null)
  const isSplitView = useIsSplitView(containerRef, forceTabs)
  const toolbarDisabled = !isSplitView && activeTab !== 'edit'

  return (
    <div ref={containerRef} className={`markdown-field ${forceTabs ? 'markdown-field-force-tabs' : ''} border border-[#332922] rounded-lg bg-[#161310] ${className}`}>
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[#332922] bg-[#211b17]">
        <button type="button" disabled={toolbarDisabled} onClick={() => wrapSelection(textareaRef, '**')} className={`${btnCls} disabled:opacity-40 disabled:cursor-not-allowed`} title="Bold">
          <strong>B</strong>
        </button>
        <button type="button" disabled={toolbarDisabled} onClick={() => wrapSelection(textareaRef, '*')} className={`${btnCls} disabled:opacity-40 disabled:cursor-not-allowed`} title="Italic">
          <em>I</em>
        </button>
        <div className="w-px bg-[#332922] mx-1" />
        <button type="button" disabled={toolbarDisabled} onClick={() => insertAtCursor(textareaRef, '## ')} className={`${btnCls} disabled:opacity-40 disabled:cursor-not-allowed`} title="Heading">
          H
        </button>
        <button type="button" disabled={toolbarDisabled} onClick={() => insertAtCursor(textareaRef, '- ')} className={`${btnCls} disabled:opacity-40 disabled:cursor-not-allowed`} title="Bulleted list">
          •
        </button>
        <span className="markdown-field-hint ml-auto text-xs text-[#999999]">Markdown supported</span>
      </div>

      <div className="markdown-field-tabs flex gap-1 px-2 pt-2">
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${activeTab === 'edit' ? 'bg-[#d4a574] text-[#161310]' : 'bg-[#332922] text-[#f0f0f0] hover:bg-[#40332a]'}`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${activeTab === 'preview' ? 'bg-[#d4a574] text-[#161310]' : 'bg-[#332922] text-[#f0f0f0] hover:bg-[#40332a]'}`}
        >
          Preview
        </button>
      </div>

      <div className="markdown-field-body">
        <textarea
          ref={textareaRef}
          className={`markdown-field-textarea ${textareaClassName} ${activeTab === 'edit' ? '' : 'markdown-field-pane-hidden'}`}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
        <div className={`markdown-field-preview-pane ${activeTab === 'preview' ? '' : 'markdown-field-pane-hidden'}`}>
          <MarkdownPreview value={value} />
        </div>
      </div>
    </div>
  )
}
