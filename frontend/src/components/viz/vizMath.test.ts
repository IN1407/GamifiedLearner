import { describe, expect, it } from 'vitest'
import { cosineSim, makeChunks, tokenizeApprox } from './vizMath'

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
