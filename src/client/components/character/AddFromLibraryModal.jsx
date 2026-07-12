import { useState } from 'react'
import Portrait from './Portrait'
import StatBlockView from './StatBlockView'
import MarkdownField from '../markdown/MarkdownField'
import { stripMarkdown } from '../markdown/stripMarkdown'

const inp = 'w-full bg-[#161310] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574]'

function LibraryMiniPortrait({ char }) {
  if (!char.portraitBase64) {
    return (
      <div className="w-8 h-8 rounded bg-[#332922] flex items-center justify-center text-[#666] font-bold text-sm flex-shrink-0">
        {char.name?.[0]?.toUpperCase() || '?'}
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
      <img src={char.portraitBase64} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
    </div>
  )
}

function CharacterPreview({ char, compact = false }) {
  if (char.isNpc) {
    return (
      <div className="flex gap-3">
        {!compact && <Portrait char={char} size="sm" />}
        <div className="flex-1 min-w-0">
          <StatBlockView char={char} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-3 mb-3">
        {!compact && (
          <div className="overflow-hidden rounded flex-shrink-0" style={{ width: 80, height: 107 }}>
            {char.portraitBase64 ? (
              <img src={char.portraitBase64} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
            ) : (
              <div className="w-full h-full bg-[#332922] flex items-center justify-center text-[#666] font-bold text-2xl">
                {char.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[#f0f0f0]">{char.name}</h3>
          <p className="text-xs text-[#d4a574] mb-1">{[char.race, char.class, char.alignment].filter(Boolean).join(' · ')}</p>
          {char.tagline && <p className="text-xs text-[#999999] italic">"{char.tagline}"</p>}
        </div>
      </div>

      {[
        ['Personality', char.personalityTraits],
        ['Flaw', char.flaw],
        ['Description', char.description],
        ['Quest Hooks', char.questHooks],
      ].filter(([, v]) => v).map(([label, value]) => (
        <div key={label} className="mb-2">
          <p className="text-xs text-[#666] uppercase tracking-wide mb-0.5">{label}</p>
          <p className="text-xs text-[#d4d4d4] leading-relaxed whitespace-pre-wrap">{stripMarkdown(value)}</p>
        </div>
      ))}

      {char.relationships?.length > 0 && (
        <div>
          <p className="text-xs text-[#666] uppercase tracking-wide mb-1">Relationships</p>
          <div className="space-y-0.5">
            {char.relationships.map((r, i) => (
              <div key={i} className="text-xs text-[#d4d4d4]">
                <span className="text-[#f0f0f0] font-medium">{r.name}</span>
                <span className="text-[#d4a574]"> ({r.type})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AddFromLibraryModal({ globalCharacters, onAdd, onClose, filterNpc = null }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [step, setStep] = useState('pick') // 'pick' | 'notes'
  const [sessionNotes, setSessionNotes] = useState('')

  const pool = filterNpc === null ? globalCharacters : globalCharacters.filter(c => !!c.isNpc === filterNpc)

  const filtered = search.trim()
    ? pool.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.race || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.class || '').toLowerCase().includes(search.toLowerCase())
      )
    : pool

  function handleAdd() {
    if (!selected) return
    onAdd(selected, sessionNotes.trim() || null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-[#211b17] rounded-lg w-[680px] max-h-[90vh] flex flex-col fade-in" onClick={e => e.stopPropagation()}>
        <div className="border-b border-[#332922] px-5 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-[#d4a574]">
            {step === 'pick' ? `Add ${filterNpc ? 'NPC' : ''} from Library` : 'Session Notes'}
          </h2>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl">×</button>
        </div>

        {step === 'pick' ? (
          <>
            <div className="p-4 border-b border-[#332922] flex-shrink-0">
              <input className={inp} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search characters…" autoFocus />
            </div>

            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* List */}
              <div className="w-56 border-r border-[#332922] overflow-y-auto flex-shrink-0">
                {pool.length === 0 ? (
                  <div className="p-4 text-center text-[#999999] text-sm">No {filterNpc ? 'NPCs' : 'characters'} in library yet.</div>
                ) : filtered.length === 0 ? (
                  <div className="p-4 text-center text-[#999999] text-sm">No matches.</div>
                ) : (
                  filtered.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors border-b border-[#332922]/50 ${
                        selected?.id === c.id ? 'bg-[#d4a574]/15 border-l-2 border-l-[#d4a574]' : 'hover:bg-[#332922]'
                      }`}
                    >
                      <LibraryMiniPortrait char={c} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#f0f0f0] truncate">{c.name}</div>
                        <div className="text-xs text-[#d4a574] truncate">{c.isNpc ? (c.statBlock?.challengeRating || 'NPC') : [c.race, c.class].filter(Boolean).join(' · ')}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Preview */}
              <div className="flex-1 overflow-y-auto p-4">
                {selected ? (
                  <CharacterPreview char={selected} />
                ) : (
                  <div className="h-full flex items-center justify-center text-[#555] text-sm">
                    Select a character to preview
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[#332922] px-5 py-3 flex justify-end gap-3 flex-shrink-0">
              <button onClick={onClose} className="px-4 py-2 bg-[#332922] text-[#f0f0f0] rounded hover:bg-[#40332a] transition-colors">Cancel</button>
              <button
                onClick={() => selected && setStep('notes')}
                disabled={!selected}
                className="px-4 py-2 bg-[#d4a574] text-[#161310] rounded font-medium hover:bg-[#c49464] transition-colors disabled:opacity-40"
              >
                Add to Session →
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-[#161310] rounded p-3">
                <CharacterPreview char={selected} compact />
              </div>
              <div>
                <label className="block text-xs text-[#999999] mb-1">Session Notes <span className="text-[#555]">(optional)</span></label>
                <MarkdownField
                  value={sessionNotes}
                  onChange={setSessionNotes}
                  textareaClassName={inp}
                  placeholder="Notes specific to this session — how you met them, their current status, etc."
                  autoFocus
                />
              </div>
            </div>
            <div className="border-t border-[#332922] px-5 py-3 flex justify-between flex-shrink-0">
              <button onClick={() => setStep('pick')} className="px-4 py-2 bg-[#332922] text-[#f0f0f0] rounded hover:bg-[#40332a] transition-colors">← Back</button>
              <button onClick={handleAdd} className="px-4 py-2 bg-[#d4a574] text-[#161310] rounded font-medium hover:bg-[#c49464] transition-colors">
                Add to Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
