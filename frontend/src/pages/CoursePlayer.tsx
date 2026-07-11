import { useCallback, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  firstIncomplete,
  flattenLessons,
  getCourse,
  lessonStatus,
  moduleMasteryPct,
} from '../content'
import { progressKey } from '../content/types'
import { newlyEarnedMilestone } from '../content/milestones'
import { useStore, useStreak, useXp } from '../state/useStore'
import { levelForXp } from '../lib/gamification'
import LessonView from '../components/LessonView'
import { lessonContextText } from '../lib/lessonContext'
import ChatDrawer from '../components/ChatDrawer'
import LevelUpOverlay from '../components/LevelUpOverlay'

export default function CoursePlayer() {
  const { courseId, moduleId, lessonId } = useParams()
  const navigate = useNavigate()
  const profile = useStore((s) => s.profile)
  const progress = useStore((s) => s.progress)
  const completeLesson = useStore((s) => s.completeLesson)
  const xp = useXp()
  const streak = useStreak()

  const [navOpen, setNavOpen] = useState(false)
  const [lessonXp, setLessonXp] = useState(0)
  const [interactiveDone, setInteractiveDone] = useState(true)
  const [levelUp, setLevelUp] = useState<{
    moduleTitle: string
    earned: number
    status: { title: string; subtitle: string; icon: string } | null
  } | null>(null)

  const course = courseId ? getCourse(courseId) : undefined

  // All hooks run unconditionally (rules of hooks) — they tolerate a missing
  // course/lesson and the early returns below handle the invalid states.
  const flat = useMemo(() => (course ? flattenLessons(course) : []), [course])
  const current = useMemo(() => {
    if (!course) return null
    if (moduleId && lessonId) {
      return flat.find((f) => f.module.id === moduleId && f.lesson.id === lessonId) ?? null
    }
    return firstIncomplete(course, progress) ?? flat[0] ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, flat, moduleId, lessonId, progress])

  const onProgress = useCallback((earned: number, complete: boolean) => {
    setLessonXp(earned)
    setInteractiveDone(complete)
  }, [])

  if (!course) return <Navigate to="/" replace />
  if (!current) return <Navigate to="/" replace />
  const { module, lesson } = current
  const status = lessonStatus(course, module.id, lesson.id, progress)
  const completed = status === 'completed'
  const locked = status === 'locked'
  const mathLevel = profile?.mathLevel ?? 'college'

  const idx = flat.findIndex((f) => f.module.id === module.id && f.lesson.id === lesson.id)
  const next = flat[idx + 1] ?? null
  const prev = flat[idx - 1] ?? null

  const hasInteractive = lesson.blocks.some(
    (b) => b.type === 'quiz' || b.type === 'exercise' || b.type === 'promptExercise',
  )
  const completionBonus = 10 + (lesson.kind === 'checkpoint' ? 50 : 0)
  const canComplete = !completed && (!hasInteractive || interactiveDone)

  const finishLesson = async () => {
    if (!canComplete) return
    const earned = lessonXp + completionBonus
    // Detect a newly-earned milestone by comparing progress before/after this
    // completion (derivation is pure, so we can simulate the "after" map).
    const key = progressKey(course.id, module.id, lesson.id)
    const after = { ...progress, [key]: progress[key] ?? ({ lessonId: key } as (typeof progress)[string]) }
    const earnedMilestone = newlyEarnedMilestone(progress, after)
    await completeLesson({
      courseId: course.id,
      moduleId: module.id,
      lessonId: lesson.id,
      xp: earned,
      isCheckpoint: lesson.kind === 'checkpoint',
    })
    if (lesson.kind === 'checkpoint' || earnedMilestone) {
      setLevelUp({
        moduleTitle: module.title,
        earned,
        status: earnedMilestone
          ? { title: earnedMilestone.title, subtitle: earnedMilestone.subtitle, icon: earnedMilestone.icon }
          : null,
      })
    } else if (next) {
      navigate(`/course/${course.id}/${next.module.id}/${next.lesson.id}`)
      window.scrollTo({ top: 0 })
    }
  }

  const closeLevelUp = () => {
    setLevelUp(null)
    if (next) {
      navigate(`/course/${course.id}/${next.module.id}/${next.lesson.id}`)
      window.scrollTo({ top: 0 })
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <button
          onClick={() => setNavOpen((v) => !v)}
          aria-label="Toggle lesson navigation"
          aria-expanded={navOpen}
          className="rounded-lg border border-slate-700 p-2 text-sm lg:hidden"
        >
          ☰
        </button>
        <Link to="/" className="text-sm font-bold text-indigo-300 hover:underline">
          ← Home
        </Link>
        <span className="hidden truncate text-sm font-semibold text-slate-200 sm:block">{course.title}</span>
        <span className="ml-auto flex items-center gap-3 text-sm font-semibold text-slate-300">
          <span title="Streak">🔥 {streak.streakWeeks}w</span>
          <span title="Total XP">⭐ {xp.toLocaleString()}</span>
        </span>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Left rail: module/lesson tree */}
        <nav
          aria-label="Course outline"
          className={`${
            navOpen ? 'block' : 'hidden'
          } fixed inset-y-0 left-0 z-20 w-72 overflow-y-auto border-r border-slate-800 bg-slate-900 p-4 pt-16 lg:static lg:block lg:pt-4`}
        >
          {course.modules.map((m, mi) => {
            const mastery = moduleMasteryPct(course, m, progress)
            return (
              <div key={m.id} className="mb-4">
                <p className="flex items-center justify-between text-xs font-bold tracking-wide text-slate-400 uppercase">
                  <span>
                    {mi + 1}. {m.title}
                  </span>
                  <span>{mastery}%</span>
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {m.lessons.map((l) => {
                    const st = lessonStatus(course, m.id, l.id, progress)
                    const isCurrent = m.id === module.id && l.id === lesson.id
                    return (
                      <li key={l.id}>
                        {st === 'locked' ? (
                          <span
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-300"
                            aria-disabled="true"
                            title="Complete earlier lessons to unlock"
                          >
                            <span aria-hidden>🔒</span> {l.title}
                          </span>
                        ) : (
                          <Link
                            to={`/course/${course.id}/${m.id}/${l.id}`}
                            onClick={() => setNavOpen(false)}
                            aria-current={isCurrent ? 'page' : undefined}
                            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${
                              isCurrent
                                ? 'bg-indigo-500/20 font-semibold text-indigo-200'
                                : 'text-slate-300 hover:bg-slate-800/60'
                            }`}
                          >
                            <span aria-hidden>{st === 'completed' ? '✅' : l.kind === 'checkpoint' ? '🏁' : '📖'}</span>
                            <span className="min-w-0 truncate">{l.title}</span>
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        {/* Main pane */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">
          <p className="text-xs font-semibold tracking-wide text-indigo-400 uppercase">
            {module.title} {lesson.kind === 'checkpoint' && '· checkpoint'}
          </p>
          <h1 className="mt-1 mb-4 text-2xl font-extrabold text-slate-100 sm:text-3xl">{lesson.title}</h1>

          {locked ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
              <p className="font-semibold">🔒 This lesson is locked.</p>
              <p className="mt-1 text-sm">Complete the earlier lessons first — the course builds on itself.</p>
              <Link
                to={
                  firstIncomplete(course, progress)
                    ? `/course/${course.id}/${firstIncomplete(course, progress)!.module.id}/${firstIncomplete(course, progress)!.lesson.id}`
                    : '/'
                }
                className="mt-3 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Go to your next lesson →
              </Link>
            </div>
          ) : (
            <>
              <LessonView
                key={progressKey(course.id, module.id, lesson.id)}
                lesson={lesson}
                mathLevel={mathLevel}
                alreadyCompleted={completed}
                onProgress={onProgress}
              />

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5">
                {prev ? (
                  <Link
                    to={`/course/${course.id}/${prev.module.id}/${prev.lesson.id}`}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60"
                  >
                    ← {prev.lesson.title}
                  </Link>
                ) : (
                  <span />
                )}
                {completed ? (
                  next ? (
                    <Link
                      to={`/course/${course.id}/${next.module.id}/${next.lesson.id}`}
                      className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
                    >
                      Next: {next.lesson.title} →
                    </Link>
                  ) : (
                    <Link to="/" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white">
                      Course complete — back home 🎉
                    </Link>
                  )
                ) : (
                  <button
                    onClick={finishLesson}
                    disabled={!canComplete}
                    title={canComplete ? undefined : 'Finish the quiz/exercises above first'}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {lesson.kind === 'checkpoint' ? '🏁 Complete checkpoint' : 'Complete lesson'} · +
                    {lessonXp + completionBonus} XP
                  </button>
                )}
              </div>
            </>
          )}
        </main>

        {/* Right rail: progress */}
        <aside className="hidden w-64 shrink-0 border-l border-slate-800 p-4 xl:block" aria-label="Progress">
          <div className="sticky top-16 space-y-4">
            <RailCard title="This module">
              <Bar pct={moduleMasteryPct(course, module, progress)} />
              <p className="mt-1 text-xs text-slate-400">
                {module.lessons.filter((l) => progress[progressKey(course.id, module.id, l.id)]).length}/
                {module.lessons.length} lessons · checkpoint at the end
              </p>
            </RailCard>
            <RailCard title="Streak">
              <p className="text-2xl font-extrabold text-slate-100">🔥 {streak.streakWeeks}w</p>
              <p className="text-xs text-slate-400">
                {streak.thisWeekCount}/{streak.commitment} lessons this week
                {streak.thisWeekMet ? ' — commitment met ✓' : ''}
              </p>
              <Bar pct={Math.min(100, Math.round((streak.thisWeekCount / streak.commitment) * 100))} />
            </RailCard>
            <RailCard title="Level">
              <LevelMini xp={xp} />
            </RailCard>
          </div>
        </aside>
      </div>

      <ChatDrawer lessonContext={lessonContextText(lesson, mathLevel)} lessonTitle={lesson.title} />

      {levelUp && (
        <LevelUpOverlay
          courseTitle={course.title}
          moduleTitle={levelUp.moduleTitle}
          level={levelForXp(xp).level}
          totalXp={xp}
          streakWeeks={streak.streakWeeks}
          earnedXp={levelUp.earned}
          status={levelUp.status}
          onClose={closeLevelUp}
        />
      )}
    </div>
  )
}

function RailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <p className="mb-2 text-xs font-bold tracking-wide text-slate-400 uppercase">{title}</p>
      {children}
    </div>
  )
}

function Bar({ pct }: { pct: number }) {
  return (
    <div
      className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-indigo-500 transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  )
}

function LevelMini({ xp }: { xp: number }) {
  const { level, intoLevel, needed } = levelForXp(xp)
  return (
    <>
      <p className="text-2xl font-extrabold text-slate-100">Lv {level}</p>
      <p className="text-xs text-slate-400">
        {intoLevel}/{needed} XP to level {level + 1}
      </p>
      <Bar pct={Math.round((intoLevel / needed) * 100)} />
    </>
  )
}
