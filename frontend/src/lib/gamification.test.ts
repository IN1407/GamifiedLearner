import { describe, expect, it } from 'vitest'
import { computeStreak, levelForXp, totalXp, weekStart } from './gamification'
import type { ActivityEvent } from './db'

const WEEK = 7 * 24 * 60 * 60 * 1000

function ev(ts: number, xp = 10): ActivityEvent {
  return { ts, type: 'lesson_completed', courseId: 'c', lessonId: 'l', xp }
}

describe('levelForXp', () => {
  it('starts at level 1 with 0 xp', () => {
    const { level, intoLevel } = levelForXp(0)
    expect(level).toBe(1)
    expect(intoLevel).toBe(0)
  })
  it('reaches level 2 at 100 xp', () => {
    expect(levelForXp(100).level).toBe(2)
    expect(levelForXp(99).level).toBe(1)
  })
  it('is monotonic', () => {
    let prev = 1
    for (let xp = 0; xp < 5000; xp += 37) {
      const l = levelForXp(xp).level
      expect(l).toBeGreaterThanOrEqual(prev)
      prev = l
    }
  })
  it('reports progress within the level correctly', () => {
    const { intoLevel, needed } = levelForXp(150)
    expect(intoLevel).toBe(50) // 150 - 100 threshold
    expect(needed).toBeGreaterThan(0)
  })
})

describe('totalXp', () => {
  it('sums event xp', () => {
    expect(totalXp([ev(1, 10), ev(2, 25), ev(3, 5)])).toBe(40)
  })
  it('is 0 for no events', () => {
    expect(totalXp([])).toBe(0)
  })
})

describe('weekStart', () => {
  it('is idempotent within a week', () => {
    const now = Date.now()
    const w = weekStart(now)
    expect(weekStart(w)).toBe(w)
    expect(weekStart(w + 3 * 24 * 3600 * 1000)).toBe(w)
  })
  it('returns a Monday', () => {
    const w = weekStart(Date.now())
    expect(new Date(w).getDay()).toBe(1) // Monday
  })
})

describe('computeStreak', () => {
  const now = new Date('2026-07-08T12:00:00').getTime() // a Wednesday
  const thisWeek = weekStart(now)

  it('counts this week met', () => {
    const events = [ev(thisWeek), ev(thisWeek + 1000), ev(thisWeek + 2000)]
    const s = computeStreak(events, 3, now)
    expect(s.thisWeekCount).toBe(3)
    expect(s.thisWeekMet).toBe(true)
    expect(s.streakWeeks).toBe(1)
  })

  it('an unmet in-progress week does not break the prior streak', () => {
    // last week met (3), this week only 1 so far (commitment 3)
    const events = [
      ev(thisWeek - WEEK),
      ev(thisWeek - WEEK + 1),
      ev(thisWeek - WEEK + 2),
      ev(thisWeek), // only 1 this week
    ]
    const s = computeStreak(events, 3, now)
    expect(s.thisWeekMet).toBe(false)
    expect(s.streakWeeks).toBe(1) // last week still counts
  })

  it('counts consecutive met weeks', () => {
    const events = [
      ...[0, 1, 2].map((i) => ev(thisWeek - 2 * WEEK + i)),
      ...[0, 1, 2].map((i) => ev(thisWeek - WEEK + i)),
      ...[0, 1, 2].map((i) => ev(thisWeek + i)),
    ]
    const s = computeStreak(events, 3, now)
    expect(s.streakWeeks).toBe(3)
  })

  it('a gap breaks the streak', () => {
    const events = [
      ...[0, 1, 2].map((i) => ev(thisWeek - 3 * WEEK + i)), // met
      // 2 weeks ago: nothing (gap)
      ...[0, 1, 2].map((i) => ev(thisWeek + i)), // met this week
    ]
    const s = computeStreak(events, 3, now)
    expect(s.streakWeeks).toBe(1) // only current run
  })

  it('zero events = zero streak', () => {
    const s = computeStreak([], 3, now)
    expect(s.streakWeeks).toBe(0)
    expect(s.thisWeekCount).toBe(0)
  })
})
