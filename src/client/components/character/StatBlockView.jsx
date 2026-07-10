const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha']

function mod(score) {
  const m = Math.floor((score - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="text-xs">
      <span className="text-[#d4a574] font-semibold">{label} </span>
      <span className="text-[#d4d4d4]">{value}</span>
    </div>
  )
}

function EntrySection({ label, entries }) {
  if (!entries?.length) return null
  return (
    <div className="mt-2 pt-2 border-t border-[#332922]/60">
      <p className="text-xs font-bold text-[#d4a574] mb-1">{label}</p>
      {entries.map((e, i) => (
        <p key={i} className="text-xs text-[#d4d4d4] leading-relaxed mb-1">
          <span className="font-semibold text-[#f0f0f0]">{e.name}{e.cost ? ` (${e.cost})` : ''}.</span> {e.text}
        </p>
      ))}
    </div>
  )
}

export default function StatBlockView({ char }) {
  const sb = char?.statBlock
  if (!sb) return <p className="text-xs text-[#666] italic">No stat block yet.</p>

  return (
    <div className="text-sm">
      <h3 className="font-bold text-[#d4a574] leading-tight">{char.name}</h3>
      {sb.sizeType && <p className="text-xs italic text-[#999999] mb-2">{sb.sizeType}{sb.alignment ? `, ${sb.alignment}` : ''}</p>}

      <Row label="Armor Class" value={sb.armorClass} />
      <Row label="Hit Points" value={sb.hitPoints} />
      <Row label="Speed" value={sb.speed} />

      <div className="grid grid-cols-6 gap-1 my-2">
        {ABILITIES.map(a => (
          <div key={a} className="bg-[#161310] rounded p-1 text-center">
            <div className="text-[9px] text-[#999999] uppercase">{a}</div>
            <div className="text-xs text-[#f0f0f0]">{sb[a]} ({mod(sb[a])})</div>
          </div>
        ))}
      </div>

      <Row label="Saving Throws" value={sb.savingThrows} />
      <Row label="Skills" value={sb.skills} />
      <Row label="Damage Vulnerabilities" value={sb.damageVulnerabilities} />
      <Row label="Damage Resistances" value={sb.damageResistances} />
      <Row label="Damage Immunities" value={sb.damageImmunities} />
      <Row label="Condition Immunities" value={sb.conditionImmunities} />
      <Row label="Senses" value={sb.senses} />
      <Row label="Languages" value={sb.languages} />
      <Row label="Challenge" value={sb.challengeRating} />

      <EntrySection label="Traits" entries={sb.traits} />
      <EntrySection label="Actions" entries={sb.actions} />
      <EntrySection label="Legendary Actions" entries={sb.legendaryActions} />
    </div>
  )
}
