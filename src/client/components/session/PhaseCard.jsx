import CalloutBlock from './blocks/CalloutBlock'
import LocationsBlock from './blocks/LocationsBlock'
import RandomTableBlock from './blocks/RandomTableBlock'
import LootBlock from './blocks/LootBlock'
import NotesBlock from './blocks/NotesBlock'

const inp = 'w-full bg-[#161310] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574] resize-none'

const BLOCK_TYPES = [
  { type: 'callout', variant: 'flavor', label: '📜 Flavor Text' },
  { type: 'callout', variant: 'readAloud', label: '🔊 Read-Aloud' },
  { type: 'locations', label: '🗺 Locations' },
  { type: 'table', label: '🎲 Random Table' },
  { type: 'loot', label: '💰 Loot Pool' },
  { type: 'notes', label: '📝 Notes' },
]

function blockUid() { return `block-${Date.now()}-${Math.random().toString(36).slice(2)}` }

function emptyBlock(spec) {
  const base = { id: blockUid(), type: spec.type }
  if (spec.type === 'callout') return { ...base, variant: spec.variant, title: '', body: '' }
  if (spec.type === 'locations') return { ...base, locationIds: [] }
  if (spec.type === 'table') return { ...base, title: '', die: 'd4', columns: ['Result', 'Effect'], rows: [] }
  if (spec.type === 'loot') return { ...base, items: [] }
  if (spec.type === 'notes') return { ...base, body: '' }
  return base
}

function BlockRenderer({ block, onChange }) {
  if (block.type === 'callout') return <CalloutBlock block={block} onChange={onChange} />
  if (block.type === 'locations') return <LocationsBlock block={block} onChange={onChange} />
  if (block.type === 'table') return <RandomTableBlock block={block} onChange={onChange} />
  if (block.type === 'loot') return <LootBlock block={block} onChange={onChange} />
  if (block.type === 'notes') return <NotesBlock block={block} onChange={onChange} />
  return null
}

export default function PhaseCard({ phase, expanded, onToggle, onChange, onDelete }) {
  const blocks = phase.blocks || []

  function updateBlock(i, newBlock) {
    const arr = [...blocks]; arr[i] = newBlock
    onChange({ ...phase, blocks: arr })
  }

  function addBlock(spec) {
    onChange({ ...phase, blocks: [...blocks, emptyBlock(spec)] })
  }

  function removeBlock(i) {
    onChange({ ...phase, blocks: blocks.filter((_, j) => j !== i) })
  }

  function moveBlock(i, dir) {
    const j = i + dir
    if (j < 0 || j >= blocks.length) return
    const arr = [...blocks]
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    onChange({ ...phase, blocks: arr })
  }

  return (
    <div className={`bg-[#211b17] border rounded-lg overflow-hidden transition-colors ${expanded ? 'border-[#d4a574]/50' : 'border-[#332922] hover:border-[#d4a574]/30'}`}>
      <div className="flex items-start gap-3 px-4 py-3 cursor-pointer" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs transition-transform ${expanded ? 'rotate-90' : ''} text-[#666]`}>▶</span>
            <h3 className="font-semibold text-[#f0f0f0]">{phase.title || 'Untitled Phase'}</h3>
            {blocks.length > 0 && (
              <span className="text-xs bg-[#332922] text-[#999999] px-1.5 py-0.5 rounded flex-shrink-0">{blocks.length} block{blocks.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          {!expanded && phase.summary && (
            <p className="text-xs text-[#999999] mt-1 ml-4 line-clamp-2">{phase.summary}</p>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={onDelete} className="px-2 py-1 text-xs bg-[#b24545]/20 text-[#b24545] rounded hover:bg-[#b24545]/40 transition-colors">Del</button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#999999] mb-1">Phase Title</label>
              <input
                className={inp}
                value={phase.title || ''}
                onChange={e => onChange({ ...phase, title: e.target.value })}
                placeholder="e.g. Phase I: The Ruined Hamlet"
              />
            </div>
            <div>
              <label className="block text-xs text-[#999999] mb-1">Summary</label>
              <input
                className={inp}
                value={phase.summary || ''}
                onChange={e => onChange({ ...phase, summary: e.target.value })}
                placeholder="One-line context for this phase..."
              />
            </div>
          </div>

          <div className="space-y-3">
            {blocks.map((block, i) => (
              <div key={block.id} className="relative group">
                <div className="flex justify-end gap-1 mb-1">
                  <button onClick={() => moveBlock(i, -1)} disabled={i === 0} className="text-xs text-[#666] hover:text-[#f0f0f0] disabled:opacity-30 px-1">▲</button>
                  <button onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} className="text-xs text-[#666] hover:text-[#f0f0f0] disabled:opacity-30 px-1">▼</button>
                  <button onClick={() => removeBlock(i)} className="text-xs text-[#b24545] hover:text-[#922b2b] px-1">Remove</button>
                </div>
                <BlockRenderer block={block} onChange={b => updateBlock(i, b)} />
              </div>
            ))}
          </div>

          <div className="border-t border-[#332922] pt-3">
            <p className="text-xs text-[#999999] mb-2">+ Add Block</p>
            <div className="flex flex-wrap gap-1.5">
              {BLOCK_TYPES.map((spec, i) => (
                <button
                  key={i}
                  onClick={() => addBlock(spec)}
                  className="px-2.5 py-1.5 bg-[#161310] text-[#d4d4d4] rounded text-xs hover:bg-[#332922] border border-[#332922] hover:border-[#d4a574]/40 transition-colors"
                >
                  {spec.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
