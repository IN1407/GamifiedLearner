import { useState } from 'react'
import { Link } from 'react-router-dom'
import { aiExplain } from '../lib/api'
import { useStore } from '../state/useStore'
import Markdown from './Markdown'
import ErrorBanner from './ErrorBanner'

/**
 * "AI Explain" — only ever rendered after a wrong answer (the parent quiz
 * enforces that), never pre-emptively and never for correct answers.
 */
export default function AIExplain({
  question,
  choices,
  userAnswer,
  correctAnswer,
  lessonContext,
}: {
  question: string
  choices: string[]
  userAnswer: string
  correctAnswer: string
  lessonContext: string
}) {
  const aiConfig = useStore((s) => s.aiConfig)
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [explanation, setExplanation] = useState('')
  const [error, setError] = useState<unknown>(null)

  if (!aiConfig) {
    return (
      <p className="mt-2 text-sm text-slate-500">
        <Link to="/settings" className="text-indigo-600 underline">
          Connect an AI provider
        </Link>{' '}
        to get an explanation of why this answer is wrong.
      </p>
    )
  }

  const fetchExplanation = async () => {
    setState('loading')
    setError(null)
    try {
      const text = await aiExplain(aiConfig, {
        question,
        choices,
        userAnswer,
        correctAnswer,
        lessonContext,
      })
      setExplanation(text)
      setState('done')
    } catch (e) {
      setError(e)
      setState('idle')
    }
  }

  return (
    <div className="mt-3">
      {state !== 'done' && (
        <button
          onClick={fetchExplanation}
          disabled={state === 'loading'}
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
        >
          {state === 'loading' ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-700" />
              Asking your AI tutor…
            </>
          ) : (
            <>✨ Explain my mistake</>
          )}
        </button>
      )}
      <ErrorBanner error={error} onRetry={fetchExplanation} onDismiss={() => setError(null)} />
      {state === 'done' && (
        <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">
            AI tutor
          </p>
          <Markdown md={explanation} />
        </div>
      )}
    </div>
  )
}
