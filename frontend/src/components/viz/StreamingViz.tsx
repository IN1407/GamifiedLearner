import { useEffect, useMemo, useRef, useState } from 'react'
import { joinTokens, tokenizeApprox } from './vizMath'

/**
 * Streaming generation simulator: an LLM reply arrives token-by-token rather
 * than all at once. Play it, pause it, or cancel mid-stream — cancelling keeps
 * the text generated so far and marks it "interrupted", mirroring how a real
 * streaming client preserves partial output when the user aborts a request.
 */
const SAMPLE =
  'Streaming sends each token the moment the model produces it, so the reader sees words appear one at a time instead of waiting for the whole reply.'

type Phase = 'idle' | 'streaming' | 'paused' | 'done' | 'cancelled'

export default function StreamingViz() {
  const tokens = useMemo(() => tokenizeApprox(SAMPLE), [])
  const [count, setCount] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (phase !== 'streaming') return
    timer.current = setInterval(() => {
      setCount((c) => Math.min(c + 1, tokens.length))
    }, 90)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [phase, tokens.length])

  // Finish once the last token has streamed (kept out of the setCount updater so
  // we never call setState from inside another state updater).
  useEffect(() => {
    if (phase === 'streaming' && count >= tokens.length) setPhase('done')
  }, [phase, count, tokens.length])

  const start = () => {
    setCount(0)
    setPhase('streaming')
  }
  const pause = () => setPhase('paused')
  const resume = () => setPhase('streaming')
  const cancel = () => setPhase('cancelled') // count is left where it stopped: partial output preserved

  const text = joinTokens(tokens, count)
  const running = phase === 'streaming' || phase === 'paused'
  const interrupted = phase === 'cancelled'

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm font-semibold text-slate-100">Streaming generation</p>
      <p className="mb-3 text-xs text-slate-400">
        Tokens stream in as the model decodes them. Cancel partway and the text already received stays put —
        a real client never throws away what it has already streamed.
      </p>

      <div
        className="min-h-[5.5rem] rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-sm text-slate-100"
        aria-live="polite"
        aria-label="Streamed output"
      >
        {text}
        {phase === 'streaming' && <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-indigo-400 align-middle" aria-hidden />}
        {phase === 'idle' && <span className="text-slate-500">Press play to start streaming…</span>}
        {interrupted && <span className="ml-2 rounded bg-rose-500/20 px-1.5 py-0.5 text-xs text-rose-300">generation interrupted</span>}
        {phase === 'done' && <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-300">complete</span>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!running ? (
          <button
            onClick={start}
            className="rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400"
          >
            {phase === 'idle' ? '▶ Play' : '↻ Replay'}
          </button>
        ) : phase === 'streaming' ? (
          <button onClick={pause} className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-600">
            ⏸ Pause
          </button>
        ) : (
          <button onClick={resume} className="rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400">
            ▶ Resume
          </button>
        )}
        <button
          onClick={cancel}
          disabled={!running}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
        >
          ✕ Cancel
        </button>
        <span className="ml-auto font-mono text-xs text-slate-500">
          {count}/{tokens.length} tokens
        </span>
      </div>
    </div>
  )
}
