import { useState } from 'react'

/**
 * Local vs hosted inference: toggle between running a model on your own machine
 * and calling a hosted API, and watch the request path and its trade-offs
 * change. No live calls — a conceptual diagram that pairs with the provider
 * course's "local vs hosted" lesson.
 */
type Mode = 'local' | 'hosted'

const PROFILES: Record<Mode, { path: string[]; notes: { label: string; value: string; tone: 'good' | 'bad' | 'mixed' }[] }> = {
  local: {
    path: ['Your app', 'Local runtime (Ollama / llama.cpp)', 'Your CPU / GPU'],
    notes: [
      { label: 'Privacy', value: 'Data never leaves your machine', tone: 'good' },
      { label: 'Cost', value: 'Free after download — no per-token billing', tone: 'good' },
      { label: 'Latency', value: 'Depends on your hardware; no network hop', tone: 'mixed' },
      { label: 'Hardware', value: 'Needs local RAM/VRAM; big models may not fit', tone: 'bad' },
    ],
  },
  hosted: {
    path: ['Your app', 'HTTPS request', 'Provider API', 'Datacenter GPU'],
    notes: [
      { label: 'Privacy', value: 'Prompt is sent to a third party', tone: 'bad' },
      { label: 'Cost', value: 'Pay per token; free tiers are rate-limited', tone: 'mixed' },
      { label: 'Latency', value: 'Fast big-model inference, plus a network round-trip', tone: 'mixed' },
      { label: 'Hardware', value: 'None — the provider runs the GPUs', tone: 'good' },
    ],
  },
}

const TONE: Record<'good' | 'bad' | 'mixed', string> = {
  good: 'text-emerald-400',
  bad: 'text-rose-400',
  mixed: 'text-amber-400',
}

export default function InferencePathViz() {
  const [mode, setMode] = useState<Mode>('hosted')
  const profile = PROFILES[mode]

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm font-semibold text-slate-100">Local vs hosted inference</p>
      <p className="mb-3 text-xs text-slate-400">
        The same chat request takes a very different path — and makes very different trade-offs — depending on
        where the model actually runs.
      </p>

      <div className="mb-4 inline-flex rounded-lg border border-slate-700 bg-slate-800 p-0.5" role="radiogroup" aria-label="Inference location">
        {(['hosted', 'local'] as const).map((m) => (
          <button
            key={m}
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition ${
              mode === m ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Request path */}
      <div className="flex flex-wrap items-center gap-2" aria-label={`Request path: ${profile.path.join(' then ')}`}>
        {profile.path.map((node, i) => (
          <span key={node} className="flex items-center gap-2">
            <span className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-100">{node}</span>
            {i < profile.path.length - 1 && <span className="text-slate-500" aria-hidden>→</span>}
          </span>
        ))}
      </div>

      {/* Trade-offs */}
      <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {profile.notes.map((n) => (
          <div key={n.label} className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
            <dt className="text-xs font-semibold text-slate-400">{n.label}</dt>
            <dd className={`text-xs ${TONE[n.tone]}`}>{n.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
