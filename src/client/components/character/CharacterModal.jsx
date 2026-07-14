import { useState, useRef } from 'react'
import Portrait from './Portrait'
import StatBlockFields, { emptyStatBlock } from './StatBlockFields'
import StatBlockView from './StatBlockView'
import ImageCropModal from '../ImageCropModal'
import NameGenModal from '../NameGenModal'
import { MAX_IMAGE_MB, MAX_IMAGE_BYTES, isGifFile, blobToBase64 } from '../../utils/imageUpload'
import { sessionCharacterImageUrl, fetchImageBlob } from '../../utils/imageUrls'
import MarkdownField from '../markdown/MarkdownField'
import MarkdownPreview from '../markdown/MarkdownPreview'

// Rebuilds a Blob from a raw (no data-URL prefix) base64 string — used to feed
// a locally-held, not-yet-saved original back into ImageCropModal for a re-crop
// without a round trip through the server.
function base64ToBlob(base64, mimeType = 'image/jpeg') {
  const byteChars = atob(base64)
  const byteNumbers = new Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i)
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType })
}

const CLASSES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']
const RACES = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Orc', 'Tiefling', 'Dragonborn', 'Half-Elf']
const ALIGNMENTS = ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil']
const REL_TYPES = ['Ally', 'Enemy', 'Rival', 'Friend', 'Family', 'Mentor', 'Student', 'Neutral', 'Romantic']

const inp = 'w-full bg-[#161310] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574]'
const lbl = 'block text-xs text-[#999999] mb-1'

