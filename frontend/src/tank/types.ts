/**
 * Shared types for the Tank Battle game. Kept free of runtime code so both the
 * pure data/config modules and the Three.js engine can import them without
 * pulling in heavy dependencies.
 */

/** Base combat stats a tank hull provides before per-tank upgrades. */
export interface TankStats {
  /** Maximum hull hit points. */
  maxHp: number
  /** World units travelled per second. */
  speed: number
  /** Damage per cannon shell. */
  damage: number
  /** Shells per second. */
  fireRate: number
  /** Shell travel speed (world units/sec). */
  shellSpeed: number
  /** Turret + hull turn speed (radians/sec). */
  turnSpeed: number
}

/** A playable tank the learner can unlock and drive. */
export interface TankDef {
  id: string
  name: string
  /** Short flavour line shown in the garage. */
  blurb: string
  /** 0 = starter, 1..30 = unlocked by defeating the boss of that checkpoint. */
  tier: number
  /** Hull / accent colours (hex) used by the procedural mesh builder. */
  hull: string
  accent: string
  stats: TankStats
}

/** Permanent, per-tank upgrade purchased once with coins. */
export interface UpgradeDef {
  id: string
  name: string
  description: string
  price: number
  /** Which stat/behaviour it modifies. */
  kind: UpgradeKind
  /** Magnitude of the effect (interpretation depends on kind). */
  amount: number
}

export type UpgradeKind =
  | 'extraBarrel' // fires `amount` additional shells in a spread
  | 'damage' // +amount flat shell damage
  | 'fireRate' // +amount shells/sec
  | 'maxHp' // +amount max hull HP
  | 'speed' // +amount move speed

/** Consumable power weapon bought in bulk and expended in battle. */
export interface PowerWeaponDef {
  id: string
  name: string
  description: string
  /** Coin price per unit. */
  price: number
  kind: PowerWeaponKind
  /** Damage dealt to every enemy in range. */
  damage: number
  /** Effect radius in world units. */
  radius: number
}

export type PowerWeaponKind = 'bomb' | 'airstrike'

/** The full, per-tank addon catalogue (nothing is shared between tanks). */
export interface TankAddons {
  tankId: string
  upgrades: UpgradeDef[]
  powerWeapons: PowerWeaponDef[]
}

/** A single multiple-choice question about a reading passage. */
export interface PassageQuestion {
  q: string
  options: string[]
  /** Index into `options` of the correct answer. */
  answer: number
}

/** A short reading-comprehension passage gating a boss second chance. */
export interface Passage {
  id: string
  title: string
  /** Reading difficulty band; higher bands unlock at later checkpoints. */
  level: 1 | 2 | 3 | 4 | 5
  text: string
  questions: [PassageQuestion, PassageQuestion]
}
