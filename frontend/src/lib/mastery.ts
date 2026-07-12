export type GradeLevel =
  | 'grade5'
  | 'grade6'
  | 'grade7'
  | 'grade8'
  | 'grade9'
  | 'grade10'
  | 'grade11'
  | 'grade12'
  | 'college'

export type EvidenceKind = 'diagnostic' | 'quiz' | 'exercise' | 'assessment' | 'review'

export interface TopicMastery {
  topicId: string
  mastery: number
  confidence: number
  attempts: number
  lastEvidenceAt: number
  lastItemIds: string[]
}

export interface MasteryEvidence {
  topicId: string
  itemId: string
  kind: EvidenceKind
  score: number
  at?: number
}

export interface MathTopic {
  id: string
  title: string
  parentId?: string
  minGrade: GradeLevel
  prerequisites: string[]
  aiUses: string[]
}

const gradeOrder: GradeLevel[] = ['grade5', 'grade6', 'grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12', 'college']

export const mathTopics: MathTopic[] = [
  { id: 'arithmetic-ratios', title: 'Ratios, rates, and proportional reasoning', minGrade: 'grade5', prerequisites: [], aiUses: ['scaling data, probabilities, token-cost estimates'] },
  { id: 'coordinate-plane', title: 'Coordinate planes and graphs', minGrade: 'grade6', prerequisites: ['arithmetic-ratios'], aiUses: ['plotting loss curves and embedding spaces'] },
  { id: 'expressions-equations', title: 'Expressions, equations, and variables', minGrade: 'grade7', prerequisites: ['arithmetic-ratios'], aiUses: ['reading model formulas and optimization updates'] },
  { id: 'linear-functions', title: 'Linear functions and slope', minGrade: 'grade8', prerequisites: ['coordinate-plane', 'expressions-equations'], aiUses: ['linear models, gradients, and trend lines'] },
  { id: 'systems-matrices', title: 'Systems of equations as matrix thinking', minGrade: 'grade9', prerequisites: ['linear-functions'], aiUses: ['feature matrices and batched model inputs'] },
  { id: 'probability-statistics', title: 'Probability, distributions, and uncertainty', minGrade: 'grade10', prerequisites: ['arithmetic-ratios'], aiUses: ['classification confidence, sampling, and evaluation metrics'] },
  { id: 'vectors-dot-products', title: 'Vectors, dot products, and cosine similarity', minGrade: 'grade11', prerequisites: ['systems-matrices'], aiUses: ['embeddings, attention scores, and retrieval ranking'] },
  { id: 'functions-logs-exponents', title: 'Functions, logarithms, and exponentials', minGrade: 'grade11', prerequisites: ['expressions-equations'], aiUses: ['softmax, cross-entropy, and scaling laws'] },
  { id: 'calculus-gradients', title: 'Derivatives and gradients', minGrade: 'grade12', prerequisites: ['linear-functions', 'functions-logs-exponents'], aiUses: ['gradient descent and neural-network training'] },
  { id: 'linear-algebra-college', title: 'College linear algebra for neural networks', minGrade: 'college', prerequisites: ['vectors-dot-products', 'systems-matrices'], aiUses: ['transformer layers, attention projections, and backpropagation'] },
]

export function mapMathLevelToGrade(level: string | undefined): GradeLevel {
  switch (level) {
    case 'middle': return 'grade7'
    case 'hs910': return 'grade9'
    case 'hs1112': return 'grade11'
    case 'college':
    case 'grad': return 'college'
    default: return 'grade9'
  }
}

export function gradeAllows(user: GradeLevel, topic: MathTopic): boolean {
  return gradeOrder.indexOf(user) >= gradeOrder.indexOf(topic.minGrade)
}

const weights: Record<EvidenceKind, number> = { diagnostic: 0.28, quiz: 0.18, exercise: 0.24, assessment: 0.34, review: 0.12 }

export function updateMastery(prev: TopicMastery | undefined, evidence: MasteryEvidence): TopicMastery {
  const score = clamp(evidence.score)
  const base: TopicMastery = prev ?? { topicId: evidence.topicId, mastery: 0.35, confidence: 0, attempts: 0, lastEvidenceAt: 0, lastItemIds: [] }
  const repeatCount = base.lastItemIds.filter((id) => id === evidence.itemId).length
  const antiFarm = 1 / (1 + repeatCount)
  const w = weights[evidence.kind] * antiFarm
  const mastery = clamp(base.mastery + (score - base.mastery) * w)
  const confidence = clamp(base.confidence + (1 - base.confidence) * Math.min(0.18, w))
  return {
    topicId: evidence.topicId,
    mastery,
    confidence,
    attempts: base.attempts + 1,
    lastEvidenceAt: evidence.at ?? Date.now(),
    lastItemIds: [...base.lastItemIds.slice(-7), evidence.itemId],
  }
}

export function recommendMathTopic(gradeLevel: GradeLevel, records: Record<string, TopicMastery>) {
  const available = mathTopics.filter((topic) => gradeAllows(gradeLevel, topic))
  const weakPrereq = available.find((topic) => topic.prerequisites.some((id) => (records[id]?.mastery ?? 0.35) < 0.62))
  const next = weakPrereq ?? available.find((topic) => (records[topic.id]?.mastery ?? 0) < 0.74) ?? mathTopics.find((topic) => !gradeAllows(gradeLevel, topic)) ?? available.at(-1)!
  const record = records[next.id]
  const reason = record
    ? `${Math.round(record.mastery * 100)}% mastery with ${Math.round(record.confidence * 100)}% confidence; next practice strengthens ${next.aiUses[0]}.`
    : `Recommended entry point for ${gradeLevel}; this supports ${next.aiUses[0]}.`
  return { topic: next, reason }
}

function clamp(n: number): number { return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0)) }
