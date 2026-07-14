import { useState, useMemo, useRef, useEffect } from 'react'
import { db } from '../../db/index.js'
import ImageCropModal from '../ImageCropModal'
import { MAX_IMAGE_MB, MAX_IMAGE_BYTES, isGifFile, isGifBlob, blobToBase64, detectImageMimeType } from '../../utils/imageUpload'
import { getImageUrl, fetchImageBlob } from '../../utils/imageUrls'
import MarkdownField from '../markdown/MarkdownField'
import MarkdownPreview from '../markdown/MarkdownPreview'
import { stripMarkdown } from '../markdown/stripMarkdown'

// Rebuilds a Blob from a raw (no data-URL prefix) base64 string — used to feed
// a locally-held, not-yet-saved original back into ImageCropModal for a re-crop
// without a round trip through the server. The MIME type is sniffed from the
// actual bytes rather than assumed, so a not-yet-saved PNG original isn't
// silently re-encoded as an opaque JPEG (losing transparency) at the crop stage.
function base64ToBlob(base64) {
  const byteChars = atob(base64)
  const byteNumbers = new Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i)
  const bytes = new Uint8Array(byteNumbers)
  return new Blob([bytes], { type: detectImageMimeType(bytes) })
}

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
    id: gluid(), name: '', type: '', description: '', notes: '', secretsAndHazards: '',
    hasImage: false, originalImageData: null, croppedImageData: null,
  })
  const [saving, setSaving] = useState(false)
  const [cropFile, setCropFile] = useState(null)
  const [cropMode, setCropMode] = useState(null) // 'new' | 're-crop'
  const [uploadError, setUploadError] = useState('')
  const [gifNotice, setGifNotice] = useState(false)
  const [gifPreviewUrl, setGifPreviewUrl] = useState(null)
  const fileRef = useRef(null)

  // Revoke the previous local GIF preview URL whenever it's replaced or the
  // modal unmounts — it's never persisted anywhere else, so nothing else owns it.
  useEffect(() => {
    return () => { if (gifPreviewUrl) URL.revokeObjectURL(gifPreviewUrl) }
  }, [gifPreviewUrl])

  async function handleImage(e) {
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
      setGifPreviewUrl(URL.createObjectURL(f))
      setCreateForm(p => ({ ...p, hasImage: true, originalImageData, croppedImageData: null }))
      setGifNotice(true)
      return
    }
    setGifPreviewUrl(null)
    setCropMode('new')
    setCropFile(f)
  }

  async function handleCropSave(originalFile, croppedBlob) {
    const croppedImageData = await blobToBase64(croppedBlob)
    if (cropMode === 're-crop') {
      setCreateForm(p => ({ ...p, hasImage: true, croppedImageData }))
    } else {
      const originalImageData = await blobToBase64(originalFile)
      setCreateForm(p => ({ ...p, hasImage: true, originalImageData, croppedImageData }))
    }
    setGifPreviewUrl(null)
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
    if (createForm.originalImageData) {
      source = base64ToBlob(createForm.originalImageData)
    } else if (createForm.hasImage) {
      const url = getImageUrl('global-location', createForm.id, 'original')
      source = await fetchImageBlob(url)
    }
    if (!source) return
    if (await isGifBlob(source)) {
      setGifNotice(true)
      return
    }
    setCropMode('re-crop')
    setCropFile(source)
  }

  function handleRemoveImage() {
    setCreateForm(p => ({ ...p, hasImage: false, originalImageData: null, croppedImageData: null }))
    setUploadError('')
    setGifNotice(false)
    setGifPreviewUrl(null)
    if (fileRef.current) fileRef.current.value = ''
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
        hasImage: createForm.hasImage,
        originalImageData: createForm.originalImageData,
        croppedImageData: createForm.croppedImageData,
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
      hasImage: false,
      sessionNotes: sessionNotes.trim() || null,
    })
  }

  const createImagePreviewUrl = createForm.croppedImageData
    ? `data:image/jpeg;base64,${createForm.croppedImageData}`
    : (gifPreviewUrl || (createForm.hasImage ? getImageUrl('global-location', createForm.id, 'cropped') : null))

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
                    <p className="text-xs text-[#999999] mt-0.5 truncate">{stripMarkdown(loc.description)}</p>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-[#332922] pt-3 flex-shrink-0">
              <button
                onClick={() => { setCreateForm({ id: gluid(), name: search, type: '', description: '', notes: '', secretsAndHazards: '', hasImage: false, originalImageData: null, croppedImageData: null }); setStep('create') }}
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
              {createImagePreviewUrl ? (
                <div className="space-y-2">
                  <div className="overflow-hidden rounded" style={{ width: '100%', maxWidth: 320, aspectRatio: '4 / 3' }}>
                    <img src={createImagePreviewUrl} alt={createForm.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleRecrop} className="text-xs text-[#d4a574] hover:underline">Re-crop</button>
                    <button onClick={handleRemoveImage} className="text-xs text-[#b24545] hover:underline">Remove</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} className="w-full h-24 border-2 border-dashed border-[#332922] rounded text-[#666] hover:border-[#d4a574] hover:text-[#d4a574] transition-colors text-sm">
                  Click to upload image
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              {uploadError && <p className="text-xs text-[#b24545] mt-1">{uploadError}</p>}
              {gifNotice && <p className="text-xs text-[#999999] mt-1">Animated GIFs are saved as-is — cropping isn't applied to GIFs.</p>}
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
              <MarkdownField
                value={createForm.description}
                onChange={v => setCreateForm(p => ({ ...p, description: v }))}
                textareaClassName={inputCls}
                placeholder="Appearance, atmosphere, notable features..."
              />
            </div>
            <div>
              <label className={labelCls}>Secrets & Hazards</label>
              <MarkdownField
                value={createForm.secretsAndHazards}
                onChange={v => setCreateForm(p => ({ ...p, secretsAndHazards: v }))}
                textareaClassName={inputCls}
                placeholder="Traps, hidden passages, lore secrets... (one per line)"
              />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <MarkdownField
                value={createForm.notes}
                onChange={v => setCreateForm(p => ({ ...p, notes: v }))}
                textareaClassName={inputCls}
                placeholder="Additional DM notes..."
              />
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
              {selected.description && <MarkdownPreview value={selected.description} className="text-sm text-[#d4d4d4]" />}
              {selected.secretsAndHazards && (
                <div className="pt-1">
                  <p className="text-xs text-[#b24545] font-semibold uppercase tracking-wide mb-1">Secrets / Hazards</p>
                  {stripMarkdown(selected.secretsAndHazards).split('\n').filter(Boolean).map((line, i) => (
                    <p key={i} className="text-xs text-[#f0f0f0] flex gap-1.5"><span className="text-[#b24545]">▸</span>{line}</p>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Session Notes <span className="text-[#555]">(optional)</span></label>
              <MarkdownField
                value={sessionNotes}
                onChange={setSessionNotes}
                textareaClassName={inputCls}
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
      {cropFile && (
        <ImageCropModal
          file={cropFile}
          aspectW={4}
          aspectH={3}
          title="Crop Location Image"
          onSave={handleCropSave}
          onClose={handleCropClose}
        />
      )}
    </div>
  )
}
