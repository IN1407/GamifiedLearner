import type { GradeResult } from '../lib/api'
import Markdown from './Markdown'

export default function GradeCard({ grade, title }: { grade: GradeResult; title?: string }) {
  if (grade.raw) {
    // Model didn't return valid JSON — show its raw response rather than hiding it.
    return (
      <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-400">
          {title ?? 'AI feedback'}
        </p>
        <Markdown md={grade.raw} />
      </div>
    )
  }
  const score = grade.score ?? 0
  const scoreColor =
    score >= 80 ? 'text-emerald-300 bg-emerald-500/20' : score >= 60 ? 'text-amber-300 bg-amber-500/20' : 'text-rose-300 bg-rose-500/20'
  return (
    <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">
          {title ?? 'AI grading'}
        </p>
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${scoreColor}`}>{score}/100</span>
      </div>
      {grade.verdict && <p className="text-sm font-medium text-slate-100">{grade.verdict}</p>}
      {grade.strengths.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-emerald-300">Strengths</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-200">
            {grade.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {grade.improvements.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-amber-300">Improvements</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-200">
            {grade.improvements.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {grade.suggested_rewrite && grade.suggested_rewrite !== '(Available with a real provider connected.)' && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-indigo-300">Suggested rewrite</p>
          <div className="mt-1 rounded-lg bg-slate-900/70 p-3">
            <Markdown md={grade.suggested_rewrite} />
          </div>
        </div>
      )}
      {grade.unverified.length > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          <span className="font-semibold">Not verified by the AI:</span> {grade.unverified.join(' · ')}
        </p>
      )}
    </div>
  )
}
