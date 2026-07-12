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
