import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { aiExplain } from '../lib/api'
import { loadExplanation, saveExplanation, type ExplanationHistory } from '../lib/db'
import { newHistory } from '../lib/explanationHistory'
import { useStore } from '../state/useStore'
import ErrorBanner from './ErrorBanner'
import ExplanationView from './ExplanationView'

/**
 * "AI Explain" — only ever rendered after a wrong answer (the parent quiz
 * enforces that). The first explanation becomes Version 1 of a persistent
 * history; the learner can then request revisions and page through versions,
 * and the whole history survives a reload (IndexedDB, keyed by siteId).
 */
export default function AIExplain({
  siteId,
  question,
  choices,
  userAnswer,
  correctAnswer,
  lessonContext,
}: {
  siteId: string
  question: string
  choices: string[]
  userAnswer: string
  correctAnswer: string
  lessonContext: string
}) {
  const aiConfig = useStore((s) => s.aiConfig)
  const [history, setHistory] = useState<ExplanationHistory | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [error, setError] = useState<unknown>(null)
  const [restored, setRestored] = useState(false)

  // Restore any persisted explanation history for this site on mount.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const existing = await loadExplanation(siteId)
      if (cancelled) return
      if (existing && existing.versions.length) {
        setHistory(existing)
        setState('done')
      }
      setRestored(true)
    })()
    return () => {
      cancelled = true
    }
  }, [siteId])

  if (!aiConfig) {
    return (
      <p className="mt-2 text-sm text-slate-400">
        <Link to="/settings" className="text-indigo-300 underline">
          Connect an AI provider
        </Link>{' '}
        to get an explanation of why this answer is wrong.
      </p>
    )
  }

  const persist = async (h: ExplanationHistory) => {
    setHistory(h)
    await saveExplanation(h)
  }

  const fetchExplanation = async () => {
    setState('loading')
    setError(null)
    try {
      const text = await aiExplain(aiConfig, { question, choices, userAnswer, correctAnswer, lessonContext })
      await persist(newHistory(siteId, text))
      setState('done')
    } catch (e) {
      setError(e)
      setState('idle')
    }
  }

  return (
    <div className="mt-3">
      {restored && state !== 'done' && (
        <button
          onClick={fetchExplanation}
          disabled={state === 'loading'}
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-sm font-medium text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-60"
        >
          {state === 'loading' ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-500/40 border-t-indigo-700" />
              Asking your AI tutor…
            </>
          ) : (
            <>✨ Explain my mistake</>
          )}
        </button>
      )}
      <ErrorBanner error={error} onRetry={fetchExplanation} onDismiss={() => setError(null)} />
      {state === 'done' && history && (
        <ExplanationView history={history} onChange={persist} aiConfig={aiConfig} lessonContext={lessonContext} />
      )}
    </div>
  )
}
