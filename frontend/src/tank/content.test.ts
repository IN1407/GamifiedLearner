import { describe, it, expect } from 'vitest'
import { PASSAGES, passagesForLevel, pickPassage } from './passages'
import { TANKS, getTank, tankUnlockedByCheckpoint } from './tanks'
import { ADDONS, getAddons } from './addons'
import { CHECKPOINT_COUNT } from './progression'

describe('passages', () => {
  it('every passage has a valid title, text, and exactly two questions', () => {
    for (const p of PASSAGES) {
      expect(p.title.length).toBeGreaterThan(0)
      expect(p.text.length).toBeGreaterThan(20)
      expect(p.questions).toHaveLength(2)
    }
  })

  it('every question has a correct answer inside its options', () => {
    for (const p of PASSAGES) {
      for (const q of p.questions) {
        expect(q.options.length).toBeGreaterThanOrEqual(2)
        expect(q.answer).toBeGreaterThanOrEqual(0)
        expect(q.answer).toBeLessThan(q.options.length)
        // No duplicate option text (a duplicate could create two correct answers).
        expect(new Set(q.options).size).toBe(q.options.length)
      }
    }
  })

  it('has passages for every reading level 1..5', () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      expect(passagesForLevel(level).length).toBeGreaterThanOrEqual(1)
    }
  })

  it('picks a passage deterministically and stays within the level', () => {
    const a = pickPassage(3, 7)
    const b = pickPassage(3, 7)
    expect(a.id).toBe(b.id)
    expect(a.level).toBe(3)
  })

  it('has unique passage ids', () => {
    expect(new Set(PASSAGES.map((p) => p.id)).size).toBe(PASSAGES.length)
  })
})

describe('tanks', () => {
  it('provides one starter plus one tank per checkpoint', () => {
    expect(TANKS.length).toBe(CHECKPOINT_COUNT + 1)
    expect(TANKS[0].tier).toBe(0)
  })

  it('gives stronger tanks a higher tier and more hull', () => {
    for (let i = 1; i < TANKS.length; i++) {
      expect(TANKS[i].tier).toBe(i)
      expect(TANKS[i].stats.maxHp).toBeGreaterThan(TANKS[i - 1].stats.maxHp)
    }
  })

  it('unlocks a distinct tank for each checkpoint boss', () => {
    const unlocked = new Set<string>()
    for (let cp = 0; cp < CHECKPOINT_COUNT; cp++) {
      unlocked.add(tankUnlockedByCheckpoint(cp).id)
    }
    // Each checkpoint unlocks a tank the player did not already start with.
    expect(unlocked.has(TANKS[0].id)).toBe(false)
    expect(unlocked.size).toBe(CHECKPOINT_COUNT)
  })

  it('falls back to the starter for an unknown id', () => {
    expect(getTank('does-not-exist').id).toBe(TANKS[0].id)
  })
})

describe('addons', () => {
  it('gives every tank its own upgrades and power weapons', () => {
    for (const tank of TANKS) {
      const a = getAddons(tank.id)
      expect(a.tankId).toBe(tank.id)
      expect(a.upgrades.length).toBeGreaterThan(0)
      expect(a.powerWeapons.length).toBeGreaterThan(0)
      for (const u of a.upgrades) expect(u.price).toBeGreaterThan(0)
      for (const w of a.powerWeapons) expect(w.price).toBeGreaterThan(0)
    }
  })

  it('keeps starter addons cheap and scales prices with tier', () => {
    const starter = getAddons(TANKS[0].id)
    const late = getAddons(TANKS[TANKS.length - 1].id)
    const starterMin = Math.min(...starter.upgrades.map((u) => u.price))
    const lateMin = Math.min(...late.upgrades.map((u) => u.price))
    expect(starterMin).toBeLessThanOrEqual(10)
    expect(lateMin).toBeGreaterThan(starterMin)
  })

  it('has an addon catalogue for every tank id', () => {
    expect(Object.keys(ADDONS).sort()).toEqual(TANKS.map((t) => t.id).sort())
  })
})
