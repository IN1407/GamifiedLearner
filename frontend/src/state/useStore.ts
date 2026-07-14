/**
 * App-wide state (zustand), hydrated from IndexedDB on boot and written back
 * through the typed data-access layer on every mutation.
 */
import { create } from 'zustand'
import {
  addEvent,
  clearAIConfig as dbClearAIConfig,
  loadAIConfig,
  loadAllAssessments,
  loadAllEvents,
  loadAllMastery,
  loadAllProgress,
  loadProfile,
  resetProgress as dbResetProgress,
  saveAIConfig,
  saveAssessment,
  saveLessonProgress,
  saveMastery,
  saveProfile,
  gradeToMathLevel,
  mathLevelToGrade,
  type ActivityEvent,
  type AIConfig,
  type AssessmentRecord,
  type GradeLevel,
  type LessonProgress,
  type MasteryRecord,
  type Profile,
} from '../lib/db'
import { topicsForModule, updateMastery } from '../content/mastery'
import { encryptSecret } from '../lib/crypto'
import { computeStreak, totalXp, type StreakInfo } from '../lib/gamification'
import { progressKey } from '../content/types'

interface StoreState {
  hydrated: boolean
  profile: Profile | null
  aiConfig: AIConfig | null
  progress: Record<string, LessonProgress>
  events: ActivityEvent[]
  assessments: Record<string, AssessmentRecord>
  mastery: Record<string, MasteryRecord>

  hydrate: () => Promise<void>
  completeOnboarding: (gradeLevel: GradeLevel, commitment: number) => Promise<void>
  setGradeLevel: (grade: GradeLevel) => Promise<void>
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
  /** Records an assessment attempt; returns true if this attempt newly passed. */
  recordAssessmentAttempt: (opts: {
    assessmentId: string
    courseId: string
    scoreFraction: number
    earned: number
    total: number
    passed: boolean
    xpOnPass: number
  }) => Promise<boolean>
  /** Fold demonstrated correctness into the topics a module maps to. */
  recordMasteryEvidence: (opts: { moduleId: string; success: number; weight?: number }) => Promise<void>
  resetProgress: () => Promise<void>
  reloadFromDB: () => Promise<void>
}

export const useStore = create<StoreState>((set, get) => ({
  hydrated: false,
  profile: null,
  aiConfig: null,
  progress: {},
  events: [],
  assessments: {},
  mastery: {},

  hydrate: async () => {
    const [profile, aiConfig, progressList, events, assessmentList, masteryList] = await Promise.all([
      loadProfile(),
      loadAIConfig(),
      loadAllProgress(),
      loadAllEvents(),
      loadAllAssessments(),
      loadAllMastery(),
    ])
    const progress: Record<string, LessonProgress> = {}
    for (const p of progressList) progress[p.lessonId] = p
    const assessments: Record<string, AssessmentRecord> = {}
    for (const a of assessmentList) assessments[a.assessmentId] = a
    const mastery: Record<string, MasteryRecord> = {}
    for (const m of masteryList) mastery[m.topicId] = m
    // Migrate pre-grade-level profiles: backfill a grade from the stored math
    // level so existing users don't get bounced back to onboarding.
    let migrated = profile ?? null
    if (profile && !profile.gradeLevel) {
      migrated = { ...profile, gradeLevel: mathLevelToGrade(profile.mathLevel) }
      await saveProfile(migrated)
    }
    set({
      hydrated: true,
      profile: migrated,
      aiConfig: aiConfig ?? null,
      progress,
      events,
      assessments,
      mastery,
    })
  },

  completeOnboarding: async (gradeLevel, commitment) => {
    const profile: Profile = {
      id: 'local',
      gradeLevel,
      mathLevel: gradeToMathLevel(gradeLevel),
      commitmentPerWeek: commitment,
      onboardingComplete: true,
      createdAt: get().profile?.createdAt ?? Date.now(),
    }
    await saveProfile(profile)
    set({ profile })
  },

  setGradeLevel: async (gradeLevel) => {
    const prev = get().profile
    if (!prev) return
    // Grade sets the content math level; mastery still overrides via recommendations.
    const profile: Profile = { ...prev, gradeLevel, mathLevel: gradeToMathLevel(gradeLevel) }
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

  recordAssessmentAttempt: async ({ assessmentId, courseId, scoreFraction, earned, total, passed, xpOnPass }) => {
    const now = Date.now()
    const prev = get().assessments[assessmentId]
    const wasPassed = prev?.passed ?? false
    const newlyPassed = passed && !wasPassed
    const record: AssessmentRecord = {
      assessmentId,
      bestScore: Math.max(prev?.bestScore ?? 0, scoreFraction),
      passed: wasPassed || passed,
      passedAt: prev?.passedAt ?? (passed ? now : undefined),
      attempts: [
        ...(prev?.attempts ?? []),
        { startedAt: now, finishedAt: now, scoreFraction, earned, total },
      ],
    }
    await saveAssessment(record)
    // Award XP + a streak-counting event only the first time it's passed.
    let event: ActivityEvent | null = null
    if (newlyPassed && xpOnPass > 0) {
      event = { ts: now, type: 'checkpoint_completed', courseId, lessonId: `assessment/${assessmentId}`, xp: xpOnPass }
      await addEvent(event)
    }
    set((s) => ({
      assessments: { ...s.assessments, [assessmentId]: record },
      events: event ? [...s.events, event] : s.events,
    }))
    return newlyPassed
  },

  recordMasteryEvidence: async ({ moduleId, success, weight = 1 }) => {
    const topics = topicsForModule(moduleId)
    if (topics.length === 0) return
    const now = Date.now()
    const current = get().mastery
    const updated: Record<string, MasteryRecord> = {}
    for (const topicId of topics) {
      updated[topicId] = updateMastery(current[topicId], topicId, success, weight, now)
    }
    // persist each touched topic (IndexedDB put is atomic per record)
    await Promise.all(Object.values(updated).map(saveMastery))
    set((s) => ({ mastery: { ...s.mastery, ...updated } }))
  },

  resetProgress: async () => {
    await dbResetProgress()
    set({ progress: {}, events: [], assessments: {}, mastery: {} })
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

/** Set of assessment ids the learner has passed — drives milestone unlocks. */
export function passedAssessmentIds(assessments: Record<string, AssessmentRecord>): Set<string> {
  const s = new Set<string>()
  for (const [id, rec] of Object.entries(assessments)) if (rec.passed) s.add(id)
  return s
}

export function usePassedAssessments(): Set<string> {
  const assessments = useStore((s) => s.assessments)
  return passedAssessmentIds(assessments)
}
