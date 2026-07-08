import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { PromptExercise } from '../content/types'
import { aiGrade, type GradeResult } from '../lib/api'
import { useStore } from '../state/useStore'
import Markdown from './Markdown'
import ErrorBanner from './ErrorBanner'
import GradeCard from './GradeCard'

/**
 * Free-text exercise graded by the connected AI against a fixed rubric.
 * Used for all Course 2 checkpoints (no multiple choice there) and select
 * Course 1 exercises. XP: full at score ≥ 75, 60% at ≥ 50, 30% below that.
 * Resubmission allowed; best XP sticks.
 */
export default function PromptExerciseBlock({
  exercise,
  onXpChange,
  onCompleteChange,
}: {
  exercise: PromptExercise
  onXpChange: (xp: number) => void
  onCompleteChange: (complete: boolean) => void
}) {
  const aiConfig = useStore((s) => s.aiConfig)
  const [text, setText] = useState('')
  const [grading, setGrading] = useState(false)
  const [grade, setGrade] = useState<GradeResult | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [bestXp, setBestXp] = useState(0)
  const [emptyWarning, setEmptyWarning] = useState(false)

  const maxXp = 25 * exercise.difficulty

  const submit = async () => {
    if (!aiConfig) return
    if (!text.trim()) {
      setEmptyWarning(true)
      return
    }
    setEmptyWarning(false)
    setGrading(true)
    setError(null)
    try {
      const g = await aiGrade(aiConfig, {
        task: exercise.instructions,
        rubric: exercise.rubric,
        submission: text,
        kind: 'prompt',
      })
      setGrade(g)
      const score = g.score ?? 0
      const earned =
        g.raw !== ''
          ? Math.round(maxXp * 0.6) // unparseable AI response: give benefit of the doubt, mid XP
          : score >= 75
            ? maxXp
            : score >= 50
              ? Math.round(maxXp * 0.6)
              : Math.round(maxXp * 0.3)
      if (earned > bestXp) {
        setBestXp(earned)
        onXpChange(earned)
      }
      onCompleteChange(true)
    } catch (e) {
      setError(e)
    } finally {
      setGrading(false)
    }
  }

  return (
    <section
      aria-label={`Exercise: ${exercise.title}`}
      className="my-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h3 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
        <span aria-hidden>🎯</span> {exercise.title}
        {grade && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">Graded</span>}
      </h3>
      <p className="mb-3 text-xs text-slate-400">
        Free-text exercise · up to {maxXp} XP · graded by your connected AI against a fixed rubric
      </p>
      <Markdown md={exercise.instructions} />

      <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        <summary className="cursor-pointer font-semibold text-slate-600">
          Grading rubric (shown up front — no surprises)
        </summary>
        <div className="mt-2">
          <Markdown md={exercise.rubric} />
        </div>
      </details>

      {!aiConfig ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          This exercise needs an AI grader.{' '}
          <Link to="/settings" className="font-medium underline">
            Connect a provider in Settings
          </Link>{' '}
          (Ollama is free and local, or pick Demo mode to preview).
        </p>
      ) : (
        <>
          <label className="sr-only" htmlFor={`pe-${exercise.id}`}>
            Your submission for {exercise.title}
          </label>
          <textarea
            id={`pe-${exercise.id}`}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setEmptyWarning(false)
            }}
            rows={7}
            placeholder={exercise.placeholder ?? 'Write your answer here…'}
            className="mt-4 w-full rounded-xl border border-slate-300 p-3 text-sm leading-6 focus:border-indigo-400"
          />
          {emptyWarning && (
            <p role="alert" className="mt-1 text-sm text-rose-600">
              Your submission is empty — write your answer before submitting.
            </p>
          )}
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={submit}
              disabled={grading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {grading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-300 border-t-white" />
                  Grading…
                </>
              ) : grade ? (
                'Resubmit (best XP is kept)'
              ) : (
                'Submit for grading'
              )}
            </button>
            {bestXp > 0 && <span className="text-sm font-medium text-emerald-700">+{bestXp} XP earned</span>}
          </div>
        </>
      )}

      <ErrorBanner error={error} onRetry={submit} onDismiss={() => setError(null)} />
      <div aria-live="polite">{grade && <GradeCard grade={grade} />}</div>
    </section>
  )
}
