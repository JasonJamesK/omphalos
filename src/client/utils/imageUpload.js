export const MAX_IMAGE_MB = 5
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024

// The longest edge (in px) a crop working-copy is downscaled to before Cropper.js
// ever touches it. Keeps the canvas well under mobile-Safari's canvas-area ceiling
// and bounds how large the eventual cropped output can be.
const WORKING_COPY_MAX_EDGE = 2400

// Reads an image file as a data URL, rejecting anything over MAX_IMAGE_BYTES
// before it ever gets base64-encoded into the database.
export function readImageFile(file, onLoad, onError) {
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    onError(`Image is ${mb} MB — max allowed size is ${MAX_IMAGE_MB} MB.`)
    return
  }
  const reader = new FileReader()
  reader.onload = e => onLoad(e.target.result)
  reader.onerror = () => onError('Could not read that file.')
  reader.readAsDataURL(file)
}

// Animated GIFs must never be run through the crop stage — cropping would bake
// down to a single static frame and destroy the animation. Callers check this
// before ever mounting the crop modal.
export function isGifFile(file) {
  return !!(file && file.type === 'image/gif')
}

// Sniffs the real image format from raw bytes, mirroring the server's
// magic-byte detection (Omphalos.Services.Implementations.ImageValidation).
// A caller-supplied `Blob.type` cannot be trusted for locally-rebuilt Blobs
// (e.g. base64ToBlob helpers), whose type is just a hardcoded default —
// only the actual bytes reveal a not-yet-saved original's real format.
export function detectImageMimeType(bytes) {
  if (bytes.length >= 2 && bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png'
  if (bytes.length >= 2 && bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif'
  return 'image/jpeg'
}

// True when a Blob/File's real bytes are a GIF, regardless of its declared
// `type` — used before opening ImageCropModal for a re-crop, since that
// component must never be mounted for a GIF (baking it to a single frame
// would silently destroy the animation). A locally-rebuilt Blob's `type`
// (e.g. from a base64ToBlob helper) can't be trusted, so this sniffs the
// GIF87a/GIF89a magic bytes ("GI") directly.
export async function isGifBlob(blob) {
  if (!blob) return false
  if (blob.type === 'image/gif') return true
  const header = new Uint8Array(await blob.slice(0, 2).arrayBuffer())
  return header[0] === 0x47 && header[1] === 0x49
}

// Prepares an EXIF-safe, size-capped working copy of an uploaded image for the
// crop stage to render. This is NOT what gets stored as the "original" — it is
// only ever the source the user crops against, so a huge phone photo can't blow
// past a mobile browser's canvas-area limit and orientation always comes out
// right regardless of how the source file's EXIF tag was written.
export async function prepareWorkingCopy(fileOrBlob) {
  const bitmap = await createImageBitmap(fileOrBlob, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, WORKING_COPY_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)

    const outputType = fileOrBlob.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const quality = outputType === 'image/jpeg' ? 0.92 : undefined

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Could not prepare that image for cropping.'))),
        outputType,
        quality
      )
    })
  } finally {
    bitmap.close?.()
  }
}

// Reads a Blob/File and resolves the raw Base64 payload (no `data:...;base64,`
// prefix) so it maps cleanly onto a byte[] DTO field on the wire.
export async function blobToBase64(blob) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(blob)
  })
  const commaIndex = dataUrl.indexOf(',')
  return commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1)
}
