import { describe, expect, it } from 'vitest'
import type { LessonProgress, MasteryRecord } from '../lib/db'
import { courses, flattenLessons } from './index'
import { progressKey } from './types'
import { recommendNext } from './recommendations'

function completeAll(): Record<string, LessonProgress> {
  const p: Record<string, LessonProgress> = {}
  for (const c of courses) {
    for (const { module, lesson } of flattenLessons(c)) {
      const key = progressKey(c.id, module.id, lesson.id)
      p[key] = { lessonId: key, courseId: c.id, moduleId: module.id, status: 'completed', xpEarned: 1, completedAt: 1 }
    }
  }
  return p
}

describe('recommendNext', () => {
  it('recommends continuing the first lesson for a fresh learner', () => {
    const rec = recommendNext({}, {})
    expect(rec.kind).toBe('continue')
    expect(rec.target).toContain('/course/course1/')
  })

  it('a confidently-weak topic overrides "continue" with an explainable review', () => {
    const mastery: Record<string, MasteryRecord> = {
      'math-ai': { topicId: 'math-ai', mastery: 0.25, confidence: 0.6, attempts: 4, lastUpdated: 1 },
    }
    const rec = recommendNext({}, mastery)
    expect(rec.kind).toBe('review')
    expect(rec.title).toContain('Math for AI')
    expect(rec.reason).toContain('25%')
    expect(rec.target).toContain('m06-math')
  })

  it('does not override for a weak-but-low-confidence topic', () => {
    const mastery: Record<string, MasteryRecord> = {
      'math-ai': { topicId: 'math-ai', mastery: 0.25, confidence: 0.1, attempts: 1, lastUpdated: 1 },
    }
    expect(recommendNext({}, mastery).kind).toBe('continue')
  })

  it('reports done when every lesson is complete and no topic is weak', () => {
    const rec = recommendNext(completeAll(), {})
    expect(rec.kind).toBe('done')
  })
})
