/**
 * Combines a tank's base hull with its purchased per-tank upgrades to produce
 * the effective stats used both by the 3D engine (to drive the player tank) and
 * by the garage/shop UI (to preview a build). Pure and side-effect free.
 */
import type { PowerWeaponDef, TankDef, TankStats } from './types'
import { getTank } from './tanks'
import { getAddons } from './addons'

export interface Loadout {
  tank: TankDef
  /** Base hull stats plus every purchased upgrade folded in. */
  stats: TankStats
  /** Additional shells fired per shot beyond the primary one (spread). */
  extraBarrels: number
  /** Owned power weapons with remaining counts (only those with count > 0). */
  powerWeapons: Array<{ def: PowerWeaponDef; count: number }>
}

/** Compute effective stats for a tank given the upgrades bought for it. */
export function effectiveStats(tankId: string, upgradeIds: readonly string[]): TankStats {
  const tank = getTank(tankId)
  const { upgrades } = getAddons(tankId)
  const s: TankStats = { ...tank.stats }
  for (const id of upgradeIds) {
    const up = upgrades.find((u) => u.id === id)
    if (!up) continue
    switch (up.kind) {
      case 'maxHp':
        s.maxHp += up.amount
        break
      case 'speed':
        s.speed += up.amount
        break
      case 'fireRate':
        s.fireRate += up.amount
        break
      case 'damage':
        s.damage += up.amount
        break
      case 'extraBarrel':
        // Handled separately via extraBarrels(); does not change scalar stats.
        break
    }
  }
  return s
}

/** Total extra shells granted by purchased extra-barrel upgrades. */
export function extraBarrels(tankId: string, upgradeIds: readonly string[]): number {
  const { upgrades } = getAddons(tankId)
  let n = 0
  for (const id of upgradeIds) {
    const up = upgrades.find((u) => u.id === id)
    if (up?.kind === 'extraBarrel') n += up.amount
  }
  return n
}

/** Build the full loadout a battle should start with. */
export function computeLoadout(
  tankId: string,
  upgradeIds: readonly string[],
  weaponCounts: Readonly<Record<string, number>>,
): Loadout {
  const tank = getTank(tankId)
  const { powerWeapons } = getAddons(tankId)
  return {
    tank,
    stats: effectiveStats(tankId, upgradeIds),
    extraBarrels: extraBarrels(tankId, upgradeIds),
    powerWeapons: powerWeapons
      .map((def) => ({ def, count: weaponCounts[def.id] ?? 0 }))
      .filter((w) => w.count > 0),
  }
}
