import MarkdownField from '../../markdown/MarkdownField'

const inp = 'w-full bg-[#161310] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574] resize-none'

function itemUid() { return `item-${Date.now()}-${Math.random().toString(36).slice(2)}` }

export default function LootBlock({ block, onChange }) {
  const items = block.items || []

  const addItem = () => onChange({ ...block, items: [...items, { id: itemUid(), name: '', description: '' }] })
  const updateItem = (i, k, v) => {
    const arr = [...items]; arr[i] = { ...arr[i], [k]: v }
    onChange({ ...block, items: arr })
  }
  const removeItem = i => onChange({ ...block, items: items.filter((_, j) => j !== i) })

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#999999] uppercase tracking-wide">Loot Pool</span>
        <button onClick={addItem} className="text-xs text-[#d4a574] hover:underline">+ Add Item</button>
      </div>
      {items.length === 0 && <p className="text-xs text-[#666] py-1">No loot yet.</p>}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={item.id ?? i} className="bg-[#161310] rounded p-2 flex gap-2">
            <div className="flex-1 space-y-1.5">
              <input
                className={inp + ' py-1.5 text-sm font-medium'}
                value={item.name}
                onChange={e => updateItem(i, 'name', e.target.value)}
                placeholder="Item name..."
              />
              <MarkdownField
                value={item.description}
                onChange={v => updateItem(i, 'description', v)}
                placeholder="Description, mechanics..."
              />
            </div>
            <button onClick={() => removeItem(i)} className="text-[#b24545] hover:text-[#922b2b] px-1 text-sm self-start">×</button>
          </div>
        ))}
      </div>
    </div>
  )
}
