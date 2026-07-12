import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchProviders, validateProvider, type ProviderInfo } from '../lib/api'
import type { MathLevel } from '../lib/db'
import { useStore } from '../state/useStore'
import ErrorBanner from '../components/ErrorBanner'

const MATH_LEVELS: { id: MathLevel; label: string; blurb: string }[] = [
  { id: 'middle', label: 'Middle school', blurb: 'We explain everything from scratch — “derivative” included.' },
  { id: 'hs910', label: '9th–10th grade', blurb: 'Algebra assumed; calculus built up step by step.' },
  { id: 'hs1112', label: '11th–12th grade', blurb: 'Basic calculus assumed; linear algebra from scratch.' },
  { id: 'college', label: 'College', blurb: 'Calculus + vectors assumed; we move faster on notation.' },
  { id: 'grad', label: 'Graduate', blurb: 'Full notation, terse derivations, references to go deeper.' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const completeOnboarding = useStore((s) => s.completeOnboarding)

  const [step, setStep] = useState<1 | 2>(1)
  const [mathLevel, setMathLevel] = useState<MathLevel>('college')
  const [commitment, setCommitment] = useState(3)

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8 text-center">
        <p className="text-5xl" aria-hidden>
          🎓
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-100">Welcome to GamifiedLearner</h1>
        <p className="mt-1 text-slate-400">Two quick steps and you're learning.</p>
        <div className="mx-auto mt-4 flex max-w-xs items-center gap-2" aria-hidden>
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-indigo-500' : 'bg-slate-700'}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-indigo-500' : 'bg-slate-700'}`} />
        </div>
      </header>

      {step === 1 && (
        <section aria-label="Step 1: your starting point">
          <h2 className="text-xl font-bold text-slate-100">1 · Set your math level</h2>
          <p className="mt-1 mb-4 text-sm text-slate-400">
            This tunes how much scaffolding the math-for-AI and neural-network modules give you — lower
            levels get <em>more</em> worked steps, never less content. Change it anytime in Settings.
          </p>
          <div role="radiogroup" aria-label="Math level" className="space-y-2">
            {MATH_LEVELS.map((lvl) => (
              <label
                key={lvl.id}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                  mathLevel === lvl.id ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="mathLevel"
                  className="mt-1 accent-indigo-600"
                  checked={mathLevel === lvl.id}
                  onChange={() => setMathLevel(lvl.id)}
                />
                <span>
                  <span className="font-semibold text-slate-100">{lvl.label}</span>
                  <span className="block text-sm text-slate-400">{lvl.blurb}</span>
                </span>
              </label>
            ))}
          </div>

          <h2 className="mt-8 text-xl font-bold text-slate-100">Your weekly commitment</h2>
          <p className="mt-1 mb-3 text-sm text-slate-400">
            Your streak counts weeks where you hit this target — pick something you'll actually keep.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="14"
              value={commitment}
              onChange={(e) => setCommitment(Number(e.target.value))}
              className="flex-1 accent-indigo-600"
              aria-label="Lessons per week commitment"
            />
            <span className="w-32 text-sm font-semibold text-slate-200">
              {commitment} lesson{commitment > 1 ? 's' : ''}/week
            </span>
          </div>

          <button
            onClick={() => setStep(2)}
            className="mt-8 w-full rounded-xl bg-indigo-600 py-3 font-bold text-white shadow hover:bg-indigo-700"
          >
            Continue →
          </button>
        </section>
      )}

      {step === 2 && (
        <ConnectAIStep
          onDone={async (connected) => {
            await completeOnboarding(mathLevel, commitment)
            if (connected) navigate('/', { replace: true })
            else navigate('/', { replace: true })
          }}
          onBack={() => setStep(1)}
        />
      )}
    </div>
  )
}

/** Shared between onboarding and Settings: key → validate → live model list → pick. */
export function ConnectAIStep({
  onDone,
  onBack,
  compact = false,
}: {
  onDone: (connected: boolean) => void | Promise<void>
  onBack?: () => void
  compact?: boolean
}) {
  const connectAI = useStore((s) => s.connectAI)
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [providersError, setProvidersError] = useState<unknown>(null)
  const [providerId, setProviderId] = useState('openai')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [models, setModels] = useState<string[] | null>(null)
  const [model, setModel] = useState('')
  const [saving, setSaving] = useState(false)

  const loadProviders = () => {
    setProvidersError(null)
    fetchProviders()
      .then(setProviders)
      .catch((e) => setProvidersError(e))
  }
  useEffect(loadProviders, [])

  const selected = providers.find((p) => p.id === providerId)

  const validate = async () => {
    setValidating(true)
    setError(null)
    setModels(null)
    try {
      const res = await validateProvider(providerId, apiKey.trim(), baseUrl.trim() || undefined)
      setModels(res.models)
      setModel(res.models[0] ?? '')
    } catch (e) {
      setError(e)
    } finally {
      setValidating(false)
    }
  }

  const save = async () => {
    if (!model) return
    setSaving(true)
    try {
      await connectAI({
        provider: providerId,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || null,
        model,
      })
      await onDone(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-label="Connect your AI">
      {!compact && (
        <>
          <h2 className="text-xl font-bold text-slate-100">2 · Connect your AI</h2>
          <p className="mt-1 mb-4 text-sm text-slate-400">
            Your AI powers “explain my mistake”, exercise grading, and the course Q&A chat. The key is
            encrypted in your browser and only ever sent to your chosen provider — never to us or anyone
            else. No key handy? Pick <strong>Ollama</strong> (free, local) or <strong>Demo mode</strong>.
          </p>
        </>
      )}

      <ErrorBanner error={providersError} onRetry={loadProviders} />

      <label className="block text-sm font-semibold text-slate-200" htmlFor="provider-select">
        Provider
      </label>
      <select
        id="provider-select"
        value={providerId}
        onChange={(e) => {
          setProviderId(e.target.value)
          setModels(null)
          setError(null)
        }}
        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm"
      >
        {providers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      {selected?.needs_key && (
        <>
          <label className="mt-4 block text-sm font-semibold text-slate-200" htmlFor="api-key">
            API key
          </label>
          <input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value)
              setModels(null)
            }}
            placeholder={selected.key_hint || 'Paste your API key'}
            autoComplete="off"
            className="mt-1 w-full rounded-xl border border-slate-700 px-3 py-2.5 font-mono text-sm"
          />
        </>
      )}

      <details className="mt-3 text-sm text-slate-400">
        <summary className="cursor-pointer">Advanced: custom base URL</summary>
        <input
          type="url"
          value={baseUrl}
          onChange={(e) => {
            setBaseUrl(e.target.value)
            setModels(null)
          }}
          placeholder={selected?.default_base_url}
          aria-label="Custom base URL"
          className="mt-2 w-full rounded-xl border border-slate-700 px-3 py-2 font-mono text-xs"
        />
        <p className="mt-1 text-xs">
          e.g. Z.ai international users: <code>https://api.z.ai/api/paas/v4</code>; remote Ollama hosts.
        </p>
      </details>

      <button
        onClick={validate}
        disabled={validating || (selected?.needs_key && !apiKey.trim())}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {validating ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500/40 border-t-white" />
            Validating & fetching models…
          </>
        ) : (
          'Validate & fetch models'
        )}
      </button>

      <ErrorBanner error={error} onRetry={validate} onDismiss={() => setError(null)} />

      {models && (
        <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4" aria-live="polite">
          <p className="text-sm font-semibold text-emerald-300">
            ✓ Connected — {models.length} model{models.length !== 1 ? 's' : ''} available (fetched live, not hardcoded)
          </p>
          <label className="mt-3 block text-sm font-semibold text-slate-200" htmlFor="model-select">
            Course assistant model
          </label>
          <select
            id="model-select"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm"
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            onClick={save}
            disabled={saving || !model}
            className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Use this model ✓'}
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-sm">
        {onBack ? (
          <button onClick={onBack} className="text-slate-400 underline hover:text-slate-200">
            ← Back
          </button>
        ) : (
          <span />
        )}
        {!compact && (
          <button onClick={() => onDone(false)} className="text-slate-400 underline hover:text-slate-200">
            Skip for now (connect later in Settings)
          </button>
        )}
      </div>
    </section>
  )
}
