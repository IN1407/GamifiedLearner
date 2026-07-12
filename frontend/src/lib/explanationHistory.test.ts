import { describe, expect, it } from 'vitest'
import {
  appendVersion,
  currentIndex,
  currentVersion,
  navigate,
  newHistory,
  orderedVersions,
} from './explanationHistory'

describe('explanation history', () => {
  it('newHistory creates Version 1 as the original with no request', () => {
    const h = newHistory('lessonA:q1', 'original text')
    expect(h.versions).toHaveLength(1)
    expect(h.versions[0].versionNumber).toBe(1)
    expect(h.versions[0].request).toBeNull()
    expect(currentVersion(h).text).toBe('original text')
  })

  it('appendVersion preserves the original and makes the revision current', () => {
    const h1 = newHistory('s', 'v1 text')
    const h2 = appendVersion(h1, 'make it simpler', 'v2 text')
    expect(h2.versions).toHaveLength(2)
    // original still present and unchanged
    expect(h2.versions[0].text).toBe('v1 text')
    expect(h2.versions[0].request).toBeNull()
    // new version is current, records the request, links to its parent
    expect(currentVersion(h2).text).toBe('v2 text')
    expect(currentVersion(h2).request).toBe('make it simpler')
    expect(currentVersion(h2).parentId).toBe(h1.currentVersionId)
    // input not mutated
    expect(h1.versions).toHaveLength(1)
  })

  it('supports multiple revisions with increasing version numbers', () => {
    let h = newHistory('s', 'v1')
    h = appendVersion(h, 'a', 'v2')
    h = appendVersion(h, 'b', 'v3')
    expect(orderedVersions(h).map((v) => v.versionNumber)).toEqual([1, 2, 3])
    expect(currentVersion(h).versionNumber).toBe(3)
  })

  it('navigate moves backward/forward and clamps at the ends', () => {
    let h = newHistory('s', 'v1')
    h = appendVersion(h, 'a', 'v2')
    h = appendVersion(h, 'b', 'v3')
    expect(currentIndex(h)).toBe(2)
    h = navigate(h, -1)
    expect(currentVersion(h).versionNumber).toBe(2)
    h = navigate(h, -1)
    expect(currentVersion(h).versionNumber).toBe(1)
    // clamp at start
    const same = navigate(h, -1)
    expect(currentVersion(same).versionNumber).toBe(1)
    h = navigate(h, 1)
    expect(currentVersion(h).versionNumber).toBe(2)
  })

  it('history is serializable (survives a JSON round-trip like IndexedDB)', () => {
    let h = newHistory('s', 'v1')
    h = appendVersion(h, 'simpler', 'v2')
    const restored = JSON.parse(JSON.stringify(h))
    expect(currentVersion(restored).text).toBe('v2')
    expect(orderedVersions(restored)).toHaveLength(2)
  })
})
