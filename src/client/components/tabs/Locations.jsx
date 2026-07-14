import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import DeleteConfirm from '../DeleteConfirm'
import AddLocationModal from '../location/AddLocationModal'
import MarkdownField from '../markdown/MarkdownField'
import MarkdownPreview from '../markdown/MarkdownPreview'
import { stripMarkdown } from '../markdown/stripMarkdown'
import { sessionLocationImageUrl } from '../../utils/imageUrls'

const inputCls = 'w-full bg-[#161310] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574] resize-none'
const labelCls = 'block text-xs text-[#999999] mb-1'

// ─── Edit session-location modal ─────────────────────────────────────────────
function EditLocationModal({ loc, sessionId, onSave, onClose }) {
  const [sessionNotes, setSessionNotes] = useState(loc.sessionNotes || '')
  const imageUrl = sessionLocationImageUrl(loc, sessionId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-[#211b17] rounded-lg w-[560px] max-h-[90vh] overflow-y-auto fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#211b17] border-b border-[#332922] px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-[#d4a574]">{loc.name}</h2>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          {/* Read-only shared data */}
          <div className="bg-[#161310] rounded p-3 space-y-2">
            <p className="text-xs text-[#999999] uppercase tracking-wide font-semibold mb-2 flex items-center gap-2">
              Shared Info
              <span className="text-[#555] normal-case tracking-normal font-normal">— edit in the Library to update the source</span>
            </p>
            {imageUrl && (
              <div className="overflow-hidden rounded" style={{ width: '100%', maxWidth: 280, aspectRatio: '4 / 3' }}>
                <img src={imageUrl} alt={loc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            {loc.type && <p className="text-xs text-[#d4a574]">{loc.type}</p>}
            {loc.description && <MarkdownPreview value={loc.description} className="text-sm text-[#d4d4d4]" />}
            {loc.secretsAndHazards && (
              <div className="pt-1">
                <p className="text-xs text-[#b24545] font-semibold uppercase tracking-wide mb-1">Secrets / Hazards</p>
                {stripMarkdown(loc.secretsAndHazards).split('\n').filter(Boolean).map((line, i) => (
                  <p key={i} className="text-xs text-[#f0f0f0] flex gap-1.5"><span className="text-[#b24545]">▸</span>{line}</p>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>Session Notes</label>
            <MarkdownField
              value={sessionNotes}
              onChange={setSessionNotes}
              textareaClassName={inputCls}
              placeholder="What happened here this session? Player discoveries, events, changes..."
              autoFocus
            />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-[#332922]">
            <button onClick={onClose} className="px-4 py-2 bg-[#332922] text-[#f0f0f0] rounded hover:bg-[#40332a] transition-colors">Cancel</button>
            <button
              onClick={() => onSave({ ...loc, sessionNotes: sessionNotes.trim() || null })}
              className="px-4 py-2 bg-[#d4a574] text-[#161310] rounded font-medium hover:bg-[#c49464] transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Location card ────────────────────────────────────────────────────────────
function LocationCard({ loc, sessionId, onEdit, onDelete }) {
  const hazardLines = stripMarkdown(loc.secretsAndHazards || '').split('\n').filter(Boolean)
  const isFromLibrary = !!loc.globalLocationId
  const imageUrl = sessionLocationImageUrl(loc, sessionId)

  return (
    <div className="bg-[#211b17] border border-[#332922] rounded-lg overflow-hidden hover:border-[#6b8e6b]/60 transition-colors group">
      {imageUrl && (
        <div className="w-full overflow-hidden" style={{ aspectRatio: '4 / 3' }}>
          <img src={imageUrl} alt={loc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <div className="px-4 py-3 flex items-start justify-between gap-2 border-b border-[#332922]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[#f0f0f0]">{loc.name || 'Unnamed Location'}</h3>
            {isFromLibrary && (
              <span className="text-xs bg-[#d4a574]/15 text-[#d4a574] px-1.5 py-0.5 rounded border border-[#d4a574]/30 flex-shrink-0">
                Library
              </span>
            )}
          </div>
          {loc.type && <p className="text-xs text-[#d4a574] mt-0.5">{loc.type}</p>}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={onEdit}
            className="px-2 py-0.5 text-xs bg-[#332922] text-[#f0f0f0] rounded hover:bg-[#40332a] transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-2 py-0.5 text-xs bg-[#b24545]/20 text-[#b24545] rounded hover:bg-[#b24545]/40 transition-colors"
          >
            Del
          </button>
        </div>
      </div>
      {loc.description && (
        <div className="px-4 py-3 text-sm text-[#d4d4d4] leading-relaxed">
          {(() => {
            const stripped = stripMarkdown(loc.description)
            return stripped.length > 220 ? stripped.slice(0, 220) + '…' : stripped
          })()}
        </div>
      )}
      {hazardLines.length > 0 && (
        <div className="px-4 py-3 border-t border-[#332922]">
          <p className="text-xs text-[#b24545] font-semibold mb-1.5 uppercase tracking-wide">Secrets / Hazards</p>
          <ul className="space-y-1">
            {hazardLines.map((line, i) => (
              <li key={i} className="text-xs text-[#f0f0f0] flex gap-1.5">
                <span className="text-[#b24545] flex-shrink-0">▸</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
      {loc.sessionNotes && (
        <div className="px-4 py-3 border-t border-[#332922] bg-[#161310]/50">
          <p className="text-xs text-[#6b8e6b] font-semibold mb-1 uppercase tracking-wide">Session Notes</p>
          <MarkdownPreview value={loc.sessionNotes} className="text-xs text-[#d4d4d4]" />
        </div>
      )}
    </div>
  )
}

// ─── Main Locations tab ───────────────────────────────────────────────────────
export default function Locations() {
  const { activeSession, state, dispatch } = useApp()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const locations = activeSession?.locations || []
  const globalLocations = state.globalLocations ?? []

  function handleAdd(locationData) {
    dispatch({ type: 'ADD_LOCATION', sessionId: activeSession.id, payload: locationData })
    setShowAddModal(false)
  }

  function handleEditSave(updated) {
    dispatch({ type: 'UPDATE_LOCATION', sessionId: activeSession.id, payload: updated })
    setEditing(null)
  }

  function handleDelete(id) {
    dispatch({ type: 'DELETE_LOCATION', sessionId: activeSession.id, payload: id })
    setDeleteTarget(null)
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[#d4a574] font-semibold text-sm uppercase tracking-wider">
          Locations <span className="text-[#666] font-normal normal-case">({locations.length})</span>
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[#d4a574] text-[#161310] rounded font-medium text-sm hover:bg-[#c49464] transition-colors"
        >
          + Add Location
        </button>
      </div>

      {locations.length === 0 ? (
        <div className="text-center text-[#999999] py-16">
          <div className="text-4xl mb-3">🗺</div>
          <p>No locations yet. Add one from the shared library!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {locations.map(loc => (
            <LocationCard
              key={loc.id}
              loc={loc}
              sessionId={activeSession.id}
              onEdit={() => setEditing({ ...loc })}
              onDelete={() => setDeleteTarget(loc)}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddLocationModal
          globalLocations={globalLocations}
          onAdd={handleAdd}
          onClose={() => setShowAddModal(false)}
          dispatch={dispatch}
        />
      )}

      {editing && (
        <EditLocationModal loc={editing} sessionId={activeSession.id} onSave={handleEditSave} onClose={() => setEditing(null)} />
      )}

      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
