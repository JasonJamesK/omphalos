import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

export default function MarkdownPreview({ value, className = '', emptyText = 'Nothing written yet.' }) {
  if (!value) {
    return (
      <div className={`markdown-preview ${className}`}>
        <p className="markdown-preview-empty">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className={`markdown-preview ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {value}
      </ReactMarkdown>
    </div>
  )
}
