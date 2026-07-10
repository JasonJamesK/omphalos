import { useRef } from 'react'
import { useApp } from '../context/AppContext'
import { logout } from '../db/index.js'

export default function TopBar({ onSettings, onNewSession, onExportPDF, onAdmin, onLibrary, libraryActive }) {
  const { state, dispatch, activeSession } = useApp()
  const titleRef = useRef(null)

  function handleTitleChange(e) {
    if (activeSession) {
      dispatch({
        type: 'UPDATE_SESSION',
        payload: { ...activeSession, title: e.target.value },
      })
    }
  }

  async function handleLogout() {
    await logout()
  }

  return (
    <div className="bg-[#211b17] border-b border-[#332922] flex items-center gap-3 px-4 flex-shrink-0" style={{ paddingTop: 0, paddingBottom: 0, lineHeight: 0 }}>
      {/* Logo */}
      <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Omphalos" className="w-auto flex-shrink-0 block" style={{ height: '128px', marginTop: '-16px', marginBottom: '-16px' }} />

      <div className="w-px h-8 bg-[#332922] flex-shrink-0" />

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
        onClick={onLibrary}
        className={`px-3 py-1.5 rounded text-xs transition-colors ${
          libraryActive
            ? 'bg-[#d4a574] text-[#161310] font-medium'
            : 'bg-[#332922] text-[#f0f0f0] hover:bg-[#40332a]'
        }`}
        title="Locations Library"
      >
        🗺 Library
      </button>

      <button
        onClick={onExportPDF}
        disabled={!activeSession}
        className="px-3 py-1.5 rounded text-xs bg-[#332922] text-[#f0f0f0] hover:bg-[#40332a] disabled:opacity-40 transition-colors"
        title="Export PDF (Ctrl+E)"
      >
        PDF
      </button>

      {state.user?.role === 'Admin' && (
        <button
          onClick={onAdmin}
          className="w-8 h-8 rounded-full bg-[#6b8e6b]/15 text-[#6b8e6b] hover:bg-[#6b8e6b]/25 transition-colors flex items-center justify-center text-base"
          title="User management"
        >
          👤
        </button>
      )}

      <button
        onClick={onSettings}
        className="w-8 h-8 rounded-full bg-[#d4a574]/15 text-[#d4a574] hover:bg-[#d4a574]/25 transition-colors flex items-center justify-center text-base"
        title="Settings (Ctrl+,)"
      >
        ⚙
      </button>

      <button
        onClick={handleLogout}
        className="w-8 h-8 rounded-full bg-[#b24545]/15 text-[#b24545] hover:bg-[#b24545]/25 transition-colors flex items-center justify-center text-sm"
        title={`Sign out (${state.user?.username})`}
      >
        ⏻
      </button>
    </div>
  )
}
