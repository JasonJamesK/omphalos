export const MAX_IMAGE_MB = 5
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024

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
