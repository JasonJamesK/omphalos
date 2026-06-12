import { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function SettingsModal({ onClose }) {
  const { state, dispatch } = useApp()
  const [key, setKey] = useState(state.settings.geminiApiKey || '')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    dispatch({ type: 'SET_SETTINGS', payload: { geminiApiKey: key } })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-[#2d2d2d] rounded-lg w-[480px] p-6 fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#d4a574]">Settings</h2>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-2xl leading-none">×</button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#f0f0f0] mb-1">Gemini API Key</label>
            <p className="text-xs text-[#999999] mb-2">
              Required for AI session summaries. Get your key from Google AI Studio.
            </p>
            <input
              type="password"
              className="w-full bg-[#1a1a1a] border border-[#3d3d3d] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574] font-mono"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="AIza..."
              spellCheck={false}
            />
          </div>

          <div className="border-t border-[#3d3d3d] pt-4">
            <h3 className="text-sm font-medium text-[#f0f0f0] mb-2">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-1 text-xs text-[#999999]">
              {[
                ['Ctrl+N', 'New session'],
                ['Ctrl+S', 'Save (auto)'],
                ['Ctrl+Z / Y', 'Undo / Redo'],
                ['Ctrl+F', 'Focus search'],
                ['Ctrl+E', 'Export PDF'],
                ['Ctrl+B', 'Toggle sidebar'],
                ['Alt+1–5', 'Switch tabs'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <kbd className="bg-[#3d3d3d] px-1.5 py-0.5 rounded font-mono text-[#d4a574]">{k}</kbd>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#3d3d3d] text-[#f0f0f0] rounded hover:bg-[#4d4d4d] transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              saved
                ? 'bg-[#6b8e6b] text-white'
                : 'bg-[#d4a574] text-[#1a1a1a] hover:bg-[#c49464]'
            }`}
          >
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
