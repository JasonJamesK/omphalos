import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import DeleteConfirm from '../DeleteConfirm'

function uid() {
  return `loc-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function emptyLocation() {
  return { id: uid(), name: '', description: '', secretsAndHazards: '' }
}

function LocationModal({ loc, onSave, onClose }) {
  const [form, setForm] = useState({ ...loc })

  const inputCls = 'w-full bg-[#1a1a1a] border border-[#3d3d3d] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574] resize-none'
  const labelCls = 'block text-xs text-[#999999] mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-[#2d2d2d] rounded-lg w-[560px] max-h-[90vh] overflow-y-auto fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#2d2d2d] border-b border-[#3d3d3d] px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-[#d4a574]">{form.name || 'New Location'}</h2>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Name</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Location name..."
              autoFocus
            />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={inputCls}
              rows={5}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe the location — appearance, atmosphere, notable features..."
            />
          </div>
          <div>
            <label className={labelCls}>Secrets & Hazards</label>
            <textarea
              className={inputCls}
              rows={4}
              value={form.secretsAndHazards}
              onChange={e => setForm(p => ({ ...p, secretsAndHazards: e.target.value }))}
              placeholder="Hidden passages, traps, lore secrets, environmental hazards... (one per line)"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-[#3d3d3d]">
            <button onClick={onClose} className="px-4 py-2 bg-[#3d3d3d] text-[#f0f0f0] rounded hover:bg-[#4d4d4d] transition-colors">
              Cancel
            </button>
            <button
              onClick={() => onSave(form)}
              disabled={!form.name.trim()}
              className="px-4 py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-medium hover:bg-[#c49464] transition-colors disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function LocationCard({ loc, onEdit, onDelete }) {
  const lines = (loc.secretsAndHazards || '').split('\n').filter(Boolean)

  return (
    <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg overflow-hidden hover:border-[#6b8e6b]/60 transition-colors group">
      <div className="px-4 py-3 flex items-start justify-between gap-2 border-b border-[#3d3d3d]">
        <h3 className="font-semibold text-[#f0f0f0]">{loc.name || 'Unnamed Location'}</h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={onEdit}
            className="px-2 py-0.5 text-xs bg-[#3d3d3d] text-[#f0f0f0] rounded hover:bg-[#4d4d4d] transition-colors"
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
          {loc.description.length > 220 ? loc.description.slice(0, 220) + '…' : loc.description}
        </div>
      )}
      {lines.length > 0 && (
        <div className="px-4 py-3 border-t border-[#3d3d3d]">
          <p className="text-xs text-[#b24545] font-semibold mb-1.5 uppercase tracking-wide">Secrets / Hazards</p>
          <ul className="space-y-1">
            {lines.map((line, i) => (
              <li key={i} className="text-xs text-[#f0f0f0] flex gap-1.5">
                <span className="text-[#b24545] flex-shrink-0">▸</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function Locations() {
  const { activeSession, dispatch } = useApp()
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const locations = activeSession?.locations || []

  function handleSave(form) {
    const exists = locations.find(l => l.id === form.id)
    if (exists) {
      dispatch({ type: 'UPDATE_LOCATION', sessionId: activeSession.id, payload: form })
    } else {
      dispatch({ type: 'ADD_LOCATION', sessionId: activeSession.id, payload: form })
    }
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
          onClick={() => setEditing(emptyLocation())}
          className="px-4 py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-medium text-sm hover:bg-[#c49464] transition-colors"
        >
          + New Location
        </button>
      </div>

      {locations.length === 0 ? (
        <div className="text-center text-[#999999] py-16">
          <div className="text-4xl mb-3">🗺</div>
          <p>No locations yet. Add your first location!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {locations.map(loc => (
            <LocationCard
              key={loc.id}
              loc={loc}
              onEdit={() => setEditing({ ...loc })}
              onDelete={() => setDeleteTarget(loc)}
            />
          ))}
        </div>
      )}

      {editing && (
        <LocationModal loc={editing} onSave={handleSave} onClose={() => setEditing(null)} />
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
