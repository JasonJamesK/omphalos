const inp = 'w-full bg-[#161310] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574] resize-none'

export default function NotesBlock({ block, onChange }) {
  return (
    <textarea
      className={inp}
      rows={3}
      value={block.body || ''}
      onChange={e => onChange({ ...block, body: e.target.value })}
      placeholder="DM notes, mechanics, reminders..."
    />
  )
}
