/**
 * Checkpoint assessments (§7). After a major checkpoint the learner takes a
 * mixed quiz + coding assessment; scoring ≥ the threshold unlocks the matching
 * milestone status. Scoring is deterministic (so it works in demo mode):
 * quiz questions are graded exactly, code tasks by static structural checks.
 * The connected AI is optional/advisory and never decides pass/fail.
 */
import type { CodeRequirements } from '../lib/api'
import type { Question } from './types'
import { isQuestionCorrect } from './quiz'

/** Centralized, configurable pass threshold (default 40%). */
export const ASSESSMENT_PASS_THRESHOLD = 0.4
export const QUESTION_POINTS = 1
export const CODE_TASK_POINTS = 2

export interface AssessmentCodeTask {
  id: string
  title: string
  instructions: string // markdown
  starterCode: string
  requirements?: CodeRequirements
}

export interface ReviewPointer {
  topic: string
  courseId: string
  moduleId: string
  lessonId?: string
}

export interface CheckpointAssessment {
  id: string
  /** milestone unlocked by passing this assessment */
  milestoneId: string
  courseId: string
  /** placed right after this module in the course outline */
  afterModuleId: string
  title: string
  intro: string
  questions: Question[]
  codeTasks: AssessmentCodeTask[]
  /** where to send the learner to review on failure */
  reviewMap: ReviewPointer[]
}

// ---------- scoring ----------

export interface AssessmentAnswers {
  /** questionId -> selected MCQ index or typed short answer */
  questions: Record<string, number | string | null>
  /** codeTaskId -> whether static verification passed */
  codePassed: Record<string, boolean>
}

export interface ScoredItem {
  id: string
  kind: 'question' | 'code'
  earned: number
  max: number
  correct: boolean
}

export interface AssessmentScore {
  earned: number
  total: number
  fraction: number
  passed: boolean
  perItem: ScoredItem[]
}

export function assessmentMaxPoints(a: CheckpointAssessment): number {
  return a.questions.length * QUESTION_POINTS + a.codeTasks.length * CODE_TASK_POINTS
}

export function passesThreshold(fraction: number, threshold = ASSESSMENT_PASS_THRESHOLD): boolean {
  return fraction >= threshold
}

export function scoreAssessment(a: CheckpointAssessment, answers: AssessmentAnswers): AssessmentScore {
  const perItem: ScoredItem[] = []
  let earned = 0
  for (const q of a.questions) {
    const correct = isQuestionCorrect(q, answers.questions[q.id] ?? null)
    if (correct) earned += QUESTION_POINTS
    perItem.push({ id: q.id, kind: 'question', earned: correct ? QUESTION_POINTS : 0, max: QUESTION_POINTS, correct })
  }
  for (const t of a.codeTasks) {
    const correct = Boolean(answers.codePassed[t.id])
    if (correct) earned += CODE_TASK_POINTS
    perItem.push({ id: t.id, kind: 'code', earned: correct ? CODE_TASK_POINTS : 0, max: CODE_TASK_POINTS, correct })
  }
  const total = assessmentMaxPoints(a)
  const fraction = total === 0 ? 0 : earned / total
  return { earned, total, fraction, passed: passesThreshold(fraction), perItem }
}

// ---------- content ----------

const q = (
  id: string,
  prompt: string,
  choices: string[],
  answerIndex: number,
  difficulty: 1 | 2 | 3 = 1,
): Question => ({ kind: 'mcq', id, prompt, choices, answerIndex, difficulty })

const short = (id: string, prompt: string, acceptableAnswers: string[], difficulty: 1 | 2 | 3 = 1): Question => ({
  kind: 'short',
  id,
  prompt,
  acceptableAnswers,
  difficulty,
})

