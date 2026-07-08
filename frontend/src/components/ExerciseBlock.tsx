import { useState } from 'react'
import type { CodeExercise } from '../content/types'
import { aiGrade, executeCode, type ExecuteResult } from '../lib/api'
import { useStore } from '../state/useStore'
import Markdown from './Markdown'
import CodeEditor from './CodeEditor'
import ErrorBanner from './ErrorBanner'
import GradeCard from './GradeCard'
import type { GradeResult } from '../lib/api'

/**
 * Code exercise: correctness is decided by deterministic server-side tests.
 * The connected AI is only consulted (optionally, after tests pass) for
 * qualitative style feedback — never for pass/fail.
 */
export default function ExerciseBlock({
  exercise,
  onXpChange,
  onCompleteChange,
}: {
  exercise: CodeExercise
  onXpChange: (xp: number) => void
  onCompleteChange: (complete: boolean) => void
}) {
  const aiConfig = useStore((s) => s.aiConfig)
  const [code, setCode] = useState(exercise.starterCode)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ExecuteResult | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [passed, setPassed] = useState(false)
  const [grade, setGrade] = useState<GradeResult | null>(null)
  const [grading, setGrading] = useState(false)
  const [gradeError, setGradeError] = useState<unknown>(null)

  const run = async () => {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const res = await executeCode(code, exercise.tests)
      setResult(res)
      if (res.all_passed && !passed) {
        setPassed(true)
        onXpChange(20 * exercise.difficulty)
        onCompleteChange(true)
      }
    } catch (e) {
      setError(e)
    } finally {
      setRunning(false)
    }
  }

  const askStyleFeedback = async () => {
    if (!aiConfig || !result) return
    setGrading(true)
    setGradeError(null)
    try {
      const g = await aiGrade(aiConfig, {
        task: exercise.instructions,
        rubric:
          exercise.rubric ??
          'Clarity: readable names and structure. Idiomatic Python: uses appropriate built-ins/idioms. Simplicity: no unnecessary complexity. Correctness was already verified by tests — do not judge it.',
        submission: code,
        kind: 'code',
        executionResults: JSON.stringify(result.results),
      })
      setGrade(g)
    } catch (e) {
      setGradeError(e)
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
        <span aria-hidden>⚡</span> {exercise.title}
        {passed && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Passed</span>}
      </h3>
      <p className="mb-3 text-xs text-slate-400">
        Code exercise · {20 * exercise.difficulty} XP · graded by real test runs, not AI
      </p>
      <Markdown md={exercise.instructions} />
      <div className="mt-4">
        <CodeEditor value={code} onChange={setCode} label={`Code for ${exercise.title}`} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={run}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {running ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-300 border-t-white" />
              Running tests…
            </>
          ) : (
            <>▶ Run tests</>
          )}
        </button>
        <button
          onClick={() => setCode(exercise.starterCode)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Reset code
        </button>
        {passed && aiConfig && !grade && (
          <button
            onClick={askStyleFeedback}
            disabled={grading}
            className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
          >
            {grading ? 'Getting feedback…' : '✨ AI style feedback'}
          </button>
        )}
      </div>

      <ErrorBanner error={error} onRetry={run} onDismiss={() => setError(null)} />

      {result && (
        <div className="mt-4 space-y-2" aria-live="polite">
          {result.error && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 font-mono text-xs whitespace-pre-wrap text-amber-900">
              {result.error}
            </div>
          )}
          {result.stdout && (
            <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs" open={!result.all_passed}>
              <summary className="cursor-pointer font-semibold text-slate-600">Program output</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-slate-700">{result.stdout}</pre>
            </details>
          )}
          <ul className="space-y-1.5">
            {result.results.map((t) => (
              <li
                key={t.name}
                className={`rounded-xl border p-3 text-sm ${
                  t.passed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                <span className="font-medium">
                  {t.passed ? '✓' : '✗'} {t.name}
                </span>
                {t.error && <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-xs">{t.error}</pre>}
              </li>
            ))}
          </ul>
          {result.all_passed && (
            <p className="text-sm font-semibold text-emerald-700">
              All tests passed! +{20 * exercise.difficulty} XP
            </p>
          )}
        </div>
      )}

      <ErrorBanner error={gradeError} onRetry={askStyleFeedback} onDismiss={() => setGradeError(null)} />
      {grade && <GradeCard grade={grade} title="AI style feedback (advisory — your XP is already earned)" />}
    </section>
  )
}
