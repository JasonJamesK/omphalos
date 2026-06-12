import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import DeleteConfirm from '../DeleteConfirm'

const TIERS = ['Minion','Common','Elite','Champion','Boss','Legendary']

const TIER_HP = { Minion: 7, Common: 15, Elite: 30, Champion: 52, Boss: 85, Legendary: 140 }

function uid() { return `enc-${Date.now()}-${Math.random().toString(36).slice(2)}` }
function cuid() { return `comb-${Date.now()}-${Math.random().toString(36).slice(2)}` }

function emptyEncounter() {
  return { id: uid(), name: '', enemies: [], notes: '', initiativeOrder: [], currentRound: 0, currentTurnIndex: 0 }
}

const inp = 'bg-[#1a1a1a] border border-[#3d3d3d] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574]'
const lbl = 'block text-xs text-[#999999] mb-1'

function EncounterModal({ enc, onSave, onClose }) {
  const [form, setForm] = useState({ ...enc, enemies: [...(enc.enemies||[])] })

  const addEnemy = () => setForm(p => ({ ...p, enemies: [...p.enemies, { name: '', qty: 1, tier: 'Common' }] }))
  const updateEnemy = (i, k, v) => setForm(p => {
    const arr = [...p.enemies]; arr[i] = { ...arr[i], [k]: v }; return { ...p, enemies: arr }
  })
  const removeEnemy = i => setForm(p => ({ ...p, enemies: p.enemies.filter((_, j) => j !== i) }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-[#2d2d2d] rounded-lg w-[540px] max-h-[90vh] overflow-y-auto fade-in" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#2d2d2d] border-b border-[#3d3d3d] px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-[#b24545]">{form.name || 'New Encounter'}</h2>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={lbl}>Encounter Name</label>
            <input className={inp + ' w-full'} value={form.name} onChange={e => setForm(p => ({...p,name:e.target.value}))} placeholder="e.g. Bandit Ambush" autoFocus />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={lbl + ' mb-0'}>Enemies</label>
              <button onClick={addEnemy} className="text-xs text-[#d4a574] hover:underline">+ Add Enemy</button>
            </div>
            {form.enemies.length === 0 && (
              <p className="text-xs text-[#666] py-2">No enemies added yet.</p>
            )}
            {form.enemies.map((en, i) => (
              <div key={i} className="flex gap-2 mb-1.5">
                <input className={inp + ' flex-1 text-xs py-1.5'} value={en.name} onChange={e => updateEnemy(i,'name',e.target.value)} placeholder="Enemy name" />
                <input type="number" className={inp + ' w-16 text-xs py-1.5'} value={en.qty} min={1} onChange={e => updateEnemy(i,'qty',Math.max(1,parseInt(e.target.value)||1))} />
                <select className={inp + ' w-28 text-xs py-1.5'} value={en.tier} onChange={e => updateEnemy(i,'tier',e.target.value)}>
                  {TIERS.map(t => <option key={t}>{t}</option>)}
                </select>
                <button onClick={() => removeEnemy(i)} className="text-[#b24545] hover:text-[#922b2b] px-1">×</button>
              </div>
            ))}
          </div>

          <div>
            <label className={lbl}>Notes</label>
            <textarea className={inp + ' w-full resize-none'} rows={4} value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} placeholder="Tactics, triggers, special conditions..." />
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-[#3d3d3d]">
            <button onClick={onClose} className="px-4 py-2 bg-[#3d3d3d] text-[#f0f0f0] rounded hover:bg-[#4d4d4d] transition-colors">Cancel</button>
            <button onClick={() => form.name.trim() && onSave(form)} disabled={!form.name.trim()} className="px-4 py-2 bg-[#b24545] text-white rounded font-medium hover:bg-[#922b2b] transition-colors disabled:opacity-40">Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function InitiativeTracker({ enc, sessionId, characters }) {
  const { dispatch } = useApp()
  const [newName, setNewName] = useState('')
  const [newInit, setNewInit] = useState('')
  const [newMaxHP, setNewMaxHP] = useState('')
  const [newIsNPC, setNewIsNPC] = useState(false)
  const [selectedCharId, setSelectedCharId] = useState('')

  function update(changes) {
    dispatch({ type: 'UPDATE_ENCOUNTER', sessionId, payload: { ...enc, ...changes } })
  }

  function addCombatant() {
    const name = newName.trim()
    if (!name) return
    const init = newInit === '' ? Math.floor(Math.random()*20)+1 : parseInt(newInit)||0
    const maxHP = parseInt(newMaxHP)||10
    const combatant = { combatantId: cuid(), name, initiative: init, currentHP: maxHP, maxHP, isNPC: newIsNPC }
    const sorted = [...enc.initiativeOrder, combatant].sort((a,b) => b.initiative - a.initiative)
    update({ initiativeOrder: sorted })
    setNewName(''); setNewInit(''); setNewMaxHP(''); setNewIsNPC(false)
  }

  function addFromCharacter() {
    const char = characters.find(c => c.id === selectedCharId)
    if (!char) return
    const maxHP = char.level * 8
    const init = Math.floor(Math.random()*20)+1
    const combatant = { combatantId: cuid(), name: char.name, initiative: init, currentHP: maxHP, maxHP, isNPC: false }
    const sorted = [...enc.initiativeOrder, combatant].sort((a,b) => b.initiative - a.initiative)
    update({ initiativeOrder: sorted })
    setSelectedCharId('')
  }

  function removeCombatant(id) {
    const order = enc.initiativeOrder.filter(c => c.combatantId !== id)
    const newIdx = Math.min(enc.currentTurnIndex, Math.max(0, order.length-1))
    update({ initiativeOrder: order, currentTurnIndex: newIdx })
  }

  function setHP(id, val) {
    const order = enc.initiativeOrder.map(c => c.combatantId===id ? {...c, currentHP: Math.max(0, Math.min(c.maxHP, parseInt(val)||0))} : c)
    update({ initiativeOrder: order })
  }

  function adjustHP(id, delta) {
    const order = enc.initiativeOrder.map(c => c.combatantId===id ? {...c, currentHP: Math.max(0, Math.min(c.maxHP, c.currentHP+delta))} : c)
    update({ initiativeOrder: order })
  }

  function nextTurn() {
    const len = enc.initiativeOrder.length
    if (!len) return
    const nextIdx = (enc.currentTurnIndex + 1) % len
    const newRound = nextIdx === 0 ? enc.currentRound + 1 : enc.currentRound
    update({ currentTurnIndex: nextIdx, currentRound: newRound })
  }

  function prevTurn() {
    const len = enc.initiativeOrder.length
    if (!len) return
    const prevIdx = (enc.currentTurnIndex - 1 + len) % len
    const newRound = enc.currentTurnIndex === 0 && enc.currentRound > 1 ? enc.currentRound - 1 : enc.currentRound
    update({ currentTurnIndex: prevIdx, currentRound: newRound })
  }

  function resetCombat() {
    update({ currentRound: 1, currentTurnIndex: 0, initiativeOrder: enc.initiativeOrder.map(c => ({...c, currentHP: c.maxHP})) })
  }

  const order = enc.initiativeOrder || []

  return (
    <div className="border-t border-[#3d3d3d] pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#d4a574]">⚔ Initiative Order</span>
          {enc.currentRound > 0 && (
            <span className="text-xs bg-[#3d3d3d] text-[#d4a574] px-2 py-0.5 rounded font-mono">
              Round {enc.currentRound}
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          <button onClick={prevTurn} disabled={!order.length} className="px-2 py-1 text-xs bg-[#3d3d3d] text-[#f0f0f0] rounded hover:bg-[#4d4d4d] disabled:opacity-40 transition-colors">◀ Prev</button>
          <button onClick={nextTurn} disabled={!order.length} className="px-2 py-1 text-xs bg-[#d4a574] text-[#1a1a1a] rounded hover:bg-[#c49464] disabled:opacity-40 transition-colors font-medium">Next ▶</button>
          <button onClick={resetCombat} className="px-2 py-1 text-xs bg-[#3d3d3d] text-[#999999] rounded hover:bg-[#4d4d4d] transition-colors">↺ Reset</button>
        </div>
      </div>

      {/* Combatant list */}
      {order.length === 0 ? (
        <p className="text-xs text-[#666] py-2 mb-3">No combatants. Add some below.</p>
      ) : (
        <div className="space-y-1.5 mb-4">
          {order.map((c, i) => {
            const active = i === enc.currentTurnIndex
            const dead = c.currentHP === 0
            return (
              <div
                key={c.combatantId}
                className={`flex items-center gap-2 rounded px-3 py-2 transition-colors ${
                  active ? 'bg-[#d4a574]/15 border border-[#d4a574]/40' : 'bg-[#1a1a1a] border border-transparent'
                } ${dead ? 'opacity-50' : ''}`}
              >
                {active && <span className="text-[#d4a574] text-xs font-bold flex-shrink-0">▶</span>}
                {!active && <span className="text-[#666] text-xs flex-shrink-0 w-3">{i+1}</span>}
                <span className="text-[#d4a574] font-mono text-xs font-bold w-6 text-right flex-shrink-0">{c.initiative}</span>
                <span className={`flex-1 text-sm font-medium truncate ${dead ? 'line-through text-[#666]' : active ? 'text-[#f0f0f0]' : 'text-[#d4d4d4]'}`}>
                  {c.name}
                  {c.isNPC && <span className="ml-1 text-xs text-[#999999]">(NPC)</span>}
                </span>
                {/* HP controls */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => adjustHP(c.combatantId,-1)} className="w-5 h-5 bg-[#3d3d3d] rounded text-[#f0f0f0] text-xs hover:bg-[#b24545]/60 transition-colors leading-none">−</button>
                  <input
                    type="number"
                    className="w-10 bg-[#3d3d3d] rounded text-center text-xs text-[#f0f0f0] py-0.5 focus:outline-none focus:border focus:border-[#d4a574]"
                    value={c.currentHP}
                    onChange={e => setHP(c.combatantId, e.target.value)}
                  />
                  <span className="text-[#666] text-xs">/{c.maxHP}</span>
                  <button onClick={() => adjustHP(c.combatantId,1)} className="w-5 h-5 bg-[#3d3d3d] rounded text-[#f0f0f0] text-xs hover:bg-[#6b8e6b]/60 transition-colors leading-none">+</button>
                </div>
                <button onClick={() => removeCombatant(c.combatantId)} className="text-[#666] hover:text-[#b24545] text-xs ml-1 flex-shrink-0 transition-colors">×</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick-add from encounter enemy list */}
      {enc.enemies?.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-[#999999] font-semibold mb-2">Quick Add from Encounter</p>
          <div className="flex flex-wrap gap-1.5">
            {enc.enemies.map((en, i) => (
              <button
                key={i}
                onClick={() => {
                  const maxHP = TIER_HP[en.tier] ?? 15
                  const newCombatants = Array.from({ length: en.qty }, (_, j) => ({
                    combatantId: cuid(),
                    name: en.qty > 1 ? `${en.name} ${j + 1}` : en.name,
                    initiative: Math.floor(Math.random() * 20) + 1,
                    currentHP: maxHP,
                    maxHP,
                    isNPC: true,
                  }))
                  const sorted = [...enc.initiativeOrder, ...newCombatants].sort((a, b) => b.initiative - a.initiative)
                  update({ initiativeOrder: sorted })
                }}
                className="px-2.5 py-1 bg-[#b24545]/20 text-[#b24545] border border-[#b24545]/30 rounded text-xs hover:bg-[#b24545]/40 transition-colors font-medium"
              >
                + {en.qty > 1 ? `${en.qty}× ` : ''}{en.name}
                <span className="ml-1 opacity-60">({en.tier})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add combatant */}
      <div className="bg-[#1a1a1a] rounded p-3 space-y-2">
        <p className="text-xs text-[#999999] font-semibold mb-2">Add Combatant</p>
        <div className="flex gap-2 flex-wrap">
          <input className={inp + ' flex-1 min-w-28 text-xs py-1.5'} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" onKeyDown={e => e.key==='Enter' && addCombatant()} />
          <input type="number" className={inp + ' w-16 text-xs py-1.5'} value={newInit} onChange={e => setNewInit(e.target.value)} placeholder="Init" title="Leave blank to auto-roll d20" />
          <input type="number" className={inp + ' w-16 text-xs py-1.5'} value={newMaxHP} onChange={e => setNewMaxHP(e.target.value)} placeholder="HP" />
          <label className="flex items-center gap-1 text-xs text-[#999999] cursor-pointer">
            <input type="checkbox" checked={newIsNPC} onChange={e => setNewIsNPC(e.target.checked)} className="accent-amber" />
            NPC
          </label>
          <button onClick={addCombatant} className="px-3 py-1.5 bg-[#d4a574] text-[#1a1a1a] rounded text-xs font-medium hover:bg-[#c49464] transition-colors">Add</button>
        </div>

        {characters.length > 0 && (
          <div className="flex gap-2 mt-2">
            <select
              className={inp + ' flex-1 text-xs py-1.5'}
              value={selectedCharId}
              onChange={e => setSelectedCharId(e.target.value)}
            >
              <option value="">Add from Characters tab…</option>
              {characters.map(c => <option key={c.id} value={c.id}>{c.name} (Lv.{c.level} {c.class})</option>)}
            </select>
            <button
              onClick={addFromCharacter}
              disabled={!selectedCharId}
              className="px-3 py-1.5 bg-[#6b8e6b] text-white rounded text-xs hover:bg-[#5a7a5a] transition-colors disabled:opacity-40"
            >
              Add NPC
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EncounterCard({ enc, onEdit, onDelete, sessionId, characters, expanded, onToggle }) {
  return (
    <div className={`bg-[#2d2d2d] border rounded-lg overflow-hidden transition-colors ${expanded ? 'border-[#b24545]/50' : 'border-[#3d3d3d] hover:border-[#b24545]/30'}`}>
      <div className="flex items-start gap-3 px-4 py-3 cursor-pointer" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs transition-transform ${expanded ? 'rotate-90' : ''} text-[#666]`}>▶</span>
            <h3 className="font-semibold text-[#f0f0f0]">{enc.name}</h3>
            {enc.currentRound > 0 && (
              <span className="text-xs bg-[#b24545]/20 text-[#b24545] px-1.5 py-0.5 rounded">Rd {enc.currentRound}</span>
            )}
          </div>
          {enc.enemies?.length > 0 && (
            <p className="text-xs text-[#999999] mt-1 ml-4">
              {enc.enemies.map(e => `${e.qty}× ${e.name}`).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} className="px-2 py-1 text-xs bg-[#3d3d3d] text-[#f0f0f0] rounded hover:bg-[#4d4d4d] transition-colors">Edit</button>
          <button onClick={onDelete} className="px-2 py-1 text-xs bg-[#b24545]/20 text-[#b24545] rounded hover:bg-[#b24545]/40 transition-colors">Del</button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          {enc.notes && (
            <div className="bg-[#1a1a1a] rounded p-2.5 mb-4 text-sm text-[#d4d4d4] leading-relaxed">
              {enc.notes}
            </div>
          )}
          {enc.enemies?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-[#999999] uppercase tracking-wide mb-1.5">Enemies</p>
              <div className="flex flex-wrap gap-2">
                {enc.enemies.map((e,i) => (
                  <span key={i} className="text-xs bg-[#b24545]/20 text-[#b24545] px-2 py-1 rounded">
                    {e.qty}× {e.name} <span className="text-[#b24545]/70">({e.tier})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          <InitiativeTracker enc={enc} sessionId={sessionId} characters={characters} />
        </div>
      )}
    </div>
  )
}

export default function Encounters() {
  const { activeSession, dispatch } = useApp()
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [expanded, setExpanded] = useState(null)

  const encounters = activeSession?.encounters || []
  const characters = activeSession?.characters || []

  function save(form) {
    const exists = encounters.find(e => e.id === form.id)
    if (exists) {
      dispatch({ type: 'UPDATE_ENCOUNTER', sessionId: activeSession.id, payload: form })
    } else {
      dispatch({ type: 'ADD_ENCOUNTER', sessionId: activeSession.id, payload: { ...form, currentRound: 0, currentTurnIndex: 0 } })
    }
    setEditing(null)
  }

  function del(id) {
    dispatch({ type: 'DELETE_ENCOUNTER', sessionId: activeSession.id, payload: id })
    setDeleting(null)
    if (expanded === id) setExpanded(null)
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[#d4a574] font-semibold text-sm uppercase tracking-wider">
          Encounters <span className="text-[#666] font-normal normal-case">({encounters.length})</span>
        </h2>
        <button
          onClick={() => setEditing(emptyEncounter())}
          className="px-4 py-2 bg-[#b24545] text-white rounded font-medium text-sm hover:bg-[#922b2b] transition-colors"
        >
          + New Encounter
        </button>
      </div>

      {encounters.length === 0 ? (
        <div className="text-center text-[#999999] py-16">
          <div className="text-4xl mb-3">⚔️</div>
          <p>No encounters yet. Plan your first fight!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {encounters.map(enc => (
            <EncounterCard
              key={enc.id}
              enc={enc}
              sessionId={activeSession.id}
              characters={characters}
              expanded={expanded === enc.id}
              onToggle={() => setExpanded(expanded === enc.id ? null : enc.id)}
              onEdit={() => setEditing({ ...enc })}
              onDelete={() => setDeleting(enc)}
            />
          ))}
        </div>
      )}

      {editing && <EncounterModal enc={editing} onSave={save} onClose={() => setEditing(null)} />}
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
