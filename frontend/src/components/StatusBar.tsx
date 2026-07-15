import type { LessonProgress } from '../lib/db'
import {
  TRACKS,
  currentStatus,
  nextStatus,
  secretMilestone,
  trackProgression,
  type MilestoneNode,
} from '../content/milestones'

/**
 * Per-course status tracks. Each course has its OWN independent progression, so
 * a learner who does Course 2 first still sees a coherent track. A hidden
 * "surprise" status is only revealed once every other status is earned.
 * All derived from stored progress + passed assessments — never drifts.
 */
export default function StatusBar({
  progress,
  passed,
}: {
  progress: Record<string, LessonProgress>
  passed: ReadonlySet<string>
}) {
  const current = currentStatus(progress, passed)
  const next = nextStatus(progress, passed)
  const secret = secretMilestone(progress, passed)

  return (
    <section aria-label="Status progression" className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">Current status</p>
          <p className="mt-0.5 text-lg font-extrabold text-slate-100">
            {current ? (
              <>
                <span aria-hidden className="mr-1">{current.icon}</span>
                {current.title}
              </>
            ) : (
              <span className="text-slate-400">No status yet — earn your first below</span>
            )}
          </p>
          {current && <p className="text-xs text-slate-400">{current.subtitle}</p>}
        </div>
        {next && (
          <p className="text-xs text-slate-400">
            Next: <span className="font-semibold text-slate-200">{next.icon} {next.title}</span>
          </p>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {TRACKS.map((track) => {
          const nodes = trackProgression(track.id, progress, passed)
          if (nodes.length === 0) return null
          const unlocked = nodes.filter((n) => n.unlocked).length
          return (
            <div key={track.id}>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-300">{track.label}</p>
                <p className="text-xs text-slate-500">
                  {unlocked}/{nodes.length}
                </p>
              </div>
              <div
                className="flex items-stretch gap-1.5"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={nodes.length}
                aria-valuenow={unlocked}
                aria-valuetext={`${track.label}: ${unlocked} of ${nodes.length} statuses unlocked`}
                aria-label={`${track.label} status progression`}
              >
                {nodes.map((node) => (
                  <Node key={node.milestone.id} node={node} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* The surprise: only rendered once earned. */}
      {secret?.unlocked && (
        <div className="gl-pop mt-4 rounded-xl border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/15 to-indigo-500/15 p-3">
          <p className="text-xs font-bold tracking-widest text-fuchsia-200 uppercase">Secret status unlocked</p>
          <p className="mt-0.5 text-lg font-extrabold text-slate-100">
            <span aria-hidden className="mr-1">{secret.milestone.icon}</span>
            {secret.milestone.title}
          </p>
          <p className="text-xs text-slate-300">{secret.milestone.subtitle}</p>
        </div>
      )}
    </section>
  )
}

function Node({ node }: { node: MilestoneNode }) {
  return (
    <div
      className={`flex h-9 flex-1 items-center justify-center rounded-lg border text-base transition ${
        node.unlocked
          ? node.milestone.track === 'secret'
            ? 'border-fuchsia-400 bg-fuchsia-500 text-white'
            : 'border-indigo-400 bg-indigo-500 text-white'
          : 'border-slate-800 bg-slate-800/60 text-slate-300'
      } ${node.current ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
      title={`${node.milestone.title}${node.unlocked ? ' — unlocked' : ' — locked'}: ${node.milestone.subtitle}`}
    >
      <span aria-hidden>{node.unlocked ? node.milestone.icon : '🔒'}</span>
      <span className="sr-only">
        {node.milestone.title}: {node.unlocked ? 'unlocked' : 'locked'}
      </span>
    </div>
  )
}
