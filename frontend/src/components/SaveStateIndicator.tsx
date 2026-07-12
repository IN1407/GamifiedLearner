import { useStore } from '../state/useStore'

export default function SaveStateIndicator() {
  const saveState = useStore((s) => s.saveState)
  if (saveState === 'idle') return null
  const label = saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save failed — retrying on next change'
  const tone = saveState === 'failed' ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
  return <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone}`} aria-live="polite">{label}</div>
}
