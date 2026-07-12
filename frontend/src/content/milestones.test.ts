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

describe('milestones config', () => {
  it('has stable, unique ids and strictly increasing order', () => {
    const ids = MILESTONES.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    const orders = MILESTONES.map((m) => m.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
    expect(new Set(orders).size).toBe(orders.length)
  })

  it('every non-terminal milestone is gated on a checkpoint assessment', () => {
    for (const m of MILESTONES) {
      if (m.id === 'all-complete') continue
      expect(m.trigger.kind).toBe('assessment-passed')
    }
  })
})

describe('status derivation from passed assessments', () => {
  const empty: Progress = {}

  it('empty state: no status, python-core is the first target', () => {
    expect(currentStatus(empty, new Set())).toBeNull()
    expect(nextStatus(empty, new Set())!.id).toBe('python-core')
  })

  it('passing the python-core assessment unlocks Pythonista', () => {
    const passed = new Set(['assess-python-core'])
    expect(currentStatus(empty, passed)!.id).toBe('python-core')
    expect(nextStatus(empty, passed)!.id).toBe('backend-builder')
  })

  it('completing lessons alone does NOT unlock an assessment-gated status', () => {
    const p: Progress = {}
    completeCourse(p, 'course1')
    // no assessments passed => no assessment-gated milestone
    const ids = unlockedMilestones(p, new Set()).map((m) => m.id)
    expect(ids).not.toContain('python-core')
    expect(ids).not.toContain('course1-complete')
  })

  it('the terminal status is still earned by finishing every lesson', () => {
    const p: Progress = {}
    for (const c of courses) completeCourse(p, c.id)
    const ids = unlockedMilestones(p, new Set()).map((m) => m.id)
    expect(ids).toContain('all-complete')
    expect(currentStatus(p, new Set())!.id).toBe('all-complete')
  })

  it('highest-order passed assessment wins as current status', () => {
    const passed = new Set(['assess-python-core', 'assess-backend', 'assess-transformers'])
    expect(currentStatus(empty, passed)!.id).toBe('transformer-internals')
    expect(nextStatus(empty, passed)!.id).toBe('course1-complete')
  })
})

describe('newlyEarnedMilestone', () => {
  it('detects the milestone crossed by passing an assessment', () => {
    const before = { progress: {}, passed: new Set<string>() }
    const after = { progress: {}, passed: new Set(['assess-python-core']) }
    expect(newlyEarnedMilestone(before, after)!.id).toBe('python-core')
  })

  it('returns null when nothing new is crossed', () => {
    const passed = new Set(['assess-python-core'])
    expect(newlyEarnedMilestone({ progress: {}, passed }, { progress: {}, passed })).toBeNull()
  })
})

describe('milestoneProgression', () => {
  it('flags unlocked and current nodes consistently', () => {
    const passed = new Set(['assess-python-core'])
    const nodes = milestoneProgression({}, passed)
    expect(nodes).toHaveLength(MILESTONES.length)
    const current = nodes.filter((n) => n.current)
    expect(current).toHaveLength(1)
    expect(current[0].milestone.id).toBe('python-core')
    expect(nodes.find((n) => n.milestone.id === 'backend-builder')!.unlocked).toBe(false)
  })
})

describe('getMilestone', () => {
  it('resolves a milestone by id', () => {
    expect(getMilestone('course1-complete')!.title).toBe('Neural Architect')
    expect(getMilestone('nope')).toBeUndefined()
  })
})
