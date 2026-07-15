/**
 * Maps course content to mastery topics so real learning produces evidence
 * (fixes the "mastery never updates" gap). Two kinds of topic live in the same
 * mastery store:
 *  - GPT's grade-gated MATH topics (from lib/mastery), fed by the math module
 *    and math-heavy assessment — this is what the "Next math focus" card reads.
 *  - Broader Python / AI-Engineering / Prompt-Engineering topics (below), fed by
 *    the rest of the curriculum — surfaced in the mastery dashboard.
 */
import { mathTopics } from '../lib/mastery'

export interface GeneralTopic {
  id: string
  title: string
  domain: string
}

/** Non-math topics, grouped by domain, for the mastery dashboard. */
export const GENERAL_TOPICS: GeneralTopic[] = [
  { id: 'py-fundamentals', title: 'Python Fundamentals', domain: 'Python' },
  { id: 'py-backend', title: 'Backend & Tooling', domain: 'Python' },
  { id: 'neural-nets', title: 'Neural Networks', domain: 'AI Engineering' },
  { id: 'transformers', title: 'Transformers & Attention', domain: 'AI Engineering' },
  { id: 'running-models', title: 'Running & Fine-tuning', domain: 'AI Engineering' },
  { id: 'rag', title: 'RAG & Embeddings', domain: 'AI Engineering' },
  { id: 'provider-apis', title: 'Provider APIs', domain: 'AI Engineering' },
  { id: 'building', title: 'Building AI Apps', domain: 'AI Engineering' },
  { id: 'prompting', title: 'Prompt Engineering', domain: 'Prompt Engineering' },
  { id: 'tools-workflow', title: 'Tools & Workflow', domain: 'Prompt Engineering' },
]

const MODULE_TOPICS: Record<string, string[]> = {
  'm01-fundamentals': ['py-fundamentals'],
  'm02-data-structures': ['py-fundamentals'],
  'm03-intermediate': ['py-fundamentals'],
  'm04-tooling': ['py-backend'],
  'm05-backend': ['py-backend'],
  'm07-neural-nets': ['neural-nets'],
  'm08-transformers': ['transformers'],
  'm09-efficient-attention': ['transformers'],
  'm10-running-models': ['running-models'],
  'm11-finetuning': ['running-models'],
  'm12-rag': ['rag'],
  'm14-provider-apis': ['provider-apis'],
  'm13-capstone': ['building'],
  'c2m01-prompting-fundamentals': ['prompting'],
  'c2m02-advanced-prompting': ['prompting'],
  'c2m03-tool-landscape': ['tools-workflow'],
  'c2m04-workflow-design': ['tools-workflow'],
  'c2m06-engineering-patterns': ['tools-workflow'],
  'c2m05-capstone': ['tools-workflow'],
}

// The math module's lessons map onto GPT's fine-grained math topics, so doing
// the math work actually advances the "Next math focus" recommendation.
const MATH_LESSON_TOPICS: Record<string, string[]> = {
  'linear-algebra': ['systems-matrices', 'vectors-dot-products', 'linear-algebra-college'],
  calculus: ['calculus-gradients', 'functions-logs-exponents'],
  'probability-checkpoint': ['probability-statistics'],
}
const ALL_MATH_TOPICS = mathTopics.map((t) => t.id)

/** Topics a single lesson's performance is evidence for. */
export function topicsForLesson(moduleId: string, lessonId: string): string[] {
  if (moduleId === 'm06-math') return MATH_LESSON_TOPICS[lessonId] ?? ['functions-logs-exponents']
  return MODULE_TOPICS[moduleId] ?? []
}

/** Topics an assessment (covering a whole module) is evidence for. */
export function topicsForModule(moduleId: string): string[] {
  if (moduleId === 'm06-math') return ALL_MATH_TOPICS
  return MODULE_TOPICS[moduleId] ?? []
}

export function topicMeta(topicId: string): { title: string; domain: string } {
  const g = GENERAL_TOPICS.find((t) => t.id === topicId)
  if (g) return { title: g.title, domain: g.domain }
  const m = mathTopics.find((t) => t.id === topicId)
  if (m) return { title: m.title, domain: 'Mathematics' }
  return { title: topicId, domain: 'Other' }
}

/** Domains in display order for the dashboard. */
export const MASTERY_DOMAINS = ['Python', 'Mathematics', 'AI Engineering', 'Prompt Engineering']