export const ASSESSMENTS: CheckpointAssessment[] = [
  {
    id: 'assess-python-core',
    milestoneId: 'python-core',
    courseId: 'course1',
    afterModuleId: 'm03-intermediate',
    title: 'Checkpoint: Python Core',
    intro: 'Prove your Python fundamentals — types, control flow, data structures, and functions. Score 40%+ to earn the **Pythonista** status. Unlimited retries.',
    questions: [
      q('pc1', 'What does `7 // 2` evaluate to?', ['3.5', '3', '4', '2'], 1),
      q('pc2', 'Which of these is **mutable**?', ['a tuple', 'a string', 'a list', 'an int'], 2),
      q('pc3', 'What does `[x * 2 for x in range(3)]` produce?', ['`[0, 2, 4]`', '`[2, 4, 6]`', '`[0, 1, 2]`', '`[1, 2, 3]`'], 0, 2),
      q('pc4', 'Accessing a missing key with `d[k]` raises which error?', ['`KeyError`', '`IndexError`', '`ValueError`', 'it returns `None`'], 0),
      short('pc5', 'Which keyword defines a function in Python?', ['def'], 1),
    ],
    codeTasks: [
      {
        id: 'pc-code1',
        title: 'Even numbers',
        instructions: 'Implement `evens(n)` to return a list of the even numbers from `0` up to (but not including) `n`. Use a loop or a comprehension.',
        starterCode: 'def evens(n):\n    # return a list like [0, 2, 4, ...] for values < n\n    pass\n',
        requirements: { mustDefine: [{ name: 'evens', minArgs: 1 }] },
      },
    ],
    reviewMap: [
      { topic: 'Types & operators', courseId: 'course1', moduleId: 'm01-fundamentals' },
      { topic: 'Lists, dicts & comprehensions', courseId: 'course1', moduleId: 'm02-data-structures' },
      { topic: 'Functions & intermediate Python', courseId: 'course1', moduleId: 'm03-intermediate' },
    ],
  },
  {
    id: 'assess-backend',
    milestoneId: 'backend-builder',
    courseId: 'course1',
    afterModuleId: 'm05-backend',
    title: 'Checkpoint: Backend & Tooling',
    intro: 'Show you can reason about tooling and a FastAPI backend. Score 40%+ to earn **Backend Wrangler**. Unlimited retries.',
    questions: [
      q('bk1', 'Which HTTP method is conventionally used to **create** a resource?', ['GET', 'POST', 'DELETE', 'HEAD'], 1),
      q('bk2', 'FastAPI uses which library to validate request/response data?', ['Pydantic', 'NumPy', 'Jinja2', 'Requests'], 0),
      q('bk3', 'Which status code means "Created"?', ['200', '201', '404', '500'], 1, 2),
      q('bk4', 'A Python generator is written using which keyword?', ['`yield`', '`return`', '`async`', '`global`'], 0, 2),
      short('bk5', 'What single character begins a decorator in Python?', ['@'], 1),
    ],
    codeTasks: [
      {
        id: 'bk-code1',
        title: 'A closure factory',
        instructions: 'Implement `make_multiplier(n)` that **returns a function** which multiplies its argument by `n`. For example `make_multiplier(3)(5)` should give `15`.',
        starterCode: 'def make_multiplier(n):\n    # return a function of one argument\n    pass\n',
        requirements: { mustDefine: [{ name: 'make_multiplier', minArgs: 1 }] },
      },
    ],
    reviewMap: [
      { topic: 'Decorators, generators & async', courseId: 'course1', moduleId: 'm04-tooling' },
      { topic: 'FastAPI backend', courseId: 'course1', moduleId: 'm05-backend' },
    ],
  },
  {
    id: 'assess-transformers',
    milestoneId: 'transformer-internals',
    courseId: 'course1',
    afterModuleId: 'm09-efficient-attention',
    title: 'Checkpoint: Transformer Internals',
    intro: 'The deep end — math, neural nets, and attention. Score 40%+ to earn **Attention Alchemist**. Unlimited retries.',
    questions: [
      q('tf1', 'The softmax function outputs…', ['a probability distribution (sums to 1)', 'a single scalar', 'only negative numbers', 'integers'], 0),
      q('tf2', 'Scaled dot-product attention divides `QKᵀ` by…', ['`√dₖ`', '`dₖ`', '`1/dₖ`', 'the sequence length'], 0, 2),
      q('tf3', 'Gradient descent updates parameters in the direction of the…', ['negative gradient', 'positive gradient', 'second derivative', 'random noise'], 0, 2),
      q('tf4', 'A KV cache stores, across generation steps, the past…', ['keys and values', 'gradients', 'model weights', 'loss values'], 0, 2),
      q('tf5', 'In a mixture-of-experts layer, each token is routed to…', ['a small subset of experts', 'every expert', 'no experts', 'the optimizer'], 0, 2),
    ],
    codeTasks: [
      {
        id: 'tf-code1',
        title: 'Softmax from scratch',
        instructions: 'Implement `softmax(xs)` for a list of numbers: return a list of the same length where each element is `exp(xᵢ) / Σ exp(xⱼ)`. Do **not** use NumPy.',
        starterCode: 'import math\n\ndef softmax(xs):\n    # return a list of probabilities that sums to 1\n    pass\n',
        requirements: { mustDefine: [{ name: 'softmax', minArgs: 1 }], mustNotImport: ['numpy'] },
      },
    ],
    reviewMap: [
      { topic: 'Math for AI', courseId: 'course1', moduleId: 'm06-math' },
      { topic: 'Neural network internals', courseId: 'course1', moduleId: 'm07-neural-nets' },
      { topic: 'Transformers in depth', courseId: 'course1', moduleId: 'm08-transformers' },
      { topic: 'Efficient attention', courseId: 'course1', moduleId: 'm09-efficient-attention' },
    ],
  },
  {
    id: 'assess-course1',
    milestoneId: 'course1-complete',
    courseId: 'course1',
    afterModuleId: 'm13-capstone',
    title: 'Final: Python for AI & Backend',
    intro: 'The comprehensive Course 1 final — running models, fine-tuning, and RAG. Score 40%+ to earn **Neural Architect**. Unlimited retries.',
    questions: [
      q('c1a', 'LoRA fine-tunes a model by…', ['adding small low-rank adapter matrices', 'retraining every weight', 'deleting layers', 'raising the temperature'], 0, 2),
      q('c1b', 'RAG stands for…', ['Retrieval-Augmented Generation', 'Recurrent Attention Gate', 'Random Access Gradient', 'Rectified Adam Gradient'], 0),
      q('c1c', 'Quantization mainly reduces…', ['numeric precision to save memory', 'the number of layers', 'the context window', 'the vocabulary size'], 0, 2),
      q('c1d', 'An embedding represents text as…', ['a vector of numbers', 'a raw string', 'a single token id', 'an image'], 0),
      q('c1e', 'Cosine similarity measures the…', ['angle between two vectors', 'sum of two vectors', 'length of one vector', 'number of shared characters'], 0, 2),
    ],
    codeTasks: [
      {
        id: 'c1-code1',
        title: 'Cosine similarity',
        instructions: 'Implement `cosine(a, b)` for two equal-length lists of numbers: the dot product divided by the product of their magnitudes. This is the core of retrieval in RAG.',
        starterCode: 'import math\n\ndef cosine(a, b):\n    # dot(a, b) / (||a|| * ||b||)\n    pass\n',
        requirements: { mustDefine: [{ name: 'cosine', minArgs: 2 }] },
      },
    ],
    reviewMap: [
      { topic: 'Running models', courseId: 'course1', moduleId: 'm10-running-models' },
      { topic: 'Fine-tuning (LoRA/QLoRA)', courseId: 'course1', moduleId: 'm11-finetuning' },
      { topic: 'RAG', courseId: 'course1', moduleId: 'm12-rag' },
      { topic: 'Capstone', courseId: 'course1', moduleId: 'm13-capstone' },
    ],
  },
  {
    id: 'assess-course2',
    milestoneId: 'course2-complete',
    courseId: 'course2',
    afterModuleId: 'c2m05-capstone',
    title: 'Final: AI-Power Usage',
    intro: 'Prove your prompt-engineering and tooling judgment. Score 40%+ to earn **Prompt Whisperer**. Unlimited retries.',
    questions: [
      q('c2a', 'Few-shot prompting means…', ['showing worked examples in the prompt', 'training the model on few samples', 'using as few tokens as possible', 'picking a small model'], 0),
      q('c2b', 'To reliably get structured JSON output you should…', ['specify the exact format (and show an example)', 'raise the temperature', 'ask the model to "be careful"', 'use a longer context'], 0, 2),
      q('c2c', 'Lowering the temperature makes output…', ['more deterministic', 'more random', 'always longer', 'always shorter'], 0),
      q('c2d', 'Chain-of-thought prompting asks the model to…', ['show its reasoning steps', 'answer in fewer tokens', 'skip reasoning', 'use a tool'], 0, 2),
      q('c2e', 'The most reliable way to reduce hallucination is to…', ['ground the model in provided context/sources', 'raise the temperature', 'tell it to be confident', 'remove all instructions'], 0, 2),
      q('c2f', 'A local model (e.g. Ollama) versus a hosted API mainly gives you…', ['privacy and no per-token cost', 'always higher quality', 'zero hardware requirements', 'unlimited context'], 0, 2),
      short('c2g', 'In a chat API, which message role sets the overall behavior? (one word)', ['system'], 2),
    ],
    codeTasks: [],
    reviewMap: [
      { topic: 'Prompting fundamentals', courseId: 'course2', moduleId: 'c2m01-prompting-fundamentals' },
      { topic: 'Advanced prompting', courseId: 'course2', moduleId: 'c2m02-advanced-prompting' },
      { topic: 'The tool landscape', courseId: 'course2', moduleId: 'c2m03-tool-landscape' },
      { topic: 'Workflow design', courseId: 'course2', moduleId: 'c2m04-workflow-design' },
    ],
  },
]

export function getAssessment(id: string): CheckpointAssessment | undefined {
  return ASSESSMENTS.find((a) => a.id === id)
}

export function assessmentForMilestone(milestoneId: string): CheckpointAssessment | undefined {
  return ASSESSMENTS.find((a) => a.milestoneId === milestoneId)
}

export function assessmentsAfterModule(courseId: string, moduleId: string): CheckpointAssessment[] {
  return ASSESSMENTS.filter((a) => a.courseId === courseId && a.afterModuleId === moduleId)
}
