import { useEffect, useMemo, useState } from 'react'
import { renderShareCard, shareOrDownload } from '../lib/shareCard'

const CONFETTI_COLORS = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#38bdf8', '#facc15']

/** Full-screen celebratory checkpoint screen with canvas-rendered share card. */
export default function LevelUpOverlay({
  courseTitle,
  moduleTitle,
  level,
  totalXp,
  streakWeeks,
  earnedXp,
  onClose,
}: {
  courseTitle: string
  moduleTitle: string
  level: number
  totalXp: number
  streakWeeks: number
  earnedXp: number
  onClose: () => void
}) {
  const [shareState, setShareState] = useState<'idle' | 'working' | 'shared' | 'downloaded' | 'failed'>('idle')

  const confetti = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        left: `${(i * 137.5) % 100}%`,
        background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        animationDuration: `${2.4 + (i % 10) * 0.35}s`,
        animationDelay: `${(i % 20) * 0.12}s`,
      })),
    [],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const share = async () => {
    setShareState('working')
    try {
      const blob = await renderShareCard({ courseTitle, moduleTitle, level, totalXp, streakWeeks })
      const result = await shareOrDownload(blob, 'gamifiedlearner-levelup.png')
      setShareState(result)
    } catch {
      setShareState('failed')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Level up! Checkpoint complete"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-700 to-violet-700 p-4"
    >
      {confetti.map((c, i) => (
        <span key={i} className="gl-confetti" style={c} aria-hidden />
      ))}
      <div className="gl-pop relative w-full max-w-lg rounded-3xl bg-white/10 p-8 text-center text-white shadow-2xl backdrop-blur-md">
        <p className="text-6xl" aria-hidden>
          🏆
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">LEVEL UP!</h1>
        <p className="mt-2 text-lg text-indigo-100">
          Checkpoint cleared: <span className="font-semibold text-white">{moduleTitle}</span>
        </p>
        <p className="text-sm text-indigo-200">{courseTitle}</p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat value={String(level)} label="Level" />
          <Stat value={`+${earnedXp}`} label="XP earned" />
          <Stat value={`${streakWeeks}w`} label="Streak" />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={share}
            disabled={shareState === 'working'}
            className="rounded-xl bg-white px-6 py-3 font-bold text-indigo-700 shadow hover:bg-indigo-50 disabled:opacity-60"
          >
            {shareState === 'working' ? 'Rendering card…' : '📤 Share'}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border-2 border-white/40 px-6 py-3 font-bold text-white hover:bg-white/10"
          >
            Keep learning →
          </button>
        </div>
        <p aria-live="polite" className="mt-3 min-h-5 text-sm text-indigo-100">
          {shareState === 'downloaded' && 'Share card saved as an image — post it anywhere!'}
          {shareState === 'shared' && 'Shared!'}
          {shareState === 'failed' && 'Could not render the share card in this browser.'}
        </p>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/15 p-3">
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs font-semibold tracking-wide text-indigo-200 uppercase">{label}</p>
    </div>
  )
}
