import { describe, expect, it } from 'vitest'
import type { LessonProgress } from '../lib/db'
import { courses, flattenLessons, getCourse } from './index'
import { progressKey } from './types'
import {
  MILESTONES,
  currentStatus,
  getMilestone,
  milestoneProgression,
  newlyEarnedMilestone,
  nextStatus,
  secretMilestone,
  trackProgression,
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

function completeCourse(progress: Progress, courseId: string): void {
  for (const { module, lesson } of flattenLessons(getCourse(courseId)!)) {
    progress[progressKey(courseId, module.id, lesson.id)] = mark(courseId, module.id, lesson.id)
  }
}

// Passing every non-secret status: all four Course-1 assessments + the Course-2
// assessment, plus finishing every Course-2 lesson (course2-power).
const ALL_ASSESSMENTS = new Set([
  'assess-python-core',
  'assess-backend',
  'assess-transformers',
  'assess-course1',
  'assess-course2',
])

describe('milestones config', () => {
  it('has stable, unique ids and per-track increasing order', () => {
    const ids = MILESTONES.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const track of ['course1', 'course2', 'secret'] as const) {
      const orders = MILESTONES.filter((m) => m.track === track).map((m) => m.order)
      expect(orders).toEqual([...orders].sort((a, b) => a - b))
      expect(new Set(orders).size).toBe(orders.length)
    }
  })

  it('keeps all present status names', () => {
    const titles = MILESTONES.map((m) => m.title)
    for (const name of ['Pythonista', 'Backend Wrangler', 'Attention Alchemist', 'Neural Architect', 'Prompt Whisperer', 'AI Power User']) {
      expect(titles).toContain(name)
    }
  })

  it('has exactly one hidden secret status', () => {
    const secret = MILESTONES.filter((m) => m.hidden)
    expect(secret).toHaveLength(1)
    expect(secret[0].track).toBe('secret')
  })
})

describe('per-course tracks are independent', () => {
  it('Course 2 statuses can be earned first, without any Course 1 progress', () => {
    const p: Progress = {}
    completeCourse(p, 'course2')
    const passed = new Set(['assess-course2'])
    const ids = unlockedMilestones(p, passed).map((m) => m.id)
    expect(ids).toContain('course2-complete') // Prompt Whisperer
    expect(ids).toContain('course2-power') // AI Power User (all course2 lessons)
    // no course1 statuses leaked in
    expect(ids).not.toContain('python-core')
    expect(ids).not.toContain('course1-complete')
  })

  it('trackProgression returns only that track and hides the secret while locked', () => {
    const c1 = trackProgression('course1', {}, new Set(['assess-python-core']))
    expect(c1.every((n) => n.milestone.track === 'course1')).toBe(true)
    expect(c1.find((n) => n.milestone.id === 'python-core')!.unlocked).toBe(true)
    // secret track shows nothing until earned
    expect(trackProgression('secret', {}, new Set())).toHaveLength(0)
  })
})

describe('the hidden surprise status', () => {
  it('is never advertised as the next target while locked', () => {
    // even one step away, next status must be a visible one, never the secret
    const p: Progress = {}
    completeCourse(p, 'course2')
    const next = nextStatus(p, new Set(['assess-python-core', 'assess-backend', 'assess-transformers', 'assess-course1', 'assess-course2']))
    // everything visible is done, so no next visible status remains
    expect(next?.id).not.toBe('singularity')
  })

  it('unlocks only after every non-secret status is earned', () => {
    const p: Progress = {}
    completeCourse(p, 'course2')
    // missing course1 assessments -> secret locked
    expect(secretMilestone(p, new Set(['assess-course2']))!.unlocked).toBe(false)
    // now earn everything
    for (const c of courses) completeCourse(p, c.id)
    const s = secretMilestone(p, ALL_ASSESSMENTS)!
    expect(s.unlocked).toBe(true)
    expect(s.milestone.title).toBe('The Singularity')
    // and it becomes the current (highest) status
    expect(currentStatus(p, ALL_ASSESSMENTS)!.id).toBe('singularity')
  })
})

describe('status derivation', () => {
  it('empty state: no status, python-core is the first target', () => {
    expect(currentStatus({}, new Set())).toBeNull()
    expect(nextStatus({}, new Set())!.id).toBe('python-core')
  })

  it('completing lessons alone does NOT unlock an assessment-gated status', () => {
    const p: Progress = {}
    completeCourse(p, 'course1')
    const ids = unlockedMilestones(p, new Set()).map((m) => m.id)
    expect(ids).not.toContain('python-core')
    expect(ids).not.toContain('course1-complete')
  })
})

describe('newlyEarnedMilestone', () => {
  it('detects the status crossed by passing an assessment', () => {
    const before = { progress: {}, passed: new Set<string>() }
    const after = { progress: {}, passed: new Set(['assess-python-core']) }
    expect(newlyEarnedMilestone(before, after)!.id).toBe('python-core')
  })

  it('celebrates the secret when the final action completes everything', () => {
    const done: Progress = {}
    for (const c of courses) completeCourse(done, c.id)
    // before: everything except the last course-1 assessment
    const before = { progress: done, passed: new Set(['assess-python-core', 'assess-backend', 'assess-transformers', 'assess-course2']) }
    const after = { progress: done, passed: ALL_ASSESSMENTS }
    expect(newlyEarnedMilestone(before, after)!.id).toBe('singularity')
  })
})

describe('milestoneProgression', () => {
  it('excludes the hidden secret until it is earned', () => {
    const nodes = milestoneProgression({}, new Set(['assess-python-core']))
    expect(nodes.find((n) => n.milestone.id === 'singularity')).toBeUndefined()
    const current = nodes.filter((n) => n.current)
    expect(current).toHaveLength(1)
    expect(current[0].milestone.id).toBe('python-core')
  })
})

describe('getMilestone', () => {
  it('resolves a milestone by id', () => {
    expect(getMilestone('course1-complete')!.title).toBe('Neural Architect')
    expect(getMilestone('nope')).toBeUndefined()
  })
})
