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

export interface AssessmentAttemptRecord {
  startedAt: number
  finishedAt: number
  scoreFraction: number
  earned: number
  total: number
}

export interface AssessmentRecord {
  assessmentId: string
  /** best score fraction (0..1) across all attempts */
  bestScore: number
  passed: boolean
  passedAt?: number
  attempts: AssessmentAttemptRecord[]
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
  assessments: { key: string; value: AssessmentRecord }
  meta: { key: string; value: { id: string; value: unknown } }
}

const DB_NAME = 'gamified-learner'
const DB_VERSION = 2

let dbPromise: Promise<IDBPDatabase<GLSchema>> | null = null

export function getDB(): Promise<IDBPDatabase<GLSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<GLSchema>(DB_NAME, DB_VERSION, {
      // Idempotent per-store creation so this handles both fresh installs
      // (oldVersion 0) and the v1 -> v2 upgrade without losing existing data.
      upgrade(db) {
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('aiConfig')) {
          db.createObjectStore('aiConfig', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('progress')) {
          const progress = db.createObjectStore('progress', { keyPath: 'lessonId' })
          progress.createIndex('byCourse', 'courseId')
          progress.createIndex('byModule', 'moduleId')
        }
        if (!db.objectStoreNames.contains('events')) {
          const events = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true })
          events.createIndex('byTs', 'ts')
        }
        if (!db.objectStoreNames.contains('assessments')) {
          db.createObjectStore('assessments', { keyPath: 'assessmentId' })
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'id' })
        }
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

// ---- assessments (checkpoint results) ----
export async function loadAllAssessments(): Promise<AssessmentRecord[]> {
  return (await getDB()).getAll('assessments')
}
export async function saveAssessment(record: AssessmentRecord): Promise<void> {
  await (await getDB()).put('assessments', record)
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
  /** optional for backward compatibility with pre-assessment exports */
  assessments?: AssessmentRecord[]
}

export async function exportState(): Promise<ExportedState> {
  const db = await getDB()
  return {
    version: 1,
    exportedAt: Date.now(),
    profile: (await db.get('profile', 'local')) ?? null,
    progress: await db.getAll('progress'),
    events: await db.getAll('events'),
    assessments: await db.getAll('assessments'),
  }
}

export async function importState(state: ExportedState): Promise<void> {
  if (state.version !== 1) throw new Error(`Unsupported export version: ${state.version}`)
  const db = await getDB()
  const tx = db.transaction(['profile', 'progress', 'events', 'assessments'], 'readwrite')
  await tx.objectStore('progress').clear()
  await tx.objectStore('events').clear()
  await tx.objectStore('assessments').clear()
  if (state.profile) await tx.objectStore('profile').put(state.profile)
  for (const p of state.progress) await tx.objectStore('progress').put(p)
  for (const e of state.events) {
    const { id: _drop, ...rest } = e
    await tx.objectStore('events').add(rest as ActivityEvent)
  }
  for (const a of state.assessments ?? []) await tx.objectStore('assessments').put(a)
  await tx.done
}

/** Reset learning progress only — keeps profile + AI connection. */
export async function resetProgress(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['progress', 'events', 'assessments'], 'readwrite')
  await tx.objectStore('progress').clear()
  await tx.objectStore('events').clear()
  await tx.objectStore('assessments').clear()
  await tx.done
}
