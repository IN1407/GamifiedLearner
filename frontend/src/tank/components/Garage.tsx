import { TANKS } from '../tanks'
import { useGameStore } from '../store'
import { effectiveStats } from '../loadout'
import type { TankStats } from '../types'

/** Tank selection screen. Locked tanks show which checkpoint boss unlocks them. */
export default function Garage({ onBack }: { onBack: () => void }) {
  const unlocked = useGameStore((s) => s.unlockedTankIds)
  const selected = useGameStore((s) => s.selectedTankId)
  const selectTank = useGameStore((s) => s.selectTank)
  const upgrades = useGameStore((s) => s.upgrades)

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Header title="🏭 Garage" subtitle="Choose the tank you drive into battle" onBack={onBack} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TANKS.map((tank) => {
          const isUnlocked = unlocked.includes(tank.id)
          const isSelected = selected === tank.id
          const stats = isUnlocked ? effectiveStats(tank.id, upgrades[tank.id] ?? []) : tank.stats
          return (
            <button
              key={tank.id}
              type="button"
              disabled={!isUnlocked}
              onClick={() => selectTank(tank.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                isSelected
                  ? 'border-indigo-400 bg-indigo-500/10 ring-2 ring-indigo-400'
                  : isUnlocked
                    ? 'border-slate-700 bg-slate-900 hover:border-slate-500'
                    : 'border-slate-800 bg-slate-900/40 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                  style={{ backgroundColor: tank.hull }}
                  aria-hidden
                >
                  🛡️
                </span>
                <div>
                  <p className="font-bold text-slate-100">
                    {tank.name}{' '}
                    {isSelected && <span className="text-xs text-indigo-300">• selected</span>}
                  </p>
                  <p className="text-xs text-slate-400">
                    {isUnlocked ? `Tier ${tank.tier}` : `🔒 Beat checkpoint ${tank.tier}`}
                  </p>
                </div>
              </div>
              {isUnlocked ? (
                <StatGrid stats={stats} />
              ) : (
                <p className="mt-3 text-xs text-slate-500">{tank.blurb}</p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StatGrid({ stats }: { stats: TankStats }) {
  const rows: Array<[string, string]> = [
    ['Hull', String(Math.round(stats.maxHp))],
    ['Damage', String(Math.round(stats.damage))],
    ['Fire rate', `${stats.fireRate.toFixed(1)}/s`],
    ['Speed', stats.speed.toFixed(1)],
  ]
  return (
    <div className="mt-3 grid grid-cols-2 gap-1 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between rounded bg-slate-800/50 px-2 py-1">
          <span className="text-slate-400">{k}</span>
          <span className="font-semibold text-slate-200">{v}</span>
        </div>
      ))}
    </div>
  )
}

export function Header({
  title,
  subtitle,
  onBack,
}: {
  title: string
  subtitle: string
  onBack: () => void
}) {
  const coins = useGameStore((s) => s.coins)
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100">{title}</h1>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-amber-500/15 px-3 py-1.5 text-sm font-bold text-amber-300">
          🪙 {coins}
        </span>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          ← Back
        </button>
      </div>
    </header>
  )
}