export default function CharacterModal({ char, onSave, onClose, globalCharacters, defaultIsNpc = false, sessionId }) {
  const isNew = !char.name
  const isLinked = !!char.globalCharacterId
  const [form, setForm] = useState({ isNpc: defaultIsNpc, statBlock: null, hasImage: false, originalImageData: null, croppedImageData: null, ...char })
  const [saveToLibrary, setSaveToLibrary] = useState(false)
  const [showNameGen, setShowNameGen] = useState(false)
  const [cropFile, setCropFile] = useState(null)
  const [cropMode, setCropMode] = useState(null) // 'new' | 're-crop'
  const [uploadError, setUploadError] = useState('')
  const [gifNotice, setGifNotice] = useState(false)
  const fileRef = useRef(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handlePortrait(e) {
    const f = e.target.files[0]
    if (!f) return
    if (fileRef.current) fileRef.current.value = ''
    setUploadError('')
    setGifNotice(false)
    if (f.size > MAX_IMAGE_BYTES) {
      const mb = (f.size / (1024 * 1024)).toFixed(1)
      setUploadError(`Image is ${mb} MB — max allowed size is ${MAX_IMAGE_MB} MB.`)
      return
    }
    if (isGifFile(f)) {
      const originalImageData = await blobToBase64(f)
      setForm(p => ({ ...p, hasImage: true, originalImageData, croppedImageData: null }))
      setGifNotice(true)
      return
    }
    setCropMode('new')
    setCropFile(f)
  }

  async function handleCropSave(originalFile, croppedBlob) {
    const croppedImageData = await blobToBase64(croppedBlob)
    if (cropMode === 're-crop') {
      setForm(p => ({ ...p, hasImage: true, croppedImageData }))
    } else {
      const originalImageData = await blobToBase64(originalFile)
      setForm(p => ({ ...p, hasImage: true, originalImageData, croppedImageData }))
    }
    setCropFile(null)
    setCropMode(null)
  }

  function handleCropClose() {
    setCropFile(null)
    setCropMode(null)
  }

  async function handleRecrop() {
    setUploadError('')
    setGifNotice(false)
    let source = null
    if (form.originalImageData) {
      source = base64ToBlob(form.originalImageData)
    } else {
      const url = sessionCharacterImageUrl(form, sessionId, 'original')
      if (url) source = await fetchImageBlob(url)
    }
    if (!source) return
    setCropMode('re-crop')
    setCropFile(source)
  }

  function handleRemovePortrait() {
    setForm(p => ({ ...p, hasImage: false, originalImageData: null, croppedImageData: null }))
    setUploadError('')
    setGifNotice(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const portraitPreviewUrl = form.croppedImageData
    ? `data:image/jpeg;base64,${form.croppedImageData}`
    : sessionCharacterImageUrl(form, sessionId)

  const roInp = 'w-full bg-[#222] border border-[#332922]/50 rounded px-3 py-2 text-[#999999] text-sm cursor-not-allowed'

  // For linked chars: shared fields read-only, session fields editable
  if (isLinked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
        <div className="bg-[#211b17] rounded-lg w-[720px] max-h-[92vh] overflow-y-auto fade-in" onClick={e => e.stopPropagation()}>
          <div className="sticky top-0 bg-[#211b17] border-b border-[#332922] px-5 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-[#d4a574]">Edit: {char.name}</h2>
              <span className="text-xs bg-[#d4a574]/20 text-[#d4a574] px-1.5 py-0.5 rounded">Library</span>
              {char.isNpc && <span className="text-xs bg-[#b24545]/20 text-[#b24545] px-1.5 py-0.5 rounded">NPC</span>}
            </div>
            <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl">×</button>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <p className="text-xs text-[#999999] uppercase tracking-wide mb-3 flex items-center gap-2">
                Shared Info
                <span className="text-[#555] normal-case tracking-normal font-normal">— edit in the Library to update the source</span>
              </p>
              <div className="flex gap-4 bg-[#161310] rounded p-4">
                <Portrait char={form} size="sm" imageUrl={sessionCharacterImageUrl(form, sessionId)} />
                <div className="flex-1 min-w-0 space-y-2">
                  {form.isNpc ? (
                    <StatBlockView char={form} />
                  ) : (
                    <>
                      {form.tagline && <p className="text-[#d4d4d4] italic text-sm">"{form.tagline}"</p>}
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        {[['Class', form.class], ['Race', form.race], ['Alignment', form.alignment]].map(([k, v]) => v && (
                          <div key={k}><span className="text-[#666]">{k}: </span><span className="text-[#d4d4d4]">{v}</span></div>
                        ))}
                      </div>
                      <MarkdownPreview value={form.personalityTraits} className="text-xs text-[#999999]" />
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-[#332922] pt-5 space-y-3">
              <p className="text-xs text-[#6b8e6b] uppercase tracking-wide">Session Fields</p>
              {!form.isNpc && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Level</label>
                    <input type="number" className={inp} value={form.level} min={1} max={20} onChange={e => set('level', Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))} />
                  </div>
                </div>
              )}
              {!form.isNpc && (
                <div>
                  <label className={lbl}>Inventory</label>
                  <textarea className={inp + ' resize-none'} rows={3} value={form.inventory || ''} onChange={e => set('inventory', e.target.value)} placeholder="Items, gold, equipment..." />
                </div>
              )}
              <div>
                <label className={lbl}>Session Notes</label>
                <MarkdownField value={form.sessionNotes || ''} onChange={v => set('sessionNotes', v || null)} placeholder="Notes specific to this session — what happened, status changes, etc." />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-[#332922]">
              <button onClick={onClose} className="px-4 py-2 bg-[#332922] text-[#f0f0f0] rounded hover:bg-[#40332a] transition-colors">Cancel</button>
              <button onClick={() => onSave(form)} className="px-5 py-2 bg-[#d4a574] text-[#161310] rounded font-medium hover:bg-[#c49464] transition-colors">Save</button>
            </div>
          </div>
        </div>
        {cropFile && (
          <ImageCropModal file={cropFile} aspectW={3} aspectH={4} title="Crop Portrait" onSave={handleCropSave} onClose={handleCropClose} />
        )}
      </div>
    )
  }

  // New / unlinked character: full form with optional "Save to library" toggle + NPC toggle
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-[#211b17] rounded-lg w-[720px] max-h-[92vh] overflow-y-auto fade-in" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#211b17] border-b border-[#332922] px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-[#d4a574]">{char.name ? `Edit: ${char.name}` : (form.isNpc ? 'New NPC / Monster' : 'New Character')}</h2>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl">×</button>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-5 mb-4">
            <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
              <input type="checkbox" checked={!!form.isNpc} onChange={e => set('isNpc', e.target.checked)} className="accent-[#b24545]" />
              <span className="text-sm text-[#d4d4d4]">This is an NPC / Monster</span>
              <span className="text-xs text-[#666]">— shows a 5e stat block instead of PC fields</span>
            </label>
          </div>

          {isNew && (
            <label className="flex items-center gap-2 mb-4 cursor-pointer select-none w-fit">
              <input type="checkbox" checked={saveToLibrary} onChange={e => setSaveToLibrary(e.target.checked)} className="accent-[#d4a574]" />
              <span className="text-sm text-[#d4d4d4]">Save to library</span>
              <span className="text-xs text-[#666]">— makes this {form.isNpc ? 'NPC' : 'character'} reusable in other sessions</span>
            </label>
          )}

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-3">
              <div>
                <label className={lbl}>Name</label>
                <div className="flex gap-2">
                  <input className={inp + ' flex-1'} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Name" />
                  <button onClick={() => setShowNameGen(true)} className="px-2 py-1 bg-[#332922] text-[#d4a574] rounded hover:bg-[#40332a] text-base" title="Roll name">🎲</button>
                </div>
              </div>
              <div>
                <label className={lbl}>Tagline</label>
                <input className={inp} value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="Brief description or epithet..." />
              </div>

              {!form.isNpc && (
                <>
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
                    <MarkdownField value={form.personalityTraits} onChange={v => set('personalityTraits', v)} textareaClassName={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Flaw</label>
                    <MarkdownField value={form.flaw} onChange={v => set('flaw', v)} textareaClassName={inp} />
                  </div>
                </>
              )}

              <div>
                <label className={lbl}>{form.isNpc ? 'Flavor Text / Notes' : 'Description'}</label>
                <MarkdownField value={form.description} onChange={v => set('description', v)} textareaClassName={inp} placeholder={form.isNpc ? 'Appearance, behavior, DM notes...' : 'Physical appearance, background...'} />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Portrait (3:4)</label>
                {portraitPreviewUrl ? (
                  <div className="space-y-2">
                    <div className="overflow-hidden rounded" style={{ width: 150, height: 200 }}>
                      <img src={portraitPreviewUrl} alt="Portrait" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleRecrop} className="text-xs text-[#d4a574] hover:underline">Re-crop</button>
                      <button onClick={handleRemovePortrait} className="text-xs text-[#b24545] hover:underline">Remove</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} className="w-full h-36 border-2 border-dashed border-[#332922] rounded text-[#666] hover:border-[#d4a574] hover:text-[#d4a574] transition-colors text-sm">
                    Click to upload portrait
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePortrait} />
                {uploadError && <p className="text-xs text-[#b24545] mt-1">{uploadError}</p>}
                {gifNotice && <p className="text-xs text-[#999999] mt-1">Animated GIFs are saved as-is — cropping isn't applied to GIFs.</p>}
              </div>

              {!form.isNpc && (
                <>
                  <div>
                    <label className={lbl}>Inventory</label>
                    <textarea className={inp + ' resize-none'} rows={4} value={form.inventory} onChange={e => set('inventory', e.target.value)} placeholder="Items, gold, equipment..." />
                  </div>
                  <div>
                    <label className={lbl}>Quest Hooks</label>
                    <MarkdownField value={form.questHooks} onChange={v => set('questHooks', v)} textareaClassName={inp} placeholder="Personal quests, goals, secrets..." />
                  </div>
                </>
              )}

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

          {form.isNpc && (
            <div className="mt-5 pt-4 border-t border-[#332922]">
              <p className="text-xs text-[#b24545] uppercase tracking-wide font-semibold mb-3">Stat Block</p>
              <StatBlockFields value={form.statBlock || emptyStatBlock()} onChange={v => set('statBlock', v)} />
            </div>
          )}

          <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-[#332922]">
            <button onClick={onClose} className="px-4 py-2 bg-[#332922] text-[#f0f0f0] rounded hover:bg-[#40332a] transition-colors">Cancel</button>
            <button
              onClick={() => form.name.trim() && onSave(form, saveToLibrary)}
              disabled={!form.name.trim()}
              className="px-5 py-2 bg-[#d4a574] text-[#161310] rounded font-medium hover:bg-[#c49464] transition-colors disabled:opacity-40"
            >
              {saveToLibrary ? 'Save & Add to Library' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {showNameGen && <NameGenModal onSelect={name => { set('name', name); setShowNameGen(false) }} onClose={() => setShowNameGen(false)} />}
      {cropFile && (
        <ImageCropModal file={cropFile} aspectW={3} aspectH={4} title="Crop Portrait" onSave={handleCropSave} onClose={handleCropClose} />
      )}
    </div>
  )
}
