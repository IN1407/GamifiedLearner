import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { exportState, importState, type MathLevel } from '../lib/db'
import { useStore } from '../state/useStore'
import { ConnectAIStep } from './Onboarding'
import ErrorBanner from '../components/ErrorBanner'

const MATH_LEVELS: { id: MathLevel; label: string }[] = [
  { id: 'middle', label: 'Middle school' },
  { id: 'hs910', label: '9th–10th grade' },
  { id: 'hs1112', label: '11th–12th grade' },
  { id: 'college', label: 'College' },
  { id: 'grad', label: 'Graduate' },
]

export default function Settings() {
  const profile = useStore((s) => s.profile)
  const aiConfig = useStore((s) => s.aiConfig)
  const setMathLevel = useStore((s) => s.setMathLevel)
  const setCommitment = useStore((s) => s.setCommitment)
  const disconnectAI = useStore((s) => s.disconnectAI)
  const resetProgress = useStore((s) => s.resetProgress)
  const reloadFromDB = useStore((s) => s.reloadFromDB)

  const [showConnect, setShowConnect] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [importError, setImportError] = useState<unknown>(null)
  const [notice, setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const doExport = async () => {
    const state = await exportState()
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gamifiedlearner-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setNotice('Progress exported as JSON.')
  }

  const doImport = async (file: File) => {
    setImportError(null)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      await importState(parsed)
      await reloadFromDB()
      setNotice('Progress imported successfully.')
    } catch (e) {
      setImportError(
        e instanceof Error && e.message.includes('version')
          ? e
          : new Error('That file is not a valid GamifiedLearner export.'),
      )
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-100">⚙️ Settings</h1>
        <Link to="/" className="text-sm font-semibold text-indigo-300 hover:underline">
          ← Home
        </Link>
      </header>

      {notice && (
        <p role="status" className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {notice}
        </p>
      )}

      {/* Math level */}
      <section id="math-level" className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <h2 className="font-bold text-slate-100">Math level</h2>
        <p className="mt-1 mb-3 text-sm text-slate-400">
          Controls scaffolding depth in the math-for-AI and neural-network modules. Takes effect immediately.
        </p>
        <select
          value={profile?.mathLevel ?? 'college'}
          onChange={(e) => setMathLevel(e.target.value as MathLevel)}
          aria-label="Math level"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm"
        >
          {MATH_LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </section>

      {/* Commitment */}
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <h2 className="font-bold text-slate-100">Weekly commitment</h2>
        <p className="mt-1 mb-3 text-sm text-slate-400">Your streak counts weeks where you hit this target.</p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="14"
            value={profile?.commitmentPerWeek ?? 3}
            onChange={(e) => setCommitment(Number(e.target.value))}
            className="flex-1 accent-indigo-600"
            aria-label="Lessons per week commitment"
          />
          <span className="w-32 text-sm font-semibold text-slate-200">
            {profile?.commitmentPerWeek ?? 3} lessons/week
          </span>
        </div>
      </section>

      {/* AI provider */}
      <section id="ai" className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <h2 className="font-bold text-slate-100">AI provider</h2>
        {aiConfig && !showConnect ? (
          <>
            <p className="mt-2 text-sm text-slate-300">
              Connected to <strong>{aiConfig.provider}</strong> · model <code className="rounded bg-slate-800 px-1">{aiConfig.model}</code>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Key is stored AES-encrypted in your browser's IndexedDB and sent only to {aiConfig.provider} via
              the local backend. It is never logged.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setShowConnect(true)}
                className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/20"
              >
                Change provider / model
              </button>
              <button
                onClick={async () => {
                  await disconnectAI()
                  setNotice('API key cleared from this browser.')
                }}
                className="rounded-lg border border-rose-500/40 px-4 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/10"
              >
                Clear API key
              </button>
            </div>
          </>
        ) : (
          <div className="mt-3">
            <ConnectAIStep
              compact
              onDone={() => {
                setShowConnect(false)
                setNotice('AI provider connected.')
              }}
              onBack={aiConfig ? () => setShowConnect(false) : undefined}
            />
          </div>
        )}
      </section>

      {/* Data */}
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <h2 className="font-bold text-slate-100">Your data</h2>
        <p className="mt-1 mb-3 text-sm text-slate-400">
          Everything lives in this browser. Export before switching devices — the JSON includes profile,
          progress, and streak history (never your API key).
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={doExport}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800/60"
          >
            ⬇ Export progress (JSON)
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800/60"
          >
            ⬆ Import progress
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            aria-label="Import progress file"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void doImport(f)
              e.target.value = ''
            }}
          />
        </div>
        <ErrorBanner error={importError} onDismiss={() => setImportError(null)} />
      </section>

      {/* Danger zone */}
      <section className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
        <h2 className="font-bold text-rose-200">Danger zone</h2>
        <p className="mt-1 mb-3 text-sm text-rose-300">
          Resets all lesson progress, XP, and streak history. Profile and AI connection are kept.
        </p>
        {confirmReset ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-rose-300">Really reset everything?</span>
            <button
              onClick={async () => {
                await resetProgress()
                setConfirmReset(false)
                setNotice('Progress reset.')
              }}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
            >
              Yes, reset
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="rounded-lg border border-rose-500/40 px-4 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/20"
          >
            Reset progress…
          </button>
        )}
      </section>
    </div>
  )
}
