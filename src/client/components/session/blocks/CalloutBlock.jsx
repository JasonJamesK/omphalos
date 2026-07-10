const inp = 'w-full bg-[#161310] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574]'

const VARIANTS = {
  flavor: { label: 'Flavor Text', icon: '📜', color: '#d4a574' },
  readAloud: { label: 'Read-Aloud', icon: '🔊', color: '#6b8e6b' },
}

export default function CalloutBlock({ block, onChange }) {
  const v = VARIANTS[block.variant] || VARIANTS.flavor

  return (
    <div className="rounded p-3" style={{ backgroundColor: '#161310', borderLeft: `3px solid ${v.color}` }}>
      <div className="flex items-center gap-2 mb-2">
        <select
          className="bg-[#211b17] border border-[#332922] rounded px-2 py-1 text-xs text-[#f0f0f0] focus:outline-none"
          value={block.variant || 'flavor'}
          onChange={e => onChange({ ...block, variant: e.target.value })}
        >
          <option value="flavor">📜 Flavor Text</option>
          <option value="readAloud">🔊 Read-Aloud</option>
        </select>
        <input
          className={inp + ' flex-1 text-sm py-1.5'}
          value={block.title || ''}
          onChange={e => onChange({ ...block, title: e.target.value })}
          placeholder={`${v.label} title...`}
        />
      </div>
      <textarea
        className={inp + ' resize-none italic'}
        rows={4}
        value={block.body || ''}
        onChange={e => onChange({ ...block, body: e.target.value })}
        placeholder="Read this out loud to your players..."
      />
    </div>
  )
}
