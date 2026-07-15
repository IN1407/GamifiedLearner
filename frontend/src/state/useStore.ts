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
  loadAllProgress,
  loadProfile,
  loadAllMastery,
  saveMastery,
  resetProgress as dbResetProgress,
  saveAIConfig,
  saveAssessment,
  saveLessonProgress,
  saveProfile,
  type ActivityEvent,
  type AIConfig,
  type AssessmentRecord,
  type LessonProgress,
  type MathLevel,
  type Profile,
} from '../lib/db'
import { mapMathLevelToGrade, updateMastery, type GradeLevel, type MasteryEvidence, type TopicMastery } from '../lib/mastery'
import {
  buildProgressDocument,
  persistProgressDocument,
  readActiveProgressDocument,
  restoreStoresFromDocument,
  subscribeSaveState,
  type SaveState,
} from '../lib/progressRepository'
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
  mastery: Record<string, TopicMastery>
  saveState: SaveState

  hydrate: () => Promise<void>
  completeOnboarding: (mathLevel: MathLevel, commitment: number) => Promise<void>
  setMathLevel: (level: MathLevel) => Promise<void>
  setGradeLevel: (level: GradeLevel) => Promise<void>
  recordMasteryEvidence: (evidence: MasteryEvidence) => Promise<void>
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
  saveState: 'idle',

  hydrate: async () => {
    let [profileRaw, aiConfig, progressList, events, assessmentList, masteryList] = await Promise.all([
      loadProfile(),
      loadAIConfig(),
      loadAllProgress(),
      loadAllEvents(),
      loadAllAssessments(),
      loadAllMastery(),
    ])
    // Crash recovery: if the per-record stores are empty but a valid atomic
    // progress document survived, restore from it (the document is validated +
    // checksum-verified; a corrupt one is quarantined and ignored).
    const storesEmpty =
      !profileRaw && progressList.length === 0 && events.length === 0 && assessmentList.length === 0 && masteryList.length === 0
    if (storesEmpty) {
      const doc = await readActiveProgressDocument()
      if (doc && (doc.profile || doc.progress.length || doc.events.length || doc.assessments.length || Object.keys(doc.mastery).length)) {
        await restoreStoresFromDocument(doc)
        ;[profileRaw, progressList, events, assessmentList, masteryList] = [
          doc.profile ?? undefined,
          doc.progress,
          doc.events,
          doc.assessments,
          Object.values(doc.mastery),
        ]
      }
    }
    const profile = profileRaw ? { ...profileRaw, gradeLevel: profileRaw.gradeLevel ?? mapMathLevelToGrade(profileRaw.mathLevel) } : undefined
    const progress: Record<string, LessonProgress> = {}
    for (const p of progressList) progress[p.lessonId] = p
    const assessments: Record<string, AssessmentRecord> = {}
    for (const a of assessmentList) assessments[a.assessmentId] = a
    const mastery: Record<string, TopicMastery> = {}
    for (const m of masteryList) mastery[m.topicId] = m
    set({
      hydrated: true,
      profile: profile ?? null,
      aiConfig: aiConfig ?? null,
      progress,
      events,
      assessments,
      mastery,
    })
  },

  completeOnboarding: async (mathLevel, commitment) => {
    const profile: Profile = {
      id: 'local',
      mathLevel,
      gradeLevel: mapMathLevelToGrade(mathLevel),
      commitmentPerWeek: commitment,
      onboardingComplete: true,
      createdAt: get().profile?.createdAt ?? Date.now(),
    }
    await saveProfile(profile)
    set({ profile })
    await persistProgressDocument(await buildProgressDocument(get().mastery))
  },

  setMathLevel: async (mathLevel) => {
    const prev = get().profile
    if (!prev) return
    const profile = { ...prev, mathLevel, gradeLevel: mapMathLevelToGrade(mathLevel) }
    await saveProfile(profile)
    set({ profile })
    await persistProgressDocument(await buildProgressDocument(get().mastery))
  },

  setGradeLevel: async (gradeLevel) => {
    const prev = get().profile
    if (!prev) return
    const profile = { ...prev, gradeLevel }
    await saveProfile(profile)
    set({ profile })
    await persistProgressDocument(await buildProgressDocument(get().mastery))
  },

  recordMasteryEvidence: async (evidence) => {
    const prev = get().mastery[evidence.topicId]
    const record = updateMastery(prev, evidence)
    await saveMastery(record)
    set((state) => ({ mastery: { ...state.mastery, [record.topicId]: record } }))
    await persistProgressDocument(await buildProgressDocument(get().mastery))
  },

  setCommitment: async (commitmentPerWeek) => {
    const prev = get().profile
    if (!prev) return
    const profile = { ...prev, commitmentPerWeek }
    await saveProfile(profile)
    set({ profile })
    await persistProgressDocument(await buildProgressDocument(get().mastery))
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
    await persistProgressDocument(await buildProgressDocument(get().mastery))
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
    await persistProgressDocument(await buildProgressDocument(get().mastery))
    return newlyPassed
  },

  resetProgress: async () => {
    await dbResetProgress()
    set({ progress: {}, events: [], assessments: {}, mastery: {} })
    await persistProgressDocument(await buildProgressDocument({}))
  },

  reloadFromDB: async () => {
    set({ hydrated: false })
    await get().hydrate()
  },
}))

// Subscribe the save-state indicator ONCE (not per-hydrate, which leaked a
// listener on every reloadFromDB).
subscribeSaveState((saveState) => useStore.setState({ saveState }))

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
