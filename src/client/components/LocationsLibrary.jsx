import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { db } from '../db/index.js'
import DeleteConfirm from './DeleteConfirm'

function uid() {
  return `gloc-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function emptyGlobalLocation() {
  return { id: uid(), name: '', type: '', description: '', notes: '', secretsAndHazards: '', imageBase64: null }
}

const inputCls = 'w-full bg-[#1a1a1a] border border-[#3d3d3d] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574] resize-none'
const labelCls = 'block text-xs text-[#999999] mb-1'

function GlobalLocationModal({ loc, onSave, onClose }) {
  const [form, setForm] = useState({ ...loc })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-[#2d2d2d] rounded-lg w-[580px] max-h-[90vh] overflow-y-auto fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#2d2d2d] border-b border-[#3d3d3d] px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-[#d4a574]">{form.name || 'New Location'}</h2>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Name *</label>
              <input
                className={inputCls}
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Location name..."
                autoFocus
              />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <input
                className={inputCls}
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                placeholder="e.g. Tavern, Forest, Dungeon..."
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={inputCls}
              rows={5}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Appearance, atmosphere, notable features..."
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
          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              className={inputCls}
              rows={3}
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Additional DM notes..."
            />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-[#3d3d3d]">
            <button onClick={onClose} className="px-4 py-2 bg-[#3d3d3d] text-[#f0f0f0] rounded hover:bg-[#4d4d4d] transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim() || saving}
              className="px-4 py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-medium hover:bg-[#c49464] transition-colors disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function GlobalLocationCard({ loc, onEdit, onDelete }) {
  const hazardLines = (loc.secretsAndHazards || '').split('\n').filter(Boolean)

  return (
    <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg overflow-hidden hover:border-[#d4a574]/40 transition-colors group">
      <div className="px-4 py-3 flex items-start justify-between gap-2 border-b border-[#3d3d3d]">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#f0f0f0] truncate">{loc.name}</h3>
          {loc.type && <span className="text-xs text-[#d4a574]">{loc.type}</span>}
        </div>
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
          {loc.description.length > 200 ? loc.description.slice(0, 200) + '…' : loc.description}
        </div>
      )}
      {hazardLines.length > 0 && (
        <div className="px-4 py-3 border-t border-[#3d3d3d]">
          <p className="text-xs text-[#b24545] font-semibold mb-1.5 uppercase tracking-wide">Secrets / Hazards</p>
          <ul className="space-y-1">
            {hazardLines.slice(0, 3).map((line, i) => (
              <li key={i} className="text-xs text-[#f0f0f0] flex gap-1.5">
                <span className="text-[#b24545] flex-shrink-0">▸</span>
                {line}
              </li>
            ))}
            {hazardLines.length > 3 && (
              <li className="text-xs text-[#666]">+{hazardLines.length - 3} more…</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function LocationsLibrary() {
  const { state, dispatch } = useApp()
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [search, setSearch] = useState('')

  const locations = state.globalLocations ?? []
  const filtered = search.trim()
    ? locations.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        (l.type || '').toLowerCase().includes(search.toLowerCase())
      )
    : locations

  async function handleSave(form) {
    const existing = locations.find(l => l.id === form.id)
    if (existing) {
      const updated = await db.updateGlobalLocation(form.id, {
        name: form.name,
        type: form.type || null,
        description: form.description || null,
        notes: form.notes || null,
        secretsAndHazards: form.secretsAndHazards || null,
        imageBase64: form.imageBase64 || null,
      })
      dispatch({ type: 'UPDATE_GLOBAL_LOCATION', payload: updated })
    } else {
      const created = await db.createGlobalLocation({
        id: form.id,
        name: form.name,
        type: form.type || null,
        description: form.description || null,
        notes: form.notes || null,
        secretsAndHazards: form.secretsAndHazards || null,
        imageBase64: form.imageBase64 || null,
      })
      dispatch({ type: 'ADD_GLOBAL_LOCATION', payload: created })
    }
    setEditing(null)
  }

  async function handleDelete(loc, force = false) {
    try {
      await db.deleteGlobalLocation(loc.id, force)
      dispatch({ type: 'DELETE_GLOBAL_LOCATION', payload: loc.id })
      setDeleteTarget(null)
      setDeleteError(null)
    } catch (err) {
      if (err.message?.includes('409') || err.message?.includes('Conflict')) {
        setDeleteError({ loc, message: 'This location is used in one or more sessions.' })
      }
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[#d4a574] font-bold text-xl">Locations Library</h1>
          <p className="text-[#999999] text-sm mt-0.5">Shared locations reusable across all sessions</p>
        </div>
        <button
          onClick={() => setEditing(emptyGlobalLocation())}
          className="px-4 py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-medium text-sm hover:bg-[#c49464] transition-colors"
        >
          + New Location
        </button>
      </div>

      {locations.length > 5 && (
        <div className="mb-4">
          <input
            className="w-full max-w-sm bg-[#2d2d2d] border border-[#3d3d3d] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574]"
            placeholder="Search locations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center text-[#999999] py-20">
          <div className="text-5xl mb-4">🗺</div>
          {search ? (
            <p>No locations match "{search}"</p>
          ) : (
            <>
              <p className="mb-2">No shared locations yet.</p>
              <p className="text-sm">Create one here, or add one from a session's Locations tab.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(loc => (
            <GlobalLocationCard
              key={loc.id}
              loc={loc}
              onEdit={() => setEditing({ ...loc })}
              onDelete={() => setDeleteTarget(loc)}
            />
          ))}
        </div>
      )}

      {editing && (
        <GlobalLocationModal loc={editing} onSave={handleSave} onClose={() => setEditing(null)} />
      )}

      {deleteTarget && !deleteError && (
        <DeleteConfirm
          name={deleteTarget.name}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {deleteError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#2d2d2d] rounded-lg w-[420px] p-6 fade-in">
            <h3 className="font-bold text-[#d4a574] mb-2">Location In Use</h3>
            <p className="text-sm text-[#d4d4d4] mb-1">{deleteError.message}</p>
            <p className="text-xs text-[#999999] mb-5">
              As an admin, you can force delete it. Session locations will keep their data but lose the library link.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setDeleteError(null); setDeleteTarget(null) }}
                className="px-4 py-2 bg-[#3d3d3d] text-[#f0f0f0] rounded hover:bg-[#4d4d4d] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteError.loc, true)}
                className="px-4 py-2 bg-[#b24545] text-white rounded font-medium hover:bg-[#922b2b] transition-colors"
              >
                Force Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
