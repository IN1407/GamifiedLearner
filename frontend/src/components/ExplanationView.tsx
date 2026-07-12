import { useState } from 'react'
import type { AIConfig, ExplanationHistory } from '../lib/db'
import { aiReviseExplanation } from '../lib/api'
import {
  appendVersion,
  currentIndex,
  currentVersion,
  navigate,
  orderedVersions,
} from '../lib/explanationHistory'
import Markdown from './Markdown'
import ErrorBanner from './ErrorBanner'

const SUGGESTIONS = ['Make it simpler', 'Use an analogy', 'Explain with code', 'Give another example', 'Less notation']

/**
 * Renders one explanation with a "Change explanation" control and version
 * history. Controlled: it never persists directly — every successful change
 * calls onChange with a NEW history object (the parent persists it), so a
 * failed generation leaves the existing versions untouched.
 */
export default function ExplanationView({
  history,
  onChange,
  aiConfig,
  lessonContext,
}: {
  history: ExplanationHistory
  onChange: (h: ExplanationHistory) => void
  aiConfig: AIConfig
  lessonContext: string
}) {
  const [open, setOpen] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [revising, setRevising] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const cur = currentVersion(history)
  const ordered = orderedVersions(history)
  const idx = currentIndex(history)

  const revise = async (raw: string) => {
    const instr = raw.trim()
    if (!instr || revising) return
    setRevising(true)
    setError(null)
    try {
      const revised = await aiReviseExplanation(aiConfig, {
        original: cur.text,
        instruction: instr,
        lessonContext,
      })
      onChange(appendVersion(history, instr, revised))
      setInstruction('')
      setOpen(false)
    } catch (e) {
      setError(e)
    } finally {
      setRevising(false)
    }
  }

  return (
    <div className="mt-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-indigo-400 uppercase">
          AI tutor{cur.request ? ' · revised' : ''}
        </p>
        {ordered.length > 1 && (
          <div className="flex items-center gap-1 text-xs text-slate-300">
            <button
              aria-label="Previous version"
              disabled={idx === 0}
              onClick={() => onChange(navigate(history, -1))}
              className="rounded px-1.5 py-0.5 hover:bg-white/10 disabled:opacity-40"
            >
              ‹
            </button>
            <span aria-live="polite">
              v{cur.versionNumber} · {idx + 1}/{ordered.length}
            </span>
            <button
              aria-label="Next version"
              disabled={idx === ordered.length - 1}
              onClick={() => onChange(navigate(history, 1))}
              className="rounded px-1.5 py-0.5 hover:bg-white/10 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        )}
      </div>
      {cur.request && <p className="mb-2 text-xs text-slate-400 italic">Your request: “{cur.request}”</p>}
      <Markdown md={cur.text} />

      <ErrorBanner error={error} onRetry={() => revise(instruction)} onDismiss={() => setError(null)} />

      <div className="mt-3 border-t border-white/10 pt-3">
        {!open ? (
          <button onClick={() => setOpen(true)} className="text-sm font-medium text-indigo-300 hover:underline">
            ✏️ Change explanation
          </button>
        ) : (
          <div>
            <label className="sr-only" htmlFor={`revise-${history.siteId}`}>
              How should the explanation change?
            </label>
            <div className="flex gap-2">
              <input
                id={`revise-${history.siteId}`}
                value={instruction}
                disabled={revising}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void revise(instruction)
                  }
                }}
                placeholder="e.g. explain it with a real-world analogy"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400"
              />
              <button
                onClick={() => revise(instruction)}
                disabled={revising || !instruction.trim()}
                className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {revising ? 'Revising…' : 'Revise'}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  disabled={revising}
                  onClick={() => revise(s)}
                  className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
