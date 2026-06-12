import { useEffect, useState } from 'react'
import { useApp } from './context/AppContext'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import SettingsModal from './components/SettingsModal'
import LoginPage from './components/LoginPage'
import SessionLog from './components/tabs/SessionLog'
import Locations from './components/tabs/Locations'
import Characters from './components/tabs/Characters'
import Encounters from './components/tabs/Encounters'
import Toolkit from './components/tabs/Toolkit'
import { exportToPDF } from './utils/pdfExport'

const TABS = ['Session', 'Locations', 'Characters', 'Encounters', 'Toolkit']

export default function App() {
  const { state, dispatch, activeSession } = useApp()
  const [showSettings, setShowSettings] = useState(false)

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e) {
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key === 'n') { e.preventDefault(); createSession() }
      else if (ctrl && e.key === 'e') { e.preventDefault(); if (activeSession) exportToPDF(activeSession) }
      else if (ctrl && e.key === 'b') { e.preventDefault(); dispatch({ type: 'TOGGLE_SIDEBAR' }) }
      else if (ctrl && e.key === ',') { e.preventDefault(); setShowSettings(true) }
      else if (e.altKey && e.key >= '1' && e.key <= '5') {
        e.preventDefault()
        dispatch({ type: 'SET_ACTIVE_TAB', payload: parseInt(e.key) - 1 })
      }
      // Ctrl+F: focus character search
      else if (ctrl && e.key === 'f') {
        const el = document.getElementById('character-search')
        if (el) { e.preventDefault(); el.focus() }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeSession, dispatch])

  function createSession() {
    dispatch({
      type: 'ADD_SESSION',
      payload: {
        id: `session-${Date.now()}`,
        title: 'New Session',
        dateCreated: Date.now(),
        dateModified: Date.now(),
        sessionLog: null,
        sessionNotes: '',
        metadata: { location:'', dateTime:'', weather:'', npcsMet:'', treasureAcquired:'', plotPoints:'', partyLevelChange:'', nextSessionHooks:'' },
        characters: [],
        locations: [],
        encounters: [],
      },
    })
  }

  // Show a blank screen while we check the cookie
  if (!state.authChecked) return null

  // Show login if not authenticated
  if (!state.user) {
    return (
      <LoginPage
        onLogin={(user) => dispatch({ type: 'SET_USER', payload: user })}
      />
    )
  }

  if (!state.loaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1a1a]">
        <div className="text-center">
          <div className="text-[#d4a574] text-3xl font-bold mb-3">OMPHALOS</div>
          <div className="text-[#999999] text-sm">Loading campaign data…</div>
        </div>
      </div>
    )
  }

  const tabContents = [
    <SessionLog key="log" />,
    <Locations key="loc" />,
    <Characters key="chars" />,
    <Encounters key="enc" />,
    <Toolkit key="toolkit" />,
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[#1a1a1a] text-[#f0f0f0]">
      <Sidebar onNewSession={createSession} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          onSettings={() => setShowSettings(true)}
          onNewSession={createSession}
          onExportPDF={() => activeSession && exportToPDF(activeSession)}
        />

        {/* Tab bar */}
        {activeSession && (
          <div className="flex bg-[#2d2d2d] border-b border-[#3d3d3d] flex-shrink-0">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: i })}
                className={`px-5 py-3 text-sm font-medium relative transition-colors ${
                  state.activeTab === i
                    ? 'text-[#d4a574]'
                    : 'text-[#999999] hover:text-[#f0f0f0]'
                }`}
              >
                {tab}
                {state.activeTab === i && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d4a574] rounded-t" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeSession ? (
            tabContents[state.activeTab]
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">📖</div>
                <p className="text-[#999999] mb-5 text-lg">No session selected</p>
                <button
                  onClick={createSession}
                  className="px-6 py-3 bg-[#d4a574] text-[#1a1a1a] rounded-lg font-bold hover:bg-[#c49464] transition-colors"
                >
                  Create New Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
