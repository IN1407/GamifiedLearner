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

  it('rejects an unsupported schema version', () => {
    expect(() => validateProgressDocument({ ...base, schemaVersion: 99 as never })).toThrow(/schema/i)
  })

  it('rejects encrypted-key material (iv / ciphertext) leaking into the document', () => {
    expect(() => validateProgressDocument({ ...base, profile: { iv: [1, 2, 3] } as never })).toThrow()
    expect(() => validateProgressDocument({ ...base, profile: { ciphertext: 'x' } as never })).toThrow()
  })

  it('rejects a mastery record whose key disagrees with its topicId', () => {
    expect(() =>
      validateProgressDocument({ ...base, mastery: { a: { topicId: 'b', mastery: 0.5, confidence: 0.2, attempts: 1, lastEvidenceAt: 1, lastItemIds: [] } } }),
    ).toThrow()
  })
})
