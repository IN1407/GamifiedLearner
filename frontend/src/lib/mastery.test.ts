import { describe, expect, it } from 'vitest'
import { mapMathLevelToGrade, mathTopics, recommendMathTopic, updateMastery } from './mastery'

describe('grade-level math mastery loop', () => {
  it('maps legacy math levels to grade-level entry points', () => {
    expect(mapMathLevelToGrade('middle')).toBe('grade7')
    expect(mapMathLevelToGrade('hs910')).toBe('grade9')
    expect(mapMathLevelToGrade('hs1112')).toBe('grade11')
    expect(mapMathLevelToGrade('college')).toBe('college')
  })

  it('keeps every topic tied to at least one AI use', () => {
    expect(mathTopics.length).toBeGreaterThan(5)
    for (const topic of mathTopics) expect(topic.aiUses.length).toBeGreaterThan(0)
  })

  it('updates mastery deterministically and reduces repeat farming', () => {
    const first = updateMastery(undefined, { topicId: 'vectors-dot-products', itemId: 'q1', kind: 'assessment', score: 1, at: 1 })
    const repeat = updateMastery(first, { topicId: 'vectors-dot-products', itemId: 'q1', kind: 'assessment', score: 1, at: 2 })
    const fresh = updateMastery(first, { topicId: 'vectors-dot-products', itemId: 'q2', kind: 'assessment', score: 1, at: 2 })
    expect(first.mastery).toBeGreaterThan(0.35)
    expect(fresh.mastery - first.mastery).toBeGreaterThan(repeat.mastery - first.mastery)
  })

  it('returns explainable recommendations', () => {
    const rec = recommendMathTopic('grade8', {})
    expect(rec.topic.minGrade).not.toBe('college')
    expect(rec.reason).toContain('supports')
  })
})
