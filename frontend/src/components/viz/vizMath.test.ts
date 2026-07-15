import { describe, expect, it } from 'vitest'
import { contextBudget, cosineSim, joinTokens, makeChunks, tokenizeApprox } from './vizMath'

describe('tokenizeApprox', () => {
  it('empty string yields no tokens', () => {
    expect(tokenizeApprox('')).toEqual([])
  })
  it('keeps short words whole and separates spaces', () => {
    expect(tokenizeApprox('hello world')).toEqual(['hello', ' ', 'world'])
  })
  it('splits long words into ~4-char subwords', () => {
    expect(tokenizeApprox('tokenization')).toEqual(['toke', 'niza', 'tion'])
  })
  it('treats punctuation as its own token', () => {
    expect(tokenizeApprox('hi!')).toEqual(['hi', '!'])
  })
})

describe('cosineSim', () => {
  it('identical direction = 1', () => {
    expect(cosineSim([1, 2], [2, 4])).toBeCloseTo(1)
  })
  it('orthogonal = 0', () => {
    expect(cosineSim([1, 0], [0, 1])).toBeCloseTo(0)
  })
  it('zero vector is safe', () => {
    expect(cosineSim([0, 0], [1, 2])).toBe(0)
  })
})

describe('makeChunks', () => {
  it('tiles with no overlap', () => {
    expect(makeChunks('abcdef', 3, 0).map((c) => c.text)).toEqual(['abc', 'def'])
  })
  it('steps by size-overlap', () => {
    expect(makeChunks('abcdef', 3, 1).map((c) => c.text)).toEqual(['abc', 'cde', 'ef'])
  })
  it('reports start/end offsets for highlighting', () => {
    const chunks = makeChunks('abcdef', 3, 1)
    expect(chunks[0]).toMatchObject({ start: 0, end: 3 })
    expect(chunks[1]).toMatchObject({ start: 2, end: 5 })
  })
  it('empty text yields no chunks and never loops forever', () => {
    expect(makeChunks('', 3, 5)).toEqual([])
    // overlap >= size would give step 0; guarded to 1 so this terminates
    expect(makeChunks('abc', 3, 5).length).toBeGreaterThan(0)
  })
})

describe('contextBudget', () => {
  const segs = [
    { label: 'system', tokens: 500 },
    { label: 'history', tokens: 1500 },
    { label: 'retrieved', tokens: 2000 },
  ]

  it('sums usage and leaves the rest as response headroom', () => {
    const b = contextBudget(segs, 8000)
    expect(b.used).toBe(4000)
    expect(b.headroom).toBe(4000)
    expect(b.overflow).toBe(0)
    expect(b.fits).toBe(true)
  })

  it('reports overflow (and zero headroom) when the prompt exceeds the window', () => {
    const b = contextBudget(segs, 3000)
    expect(b.fits).toBe(false)
    expect(b.overflow).toBe(1000)
    expect(b.headroom).toBe(0)
  })

  it('measures each slice against total capacity, not the sum', () => {
    const b = contextBudget([{ label: 'a', tokens: 2000 }], 8000)
    expect(b.slices[0].pct).toBeCloseTo(0.25)
  })

  it('is robust to a zero/negative capacity (never divides by zero)', () => {
    const b = contextBudget([{ label: 'a', tokens: 10 }], 0)
    expect(Number.isFinite(b.slices[0].pct)).toBe(true)
    expect(b.fits).toBe(false)
  })
})

describe('joinTokens', () => {
  const toks = ['Hel', 'lo', ' ', 'world']
  it('returns the first N tokens joined (the streamed-so-far prefix)', () => {
    expect(joinTokens(toks, 2)).toBe('Hello')
  })
  it('clamps out-of-range counts', () => {
    expect(joinTokens(toks, 0)).toBe('')
    expect(joinTokens(toks, 99)).toBe('Hello world')
    expect(joinTokens(toks, -3)).toBe('')
  })
})
