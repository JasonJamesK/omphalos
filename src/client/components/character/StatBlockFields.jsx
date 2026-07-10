const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export function emptyStatBlock() {
  return {
    sizeType: '', alignment: '', armorClass: '', hitPoints: '', speed: '',
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    savingThrows: '', skills: '',
    damageVulnerabilities: '', damageResistances: '', damageImmunities: '', conditionImmunities: '',
    senses: '', languages: '', challengeRating: '',
    traits: [], actions: [], legendaryActions: [],
  }
}

function mod(score) {
  const m = Math.floor((score - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

const inp = 'w-full bg-[#161310] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574]'
const lbl = 'block text-xs text-[#999999] mb-1'

function EntryList({ label, entries, onChange, withCost = false }) {
  const add = () => onChange([...(entries || []), { name: '', text: '', cost: '' }])
  const update = (i, k, v) => { const arr = [...entries]; arr[i] = { ...arr[i], [k]: v }; onChange(arr) }
  const remove = i => onChange(entries.filter((_, j) => j !== i))

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className={lbl + ' mb-0'}>{label}</label>
        <button type="button" onClick={add} className="text-xs text-[#d4a574] hover:underline">+ Add</button>
      </div>
      <div className="space-y-2">
        {(entries || []).map((e, i) => (
          <div key={i} className="bg-[#161310] rounded p-2 space-y-1.5">
            <div className="flex gap-1.5">
              <input className={inp + ' flex-1 text-xs py-1.5'} value={e.name} onChange={ev => update(i, 'name', ev.target.value)} placeholder="Name" />
              {withCost && (
                <input className={inp + ' w-32 text-xs py-1.5'} value={e.cost || ''} onChange={ev => update(i, 'cost', ev.target.value)} placeholder="Cost (optional)" />
              )}
              <button type="button" onClick={() => remove(i)} className="text-[#b24545] hover:text-[#922b2b] px-1 text-sm">×</button>
            </div>
            <textarea className={inp + ' text-xs resize-none'} rows={2} value={e.text} onChange={ev => update(i, 'text', ev.target.value)} placeholder="Description..." />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StatBlockFields({ value, onChange }) {
  const sb = value || emptyStatBlock()
  const set = (k, v) => onChange({ ...sb, [k]: v })

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lbl}>Size / Type</label>
          <input className={inp} value={sb.sizeType} onChange={e => set('sizeType', e.target.value)} placeholder="e.g. Large undead (shapechanger)" />
        </div>
        <div>
          <label className={lbl}>Alignment</label>
          <input className={inp} value={sb.alignment} onChange={e => set('alignment', e.target.value)} placeholder="e.g. Neutral Evil" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={lbl}>Armor Class</label>
          <input className={inp} value={sb.armorClass} onChange={e => set('armorClass', e.target.value)} placeholder="18 (Natural Armor)" />
        </div>
        <div>
          <label className={lbl}>Hit Points</label>
          <input className={inp} value={sb.hitPoints} onChange={e => set('hitPoints', e.target.value)} placeholder="110 (13d10 + 39)" />
        </div>
        <div>
          <label className={lbl}>Speed</label>
          <input className={inp} value={sb.speed} onChange={e => set('speed', e.target.value)} placeholder="40 ft., climb 40 ft." />
        </div>
      </div>

      <div>
        <label className={lbl}>Ability Scores</label>
        <div className="grid grid-cols-6 gap-1.5">
          {ABILITIES.map(a => (
            <div key={a} className="bg-[#161310] rounded p-1.5 text-center">
              <div className="text-[10px] text-[#999999] uppercase">{a}</div>
              <input
                type="number"
                className="w-full bg-transparent text-center text-[#f0f0f0] text-sm focus:outline-none"
                value={sb[a]}
                onChange={e => set(a, parseInt(e.target.value) || 0)}
              />
              <div className="text-[10px] text-[#d4a574]">{mod(sb[a])}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lbl}>Saving Throws</label>
          <input className={inp} value={sb.savingThrows} onChange={e => set('savingThrows', e.target.value)} placeholder="Dex +6, Con +6" />
        </div>
        <div>
          <label className={lbl}>Skills</label>
          <input className={inp} value={sb.skills} onChange={e => set('skills', e.target.value)} placeholder="Stealth +9, Perception +5" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lbl}>Damage Vulnerabilities</label>
          <input className={inp} value={sb.damageVulnerabilities} onChange={e => set('damageVulnerabilities', e.target.value)} placeholder="Fire" />
        </div>
        <div>
          <label className={lbl}>Damage Resistances</label>
          <input className={inp} value={sb.damageResistances} onChange={e => set('damageResistances', e.target.value)} placeholder="Cold; Nonmagical B/P/S" />
        </div>
        <div>
          <label className={lbl}>Damage Immunities</label>
          <input className={inp} value={sb.damageImmunities} onChange={e => set('damageImmunities', e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Condition Immunities</label>
          <input className={inp} value={sb.conditionImmunities} onChange={e => set('conditionImmunities', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={lbl}>Senses</label>
          <input className={inp} value={sb.senses} onChange={e => set('senses', e.target.value)} placeholder="Darkvision 120 ft., Passive Perception 15" />
        </div>
        <div>
          <label className={lbl}>Languages</label>
          <input className={inp} value={sb.languages} onChange={e => set('languages', e.target.value)} placeholder="Understands Common..." />
        </div>
      </div>

      <div>
        <label className={lbl}>Challenge Rating</label>
        <input className={inp} value={sb.challengeRating} onChange={e => set('challengeRating', e.target.value)} placeholder="6 (2,300 XP)" />
      </div>

      <EntryList label="Traits" entries={sb.traits} onChange={v => set('traits', v)} />
      <EntryList label="Actions" entries={sb.actions} onChange={v => set('actions', v)} />
      <EntryList label="Legendary Actions" entries={sb.legendaryActions} onChange={v => set('legendaryActions', v)} withCost />
    </div>
  )
}
