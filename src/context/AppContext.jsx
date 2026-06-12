import { createContext, useContext, useReducer, useEffect } from 'react'
import { db } from '../db/index.js'
import { mockSessions } from '../data/mockData.js'

const AppContext = createContext(null)

const initial = {
  sessions: [],
  activeSessionId: null,
  activeTab: 0,
  sidebarCollapsed: false,
  settings: { geminiApiKey: '', customTables: [] },
  loaded: false,
}

function reducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return { ...state, ...action.payload, loaded: true }

    case 'SET_ACTIVE_SESSION':
      return { ...state, activeSessionId: action.payload, activeTab: 0 }

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload }

    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed }

    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }

    case 'ADD_SESSION': {
      return {
        ...state,
        sessions: [...state.sessions, action.payload],
        activeSessionId: action.payload.id,
        activeTab: 0,
      }
    }

    case 'UPDATE_SESSION': {
      return {
        ...state,
        sessions: state.sessions.map(s =>
          s.id === action.payload.id
            ? { ...s, ...action.payload, dateModified: Date.now() }
            : s
        ),
      }
    }

    case 'DELETE_SESSION': {
      const next = state.sessions.filter(s => s.id !== action.payload)
      return {
        ...state,
        sessions: next,
        activeSessionId: next.length ? next[next.length - 1].id : null,
      }
    }

    case 'ADD_CHARACTER':
      return updateSessionField(state, action.sessionId, s => ({
        characters: [...(s.characters || []), action.payload],
      }))

    case 'UPDATE_CHARACTER':
      return updateSessionField(state, action.sessionId, s => ({
        characters: (s.characters || []).map(c =>
          c.id === action.payload.id ? action.payload : c
        ),
      }))

    case 'DELETE_CHARACTER':
      return updateSessionField(state, action.sessionId, s => ({
        characters: (s.characters || []).filter(c => c.id !== action.payload),
      }))

    case 'ADD_LOCATION':
      return updateSessionField(state, action.sessionId, s => ({
        locations: [...(s.locations || []), action.payload],
      }))

    case 'UPDATE_LOCATION':
      return updateSessionField(state, action.sessionId, s => ({
        locations: (s.locations || []).map(l =>
          l.id === action.payload.id ? action.payload : l
        ),
      }))

    case 'DELETE_LOCATION':
      return updateSessionField(state, action.sessionId, s => ({
        locations: (s.locations || []).filter(l => l.id !== action.payload),
      }))

    case 'ADD_ENCOUNTER':
      return updateSessionField(state, action.sessionId, s => ({
        encounters: [...(s.encounters || []), action.payload],
      }))

    case 'UPDATE_ENCOUNTER':
      return updateSessionField(state, action.sessionId, s => ({
        encounters: (s.encounters || []).map(e =>
          e.id === action.payload.id ? action.payload : e
        ),
      }))

    case 'DELETE_ENCOUNTER':
      return updateSessionField(state, action.sessionId, s => ({
        encounters: (s.encounters || []).filter(e => e.id !== action.payload),
      }))

    default:
      return state
  }
}

function updateSessionField(state, sessionId, updater) {
  return {
    ...state,
    sessions: state.sessions.map(s =>
      s.id === sessionId
        ? { ...s, ...updater(s), dateModified: Date.now() }
        : s
    ),
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial)

  useEffect(() => {
    async function load() {
      try {
        const [sessions, settings] = await Promise.all([
          db.getAllSessions(),
          db.getSettings(),
        ])
        let loaded = sessions.length ? sessions : mockSessions
        if (!sessions.length) {
          for (const s of mockSessions) await db.saveSession(s)
        }
        dispatch({
          type: 'INIT',
          payload: {
            sessions: loaded,
            activeSessionId: loaded[0]?.id || null,
            settings: settings || { geminiApiKey: '' },
          },
        })
      } catch {
        dispatch({
          type: 'INIT',
          payload: {
            sessions: mockSessions,
            activeSessionId: mockSessions[0]?.id || null,
            settings: { geminiApiKey: '' },
          },
        })
      }
    }
    load()
  }, [])

  // Persist sessions on change
  useEffect(() => {
    if (!state.loaded) return
    for (const s of state.sessions) {
      db.saveSession(s).catch(() => {})
    }
  }, [state.sessions, state.loaded])

  // Persist settings on change
  useEffect(() => {
    if (!state.loaded) return
    db.saveSettings(state.settings).catch(() => {})
  }, [state.settings, state.loaded])

  const activeSession = state.sessions.find(s => s.id === state.activeSessionId) || null

  return (
    <AppContext.Provider value={{ state, dispatch, activeSession }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
