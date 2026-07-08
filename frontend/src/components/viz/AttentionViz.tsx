import { useMemo, useState } from 'react'

/**
 * Interactive scaled dot-product attention explorer.
 * Weights are computed live: softmax(q·kᵀ / √d) over fixed, deterministic
 * token embeddings — toggling the √d scaling shows why it exists.
 * Sequential blue ramp (validated palette) encodes weight magnitude.
 */
const TOKENS = ['The', 'robot', 'read', 'the', 'manual', 'carefully']
const D = 8

// Deterministic pseudo-embeddings (sin/cos lattice — stable across renders).
function embedding(tokenIndex: number): number[] {
  return Array.from({ length: D }, (_, j) => Math.sin((tokenIndex + 1) * (j + 1) * 0.7) + Math.cos((tokenIndex + 2) * (j + 1) * 0.3))
}

function softmax(xs: number[]): number[] {
  const m = Math.max(...xs)
  const exps = xs.map((x) => Math.exp(x - m))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

// Sequential ramp steps 100→700 (light mode), lightest = near-zero weight.
const RAMP = ['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#104281']
const rampColor = (w: number) => RAMP[Math.min(RAMP.length - 1, Math.floor(w * RAMP.length))]

export default function AttentionViz() {
  const [queryIdx, setQueryIdx] = useState(2)
  const [scaled, setScaled] = useState(true)

  const { weights, rawScores } = useMemo(() => {
    const embs = TOKENS.map((_, i) => embedding(i))
    const q = embs[queryIdx]
    const scores = embs.map((k) => {
      const dot = q.reduce((s, qi, j) => s + qi * k[j], 0)
      return scaled ? dot / Math.sqrt(D) : dot
    })
    return { weights: softmax(scores), rawScores: scores }
  }, [queryIdx, scaled])

  const cell = 56
  const width = TOKENS.length * cell

  return (
    <div className="rounded-2xl border border-slate-200 bg-[#fcfcfb] p-4">
      <p className="text-sm font-semibold text-[#0b0b0b]">Attention weights, live</p>
      <p className="mb-3 text-xs text-[#52514e]">
        Pick a <strong>query</strong> token; the row shows softmax(q·kᵀ{scaled ? '/√d' : ''}) over every key.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Query token">
        {TOKENS.map((t, i) => (
          <button
            key={i}
            role="radio"
            aria-checked={queryIdx === i}
            onClick={() => setQueryIdx(i)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              queryIdx === i ? 'bg-[#2a78d6] text-white' : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${cell + 46}`}
          width={width}
          height={cell + 46}
          role="img"
          aria-label={`Attention weights from query "${TOKENS[queryIdx]}" to each token`}
        >
          {TOKENS.map((t, i) => (
            <g key={i}>
              <rect
                x={i * cell + 1}
                y={18}
                width={cell - 2}
                height={cell - 2}
                rx={6}
                fill={rampColor(weights[i])}
              >
                <title>
                  {`${TOKENS[queryIdx]} → ${t}: weight ${(weights[i] * 100).toFixed(1)}% (score ${rawScores[i].toFixed(2)})`}
                </title>
              </rect>
              <text
                x={i * cell + cell / 2}
                y={18 + cell / 2 + 4}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill={weights[i] > 0.45 ? '#ffffff' : '#0b0b0b'}
              >
                {(weights[i] * 100).toFixed(0)}%
              </text>
              <text x={i * cell + cell / 2} y={cell + 36} textAnchor="middle" fontSize="11" fill="#898781">
                {t}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-[#52514e]">
        <input type="checkbox" checked={scaled} onChange={(e) => setScaled(e.target.checked)} className="accent-[#2a78d6]" />
        Divide scores by √d (d={D}) before softmax
      </label>
      <p className="mt-2 text-xs text-[#52514e]">
        Uncheck the box: raw dot products grow with dimension, softmax saturates toward one token, and
        gradients through it vanish — that is exactly why the √d scaling term exists in
        softmax(QKᵀ/√d)V.
      </p>
    </div>
  )
}
