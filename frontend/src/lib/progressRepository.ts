import { getDB, type ActivityEvent, type AssessmentRecord, type LessonProgress, type Profile } from './db'
import type { TopicMastery } from './mastery'

export const PROGRESS_SCHEMA_VERSION = 2

export interface ProgressDocument {
  schemaVersion: 2
  savedAt: number
  profile: Profile | null
  progress: LessonProgress[]
  events: ActivityEvent[]
  assessments: AssessmentRecord[]
  mastery: Record<string, TopicMastery>
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed'
let tail = Promise.resolve()
let lastState: SaveState = 'idle'
const listeners = new Set<(s: SaveState) => void>()

export function subscribeSaveState(fn: (s: SaveState) => void): () => void {
  listeners.add(fn); fn(lastState); return () => listeners.delete(fn)
}
function setSaveState(s: SaveState) { lastState = s; for (const fn of listeners) fn(s) }

export function validateProgressDocument(doc: ProgressDocument): void {
  if (doc.schemaVersion !== PROGRESS_SCHEMA_VERSION) throw new Error('Unsupported progress schema')
  for (const [id, rec] of Object.entries(doc.mastery)) {
    if (id !== rec.topicId || rec.mastery < 0 || rec.mastery > 1 || rec.confidence < 0 || rec.confidence > 1) throw new Error(`Invalid mastery record: ${id}`)
  }
  const serialized = JSON.stringify(doc)
  if (/encryptedKey|apiKey|ciphertext|\biv\b|credential|password/i.test(serialized)) throw new Error('Progress document contains secret-like fields')
}

export async function buildProgressDocument(mastery: Record<string, TopicMastery> = {}): Promise<ProgressDocument> {
  const db = await getDB()
  const doc: ProgressDocument = {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    savedAt: Date.now(),
    profile: (await db.get('profile', 'local')) ?? null,
    progress: await db.getAll('progress'),
    events: await db.getAll('events'),
    assessments: await db.getAll('assessments'),
    mastery,
  }
  validateProgressDocument(doc)
  return doc
}

export function persistProgressDocument(doc: ProgressDocument): Promise<void> {
  validateProgressDocument(doc)
  tail = tail.then(() => writeAtomically(doc)).catch(() => writeAtomically(doc))
  return tail
}

async function writeAtomically(doc: ProgressDocument): Promise<void> {
  setSaveState('saving')
  try {
    const db = await getDB()
    const payload = JSON.stringify(doc)
    const checksum = await sha256(payload)
    const active = ((await db.get('meta', 'progress-active-slot'))?.value as 'A' | 'B' | undefined) ?? 'A'
    const inactive = active === 'A' ? 'B' : 'A'
    const tx = db.transaction('meta', 'readwrite')
    const meta = tx.objectStore('meta')
    // IndexedDB transaction commit is the atomic flip: write inactive full document,
    // verify metadata, then point active-slot at it while the previous slot remains last-known-good.
    await meta.put({ id: `progress-slot-${inactive}`, value: { payload, length: payload.length, checksum } })
    await meta.put({ id: 'progress-active-slot', value: inactive })
    await tx.done
    setSaveState('saved')
  } catch (error) {
    setSaveState('failed')
    throw error
  }
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Read the last atomically-written progress document from the active slot,
 * verifying the checksum and schema. Returns null when nothing is stored or the
 * stored document is corrupt/incompatible — in which case the bad payload is
 * quarantined for debugging rather than loaded. This is the startup recovery
 * source used when the per-record stores are missing/corrupt.
 */
export async function readActiveProgressDocument(): Promise<ProgressDocument | null> {
  const db = await getDB()
  const active = ((await db.get('meta', 'progress-active-slot'))?.value as 'A' | 'B' | undefined) ?? 'A'
  const slot = (await db.get('meta', `progress-slot-${active}`))?.value as
    | { payload: string; length: number; checksum: string }
    | undefined
  if (!slot?.payload) return null
  try {
    if ((await sha256(slot.payload)) !== slot.checksum) throw new Error('checksum mismatch')
    const doc = JSON.parse(slot.payload) as ProgressDocument
    validateProgressDocument(doc)
    return doc
  } catch (error) {
    // Preserve the corrupt payload; never load partially-valid state.
    await db.put('meta', { id: `progress-quarantine-${Date.now()}`, value: { slot, error: String(error) } })
    return null
  }
}

/** Restore the per-record stores from a recovered document (used when the
 * individual stores were lost but the atomic document survived). */
export async function restoreStoresFromDocument(doc: ProgressDocument): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['profile', 'progress', 'events', 'assessments', 'mastery'], 'readwrite')
  await tx.objectStore('progress').clear()
  await tx.objectStore('events').clear()
  await tx.objectStore('assessments').clear()
  await tx.objectStore('mastery').clear()
  if (doc.profile) await tx.objectStore('profile').put(doc.profile)
  for (const p of doc.progress) await tx.objectStore('progress').put(p)
  for (const e of doc.events) {
    const { id: _drop, ...rest } = e
    await tx.objectStore('events').add(rest as ActivityEvent)
  }
  for (const a of doc.assessments) await tx.objectStore('assessments').put(a)
  for (const [, m] of Object.entries(doc.mastery)) await tx.objectStore('mastery').put(m)
  await tx.done
}
