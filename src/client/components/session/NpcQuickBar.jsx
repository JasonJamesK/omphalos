import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { db } from '../../db/index.js'
import Portrait from '../character/Portrait'
import CharacterModal from '../character/CharacterModal'
import AddFromLibraryModal from '../character/AddFromLibraryModal'
import DeleteConfirm from '../DeleteConfirm'

function uid() { return `char-${Date.now()}-${Math.random().toString(36).slice(2)}` }
function charUid() { return `gchar-${Date.now()}-${Math.random().toString(36).slice(2)}` }

function emptyNpcChar() {
  return {
    id: uid(), name: '', portraitBase64: null, portraitPanX: 0, portraitPanY: 0,
    tagline: '', class: null, race: null, level: 1, alignment: '',
    personalityTraits: '', flaw: '', inventory: '', questHooks: '', relationships: [], description: '',
    globalCharacterId: null, sessionNotes: null, isNpc: true, statBlock: null,
  }
}

function leadingNumber(str) {
  const m = /\d+/.exec(str || '')
  return m ? m[0] : '—'
}

function AddNpcChooser({ onPickLibrary, onPickNew, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-[#211b17] rounded-lg w-[360px] p-5 fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#d4a574]">Add NPC / Monster</h2>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl">×</button>
        </div>
        <div className="space-y-2">
          <button onClick={onPickLibrary} className="w-full text-left px-4 py-3 bg-[#161310] hover:bg-[#332922] rounded border border-[#332922] hover:border-[#d4a574]/40 transition-colors">
            <div className="text-sm font-medium text-[#f0f0f0]">From Shared Library</div>
            <div className="text-xs text-[#999999]">Reuse an NPC/monster you've saved before</div>
          </button>
          <button onClick={onPickNew} className="w-full text-left px-4 py-3 bg-[#161310] hover:bg-[#332922] rounded border border-[#332922] hover:border-[#d4a574]/40 transition-colors">
            <div className="text-sm font-medium text-[#f0f0f0]">Create New</div>
            <div className="text-xs text-[#999999]">Build a fresh 5e stat block</div>
          </button>
        </div>
      </div>
    </div>
  )
}

function NpcStatCard({ char, onClick, onDelete }) {
  const sb = char.statBlock
  const isBoss = (sb?.legendaryActions?.length || 0) > 0
  const badge = isBoss ? { label: 'Boss', cls: 'bg-[#b24545]/20 text-[#e08a6a] border-[#b24545]/40' } : { label: 'NPC', cls: 'bg-[#6b8e6b]/20 text-[#6b8e6b] border-[#6b8e6b]/40' }

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="w-full flex gap-3 text-left bg-[#161310] border border-[#332922] rounded-lg p-3 pr-6 hover:border-[#d4a574]/50 transition-colors"
      >
        <div className="rounded overflow-hidden flex-shrink-0">
          <Portrait char={char} size="xs" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="font-semibold text-[#f0f0f0] text-sm truncate">{char.name || 'Unnamed'}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
          </div>
          {sb ? (
            <div className="flex gap-3 text-xs text-[#999999]">
              <span>AC <span className="text-[#f0f0f0] font-medium">{leadingNumber(sb.armorClass)}</span></span>
              <span>HP <span className="text-[#f0f0f0] font-medium">{leadingNumber(sb.hitPoints)}</span></span>
              <span>CR <span className="text-[#f0f0f0] font-medium">{sb.challengeRating ? leadingNumber(sb.challengeRating) : '—'}</span></span>
            </div>
          ) : (
            <p className="text-xs text-[#666] italic">No stat block yet</p>
          )}
        </div>
      </button>
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        title="Remove from session"
        className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded text-[#666] opacity-0 group-hover:opacity-100 hover:text-[#b24545] hover:bg-[#b24545]/10 transition-all text-sm leading-none"
      >
        ×
      </button>
    </div>
  )
}

export default function NpcQuickBar() {
  const { state, activeSession, dispatch } = useApp()
  const globalCharacters = state.globalCharacters ?? []
  const [showChooser, setShowChooser] = useState(false)
  const [showLibraryPick, setShowLibraryPick] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const npcs = (activeSession?.characters || []).filter(c => c.isNpc)

  function saveEdit(form) {
    dispatch({ type: 'UPDATE_CHARACTER', sessionId: activeSession.id, payload: form })
    setEditing(null)
  }

  function del(id) {
    dispatch({ type: 'DELETE_CHARACTER', sessionId: activeSession.id, payload: id })
    setDeleting(null)
  }

  async function saveNewNpc(form, saveToLibrary = false) {
    let finalForm = { ...form, isNpc: true }

    if (saveToLibrary) {
      const globalId = charUid()
      const created = await db.createGlobalCharacter({
        id: globalId,
        name: finalForm.name,
        tagline: finalForm.tagline || null,
        class: finalForm.class || null,
        race: finalForm.race || null,
        alignment: finalForm.alignment || null,
        personalityTraits: finalForm.personalityTraits || null,
        flaw: finalForm.flaw || null,
        description: finalForm.description || null,
        portraitBase64: finalForm.portraitBase64 || null,
        portraitPanX: finalForm.portraitPanX || 0,
        portraitPanY: finalForm.portraitPanY || 0,
        questHooks: finalForm.questHooks || null,
        relationships: finalForm.relationships || [],
        isNpc: true,
        statBlock: finalForm.statBlock || null,
      })
      dispatch({ type: 'ADD_GLOBAL_CHARACTER', payload: created })
      finalForm = { ...finalForm, globalCharacterId: globalId }
    }

    dispatch({ type: 'ADD_CHARACTER', sessionId: activeSession.id, payload: finalForm })
    setEditing(null)
  }

  function addFromLibrary(globalChar, sessionNotes) {
    const sessionChar = {
      id: uid(),
      name: globalChar.name,
      tagline: globalChar.tagline || '',
      class: globalChar.class || null,
      race: globalChar.race || null,
      level: 1,
      alignment: globalChar.alignment || '',
      personalityTraits: globalChar.personalityTraits || '',
      flaw: globalChar.flaw || '',
      description: globalChar.description || '',
      portraitBase64: globalChar.portraitBase64 || null,
      portraitPanX: globalChar.portraitPanX || 0,
      portraitPanY: globalChar.portraitPanY || 0,
      inventory: '',
      questHooks: globalChar.questHooks || '',
      relationships: globalChar.relationships || [],
      globalCharacterId: globalChar.id,
      sessionNotes: sessionNotes || null,
      isNpc: true,
      statBlock: globalChar.statBlock || null,
    }
    dispatch({ type: 'ADD_CHARACTER', sessionId: activeSession.id, payload: sessionChar })
    setShowLibraryPick(false)
  }

  if (!activeSession) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-[#b24545] uppercase tracking-wider">
          NPCs & Monsters <span className="text-[#666] font-normal normal-case">({npcs.length})</span>
        </h2>
        <button
          onClick={() => setShowChooser(true)}
          className="px-2.5 py-1 bg-[#332922] text-[#f0f0f0] rounded text-xs hover:bg-[#40332a] transition-colors"
        >
          + Add
        </button>
      </div>

      {npcs.length === 0 ? (
        <button
          onClick={() => setShowChooser(true)}
          className="w-full py-6 flex items-center justify-center bg-[#161310] border border-dashed border-[#332922] rounded-lg text-[#666] hover:border-[#b24545] hover:text-[#b24545] transition-colors text-sm"
        >
          + Add an NPC or monster
        </button>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {npcs.map(c => (
            <NpcStatCard key={c.id} char={c} onClick={() => setEditing({ ...c })} onDelete={() => setDeleting(c)} />
          ))}
        </div>
      )}

      {showChooser && (
        <AddNpcChooser
          onClose={() => setShowChooser(false)}
          onPickLibrary={() => { setShowChooser(false); setShowLibraryPick(true) }}
          onPickNew={() => { setShowChooser(false); setEditing(emptyNpcChar()) }}
        />
      )}
      {showLibraryPick && (
        <AddFromLibraryModal
          globalCharacters={globalCharacters}
          filterNpc={true}
          onAdd={addFromLibrary}
          onClose={() => setShowLibraryPick(false)}
        />
      )}
      {editing && (
        <CharacterModal
          char={editing}
          defaultIsNpc
          onSave={editing.name ? saveEdit : saveNewNpc}
          onClose={() => setEditing(null)}
          globalCharacters={globalCharacters}
        />
      )}
      {deleting && (
        <DeleteConfirm
          name={deleting.name || 'this NPC'}
          onConfirm={() => del(deleting.id)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
