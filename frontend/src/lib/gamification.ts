/**
 * XP levels + weekly-commitment streaks, computed from the real-dated event
 * log in IndexedDB. Pure functions — unit-tested in isolation.
 */
import type { ActivityEvent } from './db'

// ---- levels ----
/** Level thresholds grow quadratically; level 1 starts at 0 XP. */
export function levelForXp(xp: number): { level: number; intoLevel: number; needed: number } {
  let level = 1
  let threshold = 0
  let step = 100
  while (xp >= threshold + step) {
    threshold += step
    level += 1
    step = 100 + (level - 1) * 50
  }
  return { level, intoLevel: xp - threshold, needed: step }
}

// ---- weeks ----
/** Monday-based week start (local time). */
export function weekStart(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  const day = (d.getDay() + 6) % 7 // Mon=0 ... Sun=6
  d.setDate(d.getDate() - day)
  return d.getTime()
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export interface StreakInfo {
  /** consecutive weeks meeting the commitment (current week counts once met) */
  streakWeeks: number
  thisWeekCount: number
  commitment: number
  thisWeekMet: boolean
}

export function computeStreak(
  events: ActivityEvent[],
  commitment: number,
  now: number = Date.now(),
): StreakInfo {
  const lessonEvents = events.filter(
    (e) => e.type === 'lesson_completed' || e.type === 'checkpoint_completed',
  )
  const counts = new Map<number, number>()
  for (const e of lessonEvents) {
    const w = weekStart(e.ts)
    counts.set(w, (counts.get(w) ?? 0) + 1)
  }
  const currentWeek = weekStart(now)
  const thisWeekCount = counts.get(currentWeek) ?? 0
  const thisWeekMet = thisWeekCount >= commitment

  let streak = 0
  // Anchor: this week if met, otherwise last week (an in-progress week
  // doesn't break the streak until it's over).
  let week = thisWeekMet ? currentWeek : currentWeek - WEEK_MS
  while ((counts.get(week) ?? 0) >= commitment) {
    streak += 1
    week -= WEEK_MS
  }
  return { streakWeeks: streak, thisWeekCount, commitment, thisWeekMet }
}

export function totalXp(events: ActivityEvent[]): number {
  return events.reduce((sum, e) => sum + e.xp, 0)
}
