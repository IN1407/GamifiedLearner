import type { Lesson } from '../content/types'
import type { MathLevel } from './db'

/** Concatenate a lesson's prose (at the learner's math level) for AI context. */
export function lessonContextText(lesson: Lesson, mathLevel: MathLevel): string {
  return lesson.blocks
    .filter((b) => b.type === 'md')
    .map((b) => (b.type === 'md' ? (b.levelVariants?.[mathLevel] ?? b.md) : ''))
    .join('\n\n')
    .slice(0, 8000)
}
