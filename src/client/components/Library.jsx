import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { db } from '../db/index.js'
import DeleteConfirm from './DeleteConfirm'
import CropModal from './CropModal'
import { readImageFile } from '../utils/imageUpload'
import MarkdownField from './markdown/MarkdownField'
import { stripMarkdown } from './markdown/stripMarkdown'

// ─── shared styles ───────────────────────────────────────────────────────────
const inputCls = 'w-full bg-[#161310] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574] resize-none'
const labelCls = 'block text-xs text-[#999999] mb-1'

// ─── uid helpers ─────────────────────────────────────────────────────────────
function locUid() { return `gloc-${Date.now()}-${Math.random().toString(36).slice(2)}` }
function charUid() { return `gchar-${Date.now()}-${Math.random().toString(36).slice(2)}` }

// ═══════════════════════════════════════════════════════════════════════════
//  LOCATIONS TAB
// ═══════════════════════════════════════════════════════════════════════════

function emptyGlobalLocation() {
  return { id: locUid(), name: '', type: '', description: '', notes: '', secretsAndHazards: '', imageBase64: null }
}

function GlobalLocationModal({ loc, onSave, onClose }) {
  const [form, setForm] = useState({ ...loc })
  const [saving, setSaving] = useState(false)
  const [cropSrc, setCropSrc] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef(null)

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  function handleImage(e) {
    const f = e.target.files[0]
    if (!f) return
    setUploadError('')
    readImageFile(f,
      dataUrl => { setCropSrc(dataUrl); if (fileRef.current) fileRef.current.value = '' },
      err => { setUploadError(err); if (fileRef.current) fileRef.current.value = '' }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-[#211b17] rounded-lg w-[580px] max-h-[90vh] overflow-y-auto fade-in" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#211b17] border-b border-[#332922] px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-[#d4a574]">{form.name || 'New Location'}</h2>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Image (4:3)</label>
            {form.imageBase64 ? (
              <div className="space-y-2">
                <div className="overflow-hidden rounded" style={{ width: '100%', maxWidth: 320, aspectRatio: '4 / 3' }}>
                  <img src={form.imageBase64} alt={form.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => fileRef.current?.click()} className="text-xs text-[#d4a574] hover:underline">Re-crop</button>
                  <button onClick={() => { setForm(p => ({ ...p, imageBase64: null })); if (fileRef.current) fileRef.current.value = '' }} className="text-xs text-[#b24545] hover:underline">Remove</button>
                </div>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="w-full h-28 border-2 border-dashed border-[#332922] rounded text-[#666] hover:border-[#d4a574] hover:text-[#d4a574] transition-colors text-sm">
                Click to upload image
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            {uploadError && <p className="text-xs text-[#b24545] mt-1">{uploadError}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Name *</label>
              <input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Location name..." autoFocus />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <input className={inputCls} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} placeholder="e.g. Tavern, Forest, Dungeon..." />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea className={inputCls} rows={5} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Appearance, atmosphere, notable features..." />
          </div>
          <div>
            <label className={labelCls}>Secrets & Hazards</label>
            <textarea className={inputCls} rows={4} value={form.secretsAndHazards} onChange={e => setForm(p => ({ ...p, secretsAndHazards: e.target.value }))} placeholder="Hidden passages, traps, lore secrets... (one per line)" />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={inputCls} rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional DM notes..." />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-[#332922]">
            <button onClick={onClose} className="px-4 py-2 bg-[#332922] text-[#f0f0f0] rounded hover:bg-[#40332a] transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={!form.name.trim() || saving} className="px-4 py-2 bg-[#d4a574] text-[#161310] rounded font-medium hover:bg-[#c49464] transition-colors disabled:opacity-40">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
      {cropSrc && (
        <CropModal
          imageData={cropSrc}
          aspectW={4}
          aspectH={3}
          title="Crop Location Image"
          onSave={cropped => { setForm(p => ({ ...p, imageBase64: cropped })); setCropSrc(null) }}
          onClose={() => setCropSrc(null)}
        />
      )}
    </div>
  )
}

function GlobalLocationCard({ loc, onEdit, onDelete }) {
  const hazardLines = (loc.secretsAndHazards || '').split('\n').filter(Boolean)
  return (
    <div className="bg-[#211b17] border border-[#332922] rounded-lg overflow-hidden hover:border-[#d4a574]/40 transition-colors group">
      {loc.imageBase64 && (
        <div className="w-full overflow-hidden" style={{ aspectRatio: '4 / 3' }}>
          <img src={loc.imageBase64} alt={loc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <div className="px-4 py-3 flex items-start justify-between gap-2 border-b border-[#332922]">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#f0f0f0] truncate">{loc.name}</h3>
          {loc.type && <span className="text-xs text-[#d4a574]">{loc.type}</span>}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={onEdit} className="px-2 py-0.5 text-xs bg-[#332922] text-[#f0f0f0] rounded hover:bg-[#40332a] transition-colors">Edit</button>
          <button onClick={onDelete} className="px-2 py-0.5 text-xs bg-[#b24545]/20 text-[#b24545] rounded hover:bg-[#b24545]/40 transition-colors">Del</button>
        </div>
      </div>
      {loc.description && (
        <div className="px-4 py-3 text-sm text-[#d4d4d4] leading-relaxed">
          {loc.description.length > 200 ? loc.description.slice(0, 200) + '…' : loc.description}
        </div>
      )}
      {hazardLines.length > 0 && (
        <div className="px-4 py-3 border-t border-[#332922]">
          <p className="text-xs text-[#b24545] font-semibold mb-1.5 uppercase tracking-wide">Secrets / Hazards</p>
          <ul className="space-y-1">
            {hazardLines.slice(0, 3).map((line, i) => (
              <li key={i} className="text-xs text-[#f0f0f0] flex gap-1.5">
                <span className="text-[#b24545] flex-shrink-0">▸</span>{line}
              </li>
            ))}
            {hazardLines.length > 3 && <li className="text-xs text-[#666]">+{hazardLines.length - 3} more…</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

function LocationsTab() {
  const { state, dispatch } = useApp()
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [search, setSearch] = useState('')

  const locations = state.globalLocations ?? []
  const filtered = search.trim()
    ? locations.filter(l => l.name.toLowerCase().includes(search.toLowerCase()) || (l.type || '').toLowerCase().includes(search.toLowerCase()))
    : locations

  async function handleSave(form) {
    const existing = locations.find(l => l.id === form.id)
    if (existing) {
      const updated = await db.updateGlobalLocation(form.id, { name: form.name, type: form.type || null, description: form.description || null, notes: form.notes || null, secretsAndHazards: form.secretsAndHazards || null, imageBase64: form.imageBase64 || null })
      dispatch({ type: 'UPDATE_GLOBAL_LOCATION', payload: updated })
    } else {
      const created = await db.createGlobalLocation({ id: form.id, name: form.name, type: form.type || null, description: form.description || null, notes: form.notes || null, secretsAndHazards: form.secretsAndHazards || null, imageBase64: form.imageBase64 || null })
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
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-[#999999] text-sm">Shared locations reusable across all sessions</p>
        <button onClick={() => setEditing(emptyGlobalLocation())} className="px-4 py-2 bg-[#d4a574] text-[#161310] rounded font-medium text-sm hover:bg-[#c49464] transition-colors">
          + New Location
        </button>
      </div>

      {locations.length > 5 && (
        <div className="mb-4">
          <input className="w-full max-w-sm bg-[#211b17] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574]" placeholder="Search locations..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center text-[#999999] py-20">
          <div className="text-5xl mb-4">🗺</div>
          {search ? <p>No locations match "{search}"</p> : <><p className="mb-2">No shared locations yet.</p><p className="text-sm">Create one here, or add one from a session's Locations tab.</p></>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(loc => (
            <GlobalLocationCard key={loc.id} loc={loc} onEdit={() => setEditing({ ...loc })} onDelete={() => setDeleteTarget(loc)} />
          ))}
        </div>
      )}

      {editing && <GlobalLocationModal loc={editing} onSave={handleSave} onClose={() => setEditing(null)} />}

      {deleteTarget && !deleteError && (
        <DeleteConfirm name={deleteTarget.name} onConfirm={() => handleDelete(deleteTarget)} onCancel={() => setDeleteTarget(null)} />
      )}

      {deleteError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#211b17] rounded-lg w-[420px] p-6 fade-in">
            <h3 className="font-bold text-[#d4a574] mb-2">Location In Use</h3>
            <p className="text-sm text-[#d4d4d4] mb-1">{deleteError.message}</p>
            <p className="text-xs text-[#999999] mb-5">As an admin, you can force delete it. Session locations will keep their data but lose the library link.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setDeleteError(null); setDeleteTarget(null) }} className="px-4 py-2 bg-[#332922] text-[#f0f0f0] rounded hover:bg-[#40332a] transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteError.loc, true)} className="px-4 py-2 bg-[#b24545] text-white rounded font-medium hover:bg-[#922b2b] transition-colors">Force Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  CHARACTERS TAB
// ═══════════════════════════════════════════════════════════════════════════

const CLASSES = ['Barbarian','Bard','Cleric','Druid','Fighter','Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard']
const RACES = ['Human','Elf','Dwarf','Halfling','Gnome','Half-Orc','Tiefling','Dragonborn','Half-Elf']
const ALIGNMENTS = ['Lawful Good','Neutral Good','Chaotic Good','Lawful Neutral','True Neutral','Chaotic Neutral','Lawful Evil','Neutral Evil','Chaotic Evil']
const REL_TYPES = ['Ally','Enemy','Rival','Friend','Family','Mentor','Student','Neutral','Romantic']

function emptyGlobalCharacter() {
  return { id: charUid(), name: '', tagline: '', class: 'Fighter', race: 'Human', alignment: 'True Neutral', personalityTraits: '', flaw: '', description: '', portraitBase64: null, portraitPanX: 0, portraitPanY: 0, questHooks: '', relationships: [] }
}

function LibraryPortrait({ char, size = 'sm' }) {
  const w = size === 'sm' ? 80 : 120
  const h = size === 'sm' ? 107 : 160
  if (!char.portraitBase64) {
    return (
      <div className="flex items-center justify-center bg-[#332922] text-[#666] font-bold flex-shrink-0 rounded" style={{ width: w, height: h }}>
        <span style={{ fontSize: size === 'sm' ? 28 : 42 }}>{char.name?.[0]?.toUpperCase() || '?'}</span>
      </div>
    )
  }
  return (
    <div className="overflow-hidden flex-shrink-0 rounded" style={{ width: w, height: h }}>
      <img src={char.portraitBase64} alt={char.name} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
    </div>
  )
}

function GlobalCharacterModal({ char, onSave, onClose }) {
  const [form, setForm] = useState({ ...char })
  const [saving, setSaving] = useState(false)
  const [cropSrc, setCropSrc] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function handlePortrait(e) {
    const f = e.target.files[0]
    if (!f) return
    setUploadError('')
    readImageFile(f,
      dataUrl => { setCropSrc(dataUrl); if (fileRef.current) fileRef.current.value = '' },
      err => { setUploadError(err); if (fileRef.current) fileRef.current.value = '' }
    )
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-[#211b17] rounded-lg w-[720px] max-h-[92vh] overflow-y-auto fade-in" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#211b17] border-b border-[#332922] px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-[#d4a574]">{form.name || 'New Character'}</h2>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl">×</button>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Name *</label>
                <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Character name" autoFocus />
              </div>
              <div>
                <label className={labelCls}>Tagline</label>
                <input className={inputCls} value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="Brief description or epithet..." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Class</label>
                  <select className={inputCls} value={form.class} onChange={e => set('class', e.target.value)}>
                    {CLASSES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Race</label>
                  <select className={inputCls} value={form.race} onChange={e => set('race', e.target.value)}>
                    {RACES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Alignment</label>
                <select className={inputCls} value={form.alignment} onChange={e => set('alignment', e.target.value)}>
                  {ALIGNMENTS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Personality Traits</label>
                <MarkdownField value={form.personalityTraits} onChange={v => set('personalityTraits', v)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Flaw</label>
                <MarkdownField value={form.flaw} onChange={v => set('flaw', v)} className={inputCls} />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Portrait (3:4)</label>
                {form.portraitBase64 ? (
                  <div className="space-y-2">
                    <div className="overflow-hidden rounded" style={{ width: 120, height: 160 }}>
                      <img src={form.portraitBase64} alt="Portrait" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => fileRef.current?.click()} className="text-xs text-[#d4a574] hover:underline">Re-crop</button>
                      <button onClick={() => { set('portraitBase64', null); if (fileRef.current) fileRef.current.value = '' }} className="text-xs text-[#b24545] hover:underline">Remove</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} className="w-full h-28 border-2 border-dashed border-[#332922] rounded text-[#666] hover:border-[#d4a574] hover:text-[#d4a574] transition-colors text-sm">
                    Click to upload portrait
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePortrait} />
                {uploadError && <p className="text-xs text-[#b24545] mt-1">{uploadError}</p>}
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <MarkdownField value={form.description} onChange={v => set('description', v)} className={inputCls} placeholder="Physical appearance, background..." />
              </div>
              <div>
                <label className={labelCls}>Quest Hooks</label>
                <MarkdownField value={form.questHooks} onChange={v => set('questHooks', v)} className={inputCls} placeholder="Personal quests, goals, secrets..." />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelCls + ' mb-0'}>Relationships</label>
                  <button onClick={() => set('relationships', [...(form.relationships || []), { name: '', type: 'Ally' }])} className="text-xs text-[#d4a574] hover:underline">+ Add</button>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {(form.relationships || []).map((r, i) => (
                    <div key={i} className="flex gap-1.5">
                      <input className={inputCls + ' flex-1 text-xs py-1.5'} value={r.name} onChange={e => { const arr = [...form.relationships]; arr[i] = { ...arr[i], name: e.target.value }; set('relationships', arr) }} placeholder="Name" />
                      <select className={inputCls + ' w-28 text-xs py-1.5'} value={r.type} onChange={e => { const arr = [...form.relationships]; arr[i] = { ...arr[i], type: e.target.value }; set('relationships', arr) }}>
                        {REL_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                      <button onClick={() => set('relationships', form.relationships.filter((_, j) => j !== i))} className="text-[#b24545] hover:text-[#922b2b] px-1 text-sm">×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-5 pt-4 border-t border-[#332922]">
            <button onClick={onClose} className="px-4 py-2 bg-[#332922] text-[#f0f0f0] rounded hover:bg-[#40332a] transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={!form.name.trim() || saving} className="px-4 py-2 bg-[#d4a574] text-[#161310] rounded font-medium hover:bg-[#c49464] transition-colors disabled:opacity-40">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
      {cropSrc && <CropModal imageData={cropSrc} onSave={cropped => { set('portraitBase64', cropped); set('portraitPanX', 0); set('portraitPanY', 0); setCropSrc(null) }} onClose={() => setCropSrc(null)} />}
    </div>
  )
}

function GlobalCharacterCard({ char, onEdit, onDelete }) {
  const cleanDescription = stripMarkdown(char.description)
  return (
    <div className="bg-[#211b17] border border-[#332922] rounded-lg overflow-hidden hover:border-[#d4a574]/40 transition-colors group">
      <div className="p-3 flex gap-3">
        <LibraryPortrait char={char} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-[#f0f0f0] truncate">{char.name}</h3>
              <span className="text-xs text-[#d4a574]">{[char.race, char.class].filter(Boolean).join(' · ')}</span>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button onClick={onEdit} className="px-2 py-0.5 text-xs bg-[#332922] text-[#f0f0f0] rounded hover:bg-[#40332a] transition-colors">Edit</button>
              <button onClick={onDelete} className="px-2 py-0.5 text-xs bg-[#b24545]/20 text-[#b24545] rounded hover:bg-[#b24545]/40 transition-colors">Del</button>
            </div>
          </div>
          {char.tagline && <p className="text-xs text-[#999999] mt-1 italic truncate">"{char.tagline}"</p>}
          {char.alignment && <p className="text-xs text-[#777] mt-0.5">{char.alignment}</p>}
        </div>
      </div>
      {cleanDescription && (
        <div className="px-3 pb-3 text-xs text-[#d4d4d4] leading-relaxed border-t border-[#332922] pt-2">
          {cleanDescription.length > 160 ? cleanDescription.slice(0, 160) + '…' : cleanDescription}
        </div>
      )}
    </div>
  )
}

function CharactersTab() {
  const { state, dispatch } = useApp()
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [search, setSearch] = useState('')

  const characters = state.globalCharacters ?? []
  const filtered = search.trim()
    ? characters.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.race || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.class || '').toLowerCase().includes(search.toLowerCase())
      )
    : characters

  async function handleSave(form) {
    const existing = characters.find(c => c.id === form.id)
    const payload = {
      name: form.name,
      tagline: form.tagline || null,
      class: form.class || null,
      race: form.race || null,
      alignment: form.alignment || null,
      personalityTraits: form.personalityTraits || null,
      flaw: form.flaw || null,
      description: form.description || null,
      portraitBase64: form.portraitBase64 || null,
      portraitPanX: form.portraitPanX || 0,
      portraitPanY: form.portraitPanY || 0,
      questHooks: form.questHooks || null,
      relationships: form.relationships || [],
    }
    if (existing) {
      const updated = await db.updateGlobalCharacter(form.id, payload)
      dispatch({ type: 'UPDATE_GLOBAL_CHARACTER', payload: updated })
    } else {
      const created = await db.createGlobalCharacter({ id: form.id, ...payload })
      dispatch({ type: 'ADD_GLOBAL_CHARACTER', payload: created })
    }
    setEditing(null)
  }

  async function handleDelete(char, force = false) {
    try {
      await db.deleteGlobalCharacter(char.id, force)
      dispatch({ type: 'DELETE_GLOBAL_CHARACTER', payload: char.id })
      setDeleteTarget(null)
      setDeleteError(null)
    } catch (err) {
      if (err.message?.includes('409') || err.message?.includes('Conflict')) {
        setDeleteError({ char, message: 'This character is used in one or more sessions.' })
      }
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-[#999999] text-sm">Shared NPCs reusable across all sessions</p>
        <button onClick={() => setEditing(emptyGlobalCharacter())} className="px-4 py-2 bg-[#d4a574] text-[#161310] rounded font-medium text-sm hover:bg-[#c49464] transition-colors">
          + New Character
        </button>
      </div>

      {characters.length > 5 && (
        <div className="mb-4">
          <input className="w-full max-w-sm bg-[#211b17] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574]" placeholder="Search characters..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center text-[#999999] py-20">
          <div className="text-5xl mb-4">👤</div>
          {search ? <p>No characters match "{search}"</p> : <><p className="mb-2">No shared characters yet.</p><p className="text-sm">Create one here, or save one from a session's Characters tab.</p></>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(char => (
            <GlobalCharacterCard key={char.id} char={char} onEdit={() => setEditing({ ...char })} onDelete={() => setDeleteTarget(char)} />
          ))}
        </div>
      )}

      {editing && <GlobalCharacterModal char={editing} onSave={handleSave} onClose={() => setEditing(null)} />}

      {deleteTarget && !deleteError && (
        <DeleteConfirm name={deleteTarget.name} onConfirm={() => handleDelete(deleteTarget)} onCancel={() => setDeleteTarget(null)} />
      )}

      {deleteError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#211b17] rounded-lg w-[420px] p-6 fade-in">
            <h3 className="font-bold text-[#d4a574] mb-2">Character In Use</h3>
            <p className="text-sm text-[#d4d4d4] mb-1">{deleteError.message}</p>
            <p className="text-xs text-[#999999] mb-5">As an admin, you can force delete it. Session characters will keep their data but lose the library link.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setDeleteError(null); setDeleteTarget(null) }} className="px-4 py-2 bg-[#332922] text-[#f0f0f0] rounded hover:bg-[#40332a] transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteError.char, true)} className="px-4 py-2 bg-[#b24545] text-white rounded font-medium hover:bg-[#922b2b] transition-colors">Force Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  LIBRARY PAGE (tabbed)
// ═══════════════════════════════════════════════════════════════════════════

const TABS = ['Locations', 'Characters']

export default function Library() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[#d4a574] font-bold text-xl mb-3">Library</h1>
        <div className="flex border-b border-[#332922]">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-5 py-2.5 text-sm font-medium relative transition-colors ${
                activeTab === i ? 'text-[#d4a574]' : 'text-[#999999] hover:text-[#f0f0f0]'
              }`}
            >
              {tab}
              {activeTab === i && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d4a574] rounded-t" />}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 0 ? <LocationsTab /> : <CharactersTab />}
    </div>
  )
}
