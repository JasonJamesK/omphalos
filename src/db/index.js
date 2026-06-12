import { openDB } from 'idb'

const DB_NAME = 'omphalos'
const DB_VER = 1

let _db

async function getDB() {
  if (!_db) {
    _db = await openDB(DB_NAME, DB_VER, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings')
        }
      },
    })
  }
  return _db
}

export const db = {
  async getAllSessions() {
    const d = await getDB()
    return d.getAll('sessions')
  },
  async saveSession(session) {
    const d = await getDB()
    return d.put('sessions', session)
  },
  async deleteSession(id) {
    const d = await getDB()
    return d.delete('sessions', id)
  },
  async getSettings() {
    const d = await getDB()
    return d.get('settings', 'main')
  },
  async saveSettings(settings) {
    const d = await getDB()
    return d.put('settings', settings, 'main')
  },
}
