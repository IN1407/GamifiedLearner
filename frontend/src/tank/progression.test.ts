import { describe, it, expect } from 'vitest'
import {
  CHECKPOINT_COUNT,
  bossStats,
  clampCheckpoint,
  coinsForTankMilestones,
  enemyStats,
  readingLevelForCheckpoint,
} from './progression'

describe('progression', () => {
  it('clamps checkpoints into range', () => {
    expect(clampCheckpoint(-5)).toBe(0)
    expect(clampCheckpoint(0)).toBe(0)
    expect(clampCheckpoint(29)).toBe(29)
    expect(clampCheckpoint(100)).toBe(CHECKPOINT_COUNT - 1)
  })

  it('makes enemies strictly stronger at each checkpoint', () => {
    for (let cp = 1; cp < CHECKPOINT_COUNT; cp++) {
      expect(enemyStats(cp).maxHp).toBeGreaterThan(enemyStats(cp - 1).maxHp)
      expect(enemyStats(cp).damage).toBeGreaterThan(enemyStats(cp - 1).damage)
    }
  })

  it('makes bosses tougher than same-tier normal enemies', () => {
    for (let cp = 0; cp < CHECKPOINT_COUNT; cp++) {
      expect(bossStats(cp).maxHp).toBeGreaterThan(enemyStats(cp).maxHp * 3)
    }
  })

  it('awards one coin per five tanks', () => {
    expect(coinsForTankMilestones(0, 5)).toBe(1)
    expect(coinsForTankMilestones(0, 4)).toBe(0)
    expect(coinsForTankMilestones(4, 5)).toBe(1)
    expect(coinsForTankMilestones(0, 15)).toBe(3)
    expect(coinsForTankMilestones(3, 3)).toBe(0)
  })

  it('ramps reading level from 1 to 5 across the campaign', () => {
    expect(readingLevelForCheckpoint(0)).toBe(1)
    expect(readingLevelForCheckpoint(5)).toBe(1)
    expect(readingLevelForCheckpoint(6)).toBe(2)
    expect(readingLevelForCheckpoint(29)).toBe(5)
    // Monotonic non-decreasing.
    for (let cp = 1; cp < CHECKPOINT_COUNT; cp++) {
      expect(readingLevelForCheckpoint(cp)).toBeGreaterThanOrEqual(readingLevelForCheckpoint(cp - 1))
    }
  })
})
