import { useState } from 'react'
import type { Passage } from '../types'

/**
 * The boss "second chance" gate. The player must read the passage and answer
 * BOTH multiple-choice questions correctly to earn a revive. A wrong answer
 * rotates in a fresh passage (via onIncorrect) so the challenge can't be brute
 * forced — the only way through is to actually read.
 */
export default function ReadingChallenge({
  passage,
  onPass,
  onIncorrect,
}: {
  passage: Passage
  onPass: () => void
  onIncorrect: () => void
}) {
  const [answers, setAnswers] = useState<[number | null, number | null]>([null, null])
  const [feedback, setFeedback] = useState<string | null>(null)

  const bothAnswered = answers[0] !== null && answers[1] !== null

  function submit() {
    const correct = passage.questions.every((q, i) => answers[i] === q.answer)
    if (correct) {
      onPass()
    } else {
      setFeedback('Not quite! Read the new passage carefully and try again. 📖')
      setAnswers([null, null])
      onIncorrect()
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-4">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl border border-indigo-500/40 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-red-300">
            💥 You were defeated
          </span>
          <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-300">
            Read to earn a second chance
          </span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-100">📖 {passage.title}</h2>
        <p className="mt-3 whitespace-pre-line rounded-2xl bg-slate-800/60 p-4 text-[15px] leading-relaxed text-slate-100">
          {passage.text}
        </p>

        {feedback && (
          <p className="mt-3 rounded-xl bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-300">
            {feedback}
          </p>
        )}

        <div className="mt-4 space-y-4">
          {passage.questions.map((q, qi) => (
            <fieldset key={qi} className="rounded-2xl border border-slate-700 p-4">
              <legend className="px-1 text-sm font-semibold text-slate-200">
                Q{qi + 1}. {q.q}
              </legend>
              <div className="mt-2 grid gap-2">
                {q.options.map((opt, oi) => {
                  const selected = answers[qi] === oi
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() =>
                        setAnswers((a) => {
                          const next: [number | null, number | null] = [a[0], a[1]]
                          next[qi] = oi
                          return next
                        })
                      }
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                        selected
                          ? 'border-indigo-400 bg-indigo-500/20 text-white'
                          : 'border-slate-700 bg-slate-800/40 text-slate-200 hover:bg-slate-800'
                      }`}
                      aria-pressed={selected}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <button
          type="button"
          disabled={!bothAnswered}
          onClick={submit}
          className="mt-5 w-full rounded-2xl bg-indigo-600 px-4 py-3 text-base font-bold text-white shadow-lg transition enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Check my answers ✓
        </button>
      </div>
    </div>
  )
}
