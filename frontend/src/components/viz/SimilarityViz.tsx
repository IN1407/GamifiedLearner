import { useState } from 'react'
import { cosineSim } from './vizMath'

// Hand-placed 2D "embeddings" so related words point in similar directions.
// Illustrative only — real embeddings live in hundreds of dimensions.
const WORDS: Record<string, [number, number]> = {
  cat: [0.9, 0.2],
  kitten: [0.85, 0.32],
  dog: [0.8, 0.35],
  puppy: [0.75, 0.45],
  stock: [0.15, 0.95],
  bond: [0.25, 0.9],
  bank: [0.35, 0.8],
}
const NAMES = Object.keys(WORDS)

/** Pick two words and see the cosine similarity of their (toy) vectors, plus
 * the angle between them. Nearby meaning → smaller angle → similarity near 1. */
export default function SimilarityViz() {
  const [a, setA] = useState('cat')
  const [b, setB] = useState('kitten')
  const va = WORDS[a]
  const vb = WORDS[b]
  const sim = cosineSim(va, vb)
  const angle = (Math.acos(Math.max(-1, Math.min(1, sim))) * 180) / Math.PI

  // SVG geometry (origin bottom-left)
  const S = 200
  const pad = 16
  const toXY = (v: [number, number]) => [pad + v[0] * (S - 2 * pad), S - pad - v[1] * (S - 2 * pad)]
  const [ax, ay] = toXY(va)
  const [bx, by] = toXY(vb)
  const [ox, oy] = [pad, S - pad]

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm font-semibold text-slate-100">Vector similarity</p>
      <p className="mb-3 text-xs text-slate-400">
        Embeddings turn words into vectors; <strong>cosine similarity</strong> measures the angle
        between them. This is exactly how retrieval finds relevant chunks.
      </p>
      <div className="flex flex-wrap items-start gap-4">
        <svg viewBox={`0 0 ${S} ${S}`} width={S} height={S} className="shrink-0" role="img" aria-label="Two word vectors from the origin">
          <line x1={ox} y1={oy} x2={ox} y2={pad} stroke="#334155" strokeWidth="1" />
          <line x1={ox} y1={oy} x2={S - pad} y2={oy} stroke="#334155" strokeWidth="1" />
          <line x1={ox} y1={oy} x2={ax} y2={ay} stroke="#3987e5" strokeWidth="2.5" />
          <line x1={ox} y1={oy} x2={bx} y2={by} stroke="#ec4899" strokeWidth="2.5" />
          <circle cx={ax} cy={ay} r="4" fill="#3987e5" />
          <circle cx={bx} cy={by} r="4" fill="#ec4899" />
          <text x={ax + 4} y={ay - 4} fontSize="11" fill="#93c5fd">{a}</text>
          <text x={bx + 4} y={by - 4} fontSize="11" fill="#f9a8d4">{b}</text>
        </svg>

        <div className="min-w-[9rem] flex-1">
          <label className="block text-xs text-slate-400">
            Word A
            <select
              value={a}
              onChange={(e) => setA(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/50 px-2 py-1 text-sm text-slate-100"
            >
              {NAMES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="mt-2 block text-xs text-slate-400">
            Word B
            <select
              value={b}
              onChange={(e) => setB(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/50 px-2 py-1 text-sm text-slate-100"
            >
              {NAMES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-800/60 p-3 text-center" aria-live="polite">
            <p className="text-2xl font-extrabold text-slate-100">{sim.toFixed(3)}</p>
            <p className="text-[11px] tracking-wide text-slate-400 uppercase">cosine similarity</p>
            <p className="mt-1 text-xs text-slate-400">≈ {angle.toFixed(0)}° apart</p>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Try <code className="rounded bg-slate-800 px-1">cat</code> vs{' '}
        <code className="rounded bg-slate-800 px-1">kitten</code> (close) versus{' '}
        <code className="rounded bg-slate-800 px-1">cat</code> vs{' '}
        <code className="rounded bg-slate-800 px-1">stock</code> (far).
      </p>
    </div>
  )
}
