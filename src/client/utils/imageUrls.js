// Builds the binary-endpoint URL for a stored image, and resolves which URL
// (if any) a session-scoped Character/Location should render — own image if
// it has one, otherwise the linked library entry's image, otherwise nothing.

const ROUTE_BUILDERS = {
  'session-character': (id, variant, sessionId) =>
    `/api/sessions/${sessionId}/characters/${id}/portrait/${variant}`,
  'session-location': (id, variant, sessionId) =>
    `/api/sessions/${sessionId}/locations/${id}/image/${variant}`,
  'global-character': (id, variant) => `/api/characters/${id}/portrait/${variant}`,
  'global-location': (id, variant) => `/api/locations/${id}/image/${variant}`,
}

export function getImageUrl(kind, id, variant = 'cropped', sessionId = null) {
  const buildRoute = ROUTE_BUILDERS[kind]
  if (!buildRoute) {
    throw new Error(`Unknown image kind: ${kind}`)
  }
  return buildRoute(id, variant, sessionId)
}

// Resolves the URL a session-scoped Character's portrait should render:
// its own stored image if it has one, else the linked library character's
// image (no byte copy across the API), else null (render a placeholder).
export function sessionCharacterImageUrl(char, sessionId, variant = 'cropped') {
  if (!char) return null
  if (char.hasImage) return getImageUrl('session-character', char.id, variant, sessionId)
  if (char.globalCharacterId) return getImageUrl('global-character', char.globalCharacterId, variant)
  return null
}

// Same resolution order as sessionCharacterImageUrl, for session-scoped Locations.
export function sessionLocationImageUrl(loc, sessionId, variant = 'cropped') {
  if (!loc) return null
  if (loc.hasImage) return getImageUrl('session-location', loc.id, variant, sessionId)
  if (loc.globalLocationId) return getImageUrl('global-location', loc.globalLocationId, variant)
  return null
}

// Pulls a stored image back down as a Blob — used by the re-crop flow to feed
// the retained `/original` back into ImageCropModal without a fresh upload.
export async function fetchImageBlob(url) {
  const response = await fetch(url, { credentials: 'include' })
  return response.ok ? response.blob() : null
}
