import { useRef } from 'react'
import { useApp } from '../context/AppContext'

export default function TopBar({ onSettings, onNewSession, onExportPDF }) {
  const { state, dispatch, activeSession } = useApp()
  const titleRef = useRef(null)

  function handleTitleChange(e) {
    if (activeSession) {
      dispatch({
        type: 'UPDATE_SESSION',
        payload: { id: activeSession.id, title: e.target.value },
      })
    }
  }

  return (
    <div className="bg-[#2d2d2d] border-b border-[#3d3d3d] flex items-center gap-3 px-4 flex-shrink-0" style={{ paddingTop: 0, paddingBottom: 0, lineHeight: 0 }}>
      {/* Logo */}
      <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Omphalos" className="w-auto flex-shrink-0 block" style={{ height: '128px', marginTop: '-16px', marginBottom: '-16px' }} />

      <div className="w-px h-8 bg-[#3d3d3d] flex-shrink-0" />

      {/* Session title */}
      {activeSession ? (
        <input
          ref={titleRef}
          className="flex-1 bg-transparent text-[#f0f0f0] font-semibold text-base focus:outline-none placeholder-[#555] border-b border-transparent focus:border-[#d4a574] transition-colors py-0.5"
          value={activeSession.title || ''}
          onChange={handleTitleChange}
          placeholder="Session title..."
          spellCheck={false}
        />
      ) : (
        <div className="flex-1 text-[#555] text-sm">No session selected</div>
      )}

      {/* Actions */}
      <button
        onClick={onExportPDF}
        disabled={!activeSession}
        className="px-3 py-1.5 rounded text-xs bg-[#3d3d3d] text-[#f0f0f0] hover:bg-[#4d4d4d] disabled:opacity-40 transition-colors"
        title="Export PDF (Ctrl+E)"
      >
        PDF
      </button>
      <button
        onClick={onSettings}
        className="w-8 h-8 rounded bg-[#3d3d3d] text-[#999999] hover:bg-[#4d4d4d] hover:text-[#f0f0f0] transition-colors flex items-center justify-center text-base"
        title="Settings"
      >
        ⚙
      </button>
    </div>
  )
}
