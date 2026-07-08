/**
 * Typed IndexedDB data-access layer. Everything the app persists lives here:
 * the local profile, encrypted AI config, per-lesson progress, and the
 * activity event log that streaks are computed from (real dates, queryable).
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export type MathLevel = 'middle' | 'hs910' | 'hs1112' | 'college' | 'grad'

export interface Profile {
  id: 'local'
  mathLevel: MathLevel
  commitmentPerWeek: number
  onboardingComplete: boolean
  createdAt: number
}

export interface AIConfig {
  id: 'current'
  provider: string
  /** AES-GCM ciphertext of the API key; empty for keyless providers. */
  encryptedKey: ArrayBuffer | null
  iv: Uint8Array | null
  baseUrl: string | null
  model: string
  updatedAt: number
}

export type LessonStatus = 'completed'

export interface LessonProgress {
  lessonId: string // `${courseId}/${moduleId}/${lessonId}`
  courseId: string
  moduleId: string
  status: LessonStatus
  xpEarned: number
  completedAt: number
}

export interface ActivityEvent {
  id?: number
  ts: number
  type: 'lesson_completed' | 'checkpoint_completed'
  courseId: string
  lessonId: string
  xp: number
}

interface GLSchema extends DBSchema {
  profile: { key: string; value: Profile }
  aiConfig: { key: string; value: AIConfig }
  progress: {
    key: string
    value: LessonProgress
    indexes: { byCourse: string; byModule: string }
  }
  events: {
    key: number
    value: ActivityEvent
    indexes: { byTs: number }
  }
  meta: { key: string; value: { id: string; value: unknown } }
}

const DB_NAME = 'gamified-learner'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<GLSchema>> | null = null

export function getDB(): Promise<IDBPDatabase<GLSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<GLSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('profile', { keyPath: 'id' })
        db.createObjectStore('aiConfig', { keyPath: 'id' })
        const progress = db.createObjectStore('progress', { keyPath: 'lessonId' })
        progress.createIndex('byCourse', 'courseId')
        progress.createIndex('byModule', 'moduleId')
        const events = db.createObjectStore('events', {
          keyPath: 'id',
          autoIncrement: true,
        })
        events.createIndex('byTs', 'ts')
        db.createObjectStore('meta', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

// ---- profile ----
export async function loadProfile(): Promise<Profile | undefined> {
  return (await getDB()).get('profile', 'local')
}
export async function saveProfile(profile: Profile): Promise<void> {
  await (await getDB()).put('profile', profile)
}

// ---- AI config ----
export async function loadAIConfig(): Promise<AIConfig | undefined> {
  return (await getDB()).get('aiConfig', 'current')
}
export async function saveAIConfig(config: AIConfig): Promise<void> {
  await (await getDB()).put('aiConfig', config)
}
export async function clearAIConfig(): Promise<void> {
  await (await getDB()).delete('aiConfig', 'current')
}

// ---- progress ----
export async function loadAllProgress(): Promise<LessonProgress[]> {
  return (await getDB()).getAll('progress')
}
export async function saveLessonProgress(p: LessonProgress): Promise<void> {
  await (await getDB()).put('progress', p)
}

// ---- events (streak history) ----
export async function addEvent(e: ActivityEvent): Promise<void> {
  await (await getDB()).add('events', e)
}
export async function loadEventsSince(ts: number): Promise<ActivityEvent[]> {
  return (await getDB()).getAllFromIndex('events', 'byTs', IDBKeyRange.lowerBound(ts))
}
export async function loadAllEvents(): Promise<ActivityEvent[]> {
  return (await getDB()).getAll('events')
}

// ---- meta (crypto key lives here) ----
export async function getMeta<T>(id: string): Promise<T | undefined> {
  const row = await (await getDB()).get('meta', id)
  return row?.value as T | undefined
}
export async function setMeta(id: string, value: unknown): Promise<void> {
  await (await getDB()).put('meta', { id, value })
}

// ---- export / import / reset ----
export interface ExportedState {
  version: 1
  exportedAt: number
  profile: Profile | null
  progress: LessonProgress[]
  events: ActivityEvent[]
}

export async function exportState(): Promise<ExportedState> {
  const db = await getDB()
  return {
    version: 1,
    exportedAt: Date.now(),
    profile: (await db.get('profile', 'local')) ?? null,
    progress: await db.getAll('progress'),
    events: await db.getAll('events'),
  }
}

export async function importState(state: ExportedState): Promise<void> {
  if (state.version !== 1) throw new Error(`Unsupported export version: ${state.version}`)
  const db = await getDB()
  const tx = db.transaction(['profile', 'progress', 'events'], 'readwrite')
  await tx.objectStore('progress').clear()
  await tx.objectStore('events').clear()
  if (state.profile) await tx.objectStore('profile').put(state.profile)
  for (const p of state.progress) await tx.objectStore('progress').put(p)
  for (const e of state.events) {
    const { id: _drop, ...rest } = e
    await tx.objectStore('events').add(rest as ActivityEvent)
  }
  await tx.done
}

/** Reset learning progress only — keeps profile + AI connection. */
export async function resetProgress(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['progress', 'events'], 'readwrite')
  await tx.objectStore('progress').clear()
  await tx.objectStore('events').clear()
  await tx.done
}
