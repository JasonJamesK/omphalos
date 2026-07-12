import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import stripMarkdownPlugin from 'strip-markdown'

export function stripMarkdown(source) {
  if (!source) return ''
  return unified().use(remarkParse).use(stripMarkdownPlugin).use(remarkStringify).processSync(source).toString().trim()
}
