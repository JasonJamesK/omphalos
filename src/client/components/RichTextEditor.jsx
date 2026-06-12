import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

const btnCls = (active) =>
  `px-2 py-1 text-xs rounded transition-colors ${
    active
      ? 'bg-[#d4a574] text-[#1a1a1a]'
      : 'bg-[#3d3d3d] text-[#f0f0f0] hover:bg-[#4d4d4d]'
  }`

export default function RichTextEditor({ content, onChange, placeholder = 'Start writing your session log...' }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content: content || `<p data-placeholder="${placeholder}"></p>`,
    onUpdate({ editor }) {
      onChange?.(editor.getJSON())
    },
  })

  if (!editor) return null

  return (
    <div className="tiptap-editor border border-[#3d3d3d] rounded-lg overflow-hidden bg-[#1a1a1a]">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-[#3d3d3d] bg-[#2d2d2d]">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnCls(editor.isActive('bold'))}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnCls(editor.isActive('italic'))}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <div className="w-px bg-[#3d3d3d] mx-1" />
        {[1, 2, 3].map(level => (
          <button
            key={level}
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
            className={btnCls(editor.isActive('heading', { level }))}
          >
            H{level}
          </button>
        ))}
        <div className="w-px bg-[#3d3d3d] mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnCls(editor.isActive('bulletList'))}
          title="Bullet list"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnCls(editor.isActive('orderedList'))}
          title="Ordered list"
        >
          1. List
        </button>
        <div className="w-px bg-[#3d3d3d] mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="px-2 py-1 text-xs rounded bg-[#3d3d3d] text-[#f0f0f0] hover:bg-[#4d4d4d] disabled:opacity-30 transition-colors"
        >
          ↩
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="px-2 py-1 text-xs rounded bg-[#3d3d3d] text-[#f0f0f0] hover:bg-[#4d4d4d] disabled:opacity-30 transition-colors"
        >
          ↪
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
