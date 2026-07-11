import { useMemo, useState } from 'react'

/**
 * Gradient-descent playground on a 1-D non-convex loss:
 *   f(x) = 0.05x⁴ − 0.7x² + 0.35x + 4
 * Two entities, two fixed categorical slots (validated pair):
 * loss curve = blue #2a78d6, descent trajectory = orange #eb6834.
 */
const f = (x: number) => 0.05 * x ** 4 - 0.7 * x ** 2 + 0.35 * x + 4
const df = (x: number) => 0.2 * x ** 3 - 1.4 * x + 0.35

const X_MIN = -4.6
const X_MAX = 4.6
const W = 560
const H = 300
const PAD = { l: 40, r: 16, t: 14, b: 28 }

export default function GradientDescentViz() {
  const [lr, setLr] = useState(0.12)
  const [start, setStart] = useState(3.8)
  const [steps, setSteps] = useState(0)

  const path = useMemo(() => {
    const pts = [start]
    let x = start
    for (let i = 0; i < steps; i++) {
      x = x - lr * df(x)
      x = Math.max(X_MIN, Math.min(X_MAX, x))
      pts.push(x)
    }
    return pts
  }, [lr, start, steps])

  const ys = useMemo(() => {
    const samples: number[] = []
    for (let i = 0; i <= 200; i++) samples.push(f(X_MIN + ((X_MAX - X_MIN) * i) / 200))
    return samples
  }, [])
  const yMin = Math.min(...ys) - 0.5
  const yMax = Math.max(...ys.slice(20, 180)) + 1.5

  const sx = (x: number) => PAD.l + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - PAD.l - PAD.r)
  const sy = (y: number) => PAD.t + (1 - (y - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b)

  const curve = useMemo(() => {
    let d = ''
    for (let i = 0; i <= 200; i++) {
      const x = X_MIN + ((X_MAX - X_MIN) * i) / 200
      const y = Math.min(f(x), yMax)
      d += `${i === 0 ? 'M' : 'L'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`
    }
    return d
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yMax, yMin])

  const current = path[path.length - 1]
  const diverging = steps > 0 && Math.abs(current) >= X_MAX - 0.01

  const reset = () => setSteps(0)

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm font-semibold text-slate-100">Gradient descent playground</p>
      <p className="mb-2 text-xs text-slate-400">
        x ← x − η·f′(x) on a non-convex loss. Watch the learning rate change everything.
      </p>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400" aria-hidden>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-[#2a78d6]" /> loss f(x)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#eb6834]" /> descent steps
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[560px]" role="img" aria-label="Loss curve with gradient descent trajectory">
          {/* recessive grid */}
          {[0, 2, 4, 6, 8].map((y) => (
            <line key={y} x1={PAD.l} x2={W - PAD.r} y1={sy(y)} y2={sy(y)} stroke="#1e293b" strokeWidth="1" />
          ))}
          <line x1={PAD.l} x2={W - PAD.r} y1={sy(yMin)} y2={sy(yMin)} stroke="#334155" strokeWidth="1" />
          {[-4, -2, 0, 2, 4].map((x) => (
            <text key={x} x={sx(x)} y={H - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">
              {x}
            </text>
          ))}
          {[0, 2, 4, 6, 8].map((y) => (
            <text key={y} x={PAD.l - 6} y={sy(y) + 3} textAnchor="end" fontSize="10" fill="#94a3b8">
              {y}
            </text>
          ))}
          <path d={curve} fill="none" stroke="#2a78d6" strokeWidth="2" />
          {/* trajectory: connecting segments then dots; white ring separates overlaps */}
          {path.map((x, i) =>
            i === 0 ? null : (
              <line
                key={`seg-${i}`}
                x1={sx(path[i - 1])}
                y1={sy(Math.min(f(path[i - 1]), yMax))}
                x2={sx(x)}
                y2={sy(Math.min(f(x), yMax))}
                stroke="#eb6834"
                strokeWidth="1.5"
                opacity="0.55"
              />
            ),
          )}
          {path.map((x, i) => (
            <circle
              key={`pt-${i}`}
              cx={sx(x)}
              cy={sy(Math.min(f(x), yMax))}
              r={i === path.length - 1 ? 6 : 4}
              fill="#eb6834"
              stroke="#0f172a"
              strokeWidth="2"
            >
              <title>{`step ${i}: x=${x.toFixed(3)}, f(x)=${f(x).toFixed(3)}, f′(x)=${df(x).toFixed(3)}`}</title>
            </circle>
          ))}
        </svg>
      </div>

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-400">
          Learning rate η = <span className="font-mono font-semibold text-slate-100">{lr.toFixed(2)}</span>
          <input
            type="range"
            min="0.01"
            max="1.2"
            step="0.01"
            value={lr}
            onChange={(e) => {
              setLr(Number(e.target.value))
              reset()
            }}
            className="mt-1 w-full accent-[#2a78d6]"
          />
        </label>
        <label className="text-xs text-slate-400">
          Start x₀ = <span className="font-mono font-semibold text-slate-100">{start.toFixed(1)}</span>
          <input
            type="range"
            min={X_MIN + 0.4}
            max={X_MAX - 0.4}
            step="0.1"
            value={start}
            onChange={(e) => {
              setStart(Number(e.target.value))
              reset()
            }}
            className="mt-1 w-full accent-[#2a78d6]"
          />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSteps((s) => Math.min(s + 1, 60))}
          className="rounded-lg bg-[#2a78d6] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Step
        </button>
        <button
          onClick={() => setSteps((s) => Math.min(s + 10, 60))}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800/60"
        >
          +10 steps
        </button>
        <button onClick={reset} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800/60">
          Reset
        </button>
        <span className="text-xs text-slate-400" aria-live="polite">
          step {steps} · x = {current.toFixed(3)} · f(x) = {f(current).toFixed(3)}
          {diverging && <strong className="ml-1 text-red-400">diverged — η too high!</strong>}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Try: η=0.05 from x₀=3.8 (converges to the <em>local</em> minimum on the right), η=0.4 (jumps the
        hump into the global minimum), η=1.1 (oscillates/diverges). This is the whole art of learning-rate tuning.
      </p>
    </div>
  )
}
