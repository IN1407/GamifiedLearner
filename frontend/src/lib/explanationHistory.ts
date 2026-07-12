/**
 * Pure logic for explanation version histories (§12.5). No I/O — the component
 * persists the returned objects via db.saveExplanation. Every successful
 * generation appends a new version and never destroys previous ones; the
 * original is always Version 1.
 */
import type { ExplanationHistory, ExplanationVersion } from './db'

function makeId(siteId: string, n: number): string {
  return `${siteId}#v${n}#${Date.now().toString(36)}`
}

/** Create a fresh history from the original explanation (Version 1). */
export function newHistory(siteId: string, originalText: string, now = Date.now()): ExplanationHistory {
  const v1: ExplanationVersion = {
    id: makeId(siteId, 1),
    versionNumber: 1,
    parentId: null,
    createdAt: now,
    request: null,
    text: originalText,
  }
  return { siteId, versions: [v1], currentVersionId: v1.id, updatedAt: now }
}

/**
 * Append a revision as a new version (child of the current one) and make it
 * current. Returns a NEW history object; the input is not mutated, so a failed
 * generation that never calls this leaves history untouched.
 */
export function appendVersion(
  history: ExplanationHistory,
  request: string,
  text: string,
  now = Date.now(),
): ExplanationHistory {
  const nextNumber = Math.max(...history.versions.map((v) => v.versionNumber)) + 1
  const version: ExplanationVersion = {
    id: makeId(history.siteId, nextNumber),
    versionNumber: nextNumber,
    parentId: history.currentVersionId,
    createdAt: now,
    request,
    text,
  }
  return {
    ...history,
    versions: [...history.versions, version],
    currentVersionId: version.id,
    updatedAt: now,
  }
}

export function currentVersion(history: ExplanationHistory): ExplanationVersion {
  return history.versions.find((v) => v.id === history.currentVersionId) ?? history.versions[0]
}

/** Deterministic ordering by version number for the ‹ › navigation. */
export function orderedVersions(history: ExplanationHistory): ExplanationVersion[] {
  return [...history.versions].sort((a, b) => a.versionNumber - b.versionNumber)
}

export function currentIndex(history: ExplanationHistory): number {
  return orderedVersions(history).findIndex((v) => v.id === history.currentVersionId)
}

/** Move to the previous/next version; clamps at the ends. Returns new history. */
export function navigate(history: ExplanationHistory, dir: -1 | 1): ExplanationHistory {
  const ordered = orderedVersions(history)
  const idx = currentIndex(history)
  const nextIdx = Math.min(ordered.length - 1, Math.max(0, idx + dir))
  if (nextIdx === idx) return history
  return { ...history, currentVersionId: ordered[nextIdx].id }
}
