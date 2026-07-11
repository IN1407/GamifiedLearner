import { useMemo, useState } from 'react'

/**
 * Softmax-with-temperature explorer: drag logits, watch the probability
 * distribution respond. Single measure → single hue (blue), direct labels.
 */
const LABELS = ['cat', 'dog', 'car', 'pizza']

export default function SoftmaxViz() {
  const [logits, setLogits] = useState([2.0, 1.0, 0.2, -0.5])
  const [temp, setTemp] = useState(1.0)

  const probs = useMemo(() => {
    const scaled = logits.map((z) => z / temp)
    const m = Math.max(...scaled)
    const exps = scaled.map((z) => Math.exp(z - m))
    const sum = exps.reduce((a, b) => a + b, 0)
    return exps.map((e) => e / sum)
  }, [logits, temp])

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm font-semibold text-slate-100">Softmax = logits → probability distribution</p>
      <p className="mb-3 text-xs text-slate-400">
        softmax(z)ᵢ = e^(zᵢ/T) / Σⱼ e^(zⱼ/T). Note the outputs always sum to 1 — that's what makes it a
        probability distribution.
      </p>
      <div className="space-y-3">
        {LABELS.map((label, i) => (
          <div key={label} className="grid grid-cols-[64px_1fr_minmax(0,1.2fr)] items-center gap-3">
            <span className="text-sm font-medium text-slate-100">{label}</span>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <span className="sr-only">Logit for {label}</span>
              <input
                type="range"
                min="-4"
                max="4"
                step="0.1"
                value={logits[i]}
                onChange={(e) =>
                  setLogits((prev) => prev.map((v, j) => (j === i ? Number(e.target.value) : v)))
                }
                className="w-full accent-[#2a78d6]"
              />
              <span className="w-10 text-right font-mono">{logits[i].toFixed(1)}</span>
            </label>
            <div className="flex items-center gap-2">
              <div
                className="h-5 rounded-r-[4px] bg-[#2a78d6] transition-[width] duration-150"
                style={{ width: `${Math.max(probs[i] * 100, 0.5)}%` }}
                role="img"
                aria-label={`Probability of ${label}: ${(probs[i] * 100).toFixed(1)} percent`}
                title={`P(${label}) = ${(probs[i] * 100).toFixed(1)}%`}
              />
              <span className="font-mono text-xs text-slate-400">{(probs[i] * 100).toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
      <label className="mt-4 block text-xs text-slate-400">
        Temperature T = <span className="font-mono font-semibold text-slate-100">{temp.toFixed(2)}</span>
        <input
          type="range"
          min="0.05"
          max="3"
          step="0.05"
          value={temp}
          onChange={(e) => setTemp(Number(e.target.value))}
          className="mt-1 w-full accent-[#2a78d6]"
        />
      </label>
      <p className="mt-2 text-xs text-slate-400">
        Low T sharpens toward argmax (greedy decoding); high T flattens toward uniform (more random
        sampling). This is the same "temperature" knob you see in every LLM API.
      </p>
    </div>
  )
}
