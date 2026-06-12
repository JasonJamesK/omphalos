const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include', // send httpOnly cookie automatically
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (res.status === 401) {
    window.dispatchEvent(new Event('omphalos:unauthorized'))
    throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error(`API error ${res.status}`)
  if (res.status === 204) return null
  return res.json()
}

export const db = {
  async getAllSessions() {
    return request('/sessions')
  },

  async saveSession(session) {
    return request(`/sessions/${session.id}`, {
      method: 'PUT',
      body: JSON.stringify(session),
    })
  },

  async deleteSession(id) {
    return request(`/sessions/${id}`, { method: 'DELETE' })
  },

  async getSettings() {
    return request('/settings')
  },

  async saveSettings(settings) {
    return request('/settings', {
      method: 'PUT',
      body: JSON.stringify({ geminiApiKey: settings.geminiApiKey ?? '' }),
    })
  },
}

export async function login(username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error('Invalid credentials')
  return res.json()
}

export async function logout() {
  await fetch(`${BASE}/auth/logout`, { method: 'POST', credentials: 'include' })
  window.dispatchEvent(new Event('omphalos:unauthorized'))
}

export async function getMe() {
  const res = await fetch(`${BASE}/auth/me`, { credentials: 'include' })
  if (!res.ok) return null
  return res.json()
}

export const adminApi = {
  getUsers: () => request('/admin/users'),
  createUser: (username, password, role) =>
    request('/admin/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
}
