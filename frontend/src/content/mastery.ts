/**
 * Hierarchical, evidence-based topic mastery (§12.2).
 *
 * Mastery is NOT increased for opening or completing a lesson — only for
 * demonstrated correctness (quiz answers, exercise passes, assessment results).
 * The update is a deterministic exponential moving average, so it is testable
 * and cannot be farmed: repeated attempts pass a lower `weight`, so grinding the
 * same question barely moves the estimate.
 *
 * The taxonomy is data-driven (Domain › Topic). Evidence is attributed to a
 * topic via the module it came from (MODULE_TOPICS).
 */
import type { MasteryRecord } from '../lib/db'

export interface TopicDef {
  id: string
  label: string
  domain: string
}

/** Domain › Topic taxonomy, ordered for display. */
export const TOPICS: TopicDef[] = [
  { id: 'py-fundamentals', label: 'Python Fundamentals', domain: 'Python' },
  { id: 'py-backend', label: 'Backend & Tooling', domain: 'Python' },
  { id: 'math-ai', label: 'Math for AI', domain: 'Mathematics' },
  { id: 'neural-nets', label: 'Neural Networks', domain: 'AI Engineering' },
  { id: 'transformers', label: 'Transformers & Attention', domain: 'AI Engineering' },
  { id: 'running-models', label: 'Running & Fine-tuning', domain: 'AI Engineering' },
  { id: 'rag', label: 'RAG & Embeddings', domain: 'AI Engineering' },
  { id: 'provider-apis', label: 'Provider APIs', domain: 'AI Engineering' },
  { id: 'building', label: 'Building AI Apps', domain: 'AI Engineering' },
  { id: 'prompting', label: 'Prompt Engineering', domain: 'Prompt Engineering' },
  { id: 'tooling-judgment', label: 'Tools & Workflow', domain: 'Prompt Engineering' },
]

const TOPIC_IDS = new Set(TOPICS.map((t) => t.id))
export function isTopicId(id: string): boolean {
  return TOPIC_IDS.has(id)
}
export function topicDef(id: string): TopicDef | undefined {
  return TOPICS.find((t) => t.id === id)
}

/** Which topic(s) a module's evidence counts toward. */
export const MODULE_TOPICS: Record<string, string[]> = {
  'm01-fundamentals': ['py-fundamentals'],
  'm02-data-structures': ['py-fundamentals'],
  'm03-intermediate': ['py-fundamentals'],
  'm04-tooling': ['py-backend'],
  'm05-backend': ['py-backend'],
  'm06-math': ['math-ai'],
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
  'c2m03-tool-landscape': ['tooling-judgment'],
  'c2m04-workflow-design': ['tooling-judgment'],
  'c2m05-capstone': ['tooling-judgment'],
}

export function topicsForModule(moduleId: string): string[] {
  return MODULE_TOPICS[moduleId] ?? []
}

// ---- deterministic update ----

const CONFIDENCE_SATURATION = 6 // attempts needed for full confidence

/**
 * Fold one piece of evidence into a topic's mastery.
 * @param success 0..1 (1 = fully correct, 0 = wrong, partials allowed)
 * @param weight  0..1 evidence strength (retries/near-duplicates pass < 1 to
 *                resist farming; a checkpoint assessment passes 1)
 */
export function updateMastery(
  prev: MasteryRecord | undefined,
  topicId: string,
  success: number,
  weight = 1,
  now = Date.now(),
): MasteryRecord {
  const s = Math.max(0, Math.min(1, success))
  const w = Math.max(0, Math.min(1, weight))
  const attempts = (prev?.attempts ?? 0) + 1
  // Early evidence moves the estimate more; it settles as attempts accrue.
  const base = attempts <= 3 ? 0.5 : 0.3
  const alpha = base * w
  const prevMastery = prev?.mastery ?? 0.5 // neutral prior
  const mastery = prev ? prevMastery * (1 - alpha) + s * alpha : prevMastery * (1 - 0.5 * w) + s * (0.5 * w)
  return {
    topicId,
    mastery: Math.max(0, Math.min(1, mastery)),
    confidence: Math.min(1, attempts / CONFIDENCE_SATURATION),
    attempts,
    lastUpdated: now,
  }
}

export type MasteryBand = 'novice' | 'learning' | 'proficient' | 'mastered'

export function masteryBand(m: number, confidence: number): MasteryBand {
  if (confidence < 0.2) return 'novice'
  if (m >= 0.8) return 'mastered'
  if (m >= 0.6) return 'proficient'
  if (m >= 0.35) return 'learning'
  return 'novice'
}

export interface DomainSummary {
  domain: string
  topics: { def: TopicDef; record: MasteryRecord | undefined }[]
  /** confidence-weighted average mastery across seen topics, or null if none seen */
  average: number | null
}

/** Group topics by domain for the dashboard. */
export function summarizeByDomain(records: Record<string, MasteryRecord>): DomainSummary[] {
  const domains: string[] = []
  for (const t of TOPICS) if (!domains.includes(t.domain)) domains.push(t.domain)
  return domains.map((domain) => {
    const topics = TOPICS.filter((t) => t.domain === domain).map((def) => ({ def, record: records[def.id] }))
    const seen = topics.filter((t) => t.record && t.record.attempts > 0)
    const wsum = seen.reduce((a, t) => a + (t.record!.confidence || 0.01), 0)
    const average =
      seen.length === 0 ? null : seen.reduce((a, t) => a + t.record!.mastery * (t.record!.confidence || 0.01), 0) / wsum
    return { domain, topics, average }
  })
}

/** Weakest topics the learner has actually touched — for "focus areas". */
export function weakestTopics(
  records: Record<string, MasteryRecord>,
  limit = 3,
): { def: TopicDef; record: MasteryRecord }[] {
  return Object.values(records)
    .filter((r) => r.attempts > 0 && isTopicId(r.topicId) && r.mastery < 0.6)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, limit)
    .map((record) => ({ def: topicDef(record.topicId)!, record }))
}
