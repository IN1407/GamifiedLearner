import type { Module } from '../types'

export const module12: Module = {
  id: 'm12-rag',
  title: 'RAG: Retrieval-Augmented Generation',
  summary: 'Embeddings, vector search, chunking, and the retrieve-then-generate pipeline.',
  lessons: [
    {
      id: 'chunking-context',
      title: 'Chunking & Context Construction',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: String.raw`
## The RAG pipeline, end to end

Retrieval-Augmented Generation grounds a model in **your** documents so it can
answer questions it was never trained on — and cite where the answer came from.
The whole pipeline is just seven steps:

1. **Load** a source document (here, a plain \`.txt\` file).
2. **Chunk** it into passages small enough to embed and retrieve.
3. **Embed** each chunk into a vector.
4. **Store** the vectors (a "vector store" — even a plain list works to learn).
5. **Retrieve** the chunks most similar to the question.
6. **Build context** — stitch the retrieved chunks into the prompt.
7. **Generate** the final answer with a provider API, grounded in that context.

This lesson builds steps **2** and **6** — the two that people most often get
wrong. The next lesson covers embeddings, similarity, and retrieval (steps 3–5).

## Why chunk?

Models have a finite context window, embeddings blur meaning across long text,
and retrieval is sharper on focused passages. So we split the document into
overlapping windows. **Overlap** matters: without it, a sentence split across a
boundary loses its meaning in both chunks. A little overlap (say 10–20%) keeps
ideas whole.

A common **failure case**: chunks that are too large retrieve irrelevant text;
too small and they lose context. Overlap of zero drops boundary-spanning facts.

The whole reason chunking and retrieval matter is the **context window**: the
system prompt, chat history, and retrieved passages all share one fixed token
budget, and whatever the prompt fills, the response can't use. Retrieve too much
and you overflow it.
`,
        },
        {
          type: 'viz',
          viz: 'contextWindow',
          caption: 'Drag the sliders: prompt tokens and retrieved context compete for one fixed window.',
        },
        {
          type: 'viz',
          viz: 'chunking',
          caption: 'Slide the size and overlap to see chunk boundaries move over real text.',
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-chunking',
            title: 'Chunking check',
            questions: [
              {
                kind: 'mcq',
                id: 'ck1',
                prompt: 'Why do we add **overlap** between chunks?',
                choices: [
                  'So facts that span a chunk boundary are not lost',
                  'To make chunks bigger for no reason',
                  'To use more memory',
                  'Overlap is never useful',
                ],
                answerIndex: 0,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'ck2',
                prompt: 'Chunks that are **too large** tend to…',
                choices: [
                  'retrieve irrelevant text along with the answer',
                  'always improve accuracy',
                  'remove the need for embeddings',
                  'make retrieval impossible',
                ],
                answerIndex: 0,
                difficulty: 2,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-chunk-text',
            title: 'Chunk a document',
            instructions: String.raw`
Implement \`chunk_text(text, chunk_size, overlap)\`:

- Return a list of substrings of length \`chunk_size\`, stepping forward by
  \`chunk_size - overlap\` characters each time.
- The final chunk may be shorter than \`chunk_size\`.
- An empty string returns \`[]\`.

Example: \`chunk_text("abcdef", 3, 1)\` → \`["abc", "cde", "ef"]\`
`,
            starterCode: `def chunk_text(text, chunk_size, overlap):
    # step forward by (chunk_size - overlap) each time
    ...
`,
            tests: [
              { name: 'no overlap tiles exactly', code: 'assert chunk_text("abcdef", 3, 0) == ["abc", "def"]' },
              { name: 'overlap steps by size-overlap', code: 'assert chunk_text("abcdef", 3, 1) == ["abc", "cde", "ef"]' },
              { name: 'empty text', code: 'assert chunk_text("", 4, 0) == []' },
              { name: 'last chunk can be short', code: 'assert chunk_text("abcd", 3, 0) == ["abc", "d"]' },
            ],
            requirements: { mustDefine: [{ name: 'chunk_text', minArgs: 3 }] },
            difficulty: 2,
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-build-context',
            title: 'Build the prompt context',
            instructions: String.raw`
Once you've retrieved the best chunks, you assemble them into the prompt.
Implement \`build_context(chunks, question)\` that returns a single string:

- Number each chunk as a source, e.g. \`"[1] ...text..."\`, one per line.
- End with the learner's \`question\`.

The exact wording is up to you — the goal is a grounded prompt the model can
answer from. (Your code is checked statically, then you can ask the AI to review
whether your prompt is well-designed.)
`,
            starterCode: `def build_context(chunks, question):
    # return a prompt string with numbered sources + the question
    ...
`,
            tests: [
              {
                name: 'includes every chunk and the question',
                code: 'out = build_context(["alpha fact", "beta fact"], "which fact?")\nassert "alpha fact" in out and "beta fact" in out and "which fact?" in out',
              },
              {
                name: 'numbers the sources',
                code: 'out = build_context(["x"], "q")\nassert "1" in out',
              },
            ],
            requirements: { mustDefine: [{ name: 'build_context', minArgs: 2 }] },
            aiFeedback: true,
            rubric:
              'Assess whether the assembled prompt is well-designed for grounded RAG: are sources clearly delimited and numbered, is the question clearly separated, and would the format discourage the model from answering outside the provided context? Judge the design, not just that it runs.',
            difficulty: 2,
          },
        },
      ],
    },
    {
      id: 'embeddings-retrieval',
      title: 'Embeddings & Vector Search',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# The Problem RAG Solves

Models know only their training data — nothing after the cutoff, nothing private to you, and they'll confidently improvise when asked anyway. **Retrieval-Augmented Generation** fixes this without training: *find* the relevant documents at question time and *paste them into the prompt* as grounding context.

$$\text{RAG} = \text{search engine} + \text{"answer using only the context below"}$$

## Embeddings as search keys

An **embedding model** (distinct from a chat model) maps any text to a vector — typically 384–3072 dimensions — such that *semantically similar texts land near each other*. "How do I reset my password?" and "Steps to change login credentials" share almost no words but get nearby vectors. That's the retrieval superpower: search by **meaning**, not keywords.

Similarity is measured with **cosine similarity** — the dot product (module 6, again) of the two vectors normalized by their lengths:

$$\text{sim}(\mathbf{a}, \mathbf{b}) = \frac{\mathbf{a} \cdot \mathbf{b}}{\lVert\mathbf{a}\rVert \, \lVert\mathbf{b}\rVert} \in [-1, 1]$$

1 = same direction (same meaning), 0 = unrelated. Normalizing means a long document and a short one can still match on meaning rather than magnitude.

## Vector stores

A **vector store** holds (embedding, text, metadata) rows and answers "nearest k vectors to this query" fast:

- Prototyping / small corpora (≤ ~100k chunks): a NumPy array and brute-force cosine — genuinely fine, don't over-engineer.
- Production: FAISS (library), Chroma / Qdrant / Weaviate (databases), pgvector (Postgres extension) — these use **approximate** nearest-neighbor indexes (HNSW graphs) trading a sliver of recall for orders-of-magnitude speed.

## Chunking — the decision that matters most

Whole documents are too long to embed usefully (one vector can't represent 40 pages) and too long to stuff into prompts. So you split into **chunks** — and chunking strategy quietly dominates RAG quality:

- **Too small** (a sentence): retrieval hits lack the context to answer with.
- **Too large** (many pages): the one relevant paragraph is diluted; the embedding averages many topics.
- Solid default: **200–500 tokens, split on paragraph/heading boundaries, 10–15% overlap** so facts straddling a boundary survive in at least one chunk.
- Respect structure when you have it — split markdown on headings, code on functions — and store metadata (source, section) so answers can cite.
`,
        },
        {
          type: 'viz',
          viz: 'similarity',
          caption: 'Cosine similarity in 2D: related words point in similar directions.',
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-embeddings',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: '"Reset my password" retrieves "change login credentials" despite zero shared keywords because…',
                choices: [
                  'the vector store fuzzy-matches spelling',
                  'embedding models place semantically similar texts near each other in vector space',
                  'both contain common stop words',
                  'RAG uses regular expressions',
                ],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Cosine similarity differs from a raw dot product by…',
                choices: [
                  'using subtraction instead of multiplication',
                  'normalizing by both vectors’ lengths, so magnitude doesn’t dominate meaning',
                  'only working on unit-length inputs',
                  'returning values in [0, 100]',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'Chunks that are far too LARGE cause…',
                choices: [
                  'faster embedding',
                  'diluted embeddings and prompts stuffed with mostly-irrelevant text',
                  'more precise retrieval',
                  'nothing — size is irrelevant',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'Why overlap adjacent chunks by ~10–15%?',
                choices: [
                  'To make the corpus look bigger',
                  'So facts that straddle a chunk boundary appear intact in at least one chunk',
                  'Embedding models require overlap',
                  'To slow down retrieval for accuracy',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-cosine',
            title: 'Cosine similarity + top-k retrieval',
            instructions: String.raw`
Build the retrieval core:

1. \`cosine(a, b)\` — cosine similarity of two vectors (lists). If either has zero length
   (all zeros), return 0.0.
2. \`top_k(query_vec, docs, k)\` — \`docs\` is a list of \`(text, vector)\` tuples; return the
   \`k\` texts with highest cosine similarity to the query, best first.
`,
            starterCode: `import math

def cosine(a, b):
    ...

def top_k(query_vec, docs, k):
    ...
`,
            tests: [
              { name: 'identical direction = 1', code: 'assert abs(cosine([1, 2], [2, 4]) - 1.0) < 1e-9' },
              { name: 'orthogonal = 0', code: 'assert abs(cosine([1, 0], [0, 1])) < 1e-9' },
              { name: 'zero vector safe', code: 'assert cosine([0, 0], [1, 2]) == 0.0' },
              {
                name: 'retrieves by meaning-proxy',
                code: 'docs = [("cats", [1.0, 0.0]), ("dogs", [0.9, 0.1]), ("stocks", [0.0, 1.0])]\nassert top_k([1.0, 0.05], docs, 2) == ["cats", "dogs"]',
              },
            ],
            difficulty: 2,
          },
        },
      ],
    },
    {
      id: 'rag-pipeline-checkpoint',
      title: 'The Full RAG Pipeline',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# Assembling the Pipeline

**Indexing time** (once per corpus update):
\`\`\`text
documents → chunk → embed each chunk → store (vector, text, metadata)
\`\`\`

**Query time** (every question):
\`\`\`text
question → embed → top-k nearest chunks → build grounded prompt → LLM → answer
\`\`\`

The grounded prompt is where hallucination control happens:

\`\`\`python
prompt = f"""Answer using ONLY the context below.
If the context does not contain the answer, say "I don't know."
Cite the source of each claim as [source].

Context:
{chr(10).join(f"[{c.source}] {c.text}" for c in chunks)}

Question: {question}"""
\`\`\`

Three lines of defense, all in the prompt: restrict to context, licensed "I don't know", forced citations. (Recognize the technique? The AI-Explain prompt in this very app does the same scoping to lesson content.)

## Failure modes and the knobs that fix them

| Symptom | Likely cause | Fix |
|---|---|---|
| Right doc exists, wrong chunks retrieved | chunking too coarse/fine; query phrasing | re-chunk; query rewriting; hybrid keyword+vector search |
| Retrieved chunks fine, answer ignores them | prompt too weak | strengthen the "only from context" framing; fewer, better chunks |
| Answer invents citations | k too high, junk chunks | lower k; add a reranker; require quote-level citations |
| Slow queries | brute force at scale | ANN index (HNSW); cache embeddings |

A **reranker** (a cross-encoder scoring query+chunk pairs jointly) applied to your top-20 before keeping top-3 is the single highest-leverage upgrade to naive RAG.

---

# 🏁 Module 12 Checkpoint

The exercise builds an entire miniature RAG system — chunker, toy embedder, retriever, prompt builder — in pure Python. Every piece is something you've already written this course.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-checkpoint-12',
            title: 'Checkpoint quiz',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'Embedding the corpus happens…',
                choices: [
                  'on every user query',
                  'once at indexing time (and again only when documents change)',
                  'during LLM generation',
                  'never — the LLM embeds internally',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'The instruction "If the context does not contain the answer, say I don’t know" exists to…',
                choices: [
                  'reduce token costs',
                  'give the model a licensed alternative to inventing an answer',
                  'speed up retrieval',
                  'satisfy the vector store',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'Answers keep citing irrelevant retrieved chunks. Per the failure-mode table, the first knobs to try are…',
                choices: [
                  'a bigger LLM',
                  'lower k and/or add a reranker',
                  'longer chunks',
                  'higher temperature',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'RAG vs fine-tuning: RAG is the right tool when…',
                choices: [
                  'you want to change the model’s tone',
                  'answers must be grounded in changing or private documents',
                  'you need lower latency than prompting',
                  'you have no documents',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-checkpoint-12',
            title: 'Checkpoint: mini-RAG end to end',
            instructions: String.raw`
Build a word-overlap RAG (a real one swaps in neural embeddings — the plumbing is identical):

1. \`chunk_text(text, max_words)\` — split into word-lists of ≤ max_words, joined back to strings,
   no overlap needed here
2. \`score(query, chunk)\` — count of distinct query words (lowercased) that appear in the chunk
   (lowercased word set)
3. \`retrieve(query, chunks, k)\` — top-k chunks by score, best first (stable for ties)
4. \`build_prompt(query, retrieved)\` — return a string containing the line
   \`"Answer using ONLY the context below."\`, then each retrieved chunk on its own line, then
   \`f"Question: {query}"\`
`,
            starterCode: `def chunk_text(text, max_words):
    ...

def score(query, chunk):
    ...

def retrieve(query, chunks, k):
    ...

def build_prompt(query, retrieved):
    ...
`,
            tests: [
              {
                name: 'chunking respects max_words',
                code: 'cs = chunk_text("a b c d e", 2)\nassert cs == ["a b", "c d", "e"]',
              },
              {
                name: 'scoring counts distinct overlaps',
                code: 'assert score("reset password email", "To reset your password click the email link") == 3\nassert score("cat", "dogs only here") == 0',
              },
              {
                name: 'retrieval ranks correctly',
                code: 'chunks = ["billing and invoices", "reset your password here", "password and email reset steps"]\ntop = retrieve("reset password email", chunks, 2)\nassert top[0] == "password and email reset steps" and top[1] == "reset your password here"',
              },
              {
                name: 'prompt is grounded',
                code: 'p = build_prompt("q?", ["c1", "c2"])\nassert "Answer using ONLY the context below." in p and "c1" in p and "c2" in p and "Question: q?" in p',
              },
            ],
            difficulty: 3,
          },
        },
      ],
    },
  ],
}
