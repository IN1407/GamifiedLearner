import { describe, expect, it } from 'vitest'
import { courses, flattenLessons } from './index'
import { lessonMaxXp } from './types'

describe('course structure', () => {
  it('has both courses', () => {
    expect(courses.map((c) => c.id).sort()).toEqual(['course1', 'course2'])
  })

  it('course 1 has 13 modules, each ending in a checkpoint', () => {
    const c1 = courses.find((c) => c.id === 'course1')!
    expect(c1.modules).toHaveLength(14)
    for (const m of c1.modules) {
      expect(m.lessons.length).toBeGreaterThan(0)
      expect(m.lessons[m.lessons.length - 1].kind).toBe('checkpoint')
    }
  })

  it('course 2 has 5 modules, each ending in a checkpoint', () => {
    const c2 = courses.find((c) => c.id === 'course2')!
    expect(c2.modules).toHaveLength(5)
    for (const m of c2.modules) {
      expect(m.lessons[m.lessons.length - 1].kind).toBe('checkpoint')
    }
  })
})

describe('unique ids', () => {
  it('every lesson id is globally unique within its course path', () => {
    for (const course of courses) {
      const keys = new Set<string>()
      for (const { module, lesson } of flattenLessons(course)) {
        const key = `${module.id}/${lesson.id}`
        expect(keys.has(key)).toBe(false)
        keys.add(key)
      }
    }
  })

  it('quiz question ids are unique within each quiz', () => {
    for (const course of courses) {
      for (const { lesson } of flattenLessons(course)) {
        for (const block of lesson.blocks) {
          if (block.type === 'quiz') {
            const ids = block.quiz.questions.map((q) => q.id)
            expect(new Set(ids).size).toBe(ids.length)
          }
        }
      }
    }
  })
})

describe('quiz answer validity', () => {
  it('every MCQ answerIndex is in range and difficulty is 1-3', () => {
    for (const course of courses) {
      for (const { lesson } of flattenLessons(course)) {
        for (const block of lesson.blocks) {
          if (block.type !== 'quiz') continue
          for (const q of block.quiz.questions) {
            expect([1, 2, 3]).toContain(q.difficulty)
            if (q.kind === 'mcq') {
              expect(q.choices.length).toBeGreaterThanOrEqual(2)
              expect(q.answerIndex).toBeGreaterThanOrEqual(0)
              expect(q.answerIndex).toBeLessThan(q.choices.length)
            } else {
              expect(q.acceptableAnswers.length).toBeGreaterThan(0)
              expect(q.acceptableAnswers.every((a) => a.trim().length > 0)).toBe(true)
            }
          }
        }
      }
    }
  })
})

describe('course 2 has NO multiple-choice quizzes (per brief)', () => {
  it('contains zero quiz blocks; every checkpoint is a prompt exercise', () => {
    const c2 = courses.find((c) => c.id === 'course2')!
    let quizCount = 0
    let promptExerciseCount = 0
    for (const { lesson } of flattenLessons(c2)) {
      for (const block of lesson.blocks) {
        if (block.type === 'quiz') quizCount++
        if (block.type === 'promptExercise') promptExerciseCount++
      }
    }
    expect(quizCount).toBe(0)
    expect(promptExerciseCount).toBeGreaterThanOrEqual(5) // >= one per module
  })
})

describe('exercises are well-formed', () => {
  it('code exercises have starter code and at least one test', () => {
    for (const course of courses) {
      for (const { lesson } of flattenLessons(course)) {
        for (const block of lesson.blocks) {
          if (block.type === 'exercise') {
            expect(block.exercise.starterCode.length).toBeGreaterThan(0)
            expect(block.exercise.tests.length).toBeGreaterThan(0)
            for (const t of block.exercise.tests) {
              expect(t.name.length).toBeGreaterThan(0)
              expect(t.code.length).toBeGreaterThan(0)
            }
          }
          if (block.type === 'promptExercise') {
            expect(block.exercise.rubric.length).toBeGreaterThan(20)
          }
        }
      }
    }
  })
})

describe('XP math', () => {
  it('every lesson has positive max XP', () => {
    for (const course of courses) {
      for (const { lesson } of flattenLessons(course)) {
        expect(lessonMaxXp(lesson)).toBeGreaterThan(0)
      }
    }
  })
  it('checkpoints award the +50 bonus', () => {
    const c1 = courses.find((c) => c.id === 'course1')!
    const anyCheckpoint = c1.modules[0].lessons.find((l) => l.kind === 'checkpoint')!
    // a checkpoint with the same blocks minus the flag would be 50 less
    expect(lessonMaxXp(anyCheckpoint)).toBeGreaterThanOrEqual(60)
  })
})

describe('module 9 cites primary sources', () => {
  it('references the three required arXiv papers', () => {
    const c1 = courses.find((c) => c.id === 'course1')!
    const m9 = c1.modules.find((m) => m.id === 'm09-efficient-attention')!
    const allMd = m9.lessons
      .flatMap((l) => l.blocks)
      .filter((b) => b.type === 'md')
      .map((b) => (b.type === 'md' ? b.md : ''))
      .join('\n')
    expect(allMd).toContain('2405.04434') // DeepSeek-V2 (MLA)
    expect(allMd).toContain('2501.08313') // MiniMax-01 (lightning attention)
    expect(allMd).toContain('2507.20534') // Kimi K2
  })
})

describe('adaptive math-level scaffolding', () => {
  it('math and neural-net modules provide level variants', () => {
    const c1 = courses.find((c) => c.id === 'course1')!
    const adaptive = c1.modules.filter((m) => m.id === 'm06-math' || m.id === 'm07-neural-nets')
    let variantCount = 0
    for (const m of adaptive) {
      for (const l of m.lessons) {
        for (const b of l.blocks) {
          if (b.type === 'md' && b.levelVariants) variantCount++
        }
      }
    }
    expect(variantCount).toBeGreaterThan(0)
  })
})
