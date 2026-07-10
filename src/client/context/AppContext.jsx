import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { db, getMe } from '../db/index.js'

const AppContext = createContext(null)

const initial = {
  sessions: [],
  globalLocations: [],
  globalCharacters: [],
  activeSessionId: null,
  activeTab: 0,
  sidebarCollapsed: false,
  settings: { geminiApiKey: '', customTables: [] },
  loaded: false,
  user: null,
  authChecked: false,
  saveError: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, authChecked: true }

    case 'INIT':
      return { ...state, ...action.payload, loaded: true }

    case 'SET_ACTIVE_SESSION':
      return { ...state, activeSessionId: action.payload, activeTab: 0 }

    case 'MERGE_SESSION_DETAIL':
      return {
        ...state,
        sessions: state.sessions.map(s =>
          s.id === action.payload.id ? { ...s, ...action.payload } : s
        ),
      }

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload }

    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed }

    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }

    case 'SAVE_FAILED':
      return { ...state, saveError: action.payload }

    case 'CLEAR_SAVE_ERROR':
      return { ...state, saveError: null }

    case 'ADD_SESSION':
      return {
        ...state,
        sessions: [...state.sessions, action.payload],
        activeSessionId: action.payload.id,
        activeTab: 0,
      }

    // Call sites must dispatch the full session object here — a partial payload
    // silently drops any fields it omits (re-introduces the PERSIST-02 wipe bug).
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

    case 'SET_GLOBAL_LOCATIONS':
      return { ...state, globalLocations: action.payload }

    case 'ADD_GLOBAL_LOCATION':
      return { ...state, globalLocations: [...state.globalLocations, action.payload] }

    case 'UPDATE_GLOBAL_LOCATION':
      return {
        ...state,
        globalLocations: state.globalLocations.map(g =>
          g.id === action.payload.id ? action.payload : g
        ),
      }

    case 'DELETE_GLOBAL_LOCATION':
      return {
        ...state,
        globalLocations: state.globalLocations.filter(g => g.id !== action.payload),
      }

    case 'ADD_GLOBAL_CHARACTER':
      return { ...state, globalCharacters: [...state.globalCharacters, action.payload] }

    case 'UPDATE_GLOBAL_CHARACTER':
      return {
        ...state,
        globalCharacters: state.globalCharacters.map(g =>
          g.id === action.payload.id ? action.payload : g
        ),
      }

    case 'DELETE_GLOBAL_CHARACTER':
      return {
        ...state,
        globalCharacters: state.globalCharacters.filter(g => g.id !== action.payload),
      }

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

  // Refs so dispatchWithPersist never closes over stale state
  const loadedRef = useRef(false)
  const dirtySessionRef = useRef(null)

  useEffect(() => { loadedRef.current = state.loaded }, [state.loaded])

  // Check auth on mount
  useEffect(() => {
    getMe().then(user => dispatch({ type: 'SET_USER', payload: user }))

    const onUnauthorized = () => dispatch({ type: 'SET_USER', payload: null })
    window.addEventListener('omphalos:unauthorized', onUnauthorized)
    return () => window.removeEventListener('omphalos:unauthorized', onUnauthorized)
  }, [])

  // Load data once authenticated
  useEffect(() => {
    if (!state.user) return
    async function load() {
      try {
        const [sessions, settings, globalLocations, globalCharacters] = await Promise.all([
          db.getAllSessions(),
          db.getSettings(),
          db.getAllGlobalLocations(),
          db.getAllGlobalCharacters(),
        ])
        dispatch({
          type: 'INIT',
          payload: {
            sessions: sessions ?? [],
            globalLocations: globalLocations ?? [],
            globalCharacters: globalCharacters ?? [],
            activeSessionId: sessions?.[0]?.id ?? null,
            settings: settings ?? { geminiApiKey: '' },
          },
        })
      } catch {
        dispatch({
          type: 'INIT',
          payload: { sessions: [], globalLocations: [], globalCharacters: [], activeSessionId: null, settings: { geminiApiKey: '' } },
        })
      }
    }
    load()
  }, [state.user])

  const saveSession = useCallback((session) => {
    db.saveSession(session).catch(() => dispatch({ type: 'SAVE_FAILED', payload: true }))
  }, [])

  // Sessions from the list endpoint are summaries only (no characters/locations/
  // encounters/prepData/log). Lazily fetch the full record the first time a
  // session becomes active — otherwise a page refresh appears to wipe its contents.
  useEffect(() => {
    if (!state.loaded || !state.activeSessionId) return
    const session = state.sessions.find(s => s.id === state.activeSessionId)
    if (!session || session.characters !== undefined) return
    db.getSession(state.activeSessionId)
      .then(full => { if (full) dispatch({ type: 'MERGE_SESSION_DETAIL', payload: full }) })
      .catch(() => {})
  }, [state.loaded, state.activeSessionId, state.sessions])

  // After React re-renders with updated sessions, flush any pending sub-resource save.
  // This ensures we always send the post-mutation state, not the pre-dispatch snapshot.
  useEffect(() => {
    if (!state.loaded || !dirtySessionRef.current) return
    const session = state.sessions.find(s => s.id === dirtySessionRef.current)
    if (session) saveSession(session)
    dirtySessionRef.current = null
  }, [state.sessions, state.loaded, saveSession])

  // Persist settings on change
  useEffect(() => {
    if (!state.loaded) return
    db.saveSettings(state.settings).catch(() => {})
  }, [state.settings, state.loaded])

  const dispatchWithPersist = useCallback((action) => {
    dispatch(action)
    if (!loadedRef.current) return

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
      case 'DELETE_ENCOUNTER':
        dirtySessionRef.current = action.sessionId
        break
    }
  }, [saveSession])

  const activeSession = state.sessions.find(s => s.id === state.activeSessionId) || null

  return (
    <AppContext.Provider value={{ state, dispatch: dispatchWithPersist, activeSession }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
