/**
 * Adaptive next-action recommendation (§12.3). Deterministic and explainable:
 * demonstrated mastery can override "just continue" — a weak topic is surfaced
 * for review before pushing forward. The AI never drives this; it's pure logic.
 */
import type { LessonProgress, MasteryRecord } from '../lib/db'
import { courses, firstIncomplete, getCourse } from './index'
import { MODULE_TOPICS, weakestTopics } from './mastery'

export interface Recommendation {
  kind: 'review' | 'continue' | 'done'
  title: string
  reason: string
  target: string // route
}

/** Locate the course + first lesson for a module id. */
function moduleEntry(moduleId: string): { courseId: string; lessonId: string } | null {
  for (const c of courses) {
    const m = c.modules.find((mod) => mod.id === moduleId)
    if (m && m.lessons.length) return { courseId: c.id, lessonId: m.lessons[0].id }
  }
  return null
}

function firstModuleForTopic(topicId: string): string | null {
  const entry = Object.entries(MODULE_TOPICS).find(([, topics]) => topics.includes(topicId))
  return entry ? entry[0] : null
}

export function recommendNext(
  progress: Record<string, LessonProgress>,
  mastery: Record<string, MasteryRecord>,
): Recommendation {
  // 1) A confidently-weak topic overrides "just continue" — review it first.
  const weak = weakestTopics(mastery, 1)
  if (weak.length && weak[0].record.mastery < 0.5 && weak[0].record.confidence >= 0.3) {
    const topic = weak[0]
    const moduleId = firstModuleForTopic(topic.def.id)
    const entry = moduleId ? moduleEntry(moduleId) : null
    if (entry) {
      return {
        kind: 'review',
        title: `Review: ${topic.def.label}`,
        reason: `Your ${topic.def.label} mastery is ${Math.round(topic.record.mastery * 100)}% — a quick review will solidify it before you move on.`,
        target: `/course/${entry.courseId}/${moduleId}/${entry.lessonId}`,
      }
    }
  }

  // 2) Otherwise continue the first unfinished lesson across the courses.
  for (const c of courses) {
    const next = firstIncomplete(c, progress)
    if (next) {
      return {
        kind: 'continue',
        title: `Continue: ${next.lesson.title}`,
        reason: `Pick up where you left off in ${c.title}.`,
        target: `/course/${c.id}/${next.module.id}/${next.lesson.id}`,
      }
    }
  }

  // 3) Everything is complete.
  const home = getCourse(courses[0].id)
  return {
    kind: 'done',
    title: 'All caught up!',
    reason: 'You’ve completed every lesson. Revisit weak topics or retake a checkpoint assessment to push your mastery higher.',
    target: home ? `/course/${home.id}` : '/',
  }
}
