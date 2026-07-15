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

export interface BudgetSegment {
  label: string
  tokens: number
}

export interface BudgetSlice extends BudgetSegment {
  /** Fraction of the whole capacity this segment occupies, in [0, 1]. */
  pct: number
}

export interface ContextBudget {
  capacity: number
  used: number
  /** Free tokens left for the model's response (0 if the prompt overflows). */
  headroom: number
  /** Tokens by which the request exceeds the window (0 when it fits). */
  overflow: number
  fits: boolean
  slices: BudgetSlice[]
}

/**
 * Context-window budget: given labeled token amounts and a total capacity,
 * report how much of the window each part consumes, the response headroom, and
 * whether it overflows. Deterministic so the meter can be verified by hand.
 * Percentages are computed against capacity (not the sum), so an overflowing
 * request visibly exceeds 100%.
 */
export function contextBudget(segments: BudgetSegment[], capacity: number): ContextBudget {
  const cap = Math.max(1, capacity)
  const used = segments.reduce((a, s) => a + Math.max(0, s.tokens), 0)
  const slices = segments.map((s) => ({ ...s, pct: Math.max(0, s.tokens) / cap }))
  return {
    capacity: cap,
    used,
    headroom: Math.max(0, cap - used),
    overflow: Math.max(0, used - cap),
    fits: used <= cap,
    slices,
  }
}

/** First `count` tokens joined back into text — the "already generated" prefix
 * a streaming UI has received so far (partial-output preservation). */
export function joinTokens(tokens: string[], count: number): string {
  return tokens.slice(0, Math.max(0, Math.min(count, tokens.length))).join('')
}
