import { useState, useMemo, useRef } from 'react'
import Fuse from 'fuse.js'
import { useApp } from '../../context/AppContext'
import { db } from '../../db/index.js'
import CropModal from '../CropModal'
import NameGenModal from '../NameGenModal'
import DeleteConfirm from '../DeleteConfirm'

const CLASSES = ['Barbarian','Bard','Cleric','Druid','Fighter','Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard']
const RACES = ['Human','Elf','Dwarf','Halfling','Gnome','Half-Orc','Tiefling','Dragonborn','Half-Elf']
const ALIGNMENTS = ['Lawful Good','Neutral Good','Chaotic Good','Lawful Neutral','True Neutral','Chaotic Neutral','Lawful Evil','Neutral Evil','Chaotic Evil']
const REL_TYPES = ['Ally','Enemy','Rival','Friend','Family','Mentor','Student','Neutral','Romantic']

function uid() { return `char-${Date.now()}-${Math.random().toString(36).slice(2)}` }
function charUid() { return `gchar-${Date.now()}-${Math.random().toString(36).slice(2)}` }

function emptyChar() {
  return {
    id: uid(), name: '', portraitBase64: null, portraitPanX: 0, portraitPanY: 0,
    tagline: '', class: 'Fighter', race: 'Human', level: 1, alignment: 'True Neutral',
    personalityTraits: '', flaw: '', inventory: '', questHooks: '', relationships: [], description: '',
    globalCharacterId: null, sessionNotes: null,
  }
}

function Portrait({ char, size = 'sm' }) {
  const w = size === 'sm' ? 120 : 180
  const h = size === 'sm' ? 160 : 240
  if (!char.portraitBase64) {
    return (
      <div className="flex items-center justify-center bg-[#3d3d3d] text-[#666] font-bold flex-shrink-0" style={{ width: w, height: h }}>
        <span style={{ fontSize: size === 'sm' ? 36 : 56 }}>{char.name?.[0]?.toUpperCase() || '?'}</span>
      </div>
    )
  }
  return (
    <div className="overflow-hidden flex-shrink-0 relative" style={{ width: w, height: h }}>
      <img src={char.portraitBase64} alt={char.name} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
    </div>
  )
}

// ─── Drawer ──────────────────────────────────────────────────────────────────

