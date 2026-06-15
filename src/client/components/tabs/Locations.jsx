import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { db } from '../../db/index.js'
import DeleteConfirm from '../DeleteConfirm'

function uid() {
  return `loc-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function gluid() {
  return `gloc-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const inputCls = 'w-full bg-[#1a1a1a] border border-[#3d3d3d] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574] resize-none'
const labelCls = 'block text-xs text-[#999999] mb-1'

// ─── Add-location flow modal ────────────────────────────────────────────────
// step: 'pick' | 'create' | 'notes'
function AddLocationModal({ globalLocations, onAdd, onClose, dispatch }) {
  const [step, setStep] = useState('pick')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)   // GlobalLocationDto once picked/created
  const [sessionNotes, setSessionNotes] = useState('')

  // 'create' step form
  const [createForm, setCreateForm] = useState({
    id: gluid(), name: '', type: '', description: '', notes: '', secretsAndHazards: '',
  })
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return globalLocations
    const q = search.toLowerCase()
    return globalLocations.filter(l =>
      l.name.toLowerCase().includes(q) || (l.type || '').toLowerCase().includes(q)
    )
  }, [globalLocations, search])

  function pickLocation(loc) {
    setSelected(loc)
    setStep('notes')
  }

  async function handleCreate() {
    if (!createForm.name.trim()) return
    setSaving(true)
    try {
      const created = await db.createGlobalLocation({
        id: createForm.id,
        name: createForm.name,
        type: createForm.type || null,
        description: createForm.description || null,
        notes: createForm.notes || null,
        secretsAndHazards: createForm.secretsAndHazards || null,
        imageBase64: null,
      })
      dispatch({ type: 'ADD_GLOBAL_LOCATION', payload: created })
      setSelected(created)
      setStep('notes')
    } finally {
      setSaving(false)
    }
  }

  function handleConfirm() {
    if (!selected) return
    onAdd({
      id: uid(),
      globalLocationId: selected.id,
      name: selected.name,
      type: selected.type ?? '',
      description: selected.description ?? '',
      notes: selected.notes ?? '',
      secretsAndHazards: selected.secretsAndHazards ?? '',
      imageBase64: selected.imageBase64 ?? null,
      sessionNotes: sessionNotes.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-[#2d2d2d] rounded-lg w-[580px] max-h-[90vh] flex flex-col fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3d3d3d] px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            {step !== 'pick' && (
              <button
                onClick={() => setStep(step === 'notes' && selected ? 'pick' : 'pick')}
                className="text-[#999999] hover:text-[#f0f0f0] text-sm mr-1"
              >
                ←
              </button>
            )}
            <h2 className="font-bold text-[#d4a574]">
              {step === 'pick' && 'Add Location'}
              {step === 'create' && 'New Shared Location'}
              {step === 'notes' && (selected?.name || 'Location')}
            </h2>
          </div>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl">×</button>
        </div>

        {/* Pick step */}
        {step === 'pick' && (
          <div className="flex flex-col flex-1 overflow-hidden p-5 gap-3">
            <input
              className={inputCls}
              placeholder="Search library..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              {filtered.length === 0 && !search && (
                <p className="text-[#666] text-sm text-center py-6">No shared locations yet.</p>
              )}
              {filtered.length === 0 && search && (
                <p className="text-[#666] text-sm text-center py-6">No results for "{search}"</p>
              )}
              {filtered.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => pickLocation(loc)}
                  className="w-full text-left px-3 py-2.5 rounded bg-[#1a1a1a] hover:bg-[#3d3d3d] border border-transparent hover:border-[#d4a574]/30 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#f0f0f0] text-sm">{loc.name}</span>
                    {loc.type && <span className="text-xs text-[#d4a574]">{loc.type}</span>}
                  </div>
                  {loc.description && (
                    <p className="text-xs text-[#999999] mt-0.5 truncate">{loc.description}</p>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-[#3d3d3d] pt-3 flex-shrink-0">
              <button
                onClick={() => { setCreateForm({ id: gluid(), name: search, type: '', description: '', notes: '', secretsAndHazards: '' }); setStep('create') }}
                className="w-full py-2 text-sm text-[#d4a574] hover:bg-[#3d3d3d] rounded border border-[#d4a574]/30 hover:border-[#d4a574]/60 transition-colors"
              >
                + Create new shared location{search ? ` "${search}"` : ''}
              </button>
            </div>
          </div>
        )}

        {/* Create step */}
        {step === 'create' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <p className="text-xs text-[#999999]">This will be saved to the shared library and added to this session.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Name *</label>
                <input
                  className={inputCls}
                  value={createForm.name}
                  onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Location name..."
                  autoFocus
                />
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <input
                  className={inputCls}
                  value={createForm.type}
                  onChange={e => setCreateForm(p => ({ ...p, type: e.target.value }))}
                  placeholder="e.g. Tavern, Forest..."
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea className={inputCls} rows={4} value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} placeholder="Appearance, atmosphere, notable features..." />
            </div>
            <div>
              <label className={labelCls}>Secrets & Hazards</label>
              <textarea className={inputCls} rows={3} value={createForm.secretsAndHazards} onChange={e => setCreateForm(p => ({ ...p, secretsAndHazards: e.target.value }))} placeholder="Traps, hidden passages, lore secrets... (one per line)" />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea className={inputCls} rows={2} value={createForm.notes} onChange={e => setCreateForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional DM notes..." />
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-[#3d3d3d]">
              <button onClick={() => setStep('pick')} className="px-4 py-2 bg-[#3d3d3d] text-[#f0f0f0] rounded hover:bg-[#4d4d4d] transition-colors">Back</button>
              <button
                onClick={handleCreate}
                disabled={!createForm.name.trim() || saving}
                className="px-4 py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-medium hover:bg-[#c49464] transition-colors disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save to Library →'}
              </button>
            </div>
          </div>
        )}

        {/* Session notes step */}
        {step === 'notes' && selected && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Read-only preview of the global location */}
            <div className="bg-[#1a1a1a] rounded p-3 space-y-1.5">
              {selected.type && <p className="text-xs text-[#d4a574]">{selected.type}</p>}
              {selected.description && <p className="text-sm text-[#d4d4d4] leading-relaxed">{selected.description}</p>}
              {selected.secretsAndHazards && (
                <div className="pt-1">
                  <p className="text-xs text-[#b24545] font-semibold uppercase tracking-wide mb-1">Secrets / Hazards</p>
                  {selected.secretsAndHazards.split('\n').filter(Boolean).map((line, i) => (
                    <p key={i} className="text-xs text-[#f0f0f0] flex gap-1.5"><span className="text-[#b24545]">▸</span>{line}</p>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Session Notes <span className="text-[#555]">(optional)</span></label>
              <textarea
                className={inputCls}
                rows={4}
                value={sessionNotes}
                onChange={e => setSessionNotes(e.target.value)}
                placeholder="What happened here this session? Player discoveries, events, changes..."
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-[#3d3d3d]">
              <button onClick={() => setStep('pick')} className="px-4 py-2 bg-[#3d3d3d] text-[#f0f0f0] rounded hover:bg-[#4d4d4d] transition-colors">Back</button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-medium hover:bg-[#c49464] transition-colors"
              >
                Add to Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Edit session-location modal ─────────────────────────────────────────────
function EditLocationModal({ loc, onSave, onClose }) {
  const [sessionNotes, setSessionNotes] = useState(loc.sessionNotes || '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-[#2d2d2d] rounded-lg w-[560px] max-h-[90vh] overflow-y-auto fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#2d2d2d] border-b border-[#3d3d3d] px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-[#d4a574]">{loc.name}</h2>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          {/* Read-only shared data */}
          <div className="bg-[#1a1a1a] rounded p-3 space-y-2">
            <p className="text-xs text-[#999999] uppercase tracking-wide font-semibold mb-2">Shared Info</p>
            {loc.type && <p className="text-xs text-[#d4a574]">{loc.type}</p>}
            {loc.description && <p className="text-sm text-[#d4d4d4] leading-relaxed">{loc.description}</p>}
            {loc.secretsAndHazards && (
              <div className="pt-1">
                <p className="text-xs text-[#b24545] font-semibold uppercase tracking-wide mb-1">Secrets / Hazards</p>
                {loc.secretsAndHazards.split('\n').filter(Boolean).map((line, i) => (
                  <p key={i} className="text-xs text-[#f0f0f0] flex gap-1.5"><span className="text-[#b24545]">▸</span>{line}</p>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>Session Notes</label>
            <textarea
              className={inputCls}
              rows={5}
              value={sessionNotes}
              onChange={e => setSessionNotes(e.target.value)}
              placeholder="What happened here this session? Player discoveries, events, changes..."
              autoFocus
            />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-[#3d3d3d]">
            <button onClick={onClose} className="px-4 py-2 bg-[#3d3d3d] text-[#f0f0f0] rounded hover:bg-[#4d4d4d] transition-colors">Cancel</button>
            <button
              onClick={() => onSave({ ...loc, sessionNotes: sessionNotes.trim() || null })}
              className="px-4 py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-medium hover:bg-[#c49464] transition-colors"
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
function LocationCard({ loc, onEdit, onDelete }) {
  const hazardLines = (loc.secretsAndHazards || '').split('\n').filter(Boolean)
  const isFromLibrary = !!loc.globalLocationId

  return (
    <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg overflow-hidden hover:border-[#6b8e6b]/60 transition-colors group">
      <div className="px-4 py-3 flex items-start justify-between gap-2 border-b border-[#3d3d3d]">
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
      {hazardLines.length > 0 && (
        <div className="px-4 py-3 border-t border-[#3d3d3d]">
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
        <div className="px-4 py-3 border-t border-[#3d3d3d] bg-[#1a1a1a]/50">
          <p className="text-xs text-[#6b8e6b] font-semibold mb-1 uppercase tracking-wide">Session Notes</p>
          <p className="text-xs text-[#d4d4d4] leading-relaxed">{loc.sessionNotes}</p>
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
          className="px-4 py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-medium text-sm hover:bg-[#c49464] transition-colors"
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
        <EditLocationModal loc={editing} onSave={handleEditSave} onClose={() => setEditing(null)} />
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
