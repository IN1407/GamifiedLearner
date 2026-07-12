/**
 * Milestone / achievement status system.
 *
 * Design: the set of unlocked statuses is a PURE DERIVATION of learner state —
 * the completed-lesson map plus the set of passed checkpoint assessments (both
 * persisted in IndexedDB). Nothing stores a separate "current status" counter,
 * so the status bar and share card can never drift out of sync with what the
 * learner has actually earned.
 *
 * Most statuses are gated behind a checkpoint assessment (§7): you unlock the
 * status by *passing the assessment*, not merely by scrolling through lessons.
 * The terminal "completionist" status is still derived from finishing every
 * lesson.
 *
 * Consequences that fall out for free:
 *  - Existing users are "backfilled" automatically — status is recomputed from
 *    stored state on load, no migration needed.
 *  - Unlock is idempotent (it's set membership derived from state).
 *  - Removing/renaming a milestone here just changes what's displayed; it can't
 *    corrupt stored state because there is no stored milestone state.
 *
 * Titles are deliberately "cool technical nicknames", not job titles or
 * certifications. IDs are stable and decoupled from titles so a title can be
 * reworded without breaking anything.
 */
import type { LessonProgress } from '../lib/db'
import { progressKey } from './types'
import { courses, flattenLessons, getCourse } from './index'

export type MilestoneTrigger =
  | { kind: 'assessment-passed'; assessmentId: string }
  | { kind: 'module-complete'; courseId: string; moduleId: string }
  | { kind: 'course-complete'; courseId: string }
  | { kind: 'all-courses-complete' }

/** No-op default so callers that don't track assessments still type-check. */
const NO_ASSESSMENTS: ReadonlySet<string> = new Set()

export interface MilestoneDef {
  /** stable id — never rename once shipped */
  id: string
  title: string
  subtitle: string
  /** strict total order; the current status is the highest-order unlocked one */
  order: number
  icon: string
  trigger: MilestoneTrigger
}

/**
 * Ordered milestone progression. Triggers are keyed to real curriculum
 * checkpoints (see the course/module ids in src/content). Kept intentionally
 * few and well-spaced so each one feels earned.
 */
export const MILESTONES: MilestoneDef[] = [
  {
    id: 'python-core',
    title: 'Pythonista',
    subtitle: 'Core Python fluency: types, control flow, data structures & functions.',
    order: 10,
    icon: '🐍',
    trigger: { kind: 'assessment-passed', assessmentId: 'assess-python-core' },
  },
  {
    id: 'backend-builder',
    title: 'Backend Wrangler',
    subtitle: 'You can stand up a real FastAPI service from scratch.',
    order: 20,
    icon: '⚙️',
    trigger: { kind: 'assessment-passed', assessmentId: 'assess-backend' },
  },
  {
    id: 'transformer-internals',
    title: 'Attention Alchemist',
    subtitle: 'Transformers down to attention, the KV-cache and mixture-of-experts.',
    order: 30,
    icon: '🧬',
    trigger: { kind: 'assessment-passed', assessmentId: 'assess-transformers' },
  },
  {
    id: 'course1-complete',
    title: 'Neural Architect',
    subtitle: 'The whole zero-to-shipping Python-for-AI track, done.',
    order: 40,
    icon: '🏗️',
    trigger: { kind: 'assessment-passed', assessmentId: 'assess-course1' },
  },
  {
    id: 'course2-complete',
    title: 'Prompt Whisperer',
    subtitle: 'Practical AI power-usage and prompt engineering, mastered.',
    order: 50,
    icon: '🎯',
    trigger: { kind: 'assessment-passed', assessmentId: 'assess-course2' },
  },
  {
    id: 'all-complete',
    title: 'AI Power User',
    subtitle: 'Every course in GamifiedLearner — completed.',
    order: 60,
    icon: '⚡',
    trigger: { kind: 'all-courses-complete' },
  },
]

