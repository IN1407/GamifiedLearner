import { describe, expect, it } from 'vitest'
import type { MasteryRecord } from '../lib/db'
import {
  MODULE_TOPICS,
  TOPICS,
  masteryBand,
  summarizeByDomain,
  topicsForModule,
  updateMastery,
  weakestTopics,
} from './mastery'

describe('taxonomy', () => {
  it('every mapped module points at a real topic id', () => {
    const ids = new Set(TOPICS.map((t) => t.id))
    for (const [mod, topics] of Object.entries(MODULE_TOPICS)) {
      for (const t of topics) expect(ids.has(t), `${mod} -> ${t}`).toBe(true)
    }
  })
  it('topicsForModule returns [] for unknown modules', () => {
    expect(topicsForModule('nope')).toEqual([])
    expect(topicsForModule('m06-math')).toContain('math-ai')
  })
})

describe('updateMastery', () => {
  it('starts from a neutral prior and moves toward the evidence', () => {
    const good = updateMastery(undefined, 't', 1)
    expect(good.mastery).toBeGreaterThan(0.5)
    const bad = updateMastery(undefined, 't', 0)
    expect(bad.mastery).toBeLessThan(0.5)
  })

  it('is deterministic and clamps to [0,1]', () => {
    const now = 1000
    const a = updateMastery(undefined, 't', 1, 1, now)
    const b = updateMastery(undefined, 't', 1, 1, now)
    expect(a).toEqual(b)
    let r: MasteryRecord | undefined
    for (let i = 0; i < 20; i++) r = updateMastery(r, 't', 1)
    expect(r!.mastery).toBeLessThanOrEqual(1)
    expect(r!.mastery).toBeGreaterThan(0.9)
  })

  it('confidence grows with attempts and saturates at 1', () => {
    let r: MasteryRecord | undefined
    const confs: number[] = []
    for (let i = 0; i < 8; i++) {
      r = updateMastery(r, 't', 1)
      confs.push(r.confidence)
    }
    expect(confs[0]).toBeLessThan(confs[3])
    expect(confs[confs.length - 1]).toBe(1)
  })

  it('resists farming: low-weight repeats move mastery far less than full-weight evidence', () => {
    // full weight correct answer
    const full = updateMastery(undefined, 't', 1, 1)
    // same correct answer but as a near-duplicate retry (low weight)
    const farmed = updateMastery(undefined, 't', 1, 0.3)
    expect(full.mastery).toBeGreaterThan(farmed.mastery)
  })

  it('recent wrong answers pull an established mastery down', () => {
    let r: MasteryRecord | undefined
    for (let i = 0; i < 6; i++) r = updateMastery(r, 't', 1)
    const high = r!.mastery
    for (let i = 0; i < 3; i++) r = updateMastery(r, 't', 0)
    expect(r!.mastery).toBeLessThan(high)
  })
})

describe('bands', () => {
  it('low confidence reads as novice regardless of estimate', () => {
    expect(masteryBand(0.9, 0.1)).toBe('novice')
  })
  it('maps mastery to bands once confident', () => {
    expect(masteryBand(0.85, 0.8)).toBe('mastered')
    expect(masteryBand(0.65, 0.8)).toBe('proficient')
    expect(masteryBand(0.4, 0.8)).toBe('learning')
    expect(masteryBand(0.1, 0.8)).toBe('novice')
  })
})

describe('summaries', () => {
  const records: Record<string, MasteryRecord> = {
    'py-fundamentals': { topicId: 'py-fundamentals', mastery: 0.9, confidence: 1, attempts: 6, lastUpdated: 1 },
    'math-ai': { topicId: 'math-ai', mastery: 0.3, confidence: 0.5, attempts: 3, lastUpdated: 1 },
  }
  it('summarizeByDomain averages only seen topics', () => {
    const domains = summarizeByDomain(records)
    const python = domains.find((d) => d.domain === 'Python')!
    expect(python.average).toBeCloseTo(0.9)
    const untouched = domains.find((d) => d.domain === 'Prompt Engineering')!
    expect(untouched.average).toBeNull()
  })
  it('weakestTopics surfaces low-mastery seen topics', () => {
    const weak = weakestTopics(records, 3)
    expect(weak[0].def.id).toBe('math-ai')
    expect(weak.find((w) => w.def.id === 'py-fundamentals')).toBeUndefined() // 0.9 is not weak
  })
})
