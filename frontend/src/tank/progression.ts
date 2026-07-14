/**
 * Pure progression maths for the campaign: how many checkpoints/battles exist,
 * how strong enemies and bosses get, how coins are earned, and how shop prices
 * scale. Everything here is deterministic and unit-tested so the balance can be
 * reasoned about without launching the 3D engine.
 */
import type { TankStats } from './types'

/** Total checkpoints in the campaign. */
export const CHECKPOINT_COUNT = 30
/** Normal battles the player clears before each checkpoint boss. */
export const BATTLES_PER_CHECKPOINT = 10
/** Normal tanks spawned in a single battle. */
export const ENEMIES_PER_BATTLE = 3
/** Guard tanks that protect the boss and must be cleared first. */
export const BOSS_GUARDS = 3

/** Coins awarded per this many normal tanks destroyed. */
export const TANKS_PER_COIN = 5
/** Coins granted for finishing a checkpoint boss. */
export const COINS_PER_BOSS = 10

/**
 * Enemy stats for a given checkpoint (0-indexed). Enemies get stronger only at
 * checkpoint boundaries, never between the 10 battles inside a checkpoint, so
 * this is keyed purely on the checkpoint index.
 */
export function enemyStats(checkpoint: number): TankStats {
  const t = clampCheckpoint(checkpoint)
  return {
    maxHp: 28 + t * 10,
    speed: 3.2 + t * 0.05,
    damage: 6 + t * 1.6,
    fireRate: 0.6 + t * 0.02,
    shellSpeed: 14 + t * 0.3,
    turnSpeed: 1.8 + t * 0.02,
  }
}

/**
 * Boss stats for a checkpoint. `defeatable` is the weakened second-chance form
 * the player faces after passing the reading gate; the first form is rendered
 * invulnerable by the engine, so only the beatable form needs real numbers.
 */
export function bossStats(checkpoint: number): TankStats {
  const t = clampCheckpoint(checkpoint)
  return {
    maxHp: 220 + t * 90,
    speed: 2.6 + t * 0.04,
    damage: 12 + t * 2.4,
    fireRate: 0.8 + t * 0.03,
    shellSpeed: 16 + t * 0.35,
    turnSpeed: 1.4 + t * 0.02,
  }
}

/** Clamp a checkpoint index into the valid campaign range. */
export function clampCheckpoint(checkpoint: number): number {
  if (checkpoint < 0) return 0
  if (checkpoint > CHECKPOINT_COUNT - 1) return CHECKPOINT_COUNT - 1
  return checkpoint
}

/**
 * Given a running total of normal tanks destroyed before and after a battle,
 * return how many whole coins that battle just earned (1 coin per 5 tanks).
 */
export function coinsForTankMilestones(prevTotal: number, newTotal: number): number {
  return Math.floor(newTotal / TANKS_PER_COIN) - Math.floor(prevTotal / TANKS_PER_COIN)
}

/**
 * Rough coins a diligent player accumulates by the time they *reach* a given
 * checkpoint. Used to keep shop prices affordable for the tier they unlock at.
 */
export function expectedCoinsByCheckpoint(checkpoint: number): number {
  const t = clampCheckpoint(checkpoint)
  // Per checkpoint: 10 battles * 3 enemies + 3 guards = 33 tanks -> 6 coins,
  // plus 10 for the boss = 16 coins/checkpoint.
  const perCheckpoint =
    Math.floor((BATTLES_PER_CHECKPOINT * ENEMIES_PER_BATTLE + BOSS_GUARDS) / TANKS_PER_COIN) +
    COINS_PER_BOSS
  return perCheckpoint * t
}

/**
 * The reading-difficulty band appropriate for a checkpoint. Bands ramp from 1
 * (very early readers) to 5 across the 30 checkpoints so the reading grows with
 * the player.
 */
export function readingLevelForCheckpoint(checkpoint: number): 1 | 2 | 3 | 4 | 5 {
  const t = clampCheckpoint(checkpoint)
  const band = Math.min(5, Math.floor(t / 6) + 1)
  return band as 1 | 2 | 3 | 4 | 5
}
