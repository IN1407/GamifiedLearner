/**
 * App-wide state (zustand), hydrated from IndexedDB on boot and written back
 * through the typed data-access layer on every mutation.
 */
import { create } from 'zustand'
import {
  addEvent,
  clearAIConfig as dbClearAIConfig,
  loadAIConfig,
  loadAllEvents,
  loadAllProgress,
  loadProfile,
  resetProgress as dbResetProgress,
  saveAIConfig,
  saveLessonProgress,
  saveProfile,
  type ActivityEvent,
  type AIConfig,
  type LessonProgress,
  type MathLevel,
  type Profile,
} from '../lib/db'
import { encryptSecret } from '../lib/crypto'
import { computeStreak, totalXp, type StreakInfo } from '../lib/gamification'
import { progressKey } from '../content/types'

interface StoreState {
  hydrated: boolean
  profile: Profile | null
  aiConfig: AIConfig | null
  progress: Record<string, LessonProgress>
  events: ActivityEvent[]

  hydrate: () => Promise<void>
  completeOnboarding: (mathLevel: MathLevel, commitment: number) => Promise<void>
  setMathLevel: (level: MathLevel) => Promise<void>
  setCommitment: (n: number) => Promise<void>
  connectAI: (opts: {
    provider: string
    apiKey: string
    baseUrl: string | null
    model: string
  }) => Promise<void>
  disconnectAI: () => Promise<void>
  completeLesson: (opts: {
    courseId: string
    moduleId: string
    lessonId: string
    xp: number
    isCheckpoint: boolean
  }) => Promise<void>
  resetProgress: () => Promise<void>
  reloadFromDB: () => Promise<void>
}

export const useStore = create<StoreState>((set, get) => ({
  hydrated: false,
  profile: null,
  aiConfig: null,
  progress: {},
  events: [],

  hydrate: async () => {
    const [profile, aiConfig, progressList, events] = await Promise.all([
      loadProfile(),
      loadAIConfig(),
      loadAllProgress(),
      loadAllEvents(),
    ])
    const progress: Record<string, LessonProgress> = {}
    for (const p of progressList) progress[p.lessonId] = p
    set({
      hydrated: true,
      profile: profile ?? null,
      aiConfig: aiConfig ?? null,
      progress,
      events,
    })
  },

  completeOnboarding: async (mathLevel, commitment) => {
    const profile: Profile = {
      id: 'local',
      mathLevel,
      commitmentPerWeek: commitment,
      onboardingComplete: true,
      createdAt: get().profile?.createdAt ?? Date.now(),
    }
    await saveProfile(profile)
    set({ profile })
  },

  setMathLevel: async (mathLevel) => {
    const prev = get().profile
    if (!prev) return
    const profile = { ...prev, mathLevel }
    await saveProfile(profile)
    set({ profile })
  },

  setCommitment: async (commitmentPerWeek) => {
    const prev = get().profile
    if (!prev) return
    const profile = { ...prev, commitmentPerWeek }
    await saveProfile(profile)
    set({ profile })
  },

  connectAI: async ({ provider, apiKey, baseUrl, model }) => {
    let encryptedKey: ArrayBuffer | null = null
    let iv: Uint8Array | null = null
    if (apiKey) {
      const enc = await encryptSecret(apiKey)
      encryptedKey = enc.ciphertext
      iv = enc.iv
    }
    const config: AIConfig = {
      id: 'current',
      provider,
      encryptedKey,
      iv,
      baseUrl,
      model,
      updatedAt: Date.now(),
    }
    await saveAIConfig(config)
    set({ aiConfig: config })
  },

  disconnectAI: async () => {
    await dbClearAIConfig()
    set({ aiConfig: null })
  },

  completeLesson: async ({ courseId, moduleId, lessonId, xp, isCheckpoint }) => {
    const key = progressKey(courseId, moduleId, lessonId)
    if (get().progress[key]) return // idempotent — no double XP
    const record: LessonProgress = {
      lessonId: key,
      courseId,
      moduleId,
      status: 'completed',
      xpEarned: xp,
      completedAt: Date.now(),
    }
    const event: ActivityEvent = {
      ts: Date.now(),
      type: isCheckpoint ? 'checkpoint_completed' : 'lesson_completed',
      courseId,
      lessonId: key,
      xp,
    }
    await saveLessonProgress(record)
    await addEvent(event)
    set((s) => ({
      progress: { ...s.progress, [key]: record },
      events: [...s.events, event],
    }))
  },

  resetProgress: async () => {
    await dbResetProgress()
    set({ progress: {}, events: [] })
  },

  reloadFromDB: async () => {
    set({ hydrated: false })
    await get().hydrate()
  },
}))

// ---- derived selectors ----
export function useXp(): number {
  return useStore((s) => totalXp(s.events))
}

export function useStreak(): StreakInfo {
  const events = useStore((s) => s.events)
  const commitment = useStore((s) => s.profile?.commitmentPerWeek ?? 3)
  return computeStreak(events, commitment)
}
