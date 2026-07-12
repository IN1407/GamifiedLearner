import { useMemo, useState } from 'react'
import { tokenizeApprox } from './vizMath'

const SAMPLE = 'Retrieval-augmented generation grounds the model in your documents.'
const COLORS = ['#3987e5', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4']

/** Type text and watch it split into tokens — feel why token count ≠ character
 * count. Uses a deterministic approximate tokenizer (not a real vocabulary). */
export default function TokenizerViz() {
  const [text, setText] = useState(SAMPLE)
  const tokens = useMemo(() => tokenizeApprox(text), [text])

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm font-semibold text-slate-100">Tokenizer explorer</p>
      <p className="mb-3 text-xs text-slate-400">
        Models read <em>tokens</em>, not characters. Edit the text and watch it split.
      </p>
      <label className="sr-only" htmlFor="tok-input">
        Text to tokenize
      </label>
      <textarea
        id="tok-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-100 focus:border-indigo-400"
      />
      <div className="mt-3 flex flex-wrap gap-1" aria-label={`${tokens.length} tokens`}>
        {tokens.map((t, i) => (
          <span
            key={i}
            className="rounded px-1.5 py-0.5 font-mono text-xs text-white"
            style={{ backgroundColor: COLORS[i % COLORS.length] }}
          >
            {t === ' ' ? '␣' : t.replace(/\s/g, '␣')}
          </span>
        ))}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Characters" value={text.length} />
        <Stat label="Tokens" value={tokens.length} />
        <Stat label="Chars / token" value={tokens.length ? (text.length / tokens.length).toFixed(1) : '0'} />
      </dl>
      <p className="mt-2 text-xs text-slate-500">
        Rule of thumb for English: ~4 characters per token. Long or rare words split into
        multiple subword tokens — that's why they "cost" more context.
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-800/60 p-2">
      <dd className="text-lg font-extrabold text-slate-100">{value}</dd>
      <dt className="text-[11px] tracking-wide text-slate-400 uppercase">{label}</dt>
    </div>
  )
}
