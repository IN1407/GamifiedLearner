import type { MathLevel } from '../lib/db'

/** Difficulty scales XP: quiz question = 5×d, code exercise = 20×d, prompt exercise = 25×d. */
export type Difficulty = 1 | 2 | 3

export interface MCQQuestion {
  kind: 'mcq'
  id: string
  prompt: string // markdown (KaTeX supported)
  choices: string[]
  answerIndex: number
  difficulty: Difficulty
}

export interface ShortQuestion {
  kind: 'short'
  id: string
  prompt: string
  /** normalized (trim/lowercase) accepted answers */
  acceptableAnswers: string[]
  difficulty: Difficulty
}

export type Question = MCQQuestion | ShortQuestion

export interface Quiz {
  id: string
  title?: string
  questions: Question[]
}

export interface CodeExercise {
  id: string
  title: string
  instructions: string // markdown
  starterCode: string
  /**
   * Authoring/CI safety net only: reference tests that authors' solutions must
   * pass (run in CI by test_exercise_solutions.py). Learner code is NEVER run
   * against these — the app verifies learner submissions statically instead.
   */
  tests: { name: string; code: string }[]
  difficulty: Difficulty
  /** ask connected AI for qualitative style + correctness feedback after checks pass */
  aiFeedback?: boolean
  rubric?: string
  /**
   * Optional structural requirements checked statically (no execution). When
   * omitted, the backend derives them from the starter's function stubs.
   */
  requirements?: {
    mustDefine?: { name: string; minArgs?: number }[]
    mustUse?: ('loop' | 'comprehension' | 'conditional' | 'try' | 'with' | 'return')[]
    mustNotImport?: string[]
  }
}

export interface PromptExercise {
  id: string
  title: string
  instructions: string // markdown
  rubric: string
  placeholder?: string
  difficulty: Difficulty
}

export type VizKind =
  | 'attention'
  | 'gradientDescent'
  | 'softmax'
  | 'tokenizer'
  | 'similarity'
  | 'chunking'

export type Block =
  | {
      type: 'md'
      md: string
      /** adaptive scaffolding: extra/alternative markdown per math level */
      levelVariants?: Partial<Record<MathLevel, string>>
    }
  | { type: 'quiz'; quiz: Quiz }
  | { type: 'exercise'; exercise: CodeExercise }
  | { type: 'promptExercise'; exercise: PromptExercise }
  | { type: 'viz'; viz: VizKind; caption?: string }

export interface Lesson {
  id: string
  title: string
  /** checkpoints end a module and trigger the Level Up screen */
  kind: 'lesson' | 'checkpoint'
  blocks: Block[]
}

export interface Module {
  id: string
  title: string
  summary: string
  lessons: Lesson[]
}

export interface Course {
  id: string
  title: string
  tagline: string
  description: string
  accent: string // tailwind-friendly hex for course card accents
  modules: Module[]
}

export const progressKey = (courseId: string, moduleId: string, lessonId: string) =>
  `${courseId}/${moduleId}/${lessonId}`

/** XP for completing one lesson's interactive blocks, all-correct. */
export function lessonMaxXp(lesson: Lesson): number {
  let xp = 10 // completion bonus
  for (const b of lesson.blocks) {
    if (b.type === 'quiz') for (const q of b.quiz.questions) xp += 5 * q.difficulty
    else if (b.type === 'exercise') xp += 20 * b.exercise.difficulty
    else if (b.type === 'promptExercise') xp += 25 * b.exercise.difficulty
  }
  if (lesson.kind === 'checkpoint') xp += 50
  return xp
}
