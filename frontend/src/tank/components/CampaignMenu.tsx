import { Link } from 'react-router-dom'
import { useGameStore, isCampaignComplete } from '../store'
import { getTank } from '../tanks'
import {
  BATTLES_PER_CHECKPOINT,
  CHECKPOINT_COUNT,
  readingLevelForCheckpoint,
} from '../progression'

/** The campaign hub: progress, the next objective, and navigation. */
export default function CampaignMenu({
  onStartBattle,
  onStartBoss,
  onGarage,
  onShop,
}: {
  onStartBattle: () => void
  onStartBoss: () => void
  onGarage: () => void
  onShop: () => void
}) {
  const checkpoint = useGameStore((s) => s.checkpoint)
  const battle = useGameStore((s) => s.battle)
  const coins = useGameStore((s) => s.coins)
  const bossesDefeated = useGameStore((s) => s.bossesDefeated)
  const selectedTankId = useGameStore((s) => s.selectedTankId)
  const done = isCampaignComplete({ bossesDefeated })

  const bossReady = battle >= BATTLES_PER_CHECKPOINT
  const tank = getTank(selectedTankId)

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100">🎯 Tank Battle Campaign</h1>
          <p className="text-sm text-slate-400">Beat 30 bosses — read your way to every second chance.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-500/15 px-3 py-1.5 text-sm font-bold text-amber-300">
            🪙 {coins}
          </span>
          <Link
            to="/"
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            🏠 Home
          </Link>
        </div>
      </header>

      {done ? (
        <div className="mb-6 rounded-3xl border border-emerald-500/40 bg-slate-900 p-6 text-center">
          <h2 className="text-2xl font-extrabold text-emerald-300">🏆 Campaign complete!</h2>
          <p className="mt-2 text-slate-300">
            You defeated all {CHECKPOINT_COUNT} bosses and read {CHECKPOINT_COUNT} passages along the
            way. You can keep replaying battles or try tougher tanks in the garage.
          </p>
        </div>
      ) : (
        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-semibold text-indigo-300">
            Checkpoint {checkpoint + 1} of {CHECKPOINT_COUNT} · Reading level{' '}
            {readingLevelForCheckpoint(checkpoint)}
          </p>
          <div className="mt-2 mb-1 flex justify-between text-xs text-slate-400">
            <span>Battles cleared this checkpoint</span>
            <span className="font-semibold">
              {Math.min(battle, BATTLES_PER_CHECKPOINT)}/{BATTLES_PER_CHECKPOINT}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-[width]"
              style={{ width: `${(Math.min(battle, BATTLES_PER_CHECKPOINT) / BATTLES_PER_CHECKPOINT) * 100}%` }}
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {bossReady ? (
              <button
                type="button"
                onClick={onStartBoss}
                className="flex-1 rounded-2xl bg-red-600 px-4 py-4 text-lg font-extrabold text-white shadow-lg transition hover:bg-red-500"
              >
                ⚔️ Face the Checkpoint {checkpoint + 1} Boss
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartBattle}
                className="flex-1 rounded-2xl bg-indigo-600 px-4 py-4 text-lg font-extrabold text-white shadow-lg transition hover:bg-indigo-500"
              >
                ▶ Start Battle {battle + 1} / {BATTLES_PER_CHECKPOINT}
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Driving the <strong className="text-slate-300">{tank.name}</strong>.{' '}
            {bossReady
              ? 'Clear the guards, then the boss. If it beats you, read a passage to earn a second chance!'
              : 'Beat every tank to win the battle. 1 coin for every 5 tanks destroyed.'}
          </p>
        </section>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onGarage}
          className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-left transition hover:border-slate-500"
        >
          <p className="text-lg font-bold text-slate-100">🏭 Garage</p>
          <p className="text-xs text-slate-400">Switch between the tanks you have unlocked</p>
        </button>
        <button
          type="button"
          onClick={onShop}
          className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-left transition hover:border-slate-500"
        >
          <p className="text-lg font-bold text-slate-100">🔧 Armoury</p>
          <p className="text-xs text-slate-400">Buy upgrades & power weapons for your tank</p>
        </button>
      </div>

      <section aria-label="Checkpoint progress">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
          The 30 checkpoints
        </h2>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
          {Array.from({ length: CHECKPOINT_COUNT }, (_, i) => {
            const state = i < bossesDefeated ? 'done' : i === checkpoint ? 'current' : 'locked'
            return (
              <div
                key={i}
                title={`Checkpoint ${i + 1}`}
                className={`flex aspect-square items-center justify-center rounded-lg text-xs font-bold ${
                  state === 'done'
                    ? 'bg-emerald-600/30 text-emerald-300 ring-1 ring-emerald-500/40'
                    : state === 'current'
                      ? 'bg-indigo-600/30 text-indigo-200 ring-2 ring-indigo-400'
                      : 'bg-slate-800/60 text-slate-500'
                }`}
              >
                {state === 'done' ? '✓' : i + 1}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
