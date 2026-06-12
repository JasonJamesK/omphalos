import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { db, getMe } from '../db/index.js'

const AppContext = createContext(null)

const initial = {
  sessions: [],
  activeSessionId: null,
  activeTab: 0,
  sidebarCollapsed: false,
  settings: { geminiApiKey: '', customTables: [] },
  loaded: false,
  user: null,        // { id, username, role } when logged in
  authChecked: false, // true once we know if user is logged in
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, authChecked: true }

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

    case 'ADD_SESSION':
      return {
        ...state,
        sessions: [...state.sessions, action.payload],
        activeSessionId: action.payload.id,
        activeTab: 0,
      }

    case 'UPDATE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map(s =>
          s.id === action.payload.id
            ? { ...s, ...action.payload, dateModified: Date.now() }
            : s
        ),
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

  // Check auth on mount
  useEffect(() => {
    getMe().then(user => {
      dispatch({ type: 'SET_USER', payload: user })
    })

    // Listen for 401s from any API call
    const onUnauthorized = () => dispatch({ type: 'SET_USER', payload: null })
    window.addEventListener('omphalos:unauthorized', onUnauthorized)
    return () => window.removeEventListener('omphalos:unauthorized', onUnauthorized)
  }, [])

  // Load data once authenticated
  useEffect(() => {
    if (!state.user) return
    async function load() {
      try {
        const [sessions, settings] = await Promise.all([
          db.getAllSessions(),
          db.getSettings(),
        ])
        dispatch({
          type: 'INIT',
          payload: {
            sessions: sessions ?? [],
            activeSessionId: sessions?.[0]?.id ?? null,
            settings: settings ?? { geminiApiKey: '' },
          },
        })
      } catch {
        dispatch({
          type: 'INIT',
          payload: { sessions: [], activeSessionId: null, settings: { geminiApiKey: '' } },
        })
      }
    }
    load()
  }, [state.user])

  // Persist the single changed session instead of all of them
  const saveSession = useCallback((session) => {
    db.saveSession(session).catch(() => {})
  }, [])

  // Persist settings on change
  useEffect(() => {
    if (!state.loaded) return
    db.saveSettings(state.settings).catch(() => {})
  }, [state.settings, state.loaded])

  const activeSession = state.sessions.find(s => s.id === state.activeSessionId) || null

  // Wrap dispatch to trigger targeted API saves on mutations
  const dispatchWithPersist = useCallback((action) => {
    dispatch(action)

    if (!state.loaded) return

    switch (action.type) {
      case 'ADD_SESSION':
      case 'UPDATE_SESSION':
        saveSession(action.payload)
        break
      case 'DELETE_SESSION':
        db.deleteSession(action.payload).catch(() => {})
        break
      case 'ADD_CHARACTER':
      case 'UPDATE_CHARACTER':
      case 'DELETE_CHARACTER':
      case 'ADD_LOCATION':
      case 'UPDATE_LOCATION':
      case 'DELETE_LOCATION':
      case 'ADD_ENCOUNTER':
      case 'UPDATE_ENCOUNTER':
      case 'DELETE_ENCOUNTER': {
        // Save the parent session after sub-resource mutations
        const session = state.sessions.find(s => s.id === action.sessionId)
        if (session) saveSession(session)
        break
      }
    }
  }, [state.loaded, state.sessions, saveSession])

  return (
    <AppContext.Provider value={{ state, dispatch: dispatchWithPersist, activeSession }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
