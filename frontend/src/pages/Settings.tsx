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
        <h1 className="text-2xl font-extrabold text-slate-900">⚙️ Settings</h1>
        <Link to="/" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← Home
        </Link>
      </header>

      {notice && (
        <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      {/* Math level */}
      <section id="math-level" className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">Math level</h2>
        <p className="mt-1 mb-3 text-sm text-slate-500">
          Controls scaffolding depth in the math-for-AI and neural-network modules. Takes effect immediately.
        </p>
        <select
          value={profile?.mathLevel ?? 'college'}
          onChange={(e) => setMathLevel(e.target.value as MathLevel)}
          aria-label="Math level"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
        >
          {MATH_LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </section>

      {/* Commitment */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">Weekly commitment</h2>
        <p className="mt-1 mb-3 text-sm text-slate-500">Your streak counts weeks where you hit this target.</p>
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
          <span className="w-32 text-sm font-semibold text-slate-700">
            {profile?.commitmentPerWeek ?? 3} lessons/week
          </span>
        </div>
      </section>

      {/* AI provider */}
      <section id="ai" className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">AI provider</h2>
        {aiConfig && !showConnect ? (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Connected to <strong>{aiConfig.provider}</strong> · model <code className="rounded bg-slate-100 px-1">{aiConfig.model}</code>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Key is stored AES-encrypted in your browser's IndexedDB and sent only to {aiConfig.provider} via
              the local backend. It is never logged.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setShowConnect(true)}
                className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
              >
                Change provider / model
              </button>
              <button
                onClick={async () => {
                  await disconnectAI()
                  setNotice('API key cleared from this browser.')
                }}
                className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
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
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">Your data</h2>
        <p className="mt-1 mb-3 text-sm text-slate-500">
          Everything lives in this browser. Export before switching devices — the JSON includes profile,
          progress, and streak history (never your API key).
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={doExport}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ⬇ Export progress (JSON)
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
      <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
        <h2 className="font-bold text-rose-900">Danger zone</h2>
        <p className="mt-1 mb-3 text-sm text-rose-700">
          Resets all lesson progress, XP, and streak history. Profile and AI connection are kept.
        </p>
        {confirmReset ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-rose-800">Really reset everything?</span>
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
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-white"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
          >
            Reset progress…
          </button>
        )}
      </section>
    </div>
  )
}
