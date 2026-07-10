const DICE = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']

const inp = 'w-full bg-[#161310] border border-[#332922] rounded px-2 py-1.5 text-[#f0f0f0] text-xs focus:outline-none focus:border-[#d4a574]'

export default function RandomTableBlock({ block, onChange }) {
  const columns = block.columns || ['Result']
  const rows = block.rows || []

  const addColumn = () => onChange({ ...block, columns: [...columns, `Column ${columns.length + 1}`], rows: rows.map(r => [...r, '']) })
  const updateColumn = (i, v) => { const arr = [...columns]; arr[i] = v; onChange({ ...block, columns: arr }) }
  const removeColumn = i => onChange({ ...block, columns: columns.filter((_, j) => j !== i), rows: rows.map(r => r.filter((_, j) => j !== i)) })

  const addRow = () => onChange({ ...block, rows: [...rows, columns.map(() => '')] })
  const updateCell = (r, c, v) => { const arr = rows.map(row => [...row]); arr[r][c] = v; onChange({ ...block, rows: arr }) }
  const removeRow = r => onChange({ ...block, rows: rows.filter((_, j) => j !== r) })

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <select
          className={inp + ' w-20 flex-shrink-0'}
          value={block.die || 'd4'}
          onChange={e => onChange({ ...block, die: e.target.value })}
        >
          {DICE.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
        </select>
        <input
          className={inp + ' flex-1 text-sm py-1.5'}
          value={block.title || ''}
          onChange={e => onChange({ ...block, title: e.target.value })}
          placeholder="Table title..."
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[#666] font-normal pb-1 w-10">{(block.die || 'd4').toUpperCase()}</th>
              {columns.map((col, ci) => (
                <th key={ci} className="pb-1 px-1">
                  <div className="flex items-center gap-1">
                    <input className={inp + ' py-1 font-semibold'} value={col} onChange={e => updateColumn(ci, e.target.value)} />
                    {columns.length > 1 && (
                      <button onClick={() => removeColumn(ci)} className="text-[#b24545] hover:text-[#922b2b] flex-shrink-0">×</button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-14">
                <button onClick={addColumn} className="text-[#d4a574] hover:underline text-xs">+ Col</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                <td className="text-[#d4a574] font-mono text-center pr-2 pt-1">{ri + 1}</td>
                {columns.map((_, ci) => (
                  <td key={ci} className="px-1 pt-1">
                    <textarea
                      className={inp + ' resize-none'}
                      rows={2}
                      value={row[ci] || ''}
                      onChange={e => updateCell(ri, ci, e.target.value)}
                    />
                  </td>
                ))}
                <td className="pt-1 text-center">
                  <button onClick={() => removeRow(ri)} className="text-[#b24545] hover:text-[#922b2b] text-xs">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addRow} className="mt-2 text-xs text-[#d4a574] hover:underline">+ Add Row</button>
    </div>
  )
}
