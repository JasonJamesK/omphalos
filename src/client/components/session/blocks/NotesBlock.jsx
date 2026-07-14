import MarkdownField from '../../markdown/MarkdownField'

export default function NotesBlock({ block, onChange }) {
  return (
    <MarkdownField
      value={block.body}
      onChange={v => onChange({ ...block, body: v })}
      placeholder="DM notes, mechanics, reminders..."
    />
  )
}
