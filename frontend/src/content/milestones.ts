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
  /** satisfied when every non-secret milestone is earned (the surprise gate) */
  | { kind: 'all-statuses' }

/** No-op default so callers that don't track assessments still type-check. */
const NO_ASSESSMENTS: ReadonlySet<string> = new Set()

/** Each course has its OWN independent status track (a learner can do Course 2
 * first). 'secret' is a hidden surprise revealed only once it's earned. */
export type MilestoneTrack = 'course1' | 'course2' | 'secret'

export interface TrackInfo {
  id: MilestoneTrack
  label: string
}

export const TRACKS: TrackInfo[] = [
  { id: 'course1', label: 'Python for AI & Backend' },
  { id: 'course2', label: 'AI-Power Usage' },
]

export interface MilestoneDef {
  /** stable id — never rename once shipped */
  id: string
  title: string
  subtitle: string
  /** which course track this status belongs to */
  track: MilestoneTrack
  /** order WITHIN its track */
  order: number
  icon: string
  trigger: MilestoneTrigger
  /** hidden until earned — never shown as a locked node or a "next" target */
  hidden?: boolean
}

/**
 * Statuses are grouped into independent per-course tracks. Triggers are keyed to
 * real curriculum checkpoints. A hidden "surprise" unlocks only after every
 * other status across both courses is earned.
 */
export const MILESTONES: MilestoneDef[] = [
  // ---- Course 1 track ----
  {
    id: 'python-core',
    title: 'Pythonista',
    subtitle: 'Core Python fluency: types, control flow, data structures & functions.',
    track: 'course1',
    order: 10,
    icon: '🐍',
    trigger: { kind: 'assessment-passed', assessmentId: 'assess-python-core' },
  },
  {
    id: 'backend-builder',
    title: 'Backend Wrangler',
    subtitle: 'You can stand up a real FastAPI service from scratch.',
    track: 'course1',
    order: 20,
    icon: '⚙️',
    trigger: { kind: 'assessment-passed', assessmentId: 'assess-backend' },
  },
  {
    id: 'transformer-internals',
    title: 'Attention Alchemist',
    subtitle: 'Transformers down to attention, the KV-cache and mixture-of-experts.',
    track: 'course1',
    order: 30,
    icon: '🧬',
    trigger: { kind: 'assessment-passed', assessmentId: 'assess-transformers' },
  },
  {
    id: 'course1-complete',
    title: 'Neural Architect',
    subtitle: 'The whole zero-to-shipping Python-for-AI track, done.',
    track: 'course1',
    order: 40,
    icon: '🏗️',
    trigger: { kind: 'assessment-passed', assessmentId: 'assess-course1' },
  },
  // ---- Course 2 track (independent — can be earned first) ----
  {
    id: 'course2-complete',
    title: 'Prompt Whisperer',
    subtitle: 'Practical AI power-usage and prompt engineering, mastered.',
    track: 'course2',
    order: 10,
    icon: '🎯',
    trigger: { kind: 'assessment-passed', assessmentId: 'assess-course2' },
  },
  {
    id: 'course2-power',
    title: 'AI Power User',
    subtitle: 'Finished every AI-Power Usage lesson — prompting, tools, and workflow design.',
    track: 'course2',
    order: 20,
    icon: '⚡',
    trigger: { kind: 'course-complete', courseId: 'course2' },
  },
  // ---- Secret surprise (hidden until every other status is earned) ----
  {
    id: 'singularity',
    title: 'The Singularity',
    subtitle: 'You mastered every path — Python, the math, the models, and the prompts. The whole machine is yours.',
    track: 'secret',
    order: 100,
    icon: '🌌',
    hidden: true,
    trigger: { kind: 'all-statuses' },
  },
]

// Global ordering across tracks (course1 → course2 → secret), used for the
// single "current status" the share card shows. Within a track, `order` wins.
const TRACK_PRIORITY: Record<MilestoneTrack, number> = { course1: 1000, course2: 2000, secret: 9000 }
export function globalOrder(m: MilestoneDef): number {
  return TRACK_PRIORITY[m.track] + m.order
}
const BY_ORDER = [...MILESTONES].sort((a, b) => globalOrder(a) - globalOrder(b))

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
    case 'all-statuses':
      // The surprise: earned only once every non-secret status is unlocked.
      return MILESTONES.filter((m) => m.track !== 'secret').every((m) => isMilestoneSatisfied(m, progress, passed))
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

/** The next status to aim for: lowest-order not-yet-unlocked NON-HIDDEN
 * milestone (a surprise is never advertised as the next target), or null. */
export function nextStatus(
  progress: Progress,
  passed: ReadonlySet<string> = NO_ASSESSMENTS,
): MilestoneDef | null {
  return BY_ORDER.find((m) => !m.hidden && !isMilestoneSatisfied(m, progress, passed)) ?? null
}

export interface MilestoneNode {
  milestone: MilestoneDef
  unlocked: boolean
  current: boolean
}

/** Milestones in a single course track, ordered. Hidden (surprise) statuses are
 * excluded unless already unlocked. */
export function trackProgression(
  track: MilestoneTrack,
  progress: Progress,
  passed: ReadonlySet<string> = NO_ASSESSMENTS,
): MilestoneNode[] {
  const current = currentStatus(progress, passed)
  return BY_ORDER.filter((m) => m.track === track)
    .filter((m) => !m.hidden || isMilestoneSatisfied(m, progress, passed))
    .map((m) => ({
      milestone: m,
      unlocked: isMilestoneSatisfied(m, progress, passed),
      current: current?.id === m.id,
    }))
}

/** The hidden surprise milestone and whether it's been earned. */
export function secretMilestone(
  progress: Progress,
  passed: ReadonlySet<string> = NO_ASSESSMENTS,
): { milestone: MilestoneDef; unlocked: boolean } | null {
  const secret = MILESTONES.find((m) => m.track === 'secret')
  if (!secret) return null
  return { milestone: secret, unlocked: isMilestoneSatisfied(secret, progress, passed) }
}

/** Full progression across all tracks (hidden statuses only if unlocked). */
export function milestoneProgression(
  progress: Progress,
  passed: ReadonlySet<string> = NO_ASSESSMENTS,
): MilestoneNode[] {
  const current = currentStatus(progress, passed)
  return BY_ORDER.filter((m) => !m.hidden || isMilestoneSatisfied(m, progress, passed)).map((m) => ({
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
