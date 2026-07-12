import { useMemo, useState } from 'react'
import { makeChunks } from './vizMath'

const SAMPLE =
  'RAG splits a document into overlapping windows so that a fact spanning a boundary survives in both chunks. Tune the size and overlap below.'
const COLORS = ['rgba(57,135,229,0.35)', 'rgba(139,92,246,0.35)', 'rgba(16,185,129,0.35)', 'rgba(245,158,11,0.35)']

/** Slide chunk size and overlap and watch the boundaries move over real text —
 * mirrors the chunk_text exercise so learners can verify their code by eye. */
export default function ChunkingViz() {
  const [text, setText] = useState(SAMPLE)
  const [size, setSize] = useState(40)
  const [overlap, setOverlap] = useState(10)
  const chunks = useMemo(() => makeChunks(text, size, overlap), [text, size, overlap])

  // For each character, which chunks cover it (to shade overlaps darker).
  const coverage = useMemo(() => {
    const cov = new Array(text.length).fill(0)
    for (const c of chunks) for (let i = c.start; i < c.end; i++) cov[i]++
    return cov
  }, [chunks, text.length])

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm font-semibold text-slate-100">Chunking visualizer</p>
      <p className="mb-3 text-xs text-slate-400">
        Each colored band is one chunk. Darker seams are <strong>overlap</strong> — characters that
        appear in two chunks so boundary facts aren't lost.
      </p>
      <label className="sr-only" htmlFor="chunk-input">Document text</label>
      <textarea
        id="chunk-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-100 focus:border-indigo-400"
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-400">
          Chunk size = <span className="font-mono font-semibold text-slate-100">{size}</span>
          <input
            type="range"
            min={10}
            max={80}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <label className="text-xs text-slate-400">
          Overlap = <span className="font-mono font-semibold text-slate-100">{overlap}</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, size - 1)}
            value={Math.min(overlap, size - 1)}
            onChange={(e) => setOverlap(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
      </div>

      <p
        className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 font-mono text-[13px] leading-6 break-words text-slate-200"
        aria-label={`Text split into ${chunks.length} chunks`}
      >
        {Array.from(text).map((ch, i) => (
          <span
            key={i}
            style={{
              backgroundColor: coverage[i] > 1 ? 'rgba(236,72,153,0.45)' : COLORS[chunkIndexAt(chunks, i) % COLORS.length],
            }}
          >
            {ch}
          </span>
        ))}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {chunks.length} chunk{chunks.length === 1 ? '' : 's'}. Set overlap to 0 and watch the pink
        seams vanish — that's where boundary-spanning facts would be lost.
      </p>
    </div>
  )
}

function chunkIndexAt(chunks: { start: number; end: number }[], i: number): number {
  for (let c = 0; c < chunks.length; c++) if (i >= chunks[c].start && i < chunks[c].end) return c
  return 0
}
