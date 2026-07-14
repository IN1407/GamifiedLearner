import type { MasteryRecord } from '../lib/db'
import { masteryBand, summarizeByDomain, weakestTopics, type MasteryBand } from '../content/mastery'

const BAND_STYLE: Record<MasteryBand, { bar: string; label: string; text: string }> = {
  novice: { bar: 'bg-slate-500', label: 'Novice', text: 'text-slate-400' },
  learning: { bar: 'bg-amber-500', label: 'Learning', text: 'text-amber-300' },
  proficient: { bar: 'bg-sky-500', label: 'Proficient', text: 'text-sky-300' },
  mastered: { bar: 'bg-emerald-500', label: 'Mastered', text: 'text-emerald-300' },
}

/** Evidence-based topic mastery, grouped by domain (§12.2). */
export default function MasteryPanel({ mastery }: { mastery: Record<string, MasteryRecord> }) {
  const domains = summarizeByDomain(mastery)
  const anySeen = domains.some((d) => d.average !== null)
  const weak = weakestTopics(mastery, 3)

  return (
    <section
      aria-label="Topic mastery"
      className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold tracking-wide text-slate-400 uppercase">Your mastery</h2>
        {weak.length > 0 && (
          <p className="text-xs text-slate-400">
            Focus areas:{' '}
            {weak.map((w, i) => (
              <span key={w.def.id} className="text-amber-300">
                {w.def.label}
                {i < weak.length - 1 ? ', ' : ''}
              </span>
            ))}
          </p>
        )}
      </div>

      {!anySeen ? (
        <p className="mt-3 text-sm text-slate-400">
          Answer quizzes, pass exercises, and take checkpoint assessments — your mastery of each
          topic will build here from how <em>correctly</em> you do the work, not just from finishing lessons.
        </p>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {domains
            .filter((d) => d.topics.some((t) => t.record && t.record.attempts > 0))
            .map((d) => (
              <div key={d.domain}>
                <p className="mb-2 text-xs font-semibold text-slate-300">{d.domain}</p>
                <ul className="space-y-2">
                  {d.topics.map(({ def, record }) => {
                    const m = record?.mastery ?? 0
                    const conf = record?.confidence ?? 0
                    const seen = Boolean(record && record.attempts > 0)
                    const band = masteryBand(m, conf)
                    const style = BAND_STYLE[band]
                    return (
                      <li key={def.id}>
                        <div className="flex items-center justify-between text-xs">
                          <span className={seen ? 'text-slate-200' : 'text-slate-500'}>{def.label}</span>
                          <span className={seen ? style.text : 'text-slate-600'}>
                            {seen ? `${Math.round(m * 100)}% · ${style.label}` : 'not started'}
                          </span>
                        </div>
                        <div
                          className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800"
                          role="progressbar"
                          aria-valuenow={Math.round(m * 100)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${def.label} mastery`}
                        >
                          <div
                            className={`h-full rounded-full ${seen ? style.bar : 'bg-transparent'}`}
                            style={{ width: `${Math.round(m * 100)}%` }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
        </div>
      )}
    </section>
  )
}
