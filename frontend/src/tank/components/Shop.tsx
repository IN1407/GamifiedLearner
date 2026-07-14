import { getAddons } from '../addons'
import { getTank } from '../tanks'
import { useGameStore } from '../store'
import { Header } from './Garage'

/**
 * Per-tank shop. Every tank has its OWN upgrades and power weapons — nothing is
 * shared — so the catalogue shown always belongs to the currently selected tank.
 */
export default function Shop({ onBack }: { onBack: () => void }) {
  const tankId = useGameStore((s) => s.selectedTankId)
  const coins = useGameStore((s) => s.coins)
  const owned = useGameStore((s) => s.upgrades[tankId] ?? [])
  const powerWeapons = useGameStore((s) => s.powerWeapons)
  const buyUpgrade = useGameStore((s) => s.buyUpgrade)
  const buyPowerWeapon = useGameStore((s) => s.buyPowerWeapon)

  const tank = getTank(tankId)
  const addons = getAddons(tankId)

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Header
        title="🔧 Armoury"
        subtitle={`Upgrades & weapons for the ${tank.name}`}
        onBack={onBack}
      />

      <section aria-label="Permanent upgrades" className="mb-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
          Permanent upgrades
        </h2>
        <div className="space-y-2">
          {addons.upgrades.map((u) => {
            const isOwned = owned.includes(u.id)
            const affordable = coins >= u.price
            return (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-100">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.description}</p>
                </div>
                <button
                  type="button"
                  disabled={isOwned || !affordable}
                  onClick={() => buyUpgrade(tankId, u.id)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-sm font-bold transition ${
                    isOwned
                      ? 'bg-emerald-600/20 text-emerald-300'
                      : affordable
                        ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                        : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isOwned ? '✓ Owned' : `🪙 ${u.price}`}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section aria-label="Power weapons">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
          Power weapons (consumable)
        </h2>
        <div className="space-y-2">
          {addons.powerWeapons.map((w) => {
            const have = powerWeapons[tankId]?.[w.id] ?? 0
            return (
              <div
                key={w.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-100">
                    💣 {w.name}{' '}
                    <span className="ml-1 rounded bg-slate-800 px-1.5 text-xs text-slate-300">
                      owned: {have}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">{w.description}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {[1, 5].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      disabled={coins < w.price * qty}
                      onClick={() => buyPowerWeapon(tankId, w.id, qty)}
                      className="rounded-xl bg-amber-600 px-2.5 py-2 text-xs font-bold text-white transition enabled:hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500"
                    >
                      +{qty} · 🪙{w.price * qty}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
