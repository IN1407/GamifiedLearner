/**
 * Per-tank addon catalogues. There is deliberately NO universal addon: every
 * tank owns a separate set of upgrades and power weapons, generated from its
 * tier so prices stay affordable for the point in the campaign where the tank
 * is unlocked (see progression.expectedCoinsByCheckpoint) and effects stay
 * relevant as enemies scale up.
 */
import type { PowerWeaponDef, TankAddons, UpgradeDef } from './types'
import { TANKS } from './tanks'

function upgradesForTier(tier: number): UpgradeDef[] {
  const base = 6 + tier * 4
  const barrels = tier < 15 ? 1 : 2
  return [
    {
      id: 'reinforced-hull',
      name: 'Reinforced Hull',
      description: `Bolt-on armour plates. +${30 + tier * 8} max hull HP.`,
      price: Math.round(base * 0.9),
      kind: 'maxHp',
      amount: 30 + tier * 8,
    },
    {
      id: 'turbo-treads',
      name: 'Turbo Treads',
      description: 'Upgraded tracks. +0.8 movement speed for better dodging.',
      price: Math.round(base * 0.8),
      kind: 'speed',
      amount: 0.8,
    },
    {
      id: 'auto-loader',
      name: 'Auto-Loader',
      description: 'Mechanical loader. +0.3 shells fired per second.',
      price: Math.round(base * 1.1),
      kind: 'fireRate',
      amount: 0.3,
    },
    {
      id: 'heavy-shells',
      name: 'Heavy Shells',
      description: `Denser rounds. +${5 + Math.round(tier * 1.5)} damage per shell.`,
      price: Math.round(base * 1.2),
      kind: 'damage',
      amount: 5 + Math.round(tier * 1.5),
    },
    {
      id: 'twin-barrel',
      name: barrels > 1 ? 'Quad Barrel' : 'Twin Barrel',
      description: `Extra cannon${barrels > 1 ? 's' : ''}. Fires ${barrels} more shell${
        barrels > 1 ? 's' : ''
      } in a spread.`,
      price: Math.round(base * 1.6),
      kind: 'extraBarrel',
      amount: barrels,
    },
  ]
}

function powerWeaponsForTier(tier: number): PowerWeaponDef[] {
  return [
    {
      id: 'cluster-bomb',
      name: 'Cluster Bomb',
      description: `Lob a bomb that hits every enemy nearby for ${60 + tier * 20} damage.`,
      price: 3 + Math.floor(tier * 0.8),
      kind: 'bomb',
      damage: 60 + tier * 20,
      radius: 6,
    },
    {
      id: 'airstrike',
      name: 'Airstrike',
      description: `Call in a wide blast hitting all enemies for ${120 + tier * 40} damage.`,
      price: 6 + Math.floor(tier * 1.4),
      kind: 'airstrike',
      damage: 120 + tier * 40,
      radius: 9,
    },
  ]
}

/** Addon catalogue for every tank, keyed by tank id. */
export const ADDONS: Record<string, TankAddons> = Object.fromEntries(
  TANKS.map((tank) => [
    tank.id,
    {
      tankId: tank.id,
      upgrades: upgradesForTier(tank.tier),
      powerWeapons: powerWeaponsForTier(tank.tier),
    } satisfies TankAddons,
  ]),
)

/** Look up the addon catalogue for a tank (empty catalogue if unknown). */
export function getAddons(tankId: string): TankAddons {
  return (
    ADDONS[tankId] ?? { tankId, upgrades: [], powerWeapons: [] }
  )
}

/** Find a single upgrade definition on a tank. */
export function findUpgrade(tankId: string, upgradeId: string): UpgradeDef | undefined {
  return getAddons(tankId).upgrades.find((u) => u.id === upgradeId)
}

/** Find a single power-weapon definition on a tank. */
export function findPowerWeapon(tankId: string, weaponId: string): PowerWeaponDef | undefined {
  return getAddons(tankId).powerWeapons.find((w) => w.id === weaponId)
}