// Defensive: guarantee the array stays strictly ordered and id-unique even if
// someone edits it carelessly later.
const BY_ORDER = [...MILESTONES].sort((a, b) => a.order - b.order)

type Progress = Record<string, LessonProgress>

function isModuleComplete(courseId: string, moduleId: string, progress: Progress): boolean {
  const course = getCourse(courseId)
  const module = course?.modules.find((m) => m.id === moduleId)
  if (!module || module.lessons.length === 0) return false
  return module.lessons.every((l) => Boolean(progress[progressKey(courseId, moduleId, l.id)]))
}

function isCourseComplete(courseId: string, progress: Progress): boolean {
  const course = getCourse(courseId)
  if (!course) return false
  const flat = flattenLessons(course)
  if (flat.length === 0) return false
  return flat.every(({ module, lesson }) => Boolean(progress[progressKey(courseId, module.id, lesson.id)]))
}

export function getMilestone(id: string): MilestoneDef | undefined {
  return MILESTONES.find((m) => m.id === id)
}

export function isMilestoneSatisfied(
  def: MilestoneDef,
  progress: Progress,
  passed: ReadonlySet<string> = NO_ASSESSMENTS,
): boolean {
  switch (def.trigger.kind) {
    case 'assessment-passed':
      return passed.has(def.trigger.assessmentId)
    case 'module-complete':
      return isModuleComplete(def.trigger.courseId, def.trigger.moduleId, progress)
    case 'course-complete':
      return isCourseComplete(def.trigger.courseId, progress)
    case 'all-courses-complete':
      return courses.every((c) => isCourseComplete(c.id, progress))
  }
}

/** All milestones the learner has earned, lowest-order first. */
export function unlockedMilestones(
  progress: Progress,
  passed: ReadonlySet<string> = NO_ASSESSMENTS,
): MilestoneDef[] {
  return BY_ORDER.filter((m) => isMilestoneSatisfied(m, progress, passed))
}

/** The learner's current status: highest-order unlocked milestone, or null. */
export function currentStatus(
  progress: Progress,
  passed: ReadonlySet<string> = NO_ASSESSMENTS,
): MilestoneDef | null {
  const unlocked = unlockedMilestones(progress, passed)
  return unlocked.length ? unlocked[unlocked.length - 1] : null
}

/** The next status to aim for: lowest-order not-yet-unlocked milestone, or null. */
export function nextStatus(
  progress: Progress,
  passed: ReadonlySet<string> = NO_ASSESSMENTS,
): MilestoneDef | null {
  return BY_ORDER.find((m) => !isMilestoneSatisfied(m, progress, passed)) ?? null
}

export interface MilestoneNode {
  milestone: MilestoneDef
  unlocked: boolean
  current: boolean
}

/** Full progression for the status bar: every milestone with its unlock state. */
export function milestoneProgression(
  progress: Progress,
  passed: ReadonlySet<string> = NO_ASSESSMENTS,
): MilestoneNode[] {
  const current = currentStatus(progress, passed)
  return BY_ORDER.map((m) => ({
    milestone: m,
    unlocked: isMilestoneSatisfied(m, progress, passed),
    current: current?.id === m.id,
  }))
}

/**
 * The milestone (if any) newly earned by moving from one state to another.
 * Returns the highest-order newly-satisfied milestone so a single action that
 * crosses two thresholds celebrates the bigger one.
 */
export function newlyEarnedMilestone(
  before: { progress: Progress; passed: ReadonlySet<string> },
  after: { progress: Progress; passed: ReadonlySet<string> },
): MilestoneDef | null {
  const had = new Set(unlockedMilestones(before.progress, before.passed).map((m) => m.id))
  const now = unlockedMilestones(after.progress, after.passed)
  const gained = now.filter((m) => !had.has(m.id))
  return gained.length ? gained[gained.length - 1] : null
}
