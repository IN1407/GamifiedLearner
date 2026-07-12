/** Shared, deterministic quiz-answer grading — used by both the in-lesson
 * QuizBlock and the checkpoint assessments so there is one source of truth. */
import type { Question } from './types'

export function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function correctAnswerText(q: Question): string {
  return q.kind === 'mcq' ? q.choices[q.answerIndex] : q.acceptableAnswers[0]
}

/** An MCQ answer is the selected index; a short answer is the typed string. */
export function isQuestionCorrect(q: Question, answer: number | string | null): boolean {
  if (q.kind === 'mcq') return typeof answer === 'number' && answer === q.answerIndex
  return typeof answer === 'string' && q.acceptableAnswers.some((a) => normalizeAnswer(a) === normalizeAnswer(answer))
}
