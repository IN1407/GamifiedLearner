import type { Course, Lesson, Module } from './types'
import { progressKey } from './types'
import type { LessonProgress } from '../lib/db'
import { course1 } from './course1'
import { course2 } from './course2'

export const courses: Course[] = [course1, course2]

export function getCourse(id: string): Course | undefined {
  return courses.find((c) => c.id === id)
}

export interface FlatLesson {
  module: Module
  lesson: Lesson
  index: number
}

export function flattenLessons(course: Course): FlatLesson[] {
  const out: FlatLesson[] = []
  let i = 0
  for (const m of course.modules) for (const l of m.lessons) out.push({ module: m, lesson: l, index: i++ })
  return out
}

const isDone = (progress: Record<string, LessonProgress>, courseId: string, moduleId: string, lessonId: string) =>
  Boolean(progress[progressKey(courseId, moduleId, lessonId)])

/** Sequential unlock: a lesson opens when every prior lesson in the course is complete. */
export function isLessonUnlocked(
  course: Course,
  moduleId: string,
  lessonId: string,
  progress: Record<string, LessonProgress>,
): boolean {
  for (const { module, lesson } of flattenLessons(course)) {
    if (module.id === moduleId && lesson.id === lessonId) return true
    if (!isDone(progress, course.id, module.id, lesson.id)) return false
  }
  return false
}

export function moduleMasteryPct(course: Course, module: Module, progress: Record<string, LessonProgress>): number {
  const done = module.lessons.filter((l) => isDone(progress, course.id, module.id, l.id)).length
  return module.lessons.length === 0 ? 0 : Math.round((done / module.lessons.length) * 100)
}

export function courseProgressPct(course: Course, progress: Record<string, LessonProgress>): number {
  const flat = flattenLessons(course)
  const done = flat.filter(({ module, lesson }) => isDone(progress, course.id, module.id, lesson.id)).length
  return flat.length === 0 ? 0 : Math.round((done / flat.length) * 100)
}

/** "Continue where you left off": first not-yet-completed unlocked lesson. */
export function firstIncomplete(
  course: Course,
  progress: Record<string, LessonProgress>,
): FlatLesson | null {
  for (const item of flattenLessons(course)) {
    if (!isDone(progress, course.id, item.module.id, item.lesson.id)) return item
  }
  return null
}

export function lessonStatus(
  course: Course,
  moduleId: string,
  lessonId: string,
  progress: Record<string, LessonProgress>,
): 'completed' | 'unlocked' | 'locked' {
  if (isDone(progress, course.id, moduleId, lessonId)) return 'completed'
  return isLessonUnlocked(course, moduleId, lessonId, progress) ? 'unlocked' : 'locked'
}
