import type { LessonProgress } from '../lib/db'
import { MILESTONES, currentStatus, milestoneProgression, nextStatus } from '../content/milestones'

/**
 * Status progression bar. Rendered straight from the milestone engine, which
 * derives everything from stored progress + passed assessments — so it can
 * never drift out of sync with the learner's real achievements.
 */
export default function StatusBar({
  progress,
  passed,
}: {
  progress: Record<string, LessonProgress>
  passed: ReadonlySet<string>
}) {
  const nodes = milestoneProgression(progress, passed)
  const current = currentStatus(progress, passed)
  const next = nextStatus(progress, passed)
  const unlockedCount = nodes.filter((n) => n.unlocked).length

  return (
    <section
      aria-label="Status progression"
      className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">Current status</p>
          <p className="mt-0.5 text-lg font-extrabold text-slate-100">
            {current ? (
              <>
                <span aria-hidden className="mr-1">
                  {current.icon}
                </span>
                {current.title}
              </>
            ) : (
              <span className="text-slate-400">No status yet — earn your first below</span>
            )}
          </p>
          {current && <p className="text-xs text-slate-400">{current.subtitle}</p>}
        </div>
        <p className="text-xs font-semibold text-slate-400">
          {unlockedCount}/{MILESTONES.length} unlocked
        </p>
      </div>

      <div
        className="mt-4 flex items-stretch gap-1.5"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={MILESTONES.length}
        aria-valuenow={unlockedCount}
        aria-valuetext={`${unlockedCount} of ${MILESTONES.length} statuses unlocked`}
        aria-label="Milestone statuses unlocked"
      >
        {nodes.map((node) => (
          <div
            key={node.milestone.id}
            className={`flex h-9 flex-1 items-center justify-center rounded-lg border text-base transition ${
              node.unlocked
                ? 'border-indigo-400 bg-indigo-500 text-white'
                : 'border-slate-800 bg-slate-800/60 text-slate-300'
            } ${node.current ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
            title={`${node.milestone.title}${node.unlocked ? ' — unlocked' : ' — locked'}: ${node.milestone.subtitle}`}
          >
            <span aria-hidden>{node.unlocked ? node.milestone.icon : '🔒'}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {next ? (
          <>
            Next up: <span className="font-semibold text-slate-200">{next.icon} {next.title}</span> — {next.subtitle}
          </>
        ) : (
          <span className="font-semibold text-indigo-300">🏆 Every status unlocked — you maxed out GamifiedLearner!</span>
        )}
      </p>
    </section>
  )
}
