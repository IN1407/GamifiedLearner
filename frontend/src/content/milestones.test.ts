import { describe, expect, it } from 'vitest'
import type { LessonProgress } from '../lib/db'
import { courses, flattenLessons, getCourse } from './index'
import { progressKey } from './types'
import {
  MILESTONES,
  currentStatus,
  milestoneProgression,
  newlyEarnedMilestone,
  nextStatus,
  unlockedMilestones,
} from './milestones'

type Progress = Record<string, LessonProgress>

function mark(courseId: string, moduleId: string, lessonId: string): LessonProgress {
  return {
    lessonId: progressKey(courseId, moduleId, lessonId),
    courseId,
    moduleId,
    status: 'completed',
    xpEarned: 1,
    completedAt: 1,
  }
}

function completeModule(progress: Progress, courseId: string, moduleId: string): void {
  const module = getCourse(courseId)!.modules.find((m) => m.id === moduleId)!
  for (const l of module.lessons) progress[progressKey(courseId, moduleId, l.id)] = mark(courseId, moduleId, l.id)
}

function completeCourse(progress: Progress, courseId: string): void {
  for (const { module, lesson } of flattenLessons(getCourse(courseId)!)) {
    progress[progressKey(courseId, module.id, lesson.id)] = mark(courseId, module.id, lesson.id)
  }
}

describe('milestones config', () => {
  it('has stable, unique ids and strictly increasing order', () => {
    const ids = MILESTONES.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    const orders = MILESTONES.map((m) => m.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
    expect(new Set(orders).size).toBe(orders.length)
  })
})

describe('status derivation', () => {
  it('empty progress: no status, first milestone is the next target', () => {
    const p: Progress = {}
    expect(unlockedMilestones(p)).toEqual([])
    expect(currentStatus(p)).toBeNull()
    expect(nextStatus(p)!.id).toBe('python-core')
  })

  it('completing an early module unlocks its milestone as current', () => {
    const p: Progress = {}
    completeModule(p, 'course1', 'm03-intermediate')
    expect(currentStatus(p)!.id).toBe('python-core')
    expect(nextStatus(p)!.id).toBe('backend-builder')
  })

  it('a partially-complete module does NOT unlock its milestone', () => {
    const p: Progress = {}
    completeModule(p, 'course1', 'm03-intermediate')
    // remove one lesson to break completeness
    const someKey = Object.keys(p)[0]
    delete p[someKey]
    expect(unlockedMilestones(p).some((m) => m.id === 'python-core')).toBe(false)
  })

  it('finishing course 1 makes course1-complete the current status', () => {
    const p: Progress = {}
    completeCourse(p, 'course1')
    expect(currentStatus(p)!.id).toBe('course1-complete')
    // all earlier module milestones are also unlocked (highest-order wins as current)
    const ids = unlockedMilestones(p).map((m) => m.id)
    expect(ids).toContain('python-core')
    expect(ids).toContain('backend-builder')
    expect(ids).toContain('transformer-internals')
    expect(nextStatus(p)!.id).toBe('course2-complete')
  })

  it('finishing every course unlocks the terminal AI Power User status', () => {
    const p: Progress = {}
    for (const c of courses) completeCourse(p, c.id)
    expect(currentStatus(p)!.id).toBe('all-complete')
    expect(nextStatus(p)).toBeNull()
    // every milestone unlocked
    expect(unlockedMilestones(p).length).toBe(MILESTONES.length)
  })
})

describe('newlyEarnedMilestone', () => {
  it('detects the milestone crossed by the last lesson of course 1', () => {
    const after: Progress = {}
    completeCourse(after, 'course1')
    // "before" = everything except the final lesson
    const flat = flattenLessons(getCourse('course1')!)
    const last = flat[flat.length - 1]
    const before: Progress = { ...after }
    delete before[progressKey('course1', last.module.id, last.lesson.id)]

    const earned = newlyEarnedMilestone(before, after)
    expect(earned!.id).toBe('course1-complete')
  })

  it('returns null when no new milestone is crossed', () => {
    const p: Progress = {}
    completeModule(p, 'course1', 'm01-fundamentals')
    expect(newlyEarnedMilestone(p, p)).toBeNull()
  })

  it('is idempotent — re-completing an already-unlocked milestone earns nothing', () => {
    const before: Progress = {}
    completeModule(before, 'course1', 'm03-intermediate')
    const after: Progress = { ...before }
    // add an unrelated completed lesson that does not finish a new module
    after[progressKey('course1', 'm04-tooling', 'zzz-not-real')] = mark('course1', 'm04-tooling', 'zzz')
    expect(newlyEarnedMilestone(before, after)).toBeNull()
  })
})

describe('milestoneProgression', () => {
  it('flags unlocked and current nodes consistently', () => {
    const p: Progress = {}
    completeModule(p, 'course1', 'm03-intermediate')
    const nodes = milestoneProgression(p)
    expect(nodes).toHaveLength(MILESTONES.length)
    const current = nodes.filter((n) => n.current)
    expect(current).toHaveLength(1)
    expect(current[0].milestone.id).toBe('python-core')
    expect(nodes.find((n) => n.milestone.id === 'python-core')!.unlocked).toBe(true)
    expect(nodes.find((n) => n.milestone.id === 'backend-builder')!.unlocked).toBe(false)
  })
})
