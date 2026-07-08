import type { GradeResult } from '../lib/api'
import Markdown from './Markdown'

export default function GradeCard({ grade, title }: { grade: GradeResult; title?: string }) {
  if (grade.raw) {
    // Model didn't return valid JSON — show its raw response rather than hiding it.
    return (
      <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">
          {title ?? 'AI feedback'}
        </p>
        <Markdown md={grade.raw} />
      </div>
    )
  }
  const score = grade.score ?? 0
  const scoreColor =
    score >= 80 ? 'text-emerald-700 bg-emerald-100' : score >= 60 ? 'text-amber-700 bg-amber-100' : 'text-rose-700 bg-rose-100'
  return (
    <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
          {title ?? 'AI grading'}
        </p>
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${scoreColor}`}>{score}/100</span>
      </div>
      {grade.verdict && <p className="text-sm font-medium text-slate-800">{grade.verdict}</p>}
      {grade.strengths.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-emerald-700">Strengths</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
            {grade.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {grade.improvements.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-amber-700">Improvements</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
            {grade.improvements.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {grade.suggested_rewrite && grade.suggested_rewrite !== '(Available with a real provider connected.)' && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-indigo-700">Suggested rewrite</p>
          <div className="mt-1 rounded-lg bg-white/70 p-3">
            <Markdown md={grade.suggested_rewrite} />
          </div>
        </div>
      )}
      {grade.unverified.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          <span className="font-semibold">Not verified by the AI:</span> {grade.unverified.join(' · ')}
        </p>
      )}
    </div>
  )
}
