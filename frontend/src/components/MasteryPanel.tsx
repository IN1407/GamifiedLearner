import type { TopicMastery } from '../lib/mastery'
import { mathTopics } from '../lib/mastery'
import { GENERAL_TOPICS, MASTERY_DOMAINS, topicMeta } from '../content/topicEvidence'

interface Row {
  id: string
  title: string
  record: TopicMastery | undefined
}

function band(m: number, confidence: number): { label: string; bar: string; text: string } {
  if (confidence < 0.15) return { label: 'Novice', bar: 'bg-slate-500', text: 'text-slate-400' }
  if (m >= 0.8) return { label: 'Mastered', bar: 'bg-emerald-500', text: 'text-emerald-300' }
  if (m >= 0.6) return { label: 'Proficient', bar: 'bg-sky-500', text: 'text-sky-300' }
  if (m >= 0.4) return { label: 'Learning', bar: 'bg-amber-500', text: 'text-amber-300' }
  return { label: 'Novice', bar: 'bg-slate-500', text: 'text-slate-400' }
}

/** Evidence-based topic mastery across every domain (Python, Mathematics,
 * AI Engineering, Prompt Engineering). Fed by real quiz/exercise/assessment
 * performance — not by merely completing lessons. */
export default function MasteryPanel({ mastery }: { mastery: Record<string, TopicMastery> }) {
  const allTopics: Row[] = [
    ...GENERAL_TOPICS.map((t) => ({ id: t.id, title: t.title, record: mastery[t.id] })),
    ...mathTopics.map((t) => ({ id: t.id, title: t.title, record: mastery[t.id] })),
  ]
  const anySeen = allTopics.some((t) => t.record && t.record.attempts > 0)

  return (
    <section aria-label="Topic mastery" className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <h2 className="text-sm font-bold tracking-wide text-slate-400 uppercase">Your mastery</h2>
      {!anySeen ? (
        <p className="mt-3 text-sm text-slate-400">
          Answer quizzes, pass exercises, and take checkpoint assessments — your mastery of each
          topic builds here from how <em>correctly</em> you do the work, not just from finishing lessons.
        </p>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {MASTERY_DOMAINS.map((domain) => {
            const rows = allTopics.filter((t) => topicMeta(t.id).domain === domain && t.record && t.record.attempts > 0)
            if (rows.length === 0) return null
            return (
              <div key={domain}>
                <p className="mb-2 text-xs font-semibold text-slate-300">{domain}</p>
                <ul className="space-y-2">
                  {rows.map((t) => {
                    const m = t.record!.mastery
                    const b = band(m, t.record!.confidence)
                    return (
                      <li key={t.id}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-200">{t.title}</span>
                          <span className={b.text}>
                            {Math.round(m * 100)}% · {b.label}
                          </span>
                        </div>
                        <div
                          className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800"
                          role="progressbar"
                          aria-valuenow={Math.round(m * 100)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${t.title} mastery`}
                        >
                          <div className={`h-full rounded-full ${b.bar}`} style={{ width: `${Math.round(m * 100)}%` }} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
