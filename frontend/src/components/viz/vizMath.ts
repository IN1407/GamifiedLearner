/**
 * Deterministic, model-free math backing the teaching visualizations. Pure
 * functions so they can be unit-tested and reused. None of this is a real model
 * — it lets the learner *feel* the shape of the idea and verify it by hand.
 */

/** Approximate subword tokenizer: whitespace/punctuation aware, long words
 * split into ~4-char pieces (illustrative, not a real BPE vocabulary). */
export function tokenizeApprox(text: string): string[] {
  if (!text) return []
  const raw = text.match(/\s+|[a-zA-Z]+|\d+|[^\s\w]/g) ?? []
  const out: string[] = []
  for (const t of raw) {
    if (/^[a-zA-Z]+$/.test(t) && t.length > 5) {
      for (let i = 0; i < t.length; i += 4) out.push(t.slice(i, i + 4))
    } else {
      out.push(t)
    }
  }
  return out
}

/** Cosine similarity of two equal-length vectors; 0 if either is all-zeros. */
export function cosineSim(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

export interface Chunk {
  text: string
  start: number
  end: number
}

/** Overlapping character chunks (mirrors the RAG chunk_text exercise). */
export function makeChunks(text: string, size: number, overlap: number): Chunk[] {
  if (!text || size <= 0) return []
  const step = Math.max(1, size - overlap)
  const out: Chunk[] = []
  for (let i = 0; i < text.length; i += step) {
    const end = Math.min(i + size, text.length)
    out.push({ text: text.slice(i, end), start: i, end })
    if (end >= text.length) break
  }
  return out
}
