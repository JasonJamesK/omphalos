import { useRef, useState, useEffect } from 'react'
import 'cropperjs'
import { prepareWorkingCopy } from '../utils/imageUpload'

// Cropper.js v2's amber accent — every crop-stage element that ships its own
// default blue theme-color must be retinted to this so the crop stage matches
// the rest of the app's dark gothic/amber palette instead of the library default.
const THEME_COLOR = '#d4a574'
const GRID_COLOR = 'rgba(212, 165, 116, 0.35)'

const RESIZE_ACTIONS = [
  'n-resize', 's-resize', 'e-resize', 'w-resize',
  'ne-resize', 'nw-resize', 'se-resize', 'sw-resize',
]

// Cropper.js v2 ships its resize handles as small (~15px) invisible hit-boxes
// with only a subtle inner dot rendered. That is below the 44px touch target
// UI-SPEC requires, so on coarse-pointer (touch) devices we grow each handle's
// hit-box while re-centering it on the same point, leaving the visible dot
// (an internal ::after the library controls) untouched.
const TOUCH_HANDLE_STYLE = `
  @media (pointer: coarse) {
    .omph-crop-stage cropper-handle[action='n-resize'] { height: 44px !important; top: -22px !important; }
    .omph-crop-stage cropper-handle[action='s-resize'] { height: 44px !important; bottom: -22px !important; }
    .omph-crop-stage cropper-handle[action='e-resize'] { width: 44px !important; right: -22px !important; }
    .omph-crop-stage cropper-handle[action='w-resize'] { width: 44px !important; left: -22px !important; }
    .omph-crop-stage cropper-handle[action='ne-resize'] { width: 44px !important; height: 44px !important; top: -22px !important; right: -22px !important; }
    .omph-crop-stage cropper-handle[action='nw-resize'] { width: 44px !important; height: 44px !important; top: -22px !important; left: -22px !important; }
    .omph-crop-stage cropper-handle[action='se-resize'] { width: 44px !important; height: 44px !important; bottom: -22px !important; right: -22px !important; }
    .omph-crop-stage cropper-handle[action='sw-resize'] { width: 44px !important; height: 44px !important; bottom: -22px !important; left: -22px !important; }
  }
`

// Shared Cropper.js v2 crop stage used at all three crop sites (Character
// Library portraits, in-session character portraits, location images).
// `file` may be a raw File (fresh upload) or a Blob (a stored `/original`
// re-fetched for a re-crop) — this component owns EXIF-correction/downscale
// working-copy prep, so callers never hand it a pre-decoded dataURL.
//
// GIF handling is the caller's responsibility: this component assumes a
// non-GIF, croppable image and must never be mounted for `file.type ===
// 'image/gif'`.
export default function ImageCropModal({ file, aspectW, aspectH, title, onSave, onClose }) {
  const imageElRef = useRef(null)
  const selectionElRef = useRef(null)
  const [workingCopyUrl, setWorkingCopyUrl] = useState(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)

  // Prepare the EXIF-safe, 2400px-capped working copy once on mount (or if a
  // different file is handed in). This is what the crop stage renders against
  // — the raw `file` bytes are stored unmodified as the Original when saved.
  useEffect(() => {
    let cancelled = false
    let objectUrl = null
    setReady(false)
    setError(null)
    prepareWorkingCopy(file)
      .then(blob => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setWorkingCopyUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setError('Could not prepare that image for cropping.')
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [file])

  // Fixed aspect ratio for this call site — set once via attribute, since
  // React 18 cannot bind arbitrary custom-element properties through JSX.
  useEffect(() => {
    const selectionEl = selectionElRef.current
    if (!selectionEl) return
    selectionEl.setAttribute('aspect-ratio', String(aspectW / aspectH))
  }, [aspectW, aspectH])

  // Wait for the image to actually be ready before centering it and
  // initializing the selection box.
  //
  // NOTE: <cropper-image> does NOT dispatch a plain, externally-observable
  // DOM 'load' event on itself — it loads its source into an internal Image
  // held inside its own shadow root, and that internal load event does not
  // bubble/compose out to the host element. Verified directly against the
  // installed cropperjs@2.1.1 source (node_modules/cropperjs/dist/cropper.esm.js):
  // CropperImage exposes a public `$ready()` method (a Promise that resolves
  // once the image has actually loaded) for exactly this purpose — that is
  // the API to use here, not `imageEl.addEventListener('load', ...)`.
  useEffect(() => {
    const imageEl = imageElRef.current
    const selectionEl = selectionElRef.current
    if (!imageEl || !selectionEl || !workingCopyUrl) return
    let cancelled = false
    imageEl.$ready()
      .then(() => {
        if (cancelled) return
        imageEl.$center('contain')
        selectionEl.$initSelection(true, true)
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load that image.')
      })
    return () => {
      cancelled = true
    }
  }, [workingCopyUrl])

  async function handleCropAndSave() {
    try {
      const canvas = await selectionElRef.current.$toCanvas()
      canvas.toBlob(blob => {
        if (!blob) {
          setError('Could not export the cropped image.')
          return
        }
        onSave(file, blob)
      }, 'image/jpeg', 0.9)
    } catch {
      setError('Could not export the cropped image.')
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <style>{TOUCH_HANDLE_STYLE}</style>
      <div className="bg-[#211b17] rounded-lg p-5 fade-in max-w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-[#d4a574]">{title}</h3>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl leading-none">
            &times;
          </button>
        </div>
        <p className="text-xs text-[#999999] mb-3">
          Drag to reposition, scroll or pinch to zoom — select your {aspectW}:{aspectH} area.
        </p>

        {error && <p className="text-xs text-[#b24545] mb-2">{error}</p>}

        <cropper-canvas
          className="omph-crop-stage"
          style={{ width: '100%', maxWidth: 600, height: 400, display: 'block', background: '#111' }}
        >
          {workingCopyUrl && (
            <cropper-image ref={imageElRef} src={workingCopyUrl} alt="crop source" scalable />
          )}
          <cropper-shade />
          <cropper-handle action="select" plain />
          <cropper-selection
            ref={selectionElRef}
            initial-coverage="0.85"
            movable
            resizable
            outlined
            theme-color={THEME_COLOR}
          >
            <cropper-grid role="grid" covered theme-color={GRID_COLOR} />
            <cropper-crosshair centered theme-color={GRID_COLOR} />
            <cropper-handle action="move" theme-color="rgba(0, 0, 0, 0)" />
            {RESIZE_ACTIONS.map(action => (
              <cropper-handle key={action} action={action} theme-color={THEME_COLOR} />
            ))}
          </cropper-selection>
        </cropper-canvas>

        <div className="flex gap-3 justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#332922] text-[#f0f0f0] rounded hover:bg-[#40332a] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCropAndSave}
            disabled={!ready}
            className="px-5 py-2 bg-[#d4a574] text-[#161310] rounded font-bold hover:bg-[#c49464] transition-colors disabled:opacity-40"
          >
            Crop & Save
          </button>
        </div>
      </div>
    </div>
  )
}
