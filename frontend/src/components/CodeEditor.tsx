import { useRef } from 'react'

/**
 * Lightweight code editor: monospace textarea with Tab-inserts-spaces and a
 * line-number gutter. (Deliberately not Monaco — keeps the bundle small and
 * works offline; exercises here are short functions, not files.)
 */
export default function CodeEditor({
  value,
  onChange,
  label,
  rows = 12,
  disabled = false,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  rows?: number
  disabled?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const lines = value.split('\n').length

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      const el = ref.current!
      const start = el.selectionStart
      const end = el.selectionEnd
      const next = value.slice(0, start) + '    ' + value.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 4
      })
    }
  }

  return (
    <div className="flex overflow-hidden rounded-xl border border-slate-700 bg-slate-900 font-mono text-[13px] leading-6">
      <div
        aria-hidden
        className="select-none border-r border-slate-700/60 bg-slate-950/50 px-2 py-3 text-right text-slate-300"
      >
        {Array.from({ length: Math.max(lines, rows) }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={ref}
        aria-label={label}
        value={value}
        rows={Math.max(lines, rows)}
        disabled={disabled}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full resize-y bg-transparent px-3 py-3 text-slate-100 outline-none disabled:opacity-60"
      />
    </div>
  )
}
