import { useState } from 'react'
import type { CodeExercise } from '../content/types'
import { aiGrade, verifyCode, type VerifyResult } from '../lib/api'
import { useStore } from '../state/useStore'
import Markdown from './Markdown'
import CodeEditor from './CodeEditor'
import ErrorBanner from './ErrorBanner'
import GradeCard from './GradeCard'
import type { GradeResult } from '../lib/api'

/**
 * Code exercise. Learner code is verified STATICALLY — it is never executed.
 * The backend parses the AST, checks the required structure (functions
 * implemented, constructs used), and returns a pass/fail completion signal plus
 * evidence. Semantic correctness/quality is judged by the connected AI, which
 * receives the static analysis as evidence only (valid syntax ≠ correct code).
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
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [passed, setPassed] = useState(false)
  const [grade, setGrade] = useState<GradeResult | null>(null)
  const [grading, setGrading] = useState(false)
  const [gradeError, setGradeError] = useState<unknown>(null)

  const xp = 20 * exercise.difficulty

  const check = async () => {
    setChecking(true)
    setError(null)
    setResult(null)
    try {
      const res = await verifyCode(code, exercise.starterCode, exercise.requirements)
      setResult(res)
      if (res.passed && !passed) {
        setPassed(true)
        onXpChange(xp)
        onCompleteChange(true)
      }
    } catch (e) {
      setError(e)
    } finally {
      setChecking(false)
    }
  }

  const askFeedback = async () => {
    if (!aiConfig || !result) return
    setGrading(true)
    setGradeError(null)
    try {
      const g = await aiGrade(aiConfig, {
        task: exercise.instructions,
        rubric:
          exercise.rubric ??
          'Judge correctness against the task by reasoning about the logic (the platform does not run code). Then assess clarity, idiomatic Python, and simplicity. Do not pass code merely because it is syntactically valid.',
        submission: code,
        kind: 'code',
        codeEvidence: result.summary,
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
      className="my-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
    >
      <h3 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-100">
        <span aria-hidden>⚡</span> {exercise.title}
        {passed && (
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
            Passed
          </span>
        )}
      </h3>
      <p className="mb-3 text-xs text-slate-400">
        Code exercise · {xp} XP · checked statically (your code is never executed) + optional AI review
      </p>
      <Markdown md={exercise.instructions} />
      <div className="mt-4">
        <CodeEditor value={code} onChange={setCode} label={`Code for ${exercise.title}`} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={check}
          disabled={checking}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {checking ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-500/40 border-t-white" />
              Checking…
            </>
          ) : (
            <>✓ Check my code</>
          )}
        </button>
        <button
          onClick={() => setCode(exercise.starterCode)}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/60"
        >
          Reset code
        </button>
        {passed && aiConfig && !grade && (
          <button
            onClick={askFeedback}
            disabled={grading}
            className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-60"
          >
            {grading ? 'Reviewing…' : '✨ AI review my solution'}
          </button>
        )}
      </div>

      <ErrorBanner error={error} onRetry={check} onDismiss={() => setError(null)} />

      {result && (
        <div className="mt-4 space-y-2" aria-live="polite">
          {!result.valid && result.error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 font-mono text-xs whitespace-pre-wrap text-rose-200">
              <span className="font-semibold">Syntax error</span>
              {result.error.lineno != null && <span> on line {result.error.lineno}</span>}:{' '}
              {result.error.message}
              {result.error.text && <div className="mt-1 opacity-80">{result.error.text.trim()}</div>}
              <div className="mt-1 text-[11px] text-rose-300 not-italic">
                (Your code was parsed, not run — fix the syntax and check again.)
              </div>
            </div>
          )}

          {result.valid && result.checks.length > 0 && (
            <ul className="space-y-1.5">
              {result.checks.map((c) => (
                <li
                  key={c.label}
                  className={`rounded-xl border p-3 text-sm ${
                    c.passed
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                  }`}
                >
                  <span className="font-medium">
                    {c.passed ? '✓' : '•'} {c.label}
                  </span>
                  {!c.passed && c.detail && <p className="mt-1 text-xs">{c.detail}</p>}
                </li>
              ))}
            </ul>
          )}

          {result.valid && !result.passed && result.all_checks_passed && !result.changed && (
            <p className="text-sm text-amber-300">Edit the starter code with your own solution, then check again.</p>
          )}

          {result.passed && (
            <p className="text-sm font-semibold text-emerald-300">
              Structure checks passed — +{xp} XP.{' '}
              {aiConfig
                ? 'Run “AI review my solution” to check your logic and style.'
                : 'Connect an AI provider in Settings for a correctness & style review.'}
            </p>
          )}
        </div>
      )}

      <ErrorBanner error={gradeError} onRetry={askFeedback} onDismiss={() => setGradeError(null)} />
      {grade && <GradeCard grade={grade} title="AI review (advisory — your XP is already earned)" />}
    </section>
  )
}
