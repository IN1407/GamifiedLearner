import { describe, expect, it } from 'vitest'
import {
  ASSESSMENT_PASS_THRESHOLD,
  ASSESSMENTS,
  assessmentForMilestone,
  assessmentMaxPoints,
  getAssessment,
  passesThreshold,
  scoreAssessment,
  type CheckpointAssessment,
} from './assessments'
import { MILESTONES } from './milestones'
import { isQuestionCorrect } from './quiz'

describe('threshold', () => {
  it('defaults to 40%', () => {
    expect(ASSESSMENT_PASS_THRESHOLD).toBe(0.4)
  })

  it('39% fails and 40% passes at the boundary', () => {
    expect(passesThreshold(0.39)).toBe(false)
    expect(passesThreshold(0.399999)).toBe(false)
    expect(passesThreshold(0.4)).toBe(true)
    expect(passesThreshold(0.41)).toBe(true)
  })
})

// A synthetic assessment: 10 one-point questions, no code. Lets us hit exact %.
function tenQuestionAssessment(): CheckpointAssessment {
  return {
    id: 'synthetic',
    milestoneId: 'python-core',
    courseId: 'course1',
    afterModuleId: 'm03-intermediate',
    title: 'Synthetic',
    intro: '',
    questions: Array.from({ length: 10 }, (_, i) => ({
      kind: 'mcq' as const,
      id: `sq${i}`,
      prompt: `q${i}`,
      choices: ['a', 'b'],
      answerIndex: 0,
      difficulty: 1 as const,
    })),
    codeTasks: [],
    reviewMap: [],
  }
}

describe('scoreAssessment', () => {
  it('scores exactly at the 40% boundary (4/10 passes, 3/10 fails)', () => {
    const a = tenQuestionAssessment()
    const answer = (correct: number) => ({
      questions: Object.fromEntries(a.questions.map((q, i) => [q.id, i < correct ? 0 : 1])),
      codePassed: {},
    })
    const four = scoreAssessment(a, answer(4))
    expect(four.fraction).toBeCloseTo(0.4)
    expect(four.passed).toBe(true)

    const three = scoreAssessment(a, answer(3))
    expect(three.fraction).toBeCloseTo(0.3)
    expect(three.passed).toBe(false)
  })

  it('weights code tasks (2 pts) above questions (1 pt)', () => {
    const a = getAssessment('assess-python-core')!
    // 0 questions right, 1 code task passed => code worth 2 of maxPoints
    const s = scoreAssessment(a, {
      questions: {},
      codePassed: { 'pc-code1': true },
    })
    expect(s.earned).toBe(2)
    expect(s.total).toBe(assessmentMaxPoints(a))
  })

  it('unanswered questions count as incorrect', () => {
    const a = tenQuestionAssessment()
    const s = scoreAssessment(a, { questions: {}, codePassed: {} })
    expect(s.earned).toBe(0)
    expect(s.passed).toBe(false)
  })

  it('perItem reports correctness for review guidance', () => {
    const a = tenQuestionAssessment()
    const s = scoreAssessment(a, {
      questions: { sq0: 0, sq1: 1 },
      codePassed: {},
    })
    expect(s.perItem.find((i) => i.id === 'sq0')!.correct).toBe(true)
    expect(s.perItem.find((i) => i.id === 'sq1')!.correct).toBe(false)
  })
})

describe('assessment ⇄ milestone wiring', () => {
  it('every assessment maps to a real milestone and vice versa', () => {
    for (const a of ASSESSMENTS) {
      expect(MILESTONES.find((m) => m.id === a.milestoneId)).toBeTruthy()
    }
    for (const m of MILESTONES) {
      if (m.trigger.kind === 'assessment-passed') {
        expect(getAssessment(m.trigger.assessmentId)).toBeTruthy()
        expect(assessmentForMilestone(m.id)).toBeTruthy()
      }
    }
  })

  it('every MCQ answerIndex is valid and short answers are non-empty', () => {
    for (const a of ASSESSMENTS) {
      for (const q of a.questions) {
        if (q.kind === 'mcq') {
          expect(q.answerIndex).toBeGreaterThanOrEqual(0)
          expect(q.answerIndex).toBeLessThan(q.choices.length)
          // the correct choice should grade as correct
          expect(isQuestionCorrect(q, q.answerIndex)).toBe(true)
        } else {
          expect(q.acceptableAnswers.length).toBeGreaterThan(0)
          expect(isQuestionCorrect(q, q.acceptableAnswers[0])).toBe(true)
        }
      }
    }
  })

  it('code tasks declare a required function to implement', () => {
    for (const a of ASSESSMENTS) {
      for (const t of a.codeTasks) {
        expect(t.requirements?.mustDefine?.length ?? 0).toBeGreaterThan(0)
      }
    }
  })
})
