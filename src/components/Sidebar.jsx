import { useState } from 'react'
import { useApp } from '../context/AppContext'
import DeleteConfirm from './DeleteConfirm'
import { db } from '../db/index.js'

export default function Sidebar({ onNewSession }) {
  const { state, dispatch, activeSession } = useApp()
  const [deleteTarget, setDeleteTarget] = useState(null)

  const collapsed = state.sidebarCollapsed

  async function handleDelete(id) {
    dispatch({ type: 'DELETE_SESSION', payload: id })
    await db.deleteSession(id).catch(() => {})
    setDeleteTarget(null)
  }

  if (collapsed) {
    return (
      <div className="w-12 bg-[#2d2d2d] border-r border-[#3d3d3d] flex flex-col items-center pt-2 gap-2 flex-shrink-0">
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3d3d3d] text-[#d4a574] text-lg transition-colors"
          title="Expand sidebar"
        >
          ›
        </button>
        <div className="w-6 h-px bg-[#3d3d3d]" />
        {state.sessions.map(s => (
          <button
            key={s.id}
            onClick={() => dispatch({ type: 'SET_ACTIVE_SESSION', payload: s.id })}
            className={`w-8 h-8 rounded text-xs font-bold transition-colors ${
              s.id === state.activeSessionId
                ? 'bg-[#d4a574] text-[#1a1a1a]'
                : 'bg-[#3d3d3d] text-[#f0f0f0] hover:bg-[#4d4d4d]'
            }`}
            title={s.title}
          >
            {s.title?.[0] || 'S'}
          </button>
        ))}
        <button
          onClick={onNewSession}
          className="w-8 h-8 mt-auto rounded hover:bg-[#3d3d3d] text-[#d4a574] text-xl flex items-center justify-center transition-colors"
          title="New session"
        >
          +
        </button>
      </div>
    )
  }

  return (
    <div className="w-[260px] flex-shrink-0 bg-[#2d2d2d] border-r border-[#3d3d3d] flex flex-col overflow-hidden">
      {/* Collapse button */}
      <div className="flex justify-end px-2 pt-2">
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          className="text-[#999999] hover:text-[#f0f0f0] text-lg transition-colors px-1"
          title="Collapse sidebar (Ctrl+B)"
        >
          ‹
        </button>
      </div>

      {/* New Session button */}
      <div className="px-3 py-2">
        <button
          onClick={onNewSession}
          className="w-full py-2 px-3 bg-[#d4a574] text-[#1a1a1a] rounded font-medium text-sm hover:bg-[#c49464] transition-colors"
        >
          + New Session
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {state.sessions.length === 0 && (
          <p className="text-[#999999] text-xs text-center py-8 px-3">No sessions yet. Create one to get started.</p>
        )}
        {[...state.sessions].reverse().map(s => {
          const active = s.id === state.activeSessionId
          const date = new Date(s.dateModified || s.dateCreated).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short',
          })
          return (
            <div
              key={s.id}
              onClick={() => dispatch({ type: 'SET_ACTIVE_SESSION', payload: s.id })}
              className={`group flex items-start justify-between rounded-lg px-3 py-2.5 mb-1 cursor-pointer transition-all ${
                active
                  ? 'bg-[#3d3d3d] border border-[#d4a574]/40'
                  : 'hover:bg-[#3d3d3d] border border-transparent'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${active ? 'text-[#d4a574]' : 'text-[#f0f0f0]'}`}>
                  {s.title || 'Untitled Session'}
                </div>
                <div className="text-xs text-[#999999] mt-0.5">{date}</div>
                <div className="text-xs text-[#666] mt-0.5">
                  {(s.characters?.length || 0)}c · {(s.locations?.length || 0)}l · {(s.encounters?.length || 0)}e
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setDeleteTarget(s) }}
                className="opacity-0 group-hover:opacity-100 text-[#666] hover:text-[#b24545] transition-all ml-2 text-sm flex-shrink-0 mt-0.5"
                title="Delete session"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.title || 'Untitled Session'}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
