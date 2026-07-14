import { useState, useMemo } from 'react'
import Fuse from 'fuse.js'
import { useApp } from '../../context/AppContext'
import { db } from '../../db/index.js'
import DeleteConfirm from '../DeleteConfirm'
import Portrait from '../character/Portrait'
import CharacterModal from '../character/CharacterModal'
import AddFromLibraryModal from '../character/AddFromLibraryModal'
import StatBlockView from '../character/StatBlockView'
import { sessionCharacterImageUrl } from '../../utils/imageUrls'

function uid() { return `char-${Date.now()}-${Math.random().toString(36).slice(2)}` }
function charUid() { return `gchar-${Date.now()}-${Math.random().toString(36).slice(2)}` }

function emptyChar() {
  return {
    id: uid(), name: '', hasImage: false, originalImageData: null, croppedImageData: null,
    tagline: '', class: 'Fighter', race: 'Human', level: 1, alignment: 'True Neutral',
    personalityTraits: '', flaw: '', inventory: '', questHooks: '', relationships: [], description: '',
    globalCharacterId: null, sessionNotes: null, isNpc: false, statBlock: null,
  }
}

// ─── Drawer ──────────────────────────────────────────────────────────────────

function CharacterDrawer({ char, sessionId, onClose, onEdit, onDelete }) {
  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div className="w-[520px] bg-[#211b17] h-full overflow-y-auto shadow-2xl slide-in-right" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#211b17] border-b border-[#332922] px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-bold text-[#d4a574] truncate">{char.name}</h2>
            {char.globalCharacterId && (
              <span className="text-xs bg-[#d4a574]/20 text-[#d4a574] px-1.5 py-0.5 rounded flex-shrink-0">Library</span>
            )}
            {char.isNpc && (
              <span className="text-xs bg-[#b24545]/20 text-[#b24545] px-1.5 py-0.5 rounded flex-shrink-0">NPC</span>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={onEdit} className="px-3 py-1.5 bg-[#d4a574] text-[#161310] rounded text-sm font-medium hover:bg-[#c49464] transition-colors">Edit</button>
            <button onClick={onDelete} className="px-3 py-1.5 bg-[#b24545] text-white rounded text-sm hover:bg-[#922b2b] transition-colors">Delete</button>
            <button onClick={onClose} className="px-3 py-1.5 bg-[#332922] text-[#f0f0f0] rounded text-sm hover:bg-[#40332a] transition-colors">✕</button>
          </div>
        </div>
        <div className="p-5">
          <div className="flex gap-5 mb-5">
            <Portrait char={char} size="lg" imageUrl={sessionCharacterImageUrl(char, sessionId)} />
            <div className="flex-1 min-w-0">
              {char.isNpc ? (
                <StatBlockView char={char} />
              ) : (
                <>
                  {char.tagline && <p className="text-[#d4d4d4] italic text-sm mb-3 leading-relaxed">"{char.tagline}"</p>}
                  <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                    {[['Class', char.class],['Race', char.race],['Level', char.level],['Alignment', char.alignment]].map(([k,v]) => (
                      <div key={k}><span className="text-[#999999]">{k}: </span><span className="text-[#f0f0f0]">{v}</span></div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {[
            ['Personality Traits', char.personalityTraits],
            ['Flaw', char.flaw],
            ['Description', char.description],
            ['Inventory', char.inventory],
            ['Quest Hooks', char.questHooks],
          ].filter(([,v]) => v).map(([label, value]) => (
            <div key={label} className="mb-4">
              <p className="text-xs text-[#999999] uppercase tracking-wide mb-1">{label}</p>
              <p className="text-sm text-[#f0f0f0] leading-relaxed whitespace-pre-wrap bg-[#161310] rounded p-2.5">{value}</p>
            </div>
          ))}

          {char.relationships?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-[#999999] uppercase tracking-wide mb-2">Relationships</p>
              <div className="space-y-1">
                {char.relationships.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-[#161310] rounded px-2.5 py-1.5">
                    <span className="text-[#f0f0f0] font-medium">{r.name}</span>
                    <span className="text-[#d4a574] text-xs">({r.type})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {char.sessionNotes && (
            <div>
              <p className="text-xs text-[#6b8e6b] uppercase tracking-wide mb-1">Session Notes</p>
              <p className="text-sm text-[#f0f0f0] leading-relaxed whitespace-pre-wrap bg-[#161310] border border-[#6b8e6b]/30 rounded p-2.5">{char.sessionNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Characters tab ─────────────────────────────────────────────────────

export default function Characters() {
  const { state, activeSession, dispatch } = useApp()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [showLibraryPick, setShowLibraryPick] = useState(false)

  const chars = activeSession?.characters || []
  const globalCharacters = state.globalCharacters ?? []

  const fuse = useMemo(() => new Fuse(chars, {
    keys: ['name','tagline','class','race','alignment','personalityTraits','flaw','inventory','questHooks','description'],
    threshold: 0.4,
  }), [chars])

  const filtered = useMemo(() => {
    if (!query.trim()) return chars
    return fuse.search(query).map(r => r.item)
  }, [fuse, chars, query])

  async function save(form, saveToLibrary = false) {
    let finalForm = { ...form }

    if (saveToLibrary && !form.globalCharacterId) {
      const globalId = charUid()
      const payload = {
        id: globalId,
        name: form.name,
        tagline: form.tagline || null,
        class: form.class || null,
        race: form.race || null,
        alignment: form.alignment || null,
        personalityTraits: form.personalityTraits || null,
        flaw: form.flaw || null,
        description: form.description || null,
        hasImage: form.hasImage,
        originalImageData: form.originalImageData,
        croppedImageData: form.croppedImageData,
        questHooks: form.questHooks || null,
        relationships: form.relationships || [],
        isNpc: !!form.isNpc,
        statBlock: form.statBlock || null,
      }
      const created = await db.createGlobalCharacter(payload)
      dispatch({ type: 'ADD_GLOBAL_CHARACTER', payload: created })
      finalForm = { ...finalForm, globalCharacterId: globalId }
    }

    const exists = chars.find(c => c.id === finalForm.id)
    dispatch({ type: exists ? 'UPDATE_CHARACTER' : 'ADD_CHARACTER', sessionId: activeSession.id, payload: finalForm })
    setEditing(null)
    setSelected(null)
  }

  function addFromLibrary(globalChar, sessionNotes) {
    const sessionChar = {
      id: uid(),
      name: globalChar.name,
      tagline: globalChar.tagline || '',
      class: globalChar.class || 'Fighter',
      race: globalChar.race || 'Human',
      level: 1,
      alignment: globalChar.alignment || 'True Neutral',
      personalityTraits: globalChar.personalityTraits || '',
      flaw: globalChar.flaw || '',
      description: globalChar.description || '',
      hasImage: false,
      originalImageData: null,
      croppedImageData: null,
      inventory: '',
      questHooks: globalChar.questHooks || '',
      relationships: globalChar.relationships || [],
      globalCharacterId: globalChar.id,
      sessionNotes: sessionNotes || null,
      isNpc: !!globalChar.isNpc,
      statBlock: globalChar.statBlock || null,
    }
    dispatch({ type: 'ADD_CHARACTER', sessionId: activeSession.id, payload: sessionChar })
    setShowLibraryPick(false)
  }

  function del(id) {
    dispatch({ type: 'DELETE_CHARACTER', sessionId: activeSession.id, payload: id })
    setDeleting(null)
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <input
          id="character-search"
          className="flex-1 bg-[#211b17] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574]"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search characters… (Ctrl+F)"
        />
        <button
          onClick={() => setShowLibraryPick(true)}
          className="px-4 py-2 bg-[#332922] text-[#f0f0f0] rounded font-medium text-sm hover:bg-[#40332a] transition-colors whitespace-nowrap"
        >
          From Library
        </button>
        <button
          onClick={() => setEditing(emptyChar())}
          className="px-4 py-2 bg-[#d4a574] text-[#161310] rounded font-medium text-sm hover:bg-[#c49464] transition-colors whitespace-nowrap"
        >
          + New Character
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-[#999999] py-16">
          <div className="text-5xl mb-3">👥</div>
          {query ? <p>No characters match "{query}"</p> : <p>No characters yet. Add your first!</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map(c => (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              className="cursor-pointer rounded-lg overflow-hidden bg-[#211b17] border border-[#332922] hover:border-[#d4a574]/60 hover:scale-[1.03] transition-all"
            >
              <Portrait char={c} imageUrl={sessionCharacterImageUrl(c, activeSession.id)} />
              <div className="p-2.5">
                <div className="flex items-start justify-between gap-1">
                  <div className="font-semibold text-[#f0f0f0] text-sm truncate">{c.name || 'Unnamed'}</div>
                  <div className="flex gap-1 flex-shrink-0">
                    {c.isNpc && <span className="text-[8px] bg-[#b24545]/20 text-[#b24545] px-1 py-0.5 rounded leading-none mt-0.5">NPC</span>}
                    {c.globalCharacterId && <span className="text-[8px] bg-[#d4a574]/20 text-[#d4a574] px-1 py-0.5 rounded leading-none mt-0.5">LIB</span>}
                  </div>
                </div>
                {c.isNpc ? (
                  <>
                    <div className="text-[#999999] text-xs truncate mt-0.5">{c.tagline || c.statBlock?.sizeType || 'Monster'}</div>
                    <div className="text-[#d4a574] text-xs mt-0.5">{c.statBlock?.challengeRating || ''}</div>
                  </>
                ) : (
                  <>
                    <div className="text-[#999999] text-xs truncate mt-0.5">{c.tagline || `${c.race} ${c.class}`}</div>
                    <div className="text-[#d4a574] text-xs mt-0.5">Level {c.level}</div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <CharacterDrawer
          char={selected}
          sessionId={activeSession.id}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing({ ...selected }); setSelected(null) }}
          onDelete={() => { setDeleting(selected); setSelected(null) }}
        />
      )}
      {editing && (
        <CharacterModal
          char={editing}
          sessionId={activeSession.id}
          onSave={save}
          onClose={() => setEditing(null)}
          globalCharacters={globalCharacters}
        />
      )}
      {showLibraryPick && (
        <AddFromLibraryModal
          globalCharacters={globalCharacters}
          onAdd={addFromLibrary}
          onClose={() => setShowLibraryPick(false)}
        />
      )}
      {deleting && (
        <DeleteConfirm
          name={deleting.name}
          onConfirm={() => del(deleting.id)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
