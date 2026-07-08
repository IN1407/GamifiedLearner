import { Link } from 'react-router-dom'
import { courses, courseProgressPct, firstIncomplete } from '../content'
import { useStore, useStreak, useXp } from '../state/useStore'
import { levelForXp } from '../lib/gamification'

const MATH_LEVEL_LABELS: Record<string, string> = {
  middle: 'Middle school',
  hs910: '9th–10th grade',
  hs1112: '11th–12th grade',
  college: 'College',
  grad: 'Graduate',
}

export default function Home() {
  const profile = useStore((s) => s.profile)
  const aiConfig = useStore((s) => s.aiConfig)
  const progress = useStore((s) => s.progress)
  const xp = useXp()
  const streak = useStreak()
  const { level, intoLevel, needed } = levelForXp(xp)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            🎓 GamifiedLearner
          </h1>
          <p className="mt-1 text-slate-500">From zero Python to AI internals — one streak at a time.</p>
        </div>
        <Link
          to="/settings"
          className="self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ⚙️ Settings
        </Link>
      </header>

      {/* Stats row */}
      <section aria-label="Your stats" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile emoji="⭐" value={`${xp.toLocaleString()}`} label="Total XP" />
        <StatTile
          emoji="🏅"
          value={`Lv ${level}`}
          label={`${intoLevel}/${needed} XP to next`}
          bar={intoLevel / needed}
        />
        <StatTile
          emoji="🔥"
          value={`${streak.streakWeeks}w`}
          label={`streak · ${streak.thisWeekCount}/${streak.commitment} lessons this week`}
          bar={Math.min(streak.thisWeekCount / streak.commitment, 1)}
        />
        <StatTile
          emoji={aiConfig ? '🤖' : '🔌'}
          value={aiConfig ? aiConfig.provider : 'Not set'}
          label={aiConfig ? `model: ${aiConfig.model}` : 'Connect your AI'}
          to="/settings"
        />
      </section>

      <div className="mb-8 flex flex-wrap gap-3 text-sm">
        <Link
          to="/settings#math-level"
          className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-slate-700 shadow-sm hover:bg-slate-50"
        >
          📐 Math level: <strong>{MATH_LEVEL_LABELS[profile?.mathLevel ?? 'college']}</strong>
        </Link>
        <Link
          to="/settings#ai"
          className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-slate-700 shadow-sm hover:bg-slate-50"
        >
          🤖 {aiConfig ? `AI: ${aiConfig.provider} / ${aiConfig.model}` : 'Connect your AI →'}
        </Link>
      </div>

      {/* Course cards */}
      <section aria-label="Courses" className="grid gap-5 md:grid-cols-2">
        {courses.map((course) => {
          const pct = courseProgressPct(course, progress)
          const next = firstIncomplete(course, progress)
          const target = next
            ? `/course/${course.id}/${next.module.id}/${next.lesson.id}`
            : `/course/${course.id}`
          return (
            <Link
              key={course.id}
              to={target}
              className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                style={{ backgroundColor: `${course.accent}18` }}
                aria-hidden
              >
                {course.id === 'course1' ? '🐍' : '🧠'}
              </div>
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-indigo-700">{course.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{course.tagline}</p>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>
                    {course.modules.length} modules ·{' '}
                    {course.modules.reduce((n, m) => n + m.lessons.length, 0)} lessons
                  </span>
                  <span className="font-semibold">{pct}%</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${course.title} progress`}
                >
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: course.accent }} />
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold text-indigo-600">
                {pct === 0 ? 'Start course →' : pct === 100 ? 'Review course →' : `Continue: ${next?.lesson.title} →`}
              </p>
            </Link>
          )
        })}
      </section>
    </div>
  )
}

function StatTile({
  emoji,
  value,
  label,
  bar,
  to,
}: {
  emoji: string
  value: string
  label: string
  bar?: number
  to?: string
}) {
  const inner = (
    <>
      <p className="text-xl" aria-hidden>
        {emoji}
      </p>
      <p className="mt-1 truncate text-lg font-extrabold text-slate-900">{value}</p>
      <p className="truncate text-xs text-slate-500" title={label}>
        {label}
      </p>
      {bar !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.round(bar * 100)}%` }} />
        </div>
      )}
    </>
  )
  const cls = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'
  return to ? (
    <Link to={to} className={`${cls} transition hover:bg-slate-50`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  )
}
