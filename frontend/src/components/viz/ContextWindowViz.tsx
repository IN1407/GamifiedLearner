import { useState } from 'react'
import { contextBudget, type BudgetSegment } from './vizMath'

/**
 * Context-window budget meter: a fixed token capacity filled by the system
 * prompt, conversation history, and retrieved context — with whatever's left
 * being the model's response headroom. Push the sliders past the window and the
 * bar overflows, illustrating why more retrieval isn't always better.
 */
const SEG_META = [
  { key: 'system', label: 'System prompt', color: '#2a78d6', min: 0, max: 4000 },
  { key: 'history', label: 'Chat history', color: '#7c5cff', min: 0, max: 16000 },
  { key: 'retrieved', label: 'Retrieved context', color: '#20a5a0', min: 0, max: 32000 },
] as const

const CAPACITIES = [4000, 8000, 32000, 128000]

export default function ContextWindowViz() {
  const [capacity, setCapacity] = useState(8000)
  const [tokens, setTokens] = useState<Record<string, number>>({ system: 400, history: 1800, retrieved: 3200 })

  const segments: BudgetSegment[] = SEG_META.map((s) => ({ label: s.label, tokens: tokens[s.key] }))
  const budget = contextBudget(segments, capacity)
  const scale = budget.fits ? 1 : budget.capacity / Math.max(budget.used, 1)

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm font-semibold text-slate-100">Context-window budget</p>
      <p className="mb-3 text-xs text-slate-400">
        Every request shares one fixed token budget. What the prompt fills, the response can't use — and once
        it's full, the oldest or least-relevant tokens have to be dropped.
      </p>

      <label className="mb-3 block text-xs text-slate-400">
        Model context window
        <select
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
          className="ml-2 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
        >
          {CAPACITIES.map((c) => (
            <option key={c} value={c}>
              {c.toLocaleString()} tokens
            </option>
          ))}
        </select>
      </label>

      {/* The budget bar. Slices are scaled to the window; overflow is shown in red. */}
      <div
        className="flex h-7 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-800"
        role="img"
        aria-label={
          budget.fits
            ? `Prompt uses ${budget.used.toLocaleString()} of ${budget.capacity.toLocaleString()} tokens; ${budget.headroom.toLocaleString()} left for the response.`
            : `Prompt overflows the window by ${budget.overflow.toLocaleString()} tokens.`
        }
      >
        {SEG_META.map((s) => (
          <div
            key={s.key}
            className="h-full transition-[width] duration-150"
            style={{ width: `${budget.slices.find((x) => x.label === s.label)!.pct * 100 * scale}%`, backgroundColor: s.color }}
            title={`${s.label}: ${tokens[s.key].toLocaleString()} tokens`}
          />
        ))}
        {budget.fits && (
          <div
            className="h-full flex-1 bg-slate-800"
            style={{ width: `${(budget.headroom / budget.capacity) * 100}%` }}
            title={`Response headroom: ${budget.headroom.toLocaleString()} tokens`}
          />
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap gap-3">
          {SEG_META.map((s) => (
            <span key={s.key} className="flex items-center gap-1 text-slate-400">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
              {s.label}
            </span>
          ))}
        </div>
        {budget.fits ? (
          <span className="font-mono text-emerald-400">{budget.headroom.toLocaleString()} tokens free for the reply</span>
        ) : (
          <span className="font-mono font-semibold text-rose-400">
            Over by {budget.overflow.toLocaleString()} — context will be truncated
          </span>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {SEG_META.map((s) => (
          <label key={s.key} className="grid grid-cols-[120px_1fr_64px] items-center gap-3 text-xs text-slate-400">
            <span>{s.label}</span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={100}
              value={tokens[s.key]}
              onChange={(e) => setTokens((prev) => ({ ...prev, [s.key]: Number(e.target.value) }))}
              className="w-full"
              style={{ accentColor: s.color }}
              aria-label={`${s.label} tokens`}
            />
            <span className="text-right font-mono text-slate-200">{tokens[s.key].toLocaleString()}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
