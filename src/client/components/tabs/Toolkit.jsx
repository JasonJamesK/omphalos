import { useState } from 'react'
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

const inp = 'bg-[#161310] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574]'
const DICE = [4, 6, 8, 10, 12, 20, 100]
const MAGIC_TIERS = Object.keys(magicItemTiers)

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// ─── Tool shell: compact card + modal (config, generate, result) ─────────────
function ToolShell({ icon, title, buttonLabel, accent = 'amber', onGenerate, renderConfig, renderResult, hasResult, fullBody }) {
  const [open, setOpen] = useState(false)

  const btnCls = accent === 'red'
    ? 'bg-[#b24545] text-white hover:bg-[#922b2b]'
    : 'bg-[#d4a574] text-[#161310] hover:bg-[#c49464]'

  function handleCardClick() {
    onGenerate?.()
    setOpen(true)
  }

  return (
    <>
      <div className="bg-[#211b17] border border-[#332922] rounded-lg p-4 hover:border-[#d4a574]/40 transition-colors flex flex-col gap-3">
        <div className="flex items-start gap-2 min-w-0 min-h-[2.25rem]">
          <span className="text-lg flex-shrink-0">{icon}</span>
          <h3 className="font-bold text-[#f0f0f0] text-sm leading-tight">{title}</h3>
        </div>
        <button onClick={handleCardClick} className={`w-full py-2 rounded font-bold text-sm transition-colors ${btnCls}`}>
          {buttonLabel}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="bg-[#211b17] border border-[#332922] rounded-lg w-[460px] max-h-[85vh] overflow-y-auto fade-in" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#211b17] flex items-center justify-between px-5 py-4 border-b border-[#332922] z-10">
              <h2 className="font-bold text-[#d4a574] flex items-center gap-2 uppercase tracking-wide text-sm">
                <span>{icon}</span>{title}
              </h2>
              <button onClick={() => setOpen(false)} className="text-[#999999] hover:text-[#f0f0f0] text-xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              {fullBody ? fullBody() : (
                <>
                  {renderConfig?.()}
                  <button onClick={onGenerate} className={`w-full py-2.5 rounded font-bold text-sm transition-colors ${btnCls}`}>
                    {buttonLabel}
                  </button>
                  {hasResult && (
                    <div className="pt-3 border-t border-[#332922]">
                      <p className="text-xs text-[#999999] uppercase tracking-wide mb-2">Latest Result</p>
                      {renderResult()}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Shared Result Card ───────────────────────────────────────────────────────
function ResultCard({ children }) {
  return (
    <div className="bg-[#161310] rounded-lg p-3 fade-in">
      {children}
    </div>
  )
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className={`text-xs px-2 py-0.5 rounded transition-colors ${copied ? 'bg-[#6b8e6b] text-white' : 'bg-[#332922] text-[#999999] hover:text-[#f0f0f0]'}`}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

// Saves the result into this session's Quick Notes so it can be found later.
function SaveBtn({ text }) {
  const { activeSession, dispatch } = useApp()
  const [saved, setSaved] = useState(false)

  function save() {
    if (!activeSession) return
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const line = `[${stamp}] ${text}`
    dispatch({
      type: 'UPDATE_SESSION',
      payload: { id: activeSession.id, sessionNotes: (activeSession.sessionNotes ? activeSession.sessionNotes + '\n' : '') + line },
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <button
      onClick={save}
      disabled={!activeSession}
      title={activeSession ? 'Save to Quick Notes' : 'Select a session first'}
      className={`text-xs px-2 py-0.5 rounded transition-colors disabled:opacity-40 ${saved ? 'bg-[#6b8e6b] text-white' : 'bg-[#332922] text-[#999999] hover:text-[#f0f0f0]'}`}
    >
      {saved ? 'Saved!' : '★ Save'}
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
    <ToolShell
      icon="🎲" title="Name Generator" buttonLabel="Generate" onGenerate={generate} hasResult={!!latest}
      renderConfig={() => (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-[#999999] mb-1">Gender</label>
            <div className="flex gap-1">
              {GENDERS.map(g => (
                <button key={g.value} onClick={() => setGender(g.value)} className={`flex-1 py-1.5 rounded text-xs transition-colors ${gender === g.value ? 'bg-[#d4a574] text-[#161310] font-medium' : 'bg-[#332922] text-[#f0f0f0] hover:bg-[#40332a]'}`}>{g.label}</button>
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
      )}
      renderResult={() => (
        <>
          <ResultCard>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-[#f0f0f0]">{latest.name}</div>
                <div className="text-xs text-[#666] mt-0.5">{latest.gender} {latest.race}</div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0"><CopyBtn text={latest.name} /><SaveBtn text={latest.name} /></div>
            </div>
          </ResultCard>
          {history.length > 1 && (
            <div className="mt-2 space-y-0.5 max-h-28 overflow-y-auto">
              {history.slice(1).map(h => (
                <div key={h.id} className="flex justify-between text-xs px-2 py-1 rounded hover:bg-[#332922] transition-colors group">
                  <span className="text-[#d4d4d4]">{h.name}</span>
                  <span className="text-[#555] group-hover:text-[#999999]">{h.race}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    />
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
    <ToolShell
      icon="💰" title="Loot Generator" buttonLabel="Generate Loot" onGenerate={generate} hasResult={!!loot}
      renderConfig={() => (
        <div className="grid grid-cols-4 gap-1">
          {LOOT_TIERS.map(t => (
            <button key={t} onClick={() => setTier(t)} style={tier === t ? { borderColor: tierColors[t], color: tierColors[t] } : {}} className={`py-1.5 rounded text-xs font-medium border transition-colors ${tier === t ? 'bg-[#332922]' : 'bg-[#161310] border-[#332922] text-[#999999] hover:bg-[#332922] hover:text-[#f0f0f0]'}`}>{t}</button>
          ))}
        </div>
      )}
      renderResult={() => (
        <ResultCard>
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[#f0f0f0] font-medium text-sm">{loot.name}</span>
              {loot.quantity > 1 && <span className="ml-2 text-xs" style={{ color: tierColors[tier] }}>×{loot.quantity}</span>}
            </div>
            <div className="flex gap-1.5"><CopyBtn text={loot.display} /><SaveBtn text={loot.display} /></div>
          </div>
          {chars.length > 0 && (
            <div className="flex gap-1.5 mt-2">
              <select className={inp + ' flex-1 text-xs py-1'} value={targetChar} onChange={e => { setTargetChar(e.target.value); setAdded(false) }}>
                <option value="">Add to character…</option>
                {chars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={addToChar} disabled={!targetChar} className={`px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-40 ${added ? 'bg-[#6b8e6b] text-white' : 'bg-[#d4a574] text-[#161310] hover:bg-[#c49464]'}`}>{added ? '✓' : 'Add'}</button>
            </div>
          )}
        </ResultCard>
      )}
    />
  )
}

// ─── Dice Roller ──────────────────────────────────────────────────────────────
function DiceRoller() {
  const [qty, setQty] = useState(1)
  const [die, setDie] = useState(20)
  const [modifier, setModifier] = useState(0)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])

  function roll() {
    const rolls = Array.from({ length: qty }, () => Math.floor(Math.random() * die) + 1)
    const total = rolls.reduce((a, b) => a + b, 0) + modifier
    const entry = { qty, die, modifier, rolls, total, id: Date.now() }
    setResult(entry); setHistory(prev => [entry, ...prev.slice(0, 8)])
  }

  const isCrit = die === 20 && qty === 1 && result?.rolls[0] === 20
  const isFumble = die === 20 && qty === 1 && result?.rolls[0] === 1

  return (
    <ToolShell
      icon="🎲" title="Dice Roller" buttonLabel="Roll" onGenerate={roll} hasResult={!!result}
      renderConfig={() => (
        <>
          <div className="flex flex-wrap gap-1">
            {DICE.map(d => (
              <button key={d} onClick={() => setDie(d)} className={`px-2.5 py-1.5 rounded font-bold text-xs transition-colors ${die === d ? 'bg-[#d4a574] text-[#161310]' : 'bg-[#161310] text-[#999999] border border-[#332922] hover:border-[#d4a574] hover:text-[#f0f0f0]'}`}>d{d}</button>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-[#999999] mb-1">Qty</label>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setQty(q => Math.max(1, q-1))} className="w-6 h-6 bg-[#332922] rounded text-[#f0f0f0] text-xs hover:bg-[#40332a]">−</button>
                <span className="text-[#f0f0f0] font-bold w-5 text-center text-sm">{qty}</span>
                <button onClick={() => setQty(q => Math.min(20, q+1))} className="w-6 h-6 bg-[#332922] rounded text-[#f0f0f0] text-xs hover:bg-[#40332a]">+</button>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-[#999999] mb-1">Mod</label>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setModifier(m => m-1)} className="w-6 h-6 bg-[#332922] rounded text-[#f0f0f0] text-xs hover:bg-[#40332a]">−</button>
                <span className={`font-bold w-8 text-center text-sm ${modifier > 0 ? 'text-[#6b8e6b]' : modifier < 0 ? 'text-[#b24545]' : 'text-[#f0f0f0]'}`}>{modifier > 0 ? `+${modifier}` : modifier}</span>
                <button onClick={() => setModifier(m => m+1)} className="w-6 h-6 bg-[#332922] rounded text-[#f0f0f0] text-xs hover:bg-[#40332a]">+</button>
              </div>
            </div>
            <div className="flex items-end"><button onClick={() => setModifier(0)} className="text-xs text-[#555] hover:text-[#999999] mb-0.5 transition-colors">reset</button></div>
          </div>
          <div className="text-center text-[#666] text-xs font-mono">{qty}d{die}{modifier !== 0 ? (modifier > 0 ? ` +${modifier}` : ` ${modifier}`) : ''}</div>
        </>
      )}
      renderResult={() => (
        <>
          <ResultCard>
            <div className={`text-4xl font-bold text-center mb-1 ${isCrit ? 'text-[#d4a574]' : isFumble ? 'text-[#b24545]' : 'text-[#f0f0f0]'}`}>{result.total}</div>
            {isCrit && <div className="text-center text-[#d4a574] text-xs font-bold uppercase tracking-widest mb-1">Critical!</div>}
            {isFumble && <div className="text-center text-[#b24545] text-xs font-bold uppercase tracking-widest mb-1">Fumble!</div>}
            {(result.rolls.length > 1 || result.modifier !== 0) && (
              <div className="text-center text-xs text-[#666]">[{result.rolls.join(', ')}]{result.modifier !== 0 ? (result.modifier > 0 ? ` +${result.modifier}` : ` ${result.modifier}`) : ''} = {result.total}</div>
            )}
            <div className="flex justify-center gap-1.5 mt-2"><CopyBtn text={String(result.total)} /><SaveBtn text={`Rolled ${result.qty}d${result.die}${result.modifier ? (result.modifier > 0 ? `+${result.modifier}` : result.modifier) : ''} = ${result.total}`} /></div>
          </ResultCard>
          {history.length > 1 && (
            <div className="mt-2 space-y-0.5 max-h-24 overflow-y-auto">
              {history.slice(1).map(h => (
                <div key={h.id} className="flex justify-between text-xs px-2 py-0.5 rounded hover:bg-[#332922] transition-colors">
                  <span className="text-[#666] font-mono">{h.qty}d{h.die}{h.modifier !== 0 ? (h.modifier > 0 ? `+${h.modifier}` : h.modifier) : ''}</span>
                  <span className="text-[#d4d4d4] font-bold">{h.total}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    />
  )
}

// ─── NPC Personality Generator ────────────────────────────────────────────────
function NPCPersonalityGenerator() {
  const [result, setResult] = useState(null)
  function generate() { setResult({ adj: pick(npcAdjectives), prof: pick(npcProfessions), quirk: pick(npcQuirks) }) }

  return (
    <ToolShell
      icon="🧍" title="NPC Personality" buttonLabel="Generate NPC" onGenerate={generate} hasResult={!!result}
      renderResult={() => (
        <ResultCard>
          <div className="text-base font-bold text-[#f0f0f0] mb-1">{result.adj} {result.prof}</div>
          <div className="text-sm text-[#999999] italic">{result.quirk}</div>
          <div className="flex justify-end gap-1.5 mt-2"><CopyBtn text={`${result.adj} ${result.prof} ${result.quirk}`} /><SaveBtn text={`${result.adj} ${result.prof} — ${result.quirk}`} /></div>
        </ResultCard>
      )}
    />
  )
}

// ─── Weather Generator ────────────────────────────────────────────────────────
function WeatherGenerator() {
  const [result, setResult] = useState(null)
  function generate() { setResult(pick(weatherTable)) }

  return (
    <ToolShell
      icon="🌤" title="Weather Generator" buttonLabel="Generate Weather" onGenerate={generate} hasResult={!!result}
      renderResult={() => (
        <ResultCard>
          <div className="font-bold text-[#f0f0f0] mb-1">{result.condition}</div>
          <p className="text-sm text-[#999999] leading-relaxed">{result.detail}</p>
          <div className="flex justify-end gap-1.5 mt-2"><CopyBtn text={`${result.condition}: ${result.detail}`} /><SaveBtn text={`${result.condition}: ${result.detail}`} /></div>
        </ResultCard>
      )}
    />
  )
}

// ─── Encounter Complication ───────────────────────────────────────────────────
function EncounterComplicationGenerator() {
  const [result, setResult] = useState(null)
  function generate() { setResult(pick(encounterComplications)) }

  return (
    <ToolShell
      icon="⚠️" title="Encounter Complication" buttonLabel="Roll Complication" accent="red" onGenerate={generate} hasResult={!!result}
      renderResult={() => (
        <ResultCard>
          <p className="text-sm text-[#f0f0f0] leading-relaxed">{result}</p>
          <div className="flex justify-end gap-1.5 mt-2"><CopyBtn text={result} /><SaveBtn text={result} /></div>
        </ResultCard>
      )}
    />
  )
}

// ─── Tavern / Shop Generator ──────────────────────────────────────────────────
function TavernGenerator() {
  const [result, setResult] = useState(null)
  function generate() { setResult(generateTavern()) }

  return (
    <ToolShell
      icon="🍺" title="Tavern / Shop Generator" buttonLabel="Generate Establishment" onGenerate={generate} hasResult={!!result}
      renderResult={() => (
        <ResultCard>
          <div className="font-bold text-[#d4a574] text-base mb-1">{result.name}</div>
          <p className="text-xs text-[#999999] italic mb-3 leading-relaxed">{result.vibe}</p>
          <div className="space-y-2">
            {result.npcs.map((n, i) => (
              <div key={i} className="border-t border-[#211b17] pt-2">
                <span className="text-xs font-semibold text-[#d4a574]">{n.role}:</span>
                <span className="text-xs text-[#f0f0f0]"> {n.adj} {n.role.toLowerCase()} </span>
                <span className="text-xs text-[#666]">{n.quirk}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-1.5 mt-2">
            <CopyBtn text={`${result.name}\n${result.vibe}\n${result.npcs.map(n => `- ${n.adj} ${n.role} ${n.quirk}`).join('\n')}`} />
            <SaveBtn text={`${result.name} — ${result.vibe}`} />
          </div>
        </ResultCard>
      )}
    />
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
  function generate() { setStats(STAT_NAMES.map(name => ({ name, ...rollStat() }))) }

  return (
    <ToolShell
      icon="🎯" title="Ability Score Generator" buttonLabel="Roll Stats" onGenerate={generate} hasResult={!!stats}
      renderConfig={() => <p className="text-xs text-[#666]">4d6, drop lowest — for quick NPC stat blocks</p>}
      renderResult={() => (
        <ResultCard>
          <div className="grid grid-cols-3 gap-2">
            {stats.map(s => (
              <div key={s.name} className="text-center bg-[#211b17] rounded p-2">
                <div className="text-xs text-[#999999] mb-0.5">{s.name}</div>
                <div className="text-xl font-bold text-[#f0f0f0]">{s.total}</div>
                <div className="text-xs text-[#d4a574]">{mod(s.total)}</div>
                <div className="text-[10px] text-[#444] mt-0.5">[{s.rolls.join(',')} drop {s.dropped}]</div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-1.5 mt-2">
            <CopyBtn text={stats.map(s => `${s.name}: ${s.total} (${mod(s.total)})`).join(' | ')} />
            <SaveBtn text={stats.map(s => `${s.name}: ${s.total} (${mod(s.total)})`).join(' | ')} />
          </div>
        </ResultCard>
      )}
    />
  )
}

// ─── Random Event Table ───────────────────────────────────────────────────────
function RandomEventGenerator() {
  const [result, setResult] = useState(null)
  function generate() { setResult(pick(eventTable)) }

  return (
    <ToolShell
      icon="🌍" title="Random World Event" buttonLabel="Roll Event" onGenerate={generate} hasResult={!!result}
      renderResult={() => (
        <ResultCard>
          <p className="text-sm text-[#f0f0f0] leading-relaxed">{result}</p>
          <div className="flex justify-end gap-1.5 mt-2"><CopyBtn text={result} /><SaveBtn text={result} /></div>
        </ResultCard>
      )}
    />
  )
}

// ─── Magic Item Generator ─────────────────────────────────────────────────────
const TIER_COLOURS = { Common:'#999999', Uncommon:'#6b8e6b', Rare:'#4a7ab2', 'Very Rare':'#7a4a7a', Legendary:'#d4a574' }

function MagicItemGenerator() {
  const [tier, setTier] = useState('Uncommon')
  const [result, setResult] = useState(null)
  function generate() { setResult({ tier, ...pick(magicItemTiers[tier]) }) }

  return (
    <ToolShell
      icon="✨" title="Magic Item Generator" buttonLabel="Generate Item" onGenerate={generate} hasResult={!!result}
      renderConfig={() => (
        <div className="flex flex-wrap gap-1">
          {MAGIC_TIERS.map(t => (
            <button key={t} onClick={() => setTier(t)} style={tier === t ? { background: TIER_COLOURS[t] + '33', borderColor: TIER_COLOURS[t], color: TIER_COLOURS[t] } : {}} className={`px-2 py-1 rounded text-xs border transition-colors ${tier === t ? '' : 'border-[#332922] text-[#666] hover:text-[#f0f0f0] hover:border-[#555]'}`}>{t}</button>
          ))}
        </div>
      )}
      renderResult={() => (
        <ResultCard>
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="font-bold text-[#f0f0f0]">{result.name}</div>
            <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: TIER_COLOURS[result.tier] + '33', color: TIER_COLOURS[result.tier] }}>{result.tier}</span>
          </div>
          <p className="text-xs text-[#999999] leading-relaxed">{result.desc}</p>
          <div className="flex justify-end gap-1.5 mt-2">
            <CopyBtn text={`${result.name} (${result.tier}): ${result.desc}`} />
            <SaveBtn text={`${result.name} (${result.tier}): ${result.desc}`} />
          </div>
        </ResultCard>
      )}
    />
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
    <ToolShell
      icon="📋" title="Custom Table Roller" buttonLabel="+ New Table"
      fullBody={() => (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#999999]">Your own tables to roll on.</p>
            <button onClick={() => setAdding(!adding)} className="text-xs text-[#d4a574] hover:underline">{adding ? 'Cancel' : '+ New Table'}</button>
          </div>

          {adding && (
            <div className="bg-[#161310] rounded p-3 space-y-2">
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
              <div key={t.id} className="bg-[#161310] rounded p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-[#f0f0f0]">{t.name}</span>
                  <div className="flex gap-1.5">
                    <span className="text-xs text-[#555]">{t.entries.length} entries</span>
                    <button onClick={() => rollTable(t)} className="text-xs px-2 py-0.5 bg-[#d4a574] text-[#161310] rounded font-medium hover:bg-[#c49464] transition-colors">Roll</button>
                    <button onClick={() => deleteTable(t.id)} className="text-xs text-[#555] hover:text-[#b24545] transition-colors">×</button>
                  </div>
                </div>
                {results[t.id] && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#d4d4d4] italic">"{results[t.id]}"</span>
                    <div className="flex gap-1.5"><CopyBtn text={results[t.id]} /><SaveBtn text={results[t.id]} /></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    />
  )
}

// ─── Rumor / Gossip Mill ─────────────────────────────────────────────────────
const RUMOR_COLORS = { true: '#6b8e6b', false: '#b24545', herring: '#d4a574' }
const RUMOR_LABELS = { true: 'True', false: 'False', herring: 'Red Herring' }

function RumorGenerator() {
  const [result, setResult] = useState(null)
  const [showType, setShowType] = useState(false)
  function generate() { setResult(pick(rumors)); setShowType(false) }

  return (
    <ToolShell
      icon="🗣" title="Rumor / Gossip Mill" buttonLabel="Generate Rumor" onGenerate={generate} hasResult={!!result}
      renderResult={() => (
        <ResultCard>
          <p className="text-sm text-[#f0f0f0] leading-relaxed mb-2">{result.text}</p>
          <div className="flex items-center gap-2 mt-2">
            <button onClick={() => setShowType(t => !t)} className="text-xs px-2 py-0.5 bg-[#332922] text-[#999999] rounded hover:text-[#f0f0f0] transition-colors">
              {showType ? 'Hide' : 'Reveal'} Truth
            </button>
            {showType && (
              <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: RUMOR_COLORS[result.type] + '33', color: RUMOR_COLORS[result.type] }}>
                {RUMOR_LABELS[result.type]}
              </span>
            )}
            <div className="ml-auto flex gap-1.5"><CopyBtn text={result.text} /><SaveBtn text={result.text} /></div>
          </div>
        </ResultCard>
      )}
    />
  )
}

// ─── Trap Generator ───────────────────────────────────────────────────────────
function TrapGenerator() {
  const [result, setResult] = useState(null)

  function generate() {
    const type = pick(trapTypes)
    const trigger = pick(trapTriggers)
    const consequence = pick(trapConsequences)
    const detectDC = 10 + Math.floor(Math.random() * 9)
    const disarmDC = detectDC + Math.floor(Math.random() * 5) - 2
    setResult({ type, trigger, consequence, detectDC, disarmDC: Math.max(8, disarmDC) })
  }

  return (
    <ToolShell
      icon="⚙️" title="Trap Generator" buttonLabel="Generate Trap" accent="red" onGenerate={generate} hasResult={!!result}
      renderResult={() => (
        <ResultCard>
          <div className="font-bold text-[#b24545] mb-2">{result.type}</div>
          <div className="space-y-1.5 text-xs">
            <div><span className="text-[#999999]">Trigger: </span><span className="text-[#f0f0f0]">{result.trigger}</span></div>
            <div><span className="text-[#999999]">Effect: </span><span className="text-[#f0f0f0] font-medium">{result.consequence.effect}</span></div>
            <div className="text-[#d4d4d4] leading-relaxed pl-2 border-l border-[#332922]">{result.consequence.detail}</div>
            <div className="flex gap-4 pt-1">
              <span className="text-[#999999]">Detect DC: <span className="text-[#d4a574] font-bold">{result.detectDC}</span></span>
              <span className="text-[#999999]">Disarm DC: <span className="text-[#d4a574] font-bold">{result.disarmDC}</span></span>
            </div>
          </div>
          <div className="flex justify-end gap-1.5 mt-2">
            <CopyBtn text={`${result.type} | Trigger: ${result.trigger} | ${result.consequence.effect}: ${result.consequence.detail} | Detect DC ${result.detectDC}, Disarm DC ${result.disarmDC}`} />
            <SaveBtn text={`${result.type} — Detect DC ${result.detectDC}, Disarm DC ${result.disarmDC}`} />
          </div>
        </ResultCard>
      )}
    />
  )
}

// ─── NPC Quirk Generator (Speech/Mannerism) ───────────────────────────────────
function NPCQuirkGenerator() {
  const [result, setResult] = useState(null)
  function generate() { setResult({ speech: pick(speechPatterns), mannerism: pick(mannerisms), habit: pick(habits) }) }

  return (
    <ToolShell
      icon="💬" title="NPC Quirk Generator" buttonLabel="Generate Quirks" onGenerate={generate} hasResult={!!result}
      renderConfig={() => <p className="text-xs text-[#666]">Speech pattern + mannerism + habit</p>}
      renderResult={() => (
        <ResultCard>
          <div className="space-y-2 text-xs">
            {[['Speech', result.speech], ['Mannerism', result.mannerism], ['Habit', result.habit]].map(([label, val]) => (
              <div key={label}>
                <span className="text-[#d4a574] font-semibold uppercase tracking-wide">{label}: </span>
                <span className="text-[#f0f0f0]">{val}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-1.5 mt-2">
            <CopyBtn text={`Speech: ${result.speech}\nMannerism: ${result.mannerism}\nHabit: ${result.habit}`} />
            <SaveBtn text={`Speech: ${result.speech}; Mannerism: ${result.mannerism}; Habit: ${result.habit}`} />
          </div>
        </ResultCard>
      )}
    />
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
    <ToolShell
      icon="📋" title="Condition Reference" buttonLabel="Browse Conditions"
      fullBody={() => (
        <>
          <input
            className={inp + ' w-full text-xs py-1.5'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conditions…"
            autoFocus
          />
          <div className="space-y-0.5 max-h-96 overflow-y-auto">
            {filtered.map(c => (
              <div key={c.name} className="rounded overflow-hidden">
                <button
                  onClick={() => setOpen(open === c.name ? null : c.name)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-[#332922] transition-colors text-left"
                >
                  <span className="text-sm font-medium text-[#f0f0f0]">{c.name}</span>
                  <span className="text-[#555] text-xs">{open === c.name ? '▲' : '▼'}</span>
                </button>
                {open === c.name && (
                  <div className="px-2.5 py-2 bg-[#161310] text-xs text-[#d4d4d4] leading-relaxed">
                    {c.effect}
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && <p className="text-xs text-[#555] px-2 py-2">No match.</p>}
          </div>
        </>
      )}
    />
  )
}

// ─── Cliffhanger Generator ────────────────────────────────────────────────────
function CliffhangerGenerator() {
  const [result, setResult] = useState(null)
  function generate() { setResult(pick(cliffhangers)) }

  return (
    <ToolShell
      icon="🎬" title="Cliffhanger Generator" buttonLabel="Generate Ending" onGenerate={generate} hasResult={!!result}
      renderResult={() => (
        <ResultCard>
          <p className="text-sm text-[#f0f0f0] leading-relaxed italic">"{result}"</p>
          <div className="flex justify-end gap-1.5 mt-2"><CopyBtn text={result} /><SaveBtn text={result} /></div>
        </ResultCard>
      )}
    />
  )
}

// ─── Guild / Faction Generator ────────────────────────────────────────────────
function FactionGenerator() {
  const [result, setResult] = useState(null)
  function generate() { setResult(generateFaction()) }

  return (
    <ToolShell
      icon="⚑" title="Guild / Faction Generator" buttonLabel="Generate Faction" onGenerate={generate} hasResult={!!result}
      renderResult={() => (
        <ResultCard>
          <div className="font-bold text-[#d4a574] text-base mb-2">{result.name}</div>
          <div className="space-y-1.5 text-xs">
            <div><span className="text-[#999999]">Purpose: </span><span className="text-[#f0f0f0]">{result.purpose}</span></div>
            <div><span className="text-[#999999]">Nature: </span><span className="text-[#f0f0f0]">{result.trait}</span></div>
          </div>
          <div className="flex justify-end gap-1.5 mt-2">
            <CopyBtn text={`${result.name}\nPurpose: ${result.purpose}\nNature: ${result.trait}`} />
            <SaveBtn text={`${result.name} — ${result.purpose}`} />
          </div>
        </ResultCard>
      )}
    />
  )
}

// ─── NPC Appearance Generator ─────────────────────────────────────────────────
function AppearanceGenerator() {
  const [result, setResult] = useState(null)
  function generate() { setResult(generateAppearance()) }

  return (
    <ToolShell
      icon="👤" title="NPC Appearance" buttonLabel="Generate Appearance" onGenerate={generate} hasResult={!!result}
      renderResult={() => (
        <ResultCard>
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
          <div className="flex justify-end gap-1.5 mt-2">
            <CopyBtn text={`${result.height}, ${result.build}. Hair: ${result.hair}. Eyes: ${result.eyes}. ${result.features.join('; ')}. ${result.age}.`} />
            <SaveBtn text={`${result.height}, ${result.build}, ${result.hair} hair, ${result.eyes} eyes`} />
          </div>
        </ResultCard>
      )}
    />
  )
}

// ─── Shop Inventory Generator ─────────────────────────────────────────────────
function ShopInventoryGenerator() {
  const [shopType, setShopType] = useState('General Store')
  const [count, setCount] = useState(5)
  const [result, setResult] = useState(null)
  function generate() { setResult(generateShopInventory(shopType, count)) }

  return (
    <ToolShell
      icon="🏪" title="Shop Inventory" buttonLabel="Stock the Shelves" onGenerate={generate} hasResult={!!result}
      renderConfig={() => (
        <div className="space-y-2">
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
      )}
      renderResult={() => (
        <ResultCard>
          <p className="text-xs text-[#d4a574] font-semibold uppercase tracking-wide mb-2">{shopType}</p>
          <ul className="space-y-0.5">
            {result.map((item, i) => (
              <li key={i} className="text-xs text-[#f0f0f0] flex gap-1.5">
                <span className="text-[#555]">•</span>{item}
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-1.5 mt-2">
            <CopyBtn text={result.join('\n')} />
            <SaveBtn text={`${shopType}: ${result.join(', ')}`} />
          </div>
        </ResultCard>
      )}
    />
  )
}

// ─── Main Toolkit ─────────────────────────────────────────────────────────────
const TOOLS = [
  { title: 'Name Generator', Component: NameGenerator },
  { title: 'NPC Personality', Component: NPCPersonalityGenerator },
  { title: 'NPC Quirk Generator', Component: NPCQuirkGenerator },
  { title: 'NPC Appearance', Component: AppearanceGenerator },
  { title: 'Loot Generator', Component: LootGenerator },
  { title: 'Magic Item Generator', Component: MagicItemGenerator },
  { title: 'Tavern / Shop Generator', Component: TavernGenerator },
  { title: 'Shop Inventory', Component: ShopInventoryGenerator },
  { title: 'Dice Roller', Component: DiceRoller },
  { title: 'Ability Score Generator', Component: AbilityScoreGenerator },
  { title: 'Encounter Complication', Component: EncounterComplicationGenerator },
  { title: 'Trap Generator', Component: TrapGenerator },
  { title: 'Condition Reference', Component: ConditionReminder },
  { title: 'Weather Generator', Component: WeatherGenerator },
  { title: 'Random World Event', Component: RandomEventGenerator },
  { title: 'Rumor / Gossip Mill', Component: RumorGenerator },
  { title: 'Guild / Faction Generator', Component: FactionGenerator },
  { title: 'Cliffhanger Generator', Component: CliffhangerGenerator },
  { title: 'Custom Table Roller', Component: CustomTableRoller },
]

export default function Toolkit() {
  const [search, setSearch] = useState('')
  const filtered = TOOLS.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-[#d4a574] font-semibold text-sm uppercase tracking-wider flex-shrink-0">DM Toolkit</h2>
        <input
          className={inp + ' text-xs py-1.5 w-56'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Zoek een tool..."
        />
      </div>
      {filtered.length === 0 ? (
        <p className="text-xs text-[#555] text-center py-10">No tools match "{search}".</p>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map(({ title, Component }) => <Component key={title} />)}
        </div>
      )}
    </div>
  )
}
