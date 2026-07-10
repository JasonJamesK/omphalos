import { useState, useMemo, useRef } from 'react'
import { db } from '../../db/index.js'
import CropModal from '../CropModal'
import { readImageFile } from '../../utils/imageUpload'

function uid() {
  return `loc-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function gluid() {
  return `gloc-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const inputCls = 'w-full bg-[#161310] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574] resize-none'
const labelCls = 'block text-xs text-[#999999] mb-1'

// step: 'pick' | 'create' | 'notes'
export default function AddLocationModal({ globalLocations, onAdd, onClose, dispatch }) {
  const [step, setStep] = useState('pick')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)   // GlobalLocationDto once picked/created
  const [sessionNotes, setSessionNotes] = useState('')

  // 'create' step form
  const [createForm, setCreateForm] = useState({
    id: gluid(), name: '', type: '', description: '', notes: '', secretsAndHazards: '', imageBase64: null,
  })
  const [saving, setSaving] = useState(false)
  const [cropSrc, setCropSrc] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef(null)

  function handleImage(e) {
    const f = e.target.files[0]
    if (!f) return
    setUploadError('')
    readImageFile(f,
      dataUrl => { setCropSrc(dataUrl); if (fileRef.current) fileRef.current.value = '' },
      err => { setUploadError(err); if (fileRef.current) fileRef.current.value = '' }
    )
  }

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
        imageBase64: createForm.imageBase64 || null,
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
        className="bg-[#211b17] rounded-lg w-[580px] max-h-[90vh] flex flex-col fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#332922] px-5 py-4 flex-shrink-0">
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
                  className="w-full text-left px-3 py-2.5 rounded bg-[#161310] hover:bg-[#332922] border border-transparent hover:border-[#d4a574]/30 transition-colors group"
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
            <div className="border-t border-[#332922] pt-3 flex-shrink-0">
              <button
                onClick={() => { setCreateForm({ id: gluid(), name: search, type: '', description: '', notes: '', secretsAndHazards: '', imageBase64: null }); setStep('create') }}
                className="w-full py-2 text-sm text-[#d4a574] hover:bg-[#332922] rounded border border-[#d4a574]/30 hover:border-[#d4a574]/60 transition-colors"
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
            <div>
              <label className={labelCls}>Image (4:3)</label>
              {createForm.imageBase64 ? (
                <div className="space-y-2">
                  <div className="overflow-hidden rounded" style={{ width: '100%', maxWidth: 320, aspectRatio: '4 / 3' }}>
                    <img src={createForm.imageBase64} alt={createForm.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => fileRef.current?.click()} className="text-xs text-[#d4a574] hover:underline">Re-crop</button>
                    <button onClick={() => { setCreateForm(p => ({ ...p, imageBase64: null })); if (fileRef.current) fileRef.current.value = '' }} className="text-xs text-[#b24545] hover:underline">Remove</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} className="w-full h-24 border-2 border-dashed border-[#332922] rounded text-[#666] hover:border-[#d4a574] hover:text-[#d4a574] transition-colors text-sm">
                  Click to upload image
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              {uploadError && <p className="text-xs text-[#b24545] mt-1">{uploadError}</p>}
            </div>
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
            <div className="flex gap-3 justify-end pt-2 border-t border-[#332922]">
              <button onClick={() => setStep('pick')} className="px-4 py-2 bg-[#332922] text-[#f0f0f0] rounded hover:bg-[#40332a] transition-colors">Back</button>
              <button
                onClick={handleCreate}
                disabled={!createForm.name.trim() || saving}
                className="px-4 py-2 bg-[#d4a574] text-[#161310] rounded font-medium hover:bg-[#c49464] transition-colors disabled:opacity-40"
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
            <div className="bg-[#161310] rounded p-3 space-y-1.5">
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
            <div className="flex gap-3 justify-end pt-2 border-t border-[#332922]">
              <button onClick={() => setStep('pick')} className="px-4 py-2 bg-[#332922] text-[#f0f0f0] rounded hover:bg-[#40332a] transition-colors">Back</button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-[#d4a574] text-[#161310] rounded font-medium hover:bg-[#c49464] transition-colors"
              >
                Add to Session
              </button>
            </div>
          </div>
        )}
      </div>
      {cropSrc && (
        <CropModal
          imageData={cropSrc}
          aspectW={4}
          aspectH={3}
          title="Crop Location Image"
          onSave={cropped => { setCreateForm(p => ({ ...p, imageBase64: cropped })); setCropSrc(null) }}
          onClose={() => setCropSrc(null)}
        />
      )}
    </div>
  )
}
