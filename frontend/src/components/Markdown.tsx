import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

/**
 * Lesson/AI markdown renderer with GFM tables + KaTeX math.
 *
 * Headings are demoted one level (`#` → h2, `##` → h3, `###` → h4) so the
 * page's lesson-title `<h1>` stays the single h1 — content authored with a
 * leading `# Title` never produces a duplicate/competing h1. Keeps one-h1-per-page
 * for screen readers while letting lesson markdown read naturally.
 */
const Markdown = memo(function Markdown({ md, className = '' }: { md: string; className?: string }) {
  return (
    <div className={`gl-prose ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: (props) => <a {...props} target="_blank" rel="noreferrer noopener" />,
          h1: ({ node: _n, ...props }) => <h2 {...props} />,
          h2: ({ node: _n, ...props }) => <h3 {...props} />,
          h3: ({ node: _n, ...props }) => <h4 {...props} />,
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  )
})

export default Markdown
