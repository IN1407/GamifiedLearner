/**
 * The playable tank roster. Index 0 is the starter every learner begins with;
 * indices 1..30 are unlocked by defeating the boss of the matching checkpoint.
 * Stats are derived from the tier so player tanks stay a step ahead of same-tier
 * enemies (winnable) while still ramping across the campaign.
 */
import type { TankDef, TankStats } from './types'

/** Player hull stats for a given tier (0 = starter). */
function playerStats(tier: number): TankStats {
  return {
    maxHp: 90 + tier * 14,
    speed: 4.2 + tier * 0.05,
    damage: 12 + tier * 2.2,
    fireRate: 1.1 + tier * 0.02,
    shellSpeed: 20 + tier * 0.3,
    turnSpeed: 2.6 + tier * 0.02,
  }
}

/** Display names, tier by tier. Kept punchy and kid-friendly. */
const NAMES = [
  'Cadet', // 0 starter
  'Badger', 'Ironclad', 'Viper', 'Rhino', 'Falcon',
  'Titan', 'Cobra', 'Boulder', 'Comet', 'Panther',
  'Vortex', 'Mammoth', 'Raptor', 'Avalanche', 'Phoenix',
  'Warlock', 'Juggernaut', 'Cyclone', 'Dreadnought', 'Griffin',
  'Bastion', 'Nova', 'Leviathan', 'Tempest', 'Colossus',
  'Wraith', 'Behemoth', 'Kraken', 'Overlord', 'Sovereign',
]

/** Hull colour palette; cycled so every tank looks distinct from its neighbours. */
const HULLS = [
  '#5b8c5a', '#4a6fa5', '#8c4a4a', '#6b6b6b', '#4a8c8c',
  '#8c6f4a', '#5a4a8c', '#8c8c4a', '#4a8c5a', '#8c4a7a',
]
const ACCENTS = [
  '#c8e6c9', '#bbdefb', '#ffcdd2', '#e0e0e0', '#b2dfdb',
  '#ffe0b2', '#d1c4e9', '#fff9c4', '#c8e6c9', '#f8bbd0',
]

const BLURBS = [
  'Reliable and easy to drive — your first tank.',
  'A tough little scrapper with a quick reload.',
  'Heavy plating shrugs off early enemy fire.',
  'Fast and venomous — hits before it is hit.',
  'Charges straight through enemy lines.',
  'Light, swift, and deadly accurate.',
  'A walking fortress with a huge gun.',
  'Strikes fast and slips away.',
  'Slow but nearly unstoppable.',
  'Blazing speed with a punchy cannon.',
  'Silent, sleek, and merciless.',
  'A storm of shells in tank form.',
  'Enormous hull, enormous firepower.',
  'Agile hunter that never misses.',
  'Buries enemies under raw force.',
  'Rises stronger after every battle.',
  'Bends the battlefield to its will.',
  'The heaviest hitter of its age.',
  'Spins up a whirlwind of fire.',
  'Feared across every checkpoint.',
  'Swoops in with overwhelming power.',
  'An immovable, unbreakable wall.',
  'Bright, fast, and explosive.',
  'A monster dragged up from the depths.',
  'Wild, fast, and full of fury.',
  'Towering armour and crushing shells.',
  'Haunts the battlefield at full speed.',
  'Sheer mass turned into a weapon.',
  'Many-barrelled terror of the arena.',
  'Commands the field like a king.',
  'The ultimate machine — champion of all 30.',
]

/** The complete roster: 31 tanks (starter + one per checkpoint). */
export const TANKS: TankDef[] = NAMES.map((name, tier) => ({
  id: tier === 0 ? 'starter' : `tank-${tier}`,
  name,
  blurb: BLURBS[tier] ?? 'A battle-hardened war machine.',
  tier,
  hull: HULLS[tier % HULLS.length],
  accent: ACCENTS[tier % ACCENTS.length],
  stats: playerStats(tier),
}))

export const STARTER_TANK_ID = TANKS[0].id

/** Look up a tank by id, falling back to the starter if unknown. */
export function getTank(id: string): TankDef {
  return TANKS.find((t) => t.id === id) ?? TANKS[0]
}

/** The tank unlocked by clearing the boss of a given checkpoint (0-indexed). */
export function tankUnlockedByCheckpoint(checkpoint: number): TankDef {
  const idx = Math.min(checkpoint + 1, TANKS.length - 1)
  return TANKS[idx]
}
