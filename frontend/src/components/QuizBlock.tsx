import { useMemo, useState } from 'react'
import type { Question, Quiz } from '../content/types'
import { correctAnswerText, isQuestionCorrect } from '../content/quiz'
import Markdown from './Markdown'
import AIExplain from './AIExplain'

interface QuestionState {
  resolved: boolean
  attempts: number
  earnedXp: number
  lastWrongAnswer: string | null
  revealed: boolean
}

/**
 * Deterministic, client-graded quiz. XP: full (5×difficulty) on first try,
 * half on later tries, zero if the answer was revealed. "AI Explain" appears
 * only after a wrong submission.
 */
export default function QuizBlock({
  quiz,
  lessonContext,
  onXpChange,
  onCompleteChange,
}: {
  quiz: Quiz
  lessonContext: string
  onXpChange: (xp: number) => void
  onCompleteChange: (complete: boolean) => void
}) {
  const [states, setStates] = useState<Record<string, QuestionState>>({})

  const update = (id: string, next: QuestionState, all: Record<string, QuestionState>) => {
    const merged = { ...all, [id]: next }
    setStates(merged)
    const xp = quiz.questions.reduce((sum, q) => sum + (merged[q.id]?.earnedXp ?? 0), 0)
    onXpChange(xp)
    onCompleteChange(quiz.questions.every((q) => merged[q.id]?.resolved))
  }

  return (
    <section aria-label={quiz.title ?? 'Quiz'} className="my-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <h3 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-100">
        <span aria-hidden>📝</span> {quiz.title ?? 'Check your understanding'}
      </h3>
      <p className="mb-4 text-sm text-slate-400">
        Answer every question to finish this lesson. First-try correct answers earn full XP.
      </p>
      <ol className="space-y-6">
        {quiz.questions.map((q, i) => (
          <li key={q.id}>
            <QuestionView
              index={i}
              question={q}
              lessonContext={lessonContext}
              state={states[q.id] ?? { resolved: false, attempts: 0, earnedXp: 0, lastWrongAnswer: null, revealed: false }}
              onChange={(next) => update(q.id, next, states)}
            />
          </li>
        ))}
      </ol>
    </section>
  )
}

function QuestionView({
  index,
  question,
  lessonContext,
  state,
  onChange,
}: {
  index: number
  question: Question
  lessonContext: string
  state: QuestionState
  onChange: (next: QuestionState) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [typed, setTyped] = useState('')
  const [feedback, setFeedback] = useState<'none' | 'wrong' | 'right'>('none')

  const answerText = useMemo(() => correctAnswerText(question), [question])
  const groupId = `q-${question.id}`

  const submit = () => {
    if (state.resolved) return
    const userAnswer = question.kind === 'mcq' ? (selected !== null ? question.choices[selected] : '') : typed
    if (!userAnswer.trim() && question.kind === 'short') return
    if (question.kind === 'mcq' && selected === null) return

    const correct =
      question.kind === 'mcq' ? isQuestionCorrect(question, selected) : isQuestionCorrect(question, typed)

    const attempts = state.attempts + 1
    if (correct) {
      const full = 5 * question.difficulty
      const earned = attempts === 1 ? full : Math.ceil(full / 2)
      setFeedback('right')
      onChange({ ...state, resolved: true, attempts, earnedXp: earned })
    } else {
      setFeedback('wrong')
      onChange({ ...state, attempts, lastWrongAnswer: userAnswer })
    }
  }

  const reveal = () => {
    setFeedback('none')
    onChange({ ...state, resolved: true, revealed: true, earnedXp: 0 })
  }

  return (
    <div>
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            state.resolved
              ? state.revealed
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-emerald-500/20 text-emerald-300'
              : 'bg-slate-800 text-slate-400'
          }`}
          aria-hidden
        >
          {state.resolved ? (state.revealed ? '!' : '✓') : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <Markdown md={question.prompt} />

          {question.kind === 'mcq' ? (
            <fieldset className="mt-2 space-y-2" disabled={state.resolved}>
              <legend className="sr-only">Answer choices for question {index + 1}</legend>
              {question.choices.map((choice, ci) => {
                const isCorrectChoice = state.resolved && ci === question.answerIndex
                return (
                  <label
                    key={ci}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
                      isCorrectChoice
                        ? 'border-emerald-400 bg-emerald-500/10'
                        : selected === ci
                          ? 'border-indigo-400 bg-indigo-500/10'
                          : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                    } ${state.resolved ? 'cursor-default opacity-90' : ''}`}
                  >
                    <input
                      type="radio"
                      name={groupId}
                      className="mt-0.5 accent-indigo-600"
                      checked={selected === ci}
                      onChange={() => {
                        setSelected(ci)
                        setFeedback('none')
                      }}
                    />
                    <span className="gl-prose [&_p]:my-0">
                      <Markdown md={choice} />
                    </span>
                  </label>
                )
              })}
            </fieldset>
          ) : (
            <div className="mt-2">
              <label className="sr-only" htmlFor={`${groupId}-input`}>
                Your answer for question {index + 1}
              </label>
              <input
                id={`${groupId}-input`}
                type="text"
                value={typed}
                disabled={state.resolved}
                onChange={(e) => {
                  setTyped(e.target.value)
                  setFeedback('none')
                }}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="Type your answer…"
                className="w-full max-w-md rounded-xl border border-slate-700 px-3 py-2 text-sm focus:border-indigo-400 disabled:bg-slate-800/60"
              />
              {state.resolved && (
                <p className="mt-1 text-sm text-slate-400">
                  Accepted answer: <code className="rounded bg-slate-800 px-1">{answerText}</code>
                </p>
              )}
            </div>
          )}

          {!state.resolved && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={submit}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Check answer
              </button>
              {state.attempts >= 2 && (
                <button
                  onClick={reveal}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800/60"
                >
                  Show answer (0 XP)
                </button>
              )}
              <span className="text-xs text-slate-400">
                {question.difficulty === 1 ? 'Easy' : question.difficulty === 2 ? 'Medium' : 'Hard'} ·{' '}
                {5 * question.difficulty} XP
              </span>
            </div>
          )}

          <div aria-live="polite">
            {feedback === 'wrong' && !state.resolved && (
              <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                <p className="font-medium">Not quite — try again.</p>
                {state.lastWrongAnswer !== null && (
                  <AIExplain
                    question={question.prompt}
                    choices={question.kind === 'mcq' ? question.choices : []}
                    userAnswer={state.lastWrongAnswer}
                    correctAnswer={answerText}
                    lessonContext={lessonContext}
                  />
                )}
              </div>
            )}
            {state.resolved && feedback === 'right' && (
              <p className="mt-3 text-sm font-medium text-emerald-300">
                Correct! +{state.earnedXp} XP{state.attempts > 1 ? ' (half XP after retries)' : ''}
              </p>
            )}
            {state.resolved && state.revealed && (
              <p className="mt-3 text-sm font-medium text-amber-300">
                Answer revealed — review this topic before the checkpoint.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