function CharacterDrawer({ char, onClose, onEdit, onDelete }) {
  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div className="w-[520px] bg-[#2d2d2d] h-full overflow-y-auto shadow-2xl slide-in-right" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#2d2d2d] border-b border-[#3d3d3d] px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-bold text-[#d4a574] truncate">{char.name}</h2>
            {char.globalCharacterId && (
              <span className="text-xs bg-[#d4a574]/20 text-[#d4a574] px-1.5 py-0.5 rounded flex-shrink-0">Library</span>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={onEdit} className="px-3 py-1.5 bg-[#d4a574] text-[#1a1a1a] rounded text-sm font-medium hover:bg-[#c49464] transition-colors">Edit</button>
            <button onClick={onDelete} className="px-3 py-1.5 bg-[#b24545] text-white rounded text-sm hover:bg-[#922b2b] transition-colors">Delete</button>
            <button onClick={onClose} className="px-3 py-1.5 bg-[#3d3d3d] text-[#f0f0f0] rounded text-sm hover:bg-[#4d4d4d] transition-colors">✕</button>
          </div>
        </div>
        <div className="p-5">
          <div className="flex gap-5 mb-5">
            <Portrait char={char} size="lg" />
            <div className="flex-1 min-w-0">
              {char.tagline && <p className="text-[#d4d4d4] italic text-sm mb-3 leading-relaxed">"{char.tagline}"</p>}
              <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                {[['Class', char.class],['Race', char.race],['Level', char.level],['Alignment', char.alignment]].map(([k,v]) => (
                  <div key={k}><span className="text-[#999999]">{k}: </span><span className="text-[#f0f0f0]">{v}</span></div>
                ))}
              </div>
            </div>
          </div>

          {[
            ['Personality Traits', char.personalityTraits],
            ['Flaw', char.flaw],
            ['Description', char.description],
            ['Inventory', char.inventory],
            ['Quest Hooks', char.questHooks],
          ].filter(([,v]) => v).map(([label, value]) => (
            <div key={label} className="mb-4">
              <p className="text-xs text-[#999999] uppercase tracking-wide mb-1">{label}</p>
              <p className="text-sm text-[#f0f0f0] leading-relaxed whitespace-pre-wrap bg-[#1a1a1a] rounded p-2.5">{value}</p>
            </div>
          ))}

          {char.relationships?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-[#999999] uppercase tracking-wide mb-2">Relationships</p>
              <div className="space-y-1">
                {char.relationships.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-[#1a1a1a] rounded px-2.5 py-1.5">
                    <span className="text-[#f0f0f0] font-medium">{r.name}</span>
                    <span className="text-[#d4a574] text-xs">({r.type})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {char.sessionNotes && (
            <div>
              <p className="text-xs text-[#6b8e6b] uppercase tracking-wide mb-1">Session Notes</p>
              <p className="text-sm text-[#f0f0f0] leading-relaxed whitespace-pre-wrap bg-[#1a1a1a] border border-[#6b8e6b]/30 rounded p-2.5">{char.sessionNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── New / Edit modal ────────────────────────────────────────────────────────

function CharacterModal({ char, onSave, onClose, globalCharacters, onSaveToLibrary }) {
  const isNew = !char.name
  const isLinked = !!char.globalCharacterId
  const [form, setForm] = useState({ ...char })
  const [saveToLibrary, setSaveToLibrary] = useState(false)
  const [showNameGen, setShowNameGen] = useState(false)
  const [cropSrc, setCropSrc] = useState(null)
  const fileRef = useRef(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function handlePortrait(e) {
    const f = e.target.files[0]
    if (!f) return
    const r = new FileReader()
    r.onload = ev => { setCropSrc(ev.target.result); if (fileRef.current) fileRef.current.value = '' }
    r.readAsDataURL(f)
  }

  const inp = 'w-full bg-[#1a1a1a] border border-[#3d3d3d] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574]'
  const lbl = 'block text-xs text-[#999999] mb-1'
  const roInp = 'w-full bg-[#222] border border-[#3d3d3d]/50 rounded px-3 py-2 text-[#999999] text-sm cursor-not-allowed'

  // For linked chars: shared fields read-only, session fields editable
  if (isLinked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
        <div className="bg-[#2d2d2d] rounded-lg w-[720px] max-h-[92vh] overflow-y-auto fade-in" onClick={e => e.stopPropagation()}>
          <div className="sticky top-0 bg-[#2d2d2d] border-b border-[#3d3d3d] px-5 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-[#d4a574]">Edit: {char.name}</h2>
              <span className="text-xs bg-[#d4a574]/20 text-[#d4a574] px-1.5 py-0.5 rounded">Library</span>
            </div>
            <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl">×</button>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <p className="text-xs text-[#999999] uppercase tracking-wide mb-3 flex items-center gap-2">
                Shared Info
                <span className="text-[#555] normal-case tracking-normal font-normal">— edit in the Library to update the source</span>
              </p>
              <div className="flex gap-4 bg-[#1a1a1a] rounded p-4">
                <Portrait char={form} size="sm" />
                <div className="flex-1 min-w-0 space-y-2">
                  {form.tagline && <p className="text-[#d4d4d4] italic text-sm">"{form.tagline}"</p>}
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {[['Class', form.class],['Race', form.race],['Alignment', form.alignment]].map(([k,v]) => v && (
                      <div key={k}><span className="text-[#666]">{k}: </span><span className="text-[#d4d4d4]">{v}</span></div>
                    ))}
                  </div>
                  {form.personalityTraits && <p className="text-xs text-[#999999] leading-relaxed">{form.personalityTraits}</p>}
                </div>
              </div>
            </div>

            <div className="border-t border-[#3d3d3d] pt-5 space-y-3">
              <p className="text-xs text-[#6b8e6b] uppercase tracking-wide">Session Fields</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Level</label>
                  <input type="number" className={inp} value={form.level} min={1} max={20} onChange={e => set('level', Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))} />
                </div>
              </div>
              <div>
                <label className={lbl}>Inventory</label>
                <textarea className={inp + ' resize-none'} rows={3} value={form.inventory || ''} onChange={e => set('inventory', e.target.value)} placeholder="Items, gold, equipment..." />
              </div>
              <div>
                <label className={lbl}>Session Notes</label>
                <textarea className={inp + ' resize-none'} rows={4} value={form.sessionNotes || ''} onChange={e => set('sessionNotes', e.target.value || null)} placeholder="Notes specific to this session — what happened, status changes, etc." />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-[#3d3d3d]">
              <button onClick={onClose} className="px-4 py-2 bg-[#3d3d3d] text-[#f0f0f0] rounded hover:bg-[#4d4d4d] transition-colors">Cancel</button>
              <button onClick={() => onSave(form)} className="px-5 py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-medium hover:bg-[#c49464] transition-colors">Save</button>
            </div>
          </div>
        </div>
        {cropSrc && <CropModal imageData={cropSrc} onSave={cropped => { set('portraitBase64', cropped); setCropSrc(null) }} onClose={() => setCropSrc(null)} />}
      </div>
    )
  }

  // New / unlinked character: full form with optional "Save to library" toggle
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-[#2d2d2d] rounded-lg w-[720px] max-h-[92vh] overflow-y-auto fade-in" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#2d2d2d] border-b border-[#3d3d3d] px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-[#d4a574]">{char.name ? `Edit: ${char.name}` : 'New Character'}</h2>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl">×</button>
        </div>

        <div className="p-5">
          {isNew && (
            <label className="flex items-center gap-2 mb-4 cursor-pointer select-none w-fit">
              <input type="checkbox" checked={saveToLibrary} onChange={e => setSaveToLibrary(e.target.checked)} className="accent-[#d4a574]" />
              <span className="text-sm text-[#d4d4d4]">Save to library</span>
              <span className="text-xs text-[#666]">— makes this NPC reusable in other sessions</span>
            </label>
          )}

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-3">
              <div>
                <label className={lbl}>Name</label>
                <div className="flex gap-2">
                  <input className={inp + ' flex-1'} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Character name" />
                  <button onClick={() => setShowNameGen(true)} className="px-2 py-1 bg-[#3d3d3d] text-[#d4a574] rounded hover:bg-[#4d4d4d] text-base" title="Roll name">🎲</button>
                </div>
              </div>
              <div>
                <label className={lbl}>Tagline</label>
                <input className={inp} value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="Brief description or epithet..." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Class</label>
                  <select className={inp} value={form.class} onChange={e => set('class', e.target.value)}>
                    {CLASSES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Race</label>
                  <select className={inp} value={form.race} onChange={e => set('race', e.target.value)}>
                    {RACES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Level</label>
                  <input type="number" className={inp} value={form.level} min={1} max={20} onChange={e => set('level', Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))} />
                </div>
                <div>
                  <label className={lbl}>Alignment</label>
                  <select className={inp} value={form.alignment} onChange={e => set('alignment', e.target.value)}>
                    {ALIGNMENTS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={lbl}>Personality Traits</label>
                <textarea className={inp + ' resize-none'} rows={3} value={form.personalityTraits} onChange={e => set('personalityTraits', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Flaw</label>
                <textarea className={inp + ' resize-none'} rows={2} value={form.flaw} onChange={e => set('flaw', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Description</label>
                <textarea className={inp + ' resize-none'} rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Physical appearance, background..." />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Portrait (3:4)</label>
                {form.portraitBase64 ? (
                  <div className="space-y-2">
                    <div className="overflow-hidden rounded" style={{ width: 150, height: 200 }}>
                      <img src={form.portraitBase64} alt="Portrait" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => fileRef.current?.click()} className="text-xs text-[#d4a574] hover:underline">Re-crop</button>
                      <button onClick={() => { set('portraitBase64', null); if (fileRef.current) fileRef.current.value = '' }} className="text-xs text-[#b24545] hover:underline">Remove</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} className="w-full h-36 border-2 border-dashed border-[#3d3d3d] rounded text-[#666] hover:border-[#d4a574] hover:text-[#d4a574] transition-colors text-sm">
                    Click to upload portrait
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePortrait} />
              </div>
              <div>
                <label className={lbl}>Inventory</label>
                <textarea className={inp + ' resize-none'} rows={4} value={form.inventory} onChange={e => set('inventory', e.target.value)} placeholder="Items, gold, equipment..." />
              </div>
              <div>
                <label className={lbl}>Quest Hooks</label>
                <textarea className={inp + ' resize-none'} rows={3} value={form.questHooks} onChange={e => set('questHooks', e.target.value)} placeholder="Personal quests, goals, secrets..." />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={lbl + ' mb-0'}>Relationships</label>
                  <button onClick={() => set('relationships', [...(form.relationships || []), { name: '', type: 'Ally' }])} className="text-xs text-[#d4a574] hover:underline">+ Add</button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {(form.relationships || []).map((r, i) => (
                    <div key={i} className="flex gap-1.5">
                      <input className={inp + ' flex-1 text-xs py-1.5'} value={r.name} onChange={e => { const arr = [...form.relationships]; arr[i] = { ...arr[i], name: e.target.value }; set('relationships', arr) }} placeholder="Name" />
                      <select className={inp + ' w-28 text-xs py-1.5'} value={r.type} onChange={e => { const arr = [...form.relationships]; arr[i] = { ...arr[i], type: e.target.value }; set('relationships', arr) }}>
                        {REL_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                      <button onClick={() => set('relationships', form.relationships.filter((_, j) => j !== i))} className="text-[#b24545] hover:text-[#922b2b] px-1 text-sm">×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-[#3d3d3d]">
            <button onClick={onClose} className="px-4 py-2 bg-[#3d3d3d] text-[#f0f0f0] rounded hover:bg-[#4d4d4d] transition-colors">Cancel</button>
            <button
              onClick={() => form.name.trim() && onSave(form, saveToLibrary)}
              disabled={!form.name.trim()}
              className="px-5 py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-medium hover:bg-[#c49464] transition-colors disabled:opacity-40"
            >
              {saveToLibrary ? 'Save & Add to Library' : 'Save Character'}
            </button>
          </div>
        </div>
      </div>

      {showNameGen && <NameGenModal onSelect={name => { set('name', name); setShowNameGen(false) }} onClose={() => setShowNameGen(false)} />}
      {cropSrc && <CropModal imageData={cropSrc} onSave={cropped => { set('portraitBase64', cropped); set('portraitPanX', 0); set('portraitPanY', 0); setCropSrc(null) }} onClose={() => setCropSrc(null)} />}
    </div>
  )
}

// ─── Add from Library modal ──────────────────────────────────────────────────

function AddFromLibraryModal({ globalCharacters, onAdd, onClose }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [step, setStep] = useState('pick') // 'pick' | 'notes'
  const [sessionNotes, setSessionNotes] = useState('')

  const filtered = search.trim()
    ? globalCharacters.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.race || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.class || '').toLowerCase().includes(search.toLowerCase())
      )
    : globalCharacters

  function handleAdd() {
    if (!selected) return
    onAdd(selected, sessionNotes.trim() || null)
  }

  const inp = 'w-full bg-[#1a1a1a] border border-[#3d3d3d] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-[#2d2d2d] rounded-lg w-[680px] max-h-[90vh] flex flex-col fade-in" onClick={e => e.stopPropagation()}>
        <div className="border-b border-[#3d3d3d] px-5 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-[#d4a574]">
            {step === 'pick' ? 'Add from Library' : 'Session Notes'}
          </h2>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl">×</button>
        </div>

        {step === 'pick' ? (
          <>
            <div className="p-4 border-b border-[#3d3d3d] flex-shrink-0">
              <input className={inp} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search characters…" autoFocus />
            </div>

            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* List */}
              <div className="w-56 border-r border-[#3d3d3d] overflow-y-auto flex-shrink-0">
                {globalCharacters.length === 0 ? (
                  <div className="p-4 text-center text-[#999999] text-sm">No characters in library yet.</div>
                ) : filtered.length === 0 ? (
                  <div className="p-4 text-center text-[#999999] text-sm">No matches.</div>
                ) : (
                  filtered.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors border-b border-[#3d3d3d]/50 ${
                        selected?.id === c.id ? 'bg-[#d4a574]/15 border-l-2 border-l-[#d4a574]' : 'hover:bg-[#3d3d3d]'
                      }`}
                    >
                      <LibraryMiniPortrait char={c} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#f0f0f0] truncate">{c.name}</div>
                        <div className="text-xs text-[#d4a574] truncate">{[c.race, c.class].filter(Boolean).join(' · ')}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Preview */}
              <div className="flex-1 overflow-y-auto p-4">
                {selected ? (
                  <CharacterPreview char={selected} />
                ) : (
                  <div className="h-full flex items-center justify-center text-[#555] text-sm">
                    Select a character to preview
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[#3d3d3d] px-5 py-3 flex justify-end gap-3 flex-shrink-0">
              <button onClick={onClose} className="px-4 py-2 bg-[#3d3d3d] text-[#f0f0f0] rounded hover:bg-[#4d4d4d] transition-colors">Cancel</button>
              <button
                onClick={() => selected && setStep('notes')}
                disabled={!selected}
                className="px-4 py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-medium hover:bg-[#c49464] transition-colors disabled:opacity-40"
              >
                Add to Session →
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-[#1a1a1a] rounded p-3">
                <CharacterPreview char={selected} compact />
              </div>
              <div>
                <label className="block text-xs text-[#999999] mb-1">Session Notes <span className="text-[#555]">(optional)</span></label>
                <textarea
                  className={inp + ' resize-none'}
                  rows={5}
                  value={sessionNotes}
                  onChange={e => setSessionNotes(e.target.value)}
                  placeholder="Notes specific to this session — how you met them, their current status, etc."
                  autoFocus
                />
              </div>
            </div>
            <div className="border-t border-[#3d3d3d] px-5 py-3 flex justify-between flex-shrink-0">
              <button onClick={() => setStep('pick')} className="px-4 py-2 bg-[#3d3d3d] text-[#f0f0f0] rounded hover:bg-[#4d4d4d] transition-colors">← Back</button>
              <button onClick={handleAdd} className="px-4 py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-medium hover:bg-[#c49464] transition-colors">
                Add to Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LibraryMiniPortrait({ char }) {
  if (!char.portraitBase64) {
    return (
      <div className="w-8 h-8 rounded bg-[#3d3d3d] flex items-center justify-center text-[#666] font-bold text-sm flex-shrink-0">
        {char.name?.[0]?.toUpperCase() || '?'}
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
      <img src={char.portraitBase64} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
    </div>
  )
}

function CharacterPreview({ char, compact = false }) {
  return (
    <div>
      <div className="flex gap-3 mb-3">
        {!compact && (
          <div className="overflow-hidden rounded flex-shrink-0" style={{ width: 80, height: 107 }}>
            {char.portraitBase64 ? (
              <img src={char.portraitBase64} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
            ) : (
              <div className="w-full h-full bg-[#3d3d3d] flex items-center justify-center text-[#666] font-bold text-2xl">
                {char.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[#f0f0f0]">{char.name}</h3>
          <p className="text-xs text-[#d4a574] mb-1">{[char.race, char.class, char.alignment].filter(Boolean).join(' · ')}</p>
          {char.tagline && <p className="text-xs text-[#999999] italic">"{char.tagline}"</p>}
        </div>
      </div>

      {[
        ['Personality', char.personalityTraits],
        ['Flaw', char.flaw],
        ['Description', char.description],
        ['Quest Hooks', char.questHooks],
      ].filter(([, v]) => v).map(([label, value]) => (
        <div key={label} className="mb-2">
          <p className="text-xs text-[#666] uppercase tracking-wide mb-0.5">{label}</p>
          <p className="text-xs text-[#d4d4d4] leading-relaxed whitespace-pre-wrap">{value}</p>
        </div>
      ))}

      {char.relationships?.length > 0 && (
        <div>
          <p className="text-xs text-[#666] uppercase tracking-wide mb-1">Relationships</p>
          <div className="space-y-0.5">
            {char.relationships.map((r, i) => (
              <div key={i} className="text-xs text-[#d4d4d4]">
                <span className="text-[#f0f0f0] font-medium">{r.name}</span>
                <span className="text-[#d4a574]"> ({r.type})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Characters tab ─────────────────────────────────────────────────────

export default function Characters() {
  const { state, activeSession, dispatch } = useApp()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [showLibraryPick, setShowLibraryPick] = useState(false)

  const chars = activeSession?.characters || []
  const globalCharacters = state.globalCharacters ?? []

  const fuse = useMemo(() => new Fuse(chars, {
    keys: ['name','tagline','class','race','alignment','personalityTraits','flaw','inventory','questHooks','description'],
    threshold: 0.4,
  }), [chars])

  const filtered = useMemo(() => {
    if (!query.trim()) return chars
    return fuse.search(query).map(r => r.item)
  }, [fuse, chars, query])

  async function save(form, saveToLibrary = false) {
    let finalForm = { ...form }

    if (saveToLibrary && !form.globalCharacterId) {
      const globalId = charUid()
      const payload = {
        id: globalId,
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
      const created = await db.createGlobalCharacter(payload)
      dispatch({ type: 'ADD_GLOBAL_CHARACTER', payload: created })
      finalForm = { ...finalForm, globalCharacterId: globalId }
    }

    const exists = chars.find(c => c.id === finalForm.id)
    dispatch({ type: exists ? 'UPDATE_CHARACTER' : 'ADD_CHARACTER', sessionId: activeSession.id, payload: finalForm })
    setEditing(null)
    setSelected(null)
  }

  function addFromLibrary(globalChar, sessionNotes) {
    const sessionChar = {
      id: uid(),
      name: globalChar.name,
      tagline: globalChar.tagline || '',
      class: globalChar.class || 'Fighter',
      race: globalChar.race || 'Human',
      level: 1,
      alignment: globalChar.alignment || 'True Neutral',
      personalityTraits: globalChar.personalityTraits || '',
      flaw: globalChar.flaw || '',
      description: globalChar.description || '',
      portraitBase64: globalChar.portraitBase64 || null,
      portraitPanX: globalChar.portraitPanX || 0,
      portraitPanY: globalChar.portraitPanY || 0,
      inventory: '',
      questHooks: globalChar.questHooks || '',
      relationships: globalChar.relationships || [],
      globalCharacterId: globalChar.id,
      sessionNotes: sessionNotes || null,
    }
    dispatch({ type: 'ADD_CHARACTER', sessionId: activeSession.id, payload: sessionChar })
    setShowLibraryPick(false)
  }

  function del(id) {
    dispatch({ type: 'DELETE_CHARACTER', sessionId: activeSession.id, payload: id })
    setDeleting(null)
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <input
          id="character-search"
          className="flex-1 bg-[#2d2d2d] border border-[#3d3d3d] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574]"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search characters… (Ctrl+F)"
        />
        <button
          onClick={() => setShowLibraryPick(true)}
          className="px-4 py-2 bg-[#3d3d3d] text-[#f0f0f0] rounded font-medium text-sm hover:bg-[#4d4d4d] transition-colors whitespace-nowrap"
        >
          From Library
        </button>
        <button
          onClick={() => setEditing(emptyChar())}
          className="px-4 py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-medium text-sm hover:bg-[#c49464] transition-colors whitespace-nowrap"
        >
          + New Character
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-[#999999] py-16">
          <div className="text-5xl mb-3">👥</div>
          {query ? <p>No characters match "{query}"</p> : <p>No characters yet. Add your first!</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map(c => (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              className="cursor-pointer rounded-lg overflow-hidden bg-[#2d2d2d] border border-[#3d3d3d] hover:border-[#d4a574]/60 hover:scale-[1.03] transition-all"
            >
              <Portrait char={c} />
              <div className="p-2.5">
                <div className="flex items-start justify-between gap-1">
                  <div className="font-semibold text-[#f0f0f0] text-sm truncate">{c.name || 'Unnamed'}</div>
                  {c.globalCharacterId && <span className="text-[8px] bg-[#d4a574]/20 text-[#d4a574] px-1 py-0.5 rounded flex-shrink-0 leading-none mt-0.5">LIB</span>}
                </div>
                <div className="text-[#999999] text-xs truncate mt-0.5">{c.tagline || `${c.race} ${c.class}`}</div>
                <div className="text-[#d4a574] text-xs mt-0.5">Level {c.level}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <CharacterDrawer
          char={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing({ ...selected }); setSelected(null) }}
          onDelete={() => { setDeleting(selected); setSelected(null) }}
        />
      )}
      {editing && (
        <CharacterModal
          char={editing}
          onSave={save}
          onClose={() => setEditing(null)}
          globalCharacters={globalCharacters}
        />
      )}
      {showLibraryPick && (
        <AddFromLibraryModal
          globalCharacters={globalCharacters}
          onAdd={addFromLibrary}
          onClose={() => setShowLibraryPick(false)}
        />
      )}
      {deleting && (
        <DeleteConfirm
          name={deleting.name}
          onConfirm={() => del(deleting.id)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
