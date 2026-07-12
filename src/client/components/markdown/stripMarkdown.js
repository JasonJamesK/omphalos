import { remark } from 'remark'
import stripMarkdownPlugin from 'strip-markdown'

export function stripMarkdown(source) {
  if (!source) return ''
  return remark().use(stripMarkdownPlugin).processSync(source).toString().trim()
}
