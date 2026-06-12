import { useState, useRef, useEffect, useCallback } from 'react'

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    if (!onOutside) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, onOutside])
}
import { generateName, RACES, GENDERS } from '../../data/nameGen.js'
import { generateLoot, LOOT_TIERS } from '../../data/lootTables.js'
import {
  npcAdjectives, npcProfessions, npcQuirks,
  weatherTable, encounterComplications, generateTavern,
  eventTable, magicItemTiers,
  rumors, trapTypes, trapTriggers, trapConsequences,
  speechPatterns, mannerisms, habits,
  cliffhangers, generateFaction,
  generateAppearance, generateShopInventory, shopTypes,
} from '../../data/toolkitTables.js'
import { useApp } from '../../context/AppContext'

const inp = 'bg-[#1a1a1a] border border-[#3d3d3d] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574]'
const DICE = [4, 6, 8, 10, 12, 20, 100]
const MAGIC_TIERS = Object.keys(magicItemTiers)

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// ─── Shared Result Card ───────────────────────────────────────────────────────
function ResultCard({ children, onClear }) {
  return (
    <div className="bg-[#1a1a1a] rounded-lg p-3 relative fade-in">
      {onClear && (
        <button onClick={onClear} className="absolute top-2 right-2 text-[#444] hover:text-[#999999] text-sm leading-none">×</button>
      )}
      {children}
    </div>
  )
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className={`text-xs px-2 py-0.5 rounded transition-colors ${copied ? 'bg-[#6b8e6b] text-white' : 'bg-[#3d3d3d] text-[#999999] hover:text-[#f0f0f0]'}`}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

// ─── Name Generator ───────────────────────────────────────────────────────────
function NameGenerator() {
  const [gender, setGender] = useState('M')
  const [race, setRace] = useState('Human')
  const [history, setHistory] = useState([])

  function generate() {
    const r = generateName(gender, race)
    const full = `${r.first} ${r.last}`
    setHistory(prev => [{ name: full, gender: GENDERS.find(g => g.value === gender)?.label, race, id: Date.now() }, ...prev.slice(0, 8)])
  }
  const latest = history[0]

  return (
    <div className="bg-[#2d2d2d] rounded-lg p-4">
      <h3 className="font-bold text-[#d4a574] mb-3 text-sm">🎲 Name Generator</h3>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-xs text-[#999999] mb-1">Gender</label>
          <div className="flex gap-1">
            {GENDERS.map(g => (
              <button key={g.value} onClick={() => setGender(g.value)} className={`flex-1 py-1.5 rounded text-xs transition-colors ${gender === g.value ? 'bg-[#d4a574] text-[#1a1a1a] font-medium' : 'bg-[#3d3d3d] text-[#f0f0f0] hover:bg-[#4d4d4d]'}`}>{g.label}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-[#999999] mb-1">Race</label>
          <select className={inp + ' w-full text-xs py-1.5'} value={race} onChange={e => setRace(e.target.value)}>
            {RACES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 mb-3">
        <button onClick={generate} className="flex-1 py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-bold text-sm hover:bg-[#c49464] transition-colors">Generate</button>
        {latest && <button onClick={generate} className="px-3 py-2 bg-[#3d3d3d] text-[#f0f0f0] rounded text-xs hover:bg-[#4d4d4d] transition-colors">Again</button>}
      </div>
      {latest && (
        <ResultCard>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-[#f0f0f0]">{latest.name}</div>
              <div className="text-xs text-[#666] mt-0.5">{latest.gender} {latest.race}</div>
            </div>
            <CopyBtn text={latest.name} />
          </div>
        </ResultCard>
      )}
      {history.length > 1 && (
        <div className="mt-2 space-y-0.5 max-h-28 overflow-y-auto">
          {history.slice(1).map(h => (
            <div key={h.id} className="flex justify-between text-xs px-2 py-1 rounded hover:bg-[#3d3d3d] transition-colors group">
              <span className="text-[#d4d4d4]">{h.name}</span>
              <span className="text-[#555] group-hover:text-[#999999]">{h.race}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Loot Generator ───────────────────────────────────────────────────────────
function LootGenerator() {
  const { activeSession, dispatch } = useApp()
  const [tier, setTier] = useState('Commoner')
  const [loot, setLoot] = useState(null)
  const [targetChar, setTargetChar] = useState('')
  const [added, setAdded] = useState(false)
  const chars = activeSession?.characters || []
  const tierColors = { Commoner:'#999999', Merchant:'#d4a574', Noble:'#ffd700', Bandit:'#b24545', Goblin:'#6b8e6b', Dragon:'#c49464', Cursed:'#7a4a7a', Arcane:'#4a7ab2' }

  function generate() { setLoot(generateLoot(tier)); setAdded(false); setTargetChar('') }
  function addToChar() {
    const char = chars.find(c => c.id === targetChar)
    if (!char || !loot) return
    dispatch({ type: 'UPDATE_CHARACTER', sessionId: activeSession.id, payload: { ...char, inventory: (char.inventory ? char.inventory + '\n' : '') + loot.display } })
    setAdded(true)
  }

  return (
    <div className="bg-[#2d2d2d] rounded-lg p-4">
      <h3 className="font-bold text-[#d4a574] mb-3 text-sm">💰 Loot Generator</h3>
      <div className="grid grid-cols-4 gap-1 mb-3">
        {LOOT_TIERS.map(t => (
          <button key={t} onClick={() => setTier(t)} style={tier === t ? { borderColor: tierColors[t], color: tierColors[t] } : {}} className={`py-1.5 rounded text-xs font-medium border transition-colors ${tier === t ? 'bg-[#3d3d3d]' : 'bg-[#1a1a1a] border-[#3d3d3d] text-[#999999] hover:bg-[#3d3d3d] hover:text-[#f0f0f0]'}`}>{t}</button>
        ))}
      </div>
      <button onClick={generate} className="w-full py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-bold text-sm hover:bg-[#c49464] transition-colors mb-3">Generate Loot</button>
      {loot && (
        <ResultCard>
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[#f0f0f0] font-medium text-sm">{loot.name}</span>
              {loot.quantity > 1 && <span className="ml-2 text-xs" style={{ color: tierColors[tier] }}>×{loot.quantity}</span>}
            </div>
            <div className="flex gap-1.5">
              <button onClick={generate} className="text-xs px-2 py-0.5 bg-[#3d3d3d] text-[#999999] rounded hover:text-[#f0f0f0] transition-colors">Again</button>
              <CopyBtn text={loot.display} />
            </div>
          </div>
          {chars.length > 0 && (
            <div className="flex gap-1.5 mt-2">
              <select className={inp + ' flex-1 text-xs py-1'} value={targetChar} onChange={e => { setTargetChar(e.target.value); setAdded(false) }}>
                <option value="">Add to character…</option>
                {chars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={addToChar} disabled={!targetChar} className={`px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-40 ${added ? 'bg-[#6b8e6b] text-white' : 'bg-[#d4a574] text-[#1a1a1a] hover:bg-[#c49464]'}`}>{added ? '✓' : 'Add'}</button>
            </div>
          )}
        </ResultCard>
      )}
    </div>
  )
}

// ─── Dice Roller ──────────────────────────────────────────────────────────────
function DiceRoller() {
  const [qty, setQty] = useState(1)
  const [die, setDie] = useState(20)
  const [modifier, setModifier] = useState(0)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [rolling, setRolling] = useState(false)

  function roll() {
    setRolling(true)
    setTimeout(() => {
      const rolls = Array.from({ length: qty }, () => Math.floor(Math.random() * die) + 1)
      const total = rolls.reduce((a, b) => a + b, 0) + modifier
      const entry = { qty, die, modifier, rolls, total, id: Date.now() }
      setResult(entry); setHistory(prev => [entry, ...prev.slice(0, 8)]); setRolling(false)
    }, 120)
  }

  const isCrit = die === 20 && qty === 1 && result?.rolls[0] === 20
  const isFumble = die === 20 && qty === 1 && result?.rolls[0] === 1

  return (
    <div className="bg-[#2d2d2d] rounded-lg p-4">
      <h3 className="font-bold text-[#d4a574] mb-3 text-sm">🎲 Dice Roller</h3>
      <div className="flex flex-wrap gap-1 mb-3">
        {DICE.map(d => (
          <button key={d} onClick={() => setDie(d)} className={`px-2.5 py-1.5 rounded font-bold text-xs transition-colors ${die === d ? 'bg-[#d4a574] text-[#1a1a1a]' : 'bg-[#1a1a1a] text-[#999999] border border-[#3d3d3d] hover:border-[#d4a574] hover:text-[#f0f0f0]'}`}>d{d}</button>
        ))}
      </div>
      <div className="flex gap-3 mb-3">
        <div className="flex-1">
          <label className="block text-xs text-[#999999] mb-1">Qty</label>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setQty(q => Math.max(1, q-1))} className="w-6 h-6 bg-[#3d3d3d] rounded text-[#f0f0f0] text-xs hover:bg-[#4d4d4d]">−</button>
            <span className="text-[#f0f0f0] font-bold w-5 text-center text-sm">{qty}</span>
            <button onClick={() => setQty(q => Math.min(20, q+1))} className="w-6 h-6 bg-[#3d3d3d] rounded text-[#f0f0f0] text-xs hover:bg-[#4d4d4d]">+</button>
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-[#999999] mb-1">Mod</label>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setModifier(m => m-1)} className="w-6 h-6 bg-[#3d3d3d] rounded text-[#f0f0f0] text-xs hover:bg-[#4d4d4d]">−</button>
            <span className={`font-bold w-8 text-center text-sm ${modifier > 0 ? 'text-[#6b8e6b]' : modifier < 0 ? 'text-[#b24545]' : 'text-[#f0f0f0]'}`}>{modifier > 0 ? `+${modifier}` : modifier}</span>
            <button onClick={() => setModifier(m => m+1)} className="w-6 h-6 bg-[#3d3d3d] rounded text-[#f0f0f0] text-xs hover:bg-[#4d4d4d]">+</button>
          </div>
        </div>
        <div className="flex items-end"><button onClick={() => setModifier(0)} className="text-xs text-[#555] hover:text-[#999999] mb-0.5 transition-colors">reset</button></div>
      </div>
      <div className="text-center text-[#666] text-xs font-mono mb-2">{qty}d{die}{modifier !== 0 ? (modifier > 0 ? ` +${modifier}` : ` ${modifier}`) : ''}</div>
      <button onClick={roll} disabled={rolling} className="w-full py-2.5 bg-[#d4a574] text-[#1a1a1a] rounded font-bold hover:bg-[#c49464] transition-colors disabled:opacity-60 mb-3">{rolling ? '…' : 'Roll'}</button>
      {result && (
        <ResultCard>
          <div className={`text-4xl font-bold text-center mb-1 ${isCrit ? 'text-[#d4a574]' : isFumble ? 'text-[#b24545]' : 'text-[#f0f0f0]'}`}>{result.total}</div>
          {isCrit && <div className="text-center text-[#d4a574] text-xs font-bold uppercase tracking-widest mb-1">Critical!</div>}
          {isFumble && <div className="text-center text-[#b24545] text-xs font-bold uppercase tracking-widest mb-1">Fumble!</div>}
          {(result.rolls.length > 1 || result.modifier !== 0) && (
            <div className="text-center text-xs text-[#666]">[{result.rolls.join(', ')}]{result.modifier !== 0 ? (result.modifier > 0 ? ` +${result.modifier}` : ` ${result.modifier}`) : ''} = {result.total}</div>
          )}
        </ResultCard>
      )}
      {history.length > 1 && (
        <div className="mt-2 space-y-0.5 max-h-24 overflow-y-auto">
          {history.slice(1).map(h => (
            <div key={h.id} className="flex justify-between text-xs px-2 py-0.5 rounded hover:bg-[#3d3d3d] transition-colors">
              <span className="text-[#666] font-mono">{h.qty}d{h.die}{h.modifier !== 0 ? (h.modifier > 0 ? `+${h.modifier}` : h.modifier) : ''}</span>
              <span className="text-[#d4d4d4] font-bold">{h.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── NPC Personality Generator ────────────────────────────────────────────────
function NPCPersonalityGenerator() {
  const [result, setResult] = useState(null)
  const ref = useRef(null)
  useClickOutside(ref, result ? () => setResult(null) : null)

  function generate() {
    setResult({ adj: pick(npcAdjectives), prof: pick(npcProfessions), quirk: pick(npcQuirks) })
  }

  return (
    <div ref={ref} className="bg-[#2d2d2d] rounded-lg p-4">
      <h3 className="font-bold text-[#d4a574] mb-3 text-sm">🧍 NPC Personality</h3>
      <button onClick={generate} className="w-full py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-bold text-sm hover:bg-[#c49464] transition-colors mb-3">Generate NPC</button>
      {result && (
        <ResultCard onClear={() => setResult(null)}>
          <div className="text-base font-bold text-[#f0f0f0] mb-1">
            {result.adj} {result.prof}
          </div>
          <div className="text-sm text-[#999999] italic">{result.quirk}</div>
          <div className="flex justify-end mt-2">
            <CopyBtn text={`${result.adj} ${result.prof} ${result.quirk}`} />
          </div>
        </ResultCard>
      )}
    </div>
  )
}

// ─── Weather Generator ────────────────────────────────────────────────────────
function WeatherGenerator() {
  const [result, setResult] = useState(null)
  const ref = useRef(null)
  useClickOutside(ref, result ? () => setResult(null) : null)

  return (
    <div ref={ref} className="bg-[#2d2d2d] rounded-lg p-4">
      <h3 className="font-bold text-[#d4a574] mb-3 text-sm">🌤 Weather Generator</h3>
      <button onClick={() => setResult(pick(weatherTable))} className="w-full py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-bold text-sm hover:bg-[#c49464] transition-colors mb-3">Generate Weather</button>
      {result && (
        <ResultCard onClear={() => setResult(null)}>
          <div className="font-bold text-[#f0f0f0] mb-1">{result.condition}</div>
          <p className="text-sm text-[#999999] leading-relaxed">{result.detail}</p>
          <div className="flex justify-end mt-2"><CopyBtn text={`${result.condition}: ${result.detail}`} /></div>
        </ResultCard>
      )}
    </div>
  )
}

// ─── Encounter Complication ───────────────────────────────────────────────────
function EncounterComplicationGenerator() {
  const [result, setResult] = useState(null)
  const ref = useRef(null)
  useClickOutside(ref, result ? () => setResult(null) : null)

  return (
    <div ref={ref} className="bg-[#2d2d2d] rounded-lg p-4">
      <h3 className="font-bold text-[#d4a574] mb-3 text-sm">⚠️ Encounter Complication</h3>
      <button onClick={() => setResult(pick(encounterComplications))} className="w-full py-2 bg-[#b24545] text-white rounded font-bold text-sm hover:bg-[#922b2b] transition-colors mb-3">Roll Complication</button>
      {result && (
        <ResultCard onClear={() => setResult(null)}>
          <p className="text-sm text-[#f0f0f0] leading-relaxed">{result}</p>
          <div className="flex justify-end mt-2"><CopyBtn text={result} /></div>
        </ResultCard>
      )}
    </div>
  )
}

// ─── Tavern / Shop Generator ──────────────────────────────────────────────────
function TavernGenerator() {
  const [result, setResult] = useState(null)
  const ref = useRef(null)
  useClickOutside(ref, result ? () => setResult(null) : null)

  return (
    <div ref={ref} className="bg-[#2d2d2d] rounded-lg p-4">
      <h3 className="font-bold text-[#d4a574] mb-3 text-sm">🍺 Tavern / Shop Generator</h3>
      <button onClick={() => setResult(generateTavern())} className="w-full py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-bold text-sm hover:bg-[#c49464] transition-colors mb-3">Generate Establishment</button>
      {result && (
        <ResultCard onClear={() => setResult(null)}>
          <div className="font-bold text-[#d4a574] text-base mb-1">{result.name}</div>
          <p className="text-xs text-[#999999] italic mb-3 leading-relaxed">{result.vibe}</p>
          <div className="space-y-2">
            {result.npcs.map((n, i) => (
              <div key={i} className="border-t border-[#2d2d2d] pt-2">
                <span className="text-xs font-semibold text-[#d4a574]">{n.role}:</span>
                <span className="text-xs text-[#f0f0f0]"> {n.adj} {n.role.toLowerCase()} </span>
                <span className="text-xs text-[#666]">{n.quirk}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-2">
            <CopyBtn text={`${result.name}\n${result.vibe}\n${result.npcs.map(n => `- ${n.adj} ${n.role} ${n.quirk}`).join('\n')}`} />
          </div>
        </ResultCard>
      )}
    </div>
  )
}

// ─── Ability Score Generator ──────────────────────────────────────────────────
const STAT_NAMES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

function rollStat() {
  const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
  const sorted = [...rolls].sort((a, b) => b - a)
  const total = sorted.slice(0, 3).reduce((a, b) => a + b, 0)
  return { rolls, dropped: sorted[3], total }
}

function mod(score) {
  const m = Math.floor((score - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

function AbilityScoreGenerator() {
  const [stats, setStats] = useState(null)
  const ref = useRef(null)
  useClickOutside(ref, stats ? () => setStats(null) : null)

  function generate() {
    setStats(STAT_NAMES.map(name => ({ name, ...rollStat() })))
  }

  return (
    <div ref={ref} className="bg-[#2d2d2d] rounded-lg p-4">
      <h3 className="font-bold text-[#d4a574] mb-3 text-sm">🎯 Ability Score Generator</h3>
      <p className="text-xs text-[#666] mb-3">4d6, drop lowest — for quick NPC stat blocks</p>
      <button onClick={generate} className="w-full py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-bold text-sm hover:bg-[#c49464] transition-colors mb-3">Roll Stats</button>
      {stats && (
        <ResultCard onClear={() => setStats(null)}>
          <div className="grid grid-cols-3 gap-2">
            {stats.map(s => (
              <div key={s.name} className="text-center bg-[#2d2d2d] rounded p-2">
                <div className="text-xs text-[#999999] mb-0.5">{s.name}</div>
                <div className="text-xl font-bold text-[#f0f0f0]">{s.total}</div>
                <div className="text-xs text-[#d4a574]">{mod(s.total)}</div>
                <div className="text-[10px] text-[#444] mt-0.5">[{s.rolls.join(',')} drop {s.dropped}]</div>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-2">
            <CopyBtn text={stats.map(s => `${s.name}: ${s.total} (${mod(s.total)})`).join(' | ')} />
          </div>
        </ResultCard>
      )}
    </div>
  )
}

// ─── Random Event Table ───────────────────────────────────────────────────────
function RandomEventGenerator() {
  const [result, setResult] = useState(null)
  const ref = useRef(null)
  useClickOutside(ref, result ? () => setResult(null) : null)

  return (
    <div ref={ref} className="bg-[#2d2d2d] rounded-lg p-4">
      <h3 className="font-bold text-[#d4a574] mb-3 text-sm">🌍 Random World Event</h3>
      <button onClick={() => setResult(pick(eventTable))} className="w-full py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-bold text-sm hover:bg-[#c49464] transition-colors mb-3">Roll Event</button>
      {result && (
        <ResultCard onClear={() => setResult(null)}>
          <p className="text-sm text-[#f0f0f0] leading-relaxed">{result}</p>
          <div className="flex justify-end mt-2"><CopyBtn text={result} /></div>
        </ResultCard>
      )}
    </div>
  )
}

// ─── Magic Item Generator ─────────────────────────────────────────────────────
const TIER_COLOURS = { Common:'#999999', Uncommon:'#6b8e6b', Rare:'#4a7ab2', 'Very Rare':'#7a4a7a', Legendary:'#d4a574' }

function MagicItemGenerator() {
  const [tier, setTier] = useState('Uncommon')
  const [result, setResult] = useState(null)
  const ref = useRef(null)
  useClickOutside(ref, result ? () => setResult(null) : null)

  function generate() { setResult({ tier, ...pick(magicItemTiers[tier]) }) }

  return (
    <div ref={ref} className="bg-[#2d2d2d] rounded-lg p-4">
      <h3 className="font-bold text-[#d4a574] mb-3 text-sm">✨ Magic Item Generator</h3>
      <div className="flex flex-wrap gap-1 mb-3">
        {MAGIC_TIERS.map(t => (
          <button key={t} onClick={() => setTier(t)} style={tier === t ? { background: TIER_COLOURS[t] + '33', borderColor: TIER_COLOURS[t], color: TIER_COLOURS[t] } : {}} className={`px-2 py-1 rounded text-xs border transition-colors ${tier === t ? '' : 'border-[#3d3d3d] text-[#666] hover:text-[#f0f0f0] hover:border-[#555]'}`}>{t}</button>
        ))}
      </div>
      <button onClick={generate} className="w-full py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-bold text-sm hover:bg-[#c49464] transition-colors mb-3">Generate Item</button>
      {result && (
        <ResultCard onClear={() => setResult(null)}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="font-bold text-[#f0f0f0]">{result.name}</div>
            <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: TIER_COLOURS[result.tier] + '33', color: TIER_COLOURS[result.tier] }}>{result.tier}</span>
          </div>
          <p className="text-xs text-[#999999] leading-relaxed">{result.desc}</p>
          <div className="flex justify-end mt-2"><CopyBtn text={`${result.name} (${result.tier}): ${result.desc}`} /></div>
        </ResultCard>
      )}
    </div>
  )
}

// ─── Custom Table Roller ──────────────────────────────────────────────────────
function CustomTableRoller() {
  const { state, dispatch } = useApp()
  const tables = state.settings?.customTables || []
  const [newName, setNewName] = useState('')
  const [newEntries, setNewEntries] = useState('')
  const [adding, setAdding] = useState(false)
  const [results, setResults] = useState({})

  function saveTable() {
    if (!newName.trim()) return
    const entries = newEntries.split('\n').map(e => e.trim()).filter(Boolean)
    if (!entries.length) return
    const t = { id: `ct-${Date.now()}`, name: newName.trim(), entries }
    dispatch({ type: 'SET_SETTINGS', payload: { customTables: [...tables, t] } })
    setNewName(''); setNewEntries(''); setAdding(false)
  }

  function deleteTable(id) {
    dispatch({ type: 'SET_SETTINGS', payload: { customTables: tables.filter(t => t.id !== id) } })
    setResults(r => { const c = {...r}; delete c[id]; return c })
  }

  function rollTable(t) {
    setResults(r => ({ ...r, [t.id]: pick(t.entries) }))
  }

  return (
    <div className="bg-[#2d2d2d] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[#d4a574] text-sm">📋 Custom Table Roller</h3>
        <button onClick={() => setAdding(!adding)} className="text-xs text-[#d4a574] hover:underline">{adding ? 'Cancel' : '+ New Table'}</button>
      </div>

      {adding && (
        <div className="bg-[#1a1a1a] rounded p-3 mb-3 space-y-2">
          <input className={inp + ' w-full text-xs py-1.5'} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Table name…" />
          <textarea className={inp + ' w-full text-xs resize-none'} rows={5} value={newEntries} onChange={e => setNewEntries(e.target.value)} placeholder={"One entry per line:\nEntry one\nEntry two\nEntry three"} />
          <button onClick={saveTable} disabled={!newName.trim() || !newEntries.trim()} className="w-full py-1.5 bg-[#6b8e6b] text-white rounded text-xs font-medium hover:bg-[#5a7a5a] transition-colors disabled:opacity-40">Save Table</button>
        </div>
      )}

      {tables.length === 0 && !adding && (
        <p className="text-xs text-[#555] text-center py-4">No custom tables yet. Create one to get started.</p>
      )}

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {tables.map(t => (
          <div key={t.id} className="bg-[#1a1a1a] rounded p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-[#f0f0f0]">{t.name}</span>
              <div className="flex gap-1.5">
                <span className="text-xs text-[#555]">{t.entries.length} entries</span>
                <button onClick={() => rollTable(t)} className="text-xs px-2 py-0.5 bg-[#d4a574] text-[#1a1a1a] rounded font-medium hover:bg-[#c49464] transition-colors">Roll</button>
                <button onClick={() => deleteTable(t.id)} className="text-xs text-[#555] hover:text-[#b24545] transition-colors">×</button>
              </div>
            </div>
            {results[t.id] && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#d4d4d4] italic">"{results[t.id]}"</span>
                <CopyBtn text={results[t.id]} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Rumor / Gossip Mill ─────────────────────────────────────────────────────
const RUMOR_COLORS = { true: '#6b8e6b', false: '#b24545', herring: '#d4a574' }
const RUMOR_LABELS = { true: 'True', false: 'False', herring: 'Red Herring' }

function RumorGenerator() {
  const [result, setResult] = useState(null)
  const [showType, setShowType] = useState(false)
  const ref = useRef(null)
  useClickOutside(ref, result ? () => { setResult(null); setShowType(false) } : null)

  function generate() { setResult(pick(rumors)); setShowType(false) }

  return (
    <div ref={ref} className="bg-[#2d2d2d] rounded-lg p-4">
      <h3 className="font-bold text-[#d4a574] mb-3 text-sm">🗣 Rumor / Gossip Mill</h3>
      <button onClick={generate} className="w-full py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-bold text-sm hover:bg-[#c49464] transition-colors mb-3">Generate Rumor</button>
      {result && (
        <ResultCard onClear={() => { setResult(null); setShowType(false) }}>
          <p className="text-sm text-[#f0f0f0] leading-relaxed mb-2">{result.text}</p>
          <div className="flex items-center gap-2 mt-2">
            <button onClick={() => setShowType(t => !t)} className="text-xs px-2 py-0.5 bg-[#3d3d3d] text-[#999999] rounded hover:text-[#f0f0f0] transition-colors">
              {showType ? 'Hide' : 'Reveal'} Truth
            </button>
            {showType && (
              <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: RUMOR_COLORS[result.type] + '33', color: RUMOR_COLORS[result.type] }}>
                {RUMOR_LABELS[result.type]}
              </span>
            )}
            <div className="ml-auto"><CopyBtn text={result.text} /></div>
          </div>
        </ResultCard>
      )}
    </div>
  )
}

// ─── Trap Generator ───────────────────────────────────────────────────────────
function TrapGenerator() {
  const [result, setResult] = useState(null)
  const ref = useRef(null)
  useClickOutside(ref, result ? () => setResult(null) : null)

  function generate() {
    const type = pick(trapTypes)
    const trigger = pick(trapTriggers)
    const consequence = pick(trapConsequences)
    const detectDC = 10 + Math.floor(Math.random() * 9)
    const disarmDC = detectDC + Math.floor(Math.random() * 5) - 2
    setResult({ type, trigger, consequence, detectDC, disarmDC: Math.max(8, disarmDC) })
  }

  return (
    <div ref={ref} className="bg-[#2d2d2d] rounded-lg p-4">
      <h3 className="font-bold text-[#d4a574] mb-3 text-sm">⚙️ Trap Generator</h3>
      <button onClick={generate} className="w-full py-2 bg-[#b24545] text-white rounded font-bold text-sm hover:bg-[#922b2b] transition-colors mb-3">Generate Trap</button>
      {result && (
        <ResultCard onClear={() => setResult(null)}>
          <div className="font-bold text-[#b24545] mb-2">{result.type}</div>
          <div className="space-y-1.5 text-xs">
            <div><span className="text-[#999999]">Trigger: </span><span className="text-[#f0f0f0]">{result.trigger}</span></div>
            <div><span className="text-[#999999]">Effect: </span><span className="text-[#f0f0f0] font-medium">{result.consequence.effect}</span></div>
            <div className="text-[#d4d4d4] leading-relaxed pl-2 border-l border-[#3d3d3d]">{result.consequence.detail}</div>
            <div className="flex gap-4 pt-1">
              <span className="text-[#999999]">Detect DC: <span className="text-[#d4a574] font-bold">{result.detectDC}</span></span>
              <span className="text-[#999999]">Disarm DC: <span className="text-[#d4a574] font-bold">{result.disarmDC}</span></span>
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <CopyBtn text={`${result.type} | Trigger: ${result.trigger} | ${result.consequence.effect}: ${result.consequence.detail} | Detect DC ${result.detectDC}, Disarm DC ${result.disarmDC}`} />
          </div>
        </ResultCard>
      )}
    </div>
  )
}

// ─── NPC Quirk Generator (Speech/Mannerism) ───────────────────────────────────
function NPCQuirkGenerator() {
  const [result, setResult] = useState(null)
  const ref = useRef(null)
  useClickOutside(ref, result ? () => setResult(null) : null)

  function generate() {
    setResult({ speech: pick(speechPatterns), mannerism: pick(mannerisms), habit: pick(habits) })
  }

  return (
    <div ref={ref} className="bg-[#2d2d2d] rounded-lg p-4">
      <h3 className="font-bold text-[#d4a574] mb-3 text-sm">💬 NPC Quirk Generator</h3>
      <p className="text-xs text-[#666] mb-3">Speech pattern + mannerism + habit</p>
      <button onClick={generate} className="w-full py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-bold text-sm hover:bg-[#c49464] transition-colors mb-3">Generate Quirks</button>
      {result && (
        <ResultCard onClear={() => setResult(null)}>
          <div className="space-y-2 text-xs">
            {[['Speech', result.speech], ['Mannerism', result.mannerism], ['Habit', result.habit]].map(([label, val]) => (
              <div key={label}>
                <span className="text-[#d4a574] font-semibold uppercase tracking-wide">{label}: </span>
                <span className="text-[#f0f0f0]">{val}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-2">
            <CopyBtn text={`Speech: ${result.speech}\nMannerism: ${result.mannerism}\nHabit: ${result.habit}`} />
          </div>
        </ResultCard>
      )}
    </div>
  )
}

// ─── Condition Reminder ───────────────────────────────────────────────────────
const CONDITIONS = [
  { name: 'Blinded', effect: 'Auto-fails sight checks. Attack rolls against it have advantage; its attacks have disadvantage.' },
  { name: 'Charmed', effect: 'Can\'t attack the charmer. Charmer has advantage on social checks against it.' },
  { name: 'Deafened', effect: 'Auto-fails hearing checks. No disadvantage on attacks.' },
  { name: 'Frightened', effect: 'Disadvantage on ability checks/attacks while source is visible. Can\'t willingly move closer.' },
  { name: 'Grappled', effect: 'Speed 0. Ends if grappler is incapacitated or creature is moved out of reach.' },
  { name: 'Incapacitated', effect: 'Can\'t take actions or reactions.' },
  { name: 'Invisible', effect: 'Unseen. Attacks against it have disadvantage; its attacks have advantage.' },
  { name: 'Paralyzed', effect: 'Incapacitated, can\'t move or speak. Auto-fails Str/Dex saves. Hits are crits if within 5 ft.' },
  { name: 'Petrified', effect: 'Transformed to stone. Incapacitated, weight ×10, resistance to all damage, immune to poison/disease.' },
  { name: 'Poisoned', effect: 'Disadvantage on attack rolls and ability checks.' },
  { name: 'Prone', effect: 'Disadvantage on attacks. Melee attacks against it have advantage; ranged attacks have disadvantage.' },
  { name: 'Restrained', effect: 'Speed 0. Attacks against it have advantage; its attacks have disadvantage. Disadvantage on Dex saves.' },
  { name: 'Stunned', effect: 'Incapacitated, can\'t move, can only speak falteringly. Auto-fails Str/Dex saves.' },
  { name: 'Unconscious', effect: 'Incapacitated, can\'t move/speak, unaware. Drops held items, falls prone. Hits are crits if within 5 ft.' },
  { name: 'Exhaustion 1', effect: 'Disadvantage on ability checks.' },
  { name: 'Exhaustion 2', effect: 'Speed halved.' },
  { name: 'Exhaustion 3', effect: 'Disadvantage on attack rolls and saving throws.' },
  { name: 'Exhaustion 4', effect: 'Hit point maximum halved.' },
  { name: 'Exhaustion 5', effect: 'Speed reduced to 0.' },
  { name: 'Exhaustion 6', effect: 'Death.' },
  { name: 'Blessed', effect: '+1d4 to attack rolls and saving throws (concentration).' },
  { name: 'Hasted', effect: '+2 AC, advantage on Dex saves, extra action. Speed doubled. On end: can\'t move or act for 1 round.' },
  { name: 'Raging', effect: '+2 damage (melee/thrown), resistance to bludgeoning/piercing/slashing, advantage on Str checks/saves.' },
  { name: 'Inspired', effect: '+1d6 (or higher) to one ability check, attack roll, or saving throw. Use within 10 minutes.' },
]

function ConditionReminder() {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(null)
  const filtered = CONDITIONS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="bg-[#2d2d2d] rounded-lg p-4">
      <h3 className="font-bold text-[#d4a574] mb-3 text-sm">📋 Condition Reference</h3>
      <input
        className={inp + ' w-full text-xs py-1.5 mb-2'}
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search conditions…"
      />
      <div className="space-y-0.5 max-h-64 overflow-y-auto">
        {filtered.map(c => (
          <div key={c.name} className="rounded overflow-hidden">
            <button
              onClick={() => setOpen(open === c.name ? null : c.name)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-[#3d3d3d] transition-colors text-left"
            >
              <span className="text-sm font-medium text-[#f0f0f0]">{c.name}</span>
              <span className="text-[#555] text-xs">{open === c.name ? '▲' : '▼'}</span>
            </button>
            {open === c.name && (
              <div className="px-2.5 py-2 bg-[#1a1a1a] text-xs text-[#d4d4d4] leading-relaxed">
                {c.effect}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-xs text-[#555] px-2 py-2">No match.</p>}
      </div>
    </div>
  )
}

// ─── Cliffhanger Generator ────────────────────────────────────────────────────
function CliffhangerGenerator() {
  const [result, setResult] = useState(null)
  const ref = useRef(null)
  useClickOutside(ref, result ? () => setResult(null) : null)

  return (
    <div ref={ref} className="bg-[#2d2d2d] rounded-lg p-4">
      <h3 className="font-bold text-[#d4a574] mb-3 text-sm">🎬 Cliffhanger Generator</h3>
      <button onClick={() => setResult(pick(cliffhangers))} className="w-full py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-bold text-sm hover:bg-[#c49464] transition-colors mb-3">Generate Ending</button>
      {result && (
        <ResultCard onClear={() => setResult(null)}>
          <p className="text-sm text-[#f0f0f0] leading-relaxed italic">"{result}"</p>
          <div className="flex justify-end mt-2"><CopyBtn text={result} /></div>
        </ResultCard>
      )}
    </div>
  )
}

// ─── Guild / Faction Generator ────────────────────────────────────────────────
function FactionGenerator() {
  const [result, setResult] = useState(null)
  const ref = useRef(null)
  useClickOutside(ref, result ? () => setResult(null) : null)

  return (
    <div ref={ref} className="bg-[#2d2d2d] rounded-lg p-4">
      <h3 className="font-bold text-[#d4a574] mb-3 text-sm">⚑ Guild / Faction Generator</h3>
      <button onClick={() => setResult(generateFaction())} className="w-full py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-bold text-sm hover:bg-[#c49464] transition-colors mb-3">Generate Faction</button>
      {result && (
        <ResultCard onClear={() => setResult(null)}>
          <div className="font-bold text-[#d4a574] text-base mb-2">{result.name}</div>
          <div className="space-y-1.5 text-xs">
            <div><span className="text-[#999999]">Purpose: </span><span className="text-[#f0f0f0]">{result.purpose}</span></div>
            <div><span className="text-[#999999]">Nature: </span><span className="text-[#f0f0f0]">{result.trait}</span></div>
          </div>
          <div className="flex justify-end mt-2">
            <CopyBtn text={`${result.name}\nPurpose: ${result.purpose}\nNature: ${result.trait}`} />
          </div>
        </ResultCard>
      )}
    </div>
  )
}

// ─── NPC Appearance Generator ─────────────────────────────────────────────────
function AppearanceGenerator() {
  const [result, setResult] = useState(null)
  const ref = useRef(null)
  useClickOutside(ref, result ? () => setResult(null) : null)

  return (
    <div ref={ref} className="bg-[#2d2d2d] rounded-lg p-4">
      <h3 className="font-bold text-[#d4a574] mb-3 text-sm">👤 NPC Appearance</h3>
      <button onClick={() => setResult(generateAppearance())} className="w-full py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-bold text-sm hover:bg-[#c49464] transition-colors mb-3">Generate Appearance</button>
      {result && (
        <ResultCard onClear={() => setResult(null)}>
          <div className="space-y-1 text-xs">
            {[['Height', result.height], ['Build', result.build], ['Hair', result.hair], ['Eyes', result.eyes], ['Age impression', result.age]].map(([k, v]) => (
              <div key={k}><span className="text-[#999999]">{k}: </span><span className="text-[#f0f0f0]">{v}</span></div>
            ))}
            <div className="pt-1">
              <span className="text-[#999999]">Feature{result.features.length > 1 ? 's' : ''}: </span>
              {result.features.map((f, i) => (
                <span key={i} className="text-[#f0f0f0]">{f}{i < result.features.length - 1 ? '; ' : ''}</span>
              ))}
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <CopyBtn text={`${result.height}, ${result.build}. Hair: ${result.hair}. Eyes: ${result.eyes}. ${result.features.join('; ')}. ${result.age}.`} />
          </div>
        </ResultCard>
      )}
    </div>
  )
}

// ─── Shop Inventory Generator ─────────────────────────────────────────────────
function ShopInventoryGenerator() {
  const [shopType, setShopType] = useState('General Store')
  const [count, setCount] = useState(5)
  const [result, setResult] = useState(null)
  const ref = useRef(null)
  useClickOutside(ref, result ? () => setResult(null) : null)

  function generate() { setResult(generateShopInventory(shopType, count)) }

  return (
    <div ref={ref} className="bg-[#2d2d2d] rounded-lg p-4">
      <h3 className="font-bold text-[#d4a574] mb-3 text-sm">🏪 Shop Inventory</h3>
      <div className="space-y-2 mb-3">
        <div>
          <label className="block text-xs text-[#999999] mb-1">Vendor Type</label>
          <select className={inp + ' w-full text-xs py-1.5'} value={shopType} onChange={e => setShopType(e.target.value)}>
            {shopTypes.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#999999] mb-1">Items to show: {count}</label>
          <input type="range" min={3} max={10} value={count} onChange={e => setCount(+e.target.value)} className="w-full accent-amber" />
        </div>
      </div>
      <button onClick={generate} className="w-full py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-bold text-sm hover:bg-[#c49464] transition-colors mb-3">Stock the Shelves</button>
      {result && (
        <ResultCard onClear={() => setResult(null)}>
          <p className="text-xs text-[#d4a574] font-semibold uppercase tracking-wide mb-2">{shopType}</p>
          <ul className="space-y-0.5">
            {result.map((item, i) => (
              <li key={i} className="text-xs text-[#f0f0f0] flex gap-1.5">
                <span className="text-[#555]">•</span>{item}
              </li>
            ))}
          </ul>
          <div className="flex justify-end mt-2">
            <CopyBtn text={result.join('\n')} />
          </div>
        </ResultCard>
      )}
    </div>
  )
}

// ─── Main Toolkit ─────────────────────────────────────────────────────────────
export default function Toolkit() {
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h2 className="text-[#d4a574] font-semibold text-sm uppercase tracking-wider mb-4">DM Toolkit</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NameGenerator />
        <LootGenerator />
        <DiceRoller />
        <NPCPersonalityGenerator />
        <WeatherGenerator />
        <EncounterComplicationGenerator />
        <TavernGenerator />
        <AbilityScoreGenerator />
        <RandomEventGenerator />
        <MagicItemGenerator />
        <RumorGenerator />
        <TrapGenerator />
        <NPCQuirkGenerator />
        <ConditionReminder />
        <CliffhangerGenerator />
        <FactionGenerator />
        <AppearanceGenerator />
        <ShopInventoryGenerator />
        <CustomTableRoller />
      </div>
    </div>
  )
}
