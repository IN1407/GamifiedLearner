import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  ASSESSMENT_PASS_THRESHOLD,
  assessmentMaxPoints,
  getAssessment,
  scoreAssessment,
  type AssessmentScore,
  type CheckpointAssessment,
} from '../content/assessments'
import type { Question } from '../content/types'
import { topicsForModule } from '../content/topicEvidence'
import { getMilestone, type MilestoneDef } from '../content/milestones'
import { verifyCode } from '../lib/api'
import { useStore, useStreak, useXp } from '../state/useStore'
import { levelForXp } from '../lib/gamification'
import Markdown from '../components/Markdown'
import CodeEditor from '../components/CodeEditor'
import ErrorBanner from '../components/ErrorBanner'
import LevelUpOverlay from '../components/LevelUpOverlay'

/** XP awarded the first time an assessment is passed (scales with its size). */
function assessmentXp(maxPoints: number): number {
  return 40 + maxPoints * 10
}

type Phase = 'intro' | 'taking' | 'grading' | 'result'

export default function AssessmentView() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const assessment = assessmentId ? getAssessment(assessmentId) : undefined

  const record = useStore((s) => (assessmentId ? s.assessments[assessmentId] : undefined))
  const recordAttempt = useStore((s) => s.recordAssessmentAttempt)
  const recordMasteryEvidence = useStore((s) => s.recordMasteryEvidence)
  const xp = useXp()
  const streak = useStreak()

  const [phase, setPhase] = useState<Phase>('intro')
  const [answers, setAnswers] = useState<Record<string, number | string | null>>({})
  const [codeMap, setCodeMap] = useState<Record<string, string>>(
    () => Object.fromEntries((assessment?.codeTasks ?? []).map((t) => [t.id, t.starterCode])),
  )
  const [score, setScore] = useState<AssessmentScore | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [celebrate, setCelebrate] = useState<MilestoneDef | null>(null)
  const startedAt = useRef(Date.now())

  if (!assessment) return <Navigate to="/" replace />

  const maxPoints = assessmentMaxPoints(assessment)
  const thresholdPct = Math.round(ASSESSMENT_PASS_THRESHOLD * 100)
  const answeredCount =
    assessment.questions.filter((q) => {
      const a = answers[q.id]
      return typeof a === 'number' || (typeof a === 'string' && a.trim() !== '')
    }).length

  const backToCourse = () => navigate(`/course/${assessment.courseId}`)

  const submit = async () => {
    setPhase('grading')
    setError(null)
    try {
      const codePassed: Record<string, boolean> = {}
      for (const task of assessment.codeTasks) {
        const res = await verifyCode(codeMap[task.id] ?? '', task.starterCode, task.requirements)
        codePassed[task.id] = res.passed
      }
      const result = scoreAssessment(assessment, { questions: answers, codePassed })
      const newlyPassed = await recordAttempt({
        assessmentId: assessment.id,
        courseId: assessment.courseId,
        scoreFraction: result.fraction,
        earned: result.earned,
        total: result.total,
        passed: result.passed,
        xpOnPass: assessmentXp(maxPoints),
      })
      // Strong, per-topic mastery evidence from the assessment (retries count
      // less thanks to the engine's per-item anti-farming).
      const seenTopics = new Set<string>()
      for (const r of assessment.reviewMap) {
        for (const topicId of topicsForModule(r.moduleId)) {
          if (seenTopics.has(topicId)) continue
          seenTopics.add(topicId)
          await recordMasteryEvidence({ topicId, itemId: assessment.id, kind: 'assessment', score: result.fraction })
        }
      }
      setScore(result)
      setPhase('result')
      if (newlyPassed) setCelebrate(getMilestone(assessment.milestoneId) ?? null)
    } catch (e) {
      setError(e)
      setPhase('taking')
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center gap-3 text-sm">
        <Link to={`/course/${assessment.courseId}`} className="font-bold text-indigo-300 hover:underline">
          ← Back to course
        </Link>
        <span className="ml-auto font-semibold text-slate-400">
          🎯 pass at {thresholdPct}%
        </span>
      </div>

      <p className="text-xs font-semibold tracking-wide text-indigo-400 uppercase">Checkpoint assessment</p>
      <h1 className="mt-1 mb-3 text-2xl font-extrabold text-slate-100 sm:text-3xl">{assessment.title}</h1>

      {phase === 'intro' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="gl-prose">
            <Markdown md={assessment.intro} />
          </div>
          <ul className="mt-4 space-y-1 text-sm text-slate-400">
            <li>• {assessment.questions.length} questions + {assessment.codeTasks.length} coding task(s)</li>
            <li>• Score {thresholdPct}% or higher to unlock the status</li>
            <li>• Unlimited retries — your best score is kept</li>
          </ul>
          {record && (
            <p className="mt-4 rounded-xl border border-slate-800 bg-slate-800/60 p-3 text-sm text-slate-300">
              Best so far: <strong>{Math.round(record.bestScore * 100)}%</strong>
              {record.passed ? ' — passed ✓' : ''} · {record.attempts.length} attempt(s)
            </p>
          )}
          <button
            onClick={() => {
              startedAt.current = Date.now()
              setPhase('taking')
            }}
            className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
          >
            {record ? 'Retake assessment' : 'Start assessment'} →
          </button>
        </div>
      )}

      {(phase === 'taking' || phase === 'grading') && (
        <div className="space-y-5">
          <ErrorBanner error={error} onRetry={submit} onDismiss={() => setError(null)} />
          <ol className="space-y-5">
            {assessment.questions.map((q, i) => (
              <li key={q.id}>
                <QuestionInput
                  index={i}
                  question={q}
                  value={answers[q.id] ?? null}
                  onChange={(v) => setAnswers((s) => ({ ...s, [q.id]: v }))}
                  disabled={phase === 'grading'}
                />
              </li>
            ))}
          </ol>

          {assessment.codeTasks.map((task, i) => (
            <section
              key={task.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              aria-label={`Coding task: ${task.title}`}
            >
              <h3 className="mb-1 text-lg font-bold text-slate-100">
                ⚡ Coding task {i + 1}: {task.title}
              </h3>
              <div className="gl-prose">
                <Markdown md={task.instructions} />
              </div>
              <div className="mt-3">
                <CodeEditor
                  value={codeMap[task.id] ?? ''}
                  onChange={(v) => setCodeMap((s) => ({ ...s, [task.id]: v }))}
                  label={`Code for ${task.title}`}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Checked statically on submit (your code is never executed).
              </p>
            </section>
          ))}

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
            <button
              onClick={submit}
              disabled={phase === 'grading'}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {phase === 'grading' ? 'Grading…' : 'Submit assessment'}
            </button>
            <span className="text-sm text-slate-400" aria-live="polite">
              {answeredCount}/{assessment.questions.length} questions answered
              {answeredCount < assessment.questions.length && ' — unanswered count as incorrect'}
            </span>
          </div>
        </div>
      )}

      {phase === 'result' && score && (
        <ResultView
          score={score}
          assessment={assessment}
          onRetry={() => {
            setError(null)
            setPhase('taking')
          }}
          onDone={backToCourse}
        />
      )}

      {celebrate && (
        <LevelUpOverlay
          courseTitle={assessment.title}
          moduleTitle={`${Math.round((score?.fraction ?? 0) * 100)}% on ${assessment.title}`}
          level={levelForXp(xp).level}
          totalXp={xp}
          streakWeeks={streak.streakWeeks}
          earnedXp={assessmentXp(maxPoints)}
          status={{ title: celebrate.title, subtitle: celebrate.subtitle, icon: celebrate.icon }}
          onClose={() => {
            setCelebrate(null)
          }}
        />
      )}
    </div>
  )
}

