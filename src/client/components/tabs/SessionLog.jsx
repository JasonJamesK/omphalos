import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import RichTextEditor from '../RichTextEditor'
import NpcQuickBar from '../session/NpcQuickBar'
import SessionPrep from './SessionPrep'
import MarkdownField from '../markdown/MarkdownField'

function extractPlainText(node) {
  if (!node) return ''
  if (node.type === 'text') return node.text || ''
  const c = (node.content || []).map(extractPlainText).join('')
  if (node.type === 'paragraph' || node.type === 'heading') return c + '\n'
  if (node.type === 'listItem') return '• ' + c
  return c
}

const metaFields = [
  { key: 'location', label: 'Location' },
  { key: 'dateTime', label: 'Date / Time' },
  { key: 'weather', label: 'Weather' },
  { key: 'npcsMet', label: 'NPCs Met' },
  { key: 'treasureAcquired', label: 'Treasure Acquired' },
  { key: 'plotPoints', label: 'Plot Points' },
  { key: 'partyLevelChange', label: 'Party Level Change' },
  { key: 'nextSessionHooks', label: 'Next Session Hooks' },
]

const inputCls = 'w-full bg-[#161310] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574] resize-none'
const labelCls = 'block text-xs text-[#999999] mb-1'

export default function SessionLog() {
  const { activeSession, dispatch, state } = useApp()
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [aiError, setAiError] = useState('')

  const session = activeSession
  if (!session) return null

  const meta = session.metadata || {}

  function updateLog(json) {
    dispatch({
      type: 'UPDATE_SESSION',
      payload: { ...session, sessionLog: json },
    })
  }

  function updateNotes(v) {
    dispatch({
      type: 'UPDATE_SESSION',
      payload: { ...session, sessionNotes: v },
    })
  }

  function updateMeta(key, value) {
    dispatch({
      type: 'UPDATE_SESSION',
      payload: {
        ...session,
        metadata: { ...meta, [key]: value },
      },
    })
  }

  async function handleAISummary() {
    const apiKey = state.settings?.geminiApiKey
    if (!apiKey) {
      setAiError('No Gemini API key set. Add one in Settings.')
      return
    }
    setAiLoading(true)
    setAiError('')
    setAiSummary('')
    try {
      const logText = extractPlainText(session.sessionLog)
      const notesText = session.sessionNotes || ''
      const prompt = `You are a D&D session chronicler. Write a vivid, 3-paragraph summary of the following D&D session log in narrative prose — present tense, third person. Include key events, dramatic moments, and character highlights. End with a cliffhanger hook for the next session.\n\nSESSION LOG:\n${logText}\n\nSESSION NOTES:\n${notesText}`
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 600 },
          }),
        }
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.'
      setAiSummary(text)
    } catch (err) {
      setAiError(err.message || 'Failed to generate summary.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="lg:h-full overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_1fr] divide-y lg:divide-y-0 divide-x-0 lg:divide-x divide-[#332922]">
      {/* Left: prep — overview & phases */}
      <div className="lg:h-full lg:overflow-y-auto">
        <SessionPrep />
      </div>

      {/* Middle: live session log (rich text) */}
      <div className="lg:h-full flex flex-col p-4">
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <h2 className="text-sm font-semibold text-[#d4a574] uppercase tracking-wider">Session Notes</h2>
          <button
            onClick={handleAISummary}
            disabled={aiLoading}
            className="px-3 py-1.5 bg-[#332922] text-[#f0f0f0] rounded text-xs hover:bg-[#40332a] transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {aiLoading ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-[#d4a574] border-t-transparent rounded-full animate-spin" />
                Summarizing...
              </>
            ) : '✦ AI Summary'}
          </button>
        </div>

        {(aiError || aiSummary) && (
          <div className="flex-shrink-0 mb-3">
            {aiError && (
              <div className="p-3 bg-[#b24545]/20 border border-[#b24545]/40 rounded text-sm text-[#f0f0f0]">
                {aiError}
              </div>
            )}
            {aiSummary && (
              <div className="p-4 bg-[#211b17] border border-[#d4a574]/30 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#d4a574] font-semibold uppercase tracking-wider">AI Summary</span>
                  <button onClick={() => setAiSummary('')} className="text-[#999999] hover:text-[#f0f0f0] text-sm">×</button>
                </div>
                <p className="text-[#f0f0f0] text-sm leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 min-h-0">
          <RichTextEditor
            key={session.id}
            content={session.sessionLog}
            onChange={updateLog}
            placeholder="Start logging what happens as the party plays..."
            fill
          />
        </div>
      </div>

      {/* Right: NPCs/monsters, metadata, quick notes */}
      <div className="lg:h-full lg:overflow-y-auto p-4 space-y-6">
        <NpcQuickBar />

        <div>
          <h2 className="text-sm font-semibold text-[#d4a574] uppercase tracking-wider mb-3">Session Metadata</h2>
          <div className="grid grid-cols-2 gap-3">
            {metaFields.map(({ key, label }) => {
              const isLong = ['npcsMet', 'treasureAcquired', 'plotPoints', 'nextSessionHooks'].includes(key)
              return (
                <div key={key} className={isLong ? 'col-span-2' : ''}>
                  <label className={labelCls}>{label}</label>
                  {isLong ? (
                    <textarea
                      className={inputCls}
                      rows={2}
                      value={meta[key] || ''}
                      onChange={e => updateMeta(key, e.target.value)}
                      placeholder={`${label}...`}
                    />
                  ) : (
                    <input
                      className={inputCls}
                      value={meta[key] || ''}
                      onChange={e => updateMeta(key, e.target.value)}
                      placeholder={`${label}...`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-[#d4a574] uppercase tracking-wider mb-2">Quick Notes</h2>
          <p className="text-xs text-[#666] mb-2">Click ★ Save on any Toolkit result to log it here.</p>
          <MarkdownField
            key={session.id}
            value={session.sessionNotes}
            onChange={v => updateNotes(v)}
            forceTabs
            placeholder="Quick notes, reminders, DC results..."
          />
        </div>
      </div>
    </div>
  )
}
