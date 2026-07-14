/** Learner-facing grade options and the scaffolding blurb for each. */
import { gradeToMathLevel, type GradeLevel, type MathLevel } from '../lib/db'

export const GRADE_LEVELS: { id: GradeLevel; label: string }[] = [
  { id: 'grade5', label: 'Grade 5' },
  { id: 'grade6', label: 'Grade 6' },
  { id: 'grade7', label: 'Grade 7' },
  { id: 'grade8', label: 'Grade 8' },
  { id: 'grade9', label: 'Grade 9' },
  { id: 'grade10', label: 'Grade 10' },
  { id: 'grade11', label: 'Grade 11' },
  { id: 'grade12', label: 'Grade 12' },
  { id: 'college', label: 'College / University' },
]

export function gradeLabel(g: GradeLevel): string {
  return GRADE_LEVELS.find((x) => x.id === g)?.label ?? g
}

const MATH_BLURB: Record<MathLevel, string> = {
  middle: 'We build the AI math from scratch — fractions, ratios and “what a variable is” included. No calculus assumed.',
  hs910: 'Algebra assumed; we build vectors and calculus up step by step toward gradients and loss functions.',
  hs1112: 'Basic calculus assumed; we develop linear algebra and probability from the ground up.',
  college: 'Calculus and vectors assumed; we move faster on notation and go deeper on derivations.',
  grad: 'Full notation, terse derivations, and references to go deeper.',
}

export function gradeBlurb(g: GradeLevel): string {
  return MATH_BLURB[gradeToMathLevel(g)]
}
