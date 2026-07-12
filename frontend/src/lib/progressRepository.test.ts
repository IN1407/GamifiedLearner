import { describe, expect, it } from 'vitest'
import { validateProgressDocument, type ProgressDocument } from './progressRepository'

const base: ProgressDocument = { schemaVersion: 2, savedAt: 1, profile: null, progress: [], events: [], assessments: [], mastery: {} }

describe('progress document validation', () => {
  it('accepts bounded mastery records', () => {
    expect(() => validateProgressDocument({ ...base, mastery: { topic: { topicId: 'topic', mastery: 0.5, confidence: 0.2, attempts: 1, lastEvidenceAt: 1, lastItemIds: [] } } })).not.toThrow()
  })

  it('rejects out-of-range mastery and secret-like fields', () => {
    expect(() => validateProgressDocument({ ...base, mastery: { topic: { topicId: 'topic', mastery: 1.2, confidence: 0, attempts: 1, lastEvidenceAt: 1, lastItemIds: [] } } })).toThrow()
    expect(() => validateProgressDocument({ ...base, profile: { id: 'local', mathLevel: 'college', commitmentPerWeek: 3, onboardingComplete: true, createdAt: 1, apiKey: 'secret' } as never })).toThrow()
  })
})