function QuestionInput({
  index,
  question,
  value,
  onChange,
  disabled,
}: {
  index: number
  question: Question
  value: number | string | null
  onChange: (v: number | string) => void
  disabled: boolean
}) {
  const groupId = `aq-${question.id}`
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-400">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="gl-prose [&_p]:my-0">
            <Markdown md={question.prompt} />
          </div>
          {question.kind === 'mcq' ? (
            <fieldset className="mt-3 space-y-2" disabled={disabled}>
              <legend className="sr-only">Answer choices for question {index + 1}</legend>
              {question.choices.map((choice, ci) => (
                <label
                  key={ci}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
                    value === ci
                      ? 'border-indigo-400 bg-indigo-500/10'
                      : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name={groupId}
                    className="mt-0.5 accent-indigo-600"
                    checked={value === ci}
                    onChange={() => onChange(ci)}
                  />
                  <span className="gl-prose [&_p]:my-0">
                    <Markdown md={choice} />
                  </span>
                </label>
              ))}
            </fieldset>
          ) : (
            <input
              type="text"
              value={typeof value === 'string' ? value : ''}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Type your answer…"
              aria-label={`Answer for question ${index + 1}`}
              className="mt-3 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400"
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ResultView({
  score,
  assessment,
  onRetry,
  onDone,
}: {
  score: AssessmentScore
  assessment: CheckpointAssessment
  onRetry: () => void
  onDone: () => void
}) {
  const pct = Math.round(score.fraction * 100)
  const wrongItems = score.perItem.filter((i) => !i.correct)
  return (
    <div className="space-y-4" aria-live="polite">
      <div
        className={`rounded-2xl border p-6 ${
          score.passed
            ? 'border-emerald-500/40 bg-emerald-500/10'
            : 'border-amber-500/40 bg-amber-500/10'
        }`}
      >
        <p className="text-sm font-semibold tracking-wide uppercase text-slate-300">
          {score.passed ? 'Passed 🎉' : 'Not yet — keep going'}
        </p>
        <p className={`mt-1 text-4xl font-extrabold ${score.passed ? 'text-emerald-300' : 'text-amber-200'}`}>
          {pct}%
        </p>
        <p className="mt-1 text-sm text-slate-300">
          {score.earned}/{score.total} points · pass mark {Math.round(ASSESSMENT_PASS_THRESHOLD * 100)}%
        </p>
      </div>

      {!score.passed && wrongItems.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="font-semibold text-slate-100">Review these areas, then retry:</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {assessment.reviewMap.map((r) => (
              <li key={r.moduleId}>
                <Link
                  to={`/course/${r.courseId}`}
                  className="text-indigo-300 hover:underline"
                >
                  {r.topic}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onRetry}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
        >
          {score.passed ? 'Review answers' : 'Try again'}
        </button>
        <button
          onClick={onDone}
          className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800/60"
        >
          Back to course
        </button>
      </div>
    </div>
  )
}
