import type { Module } from '../types'

export const module13: Module = {
  id: 'm13-capstone',
  title: 'Capstone: Ship an AI App',
  summary: 'Build a small AI-powered web app end to end — the veteran checkpoint.',
  lessons: [
    {
      id: 'capstone',
      title: 'The Veteran Checkpoint',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# Capstone: Build It For Real

You've gone from \`x = 1\` to reading attention papers. Time to ship. **The build happens on your machine** — this checkpoint verifies the architecture in your head, tests the trickiest server piece here in the browser, and then AI-grades your design document.

## The project

Build **DocChat** (or your own variant of comparable scope): a web app where a user pastes a document, then asks questions answered *from that document*.

Required shape — every piece is a module you've completed:

\`\`\`text
Browser (simple HTML/JS or React)
   │  POST /api/document          (m5: FastAPI, Pydantic validation)
   │  POST /api/ask               (m5: routing, error handling)
   ▼
FastAPI backend
   ├─ chunk + score document      (m12: your mini-RAG, verbatim)
   ├─ build grounded prompt       (m12: "answer ONLY from context")
   ├─ call an LLM                 (m10: OpenAI-compatible SDK or Ollama — adapter pattern)
   ├─ handle 401/429/timeouts     (m3 exceptions, m4 retry decorator, m5 HTTPException)
   └─ stream or return answer     (m4: async)
\`\`\`

## Milestones (do them in order, verify each)

1. **Skeleton**: FastAPI app with \`/api/health\`; frontend page that calls it. *Verify: docs page renders, fetch works.*
2. **Ingest**: \`POST /api/document\` accepts \`{"text": ...}\` (Pydantic, 422 on garbage), chunks it, stores chunks in memory. *Verify: returns chunk count.*
3. **Ask**: \`POST /api/ask\` retrieves top-3 chunks, builds the grounded prompt, calls your model (Ollama = free), returns \`{"answer", "sources"}\`. *Verify: answers cite the document; questions the doc can't answer get "I don't know."*
4. **Failure-proofing**: kill Ollama / unplug the network — the user must see a specific, readable error, not a stack trace. Empty document, empty question → 4xx with clear detail.
5. **Polish**: loading state, streaming if you're feeling strong, README with run instructions.

Below: an architecture quiz, the server-side core as a tested exercise, and the design-doc submission.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-capstone',
            title: 'Architecture review',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'The user’s API key for the LLM provider belongs…',
                choices: [
                  'in the frontend JS so calls are direct and fast',
                  'server-side (env var or per-request over HTTPS) — the browser never talks to the provider',
                  'in localStorage, unencrypted, for convenience',
                  'committed to the repo in config.py',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Your `/api/ask` handler calls the LLM synchronously with the `requests` library. Under 10 concurrent users the whole app freezes. Why?',
                choices: [
                  'requests has a global lock',
                  'a blocking call inside the async event loop stalls every other request (module 4!)',
                  'FastAPI only supports one user',
                  'the LLM bans concurrent calls',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'A question the document can’t answer should produce…',
                choices: [
                  'the model’s best guess from general knowledge, unlabeled',
                  '"I don’t know" (or equivalent), because the grounded prompt licenses it',
                  'a 500 error',
                  'an empty string',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'Which failure MUST show the user a specific visible error rather than failing silently?',
                choices: [
                  'provider returns 429',
                  'provider is unreachable',
                  'user submits an empty document',
                  'all of the above',
                ],
                answerIndex: 3,
                difficulty: 1,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-capstone-core',
            title: 'The /api/ask core, tested',
            instructions: String.raw`
Implement the framework-free heart of DocChat — the function your route handler calls.

\`answer_query(question, chunks, llm)\` where \`llm\` is a callable \`prompt -> str\` (in production
it's your provider adapter; in tests it's a fake):

1. If \`question\` is blank (after strip) → raise \`ValueError("empty question")\`
2. If \`chunks\` is empty → return \`{"answer": "No document loaded.", "sources": []}\` without calling llm
3. Retrieve the top 2 chunks by distinct-word-overlap score with the question
   (your module-12 \`score\`; reimplement it here)
4. Build the prompt: \`"Answer using ONLY the context below.\n"\` + one line per chunk + \`f"Question: {question}"\`
5. Return \`{"answer": llm(prompt), "sources": [the chosen chunks]}\`
`,
            starterCode: `def answer_query(question, chunks, llm):
    ...
`,
            tests: [
              {
                name: 'empty question raises',
                code: 'try:\n    answer_query("   ", ["c"], lambda p: "x")\n    assert False\nexcept ValueError:\n    pass',
              },
              {
                name: 'no document short-circuits',
                code: 'called = []\nout = answer_query("q", [], lambda p: called.append(1) or "x")\nassert out == {"answer": "No document loaded.", "sources": []} and not called',
              },
              {
                name: 'grounded prompt reaches the llm',
                code: 'seen = {}\ndef fake(p):\n    seen["p"] = p\n    return "ans"\nout = answer_query("password reset", ["billing stuff", "reset password steps", "misc"], fake)\nassert "Answer using ONLY the context below." in seen["p"]\nassert "reset password steps" in seen["p"]\nassert "Question: password reset" in seen["p"]',
              },
              {
                name: 'returns answer and sources',
                code: 'out = answer_query("password", ["a password chunk", "unrelated"], lambda p: "the answer")\nassert out["answer"] == "the answer" and out["sources"][0] == "a password chunk"',
              },
            ],
            difficulty: 3,
          },
        },
        {
          type: 'promptExercise',
          exercise: {
            id: 'ex-capstone-doc',
            title: 'Submit your capstone design document',
            instructions: String.raw`
Build the app on your machine, then submit a **design document** (300–600 words) covering:

1. **What you built** — feature list, which model/provider, hosted or local
2. **Architecture** — endpoints, data flow, where chunking/retrieval/prompting happen
3. **Failure handling** — what the user sees for: provider down, rate limit, empty inputs
4. **One tradeoff you made** and the alternative you rejected (e.g. streaming vs simple, brute-force vs vector DB)
5. **What you'd build next** with one more week

Your connected AI grades it against the rubric below. Be concrete — "FastAPI with two POST endpoints"
beats "a modern backend".
`,
            rubric: `Scoring criteria (100 points total):
- Completeness (30): all five sections present and substantive; endpoints and data flow actually described
- Technical correctness (30): architecture is coherent (keys server-side, async or justified sync, grounded prompting for RAG); no claims that contradict how HTTP/LLM APIs work
- Failure-handling depth (20): names at least three concrete failure modes with the specific user-visible behavior for each
- Tradeoff reasoning (20): at least one real tradeoff with the rejected alternative and WHY
Do not award points for length, buzzwords, or enthusiasm. The submission is a design document, not code — do not claim to have verified the described app runs.`,
            placeholder: 'What I built: DocChat — paste a document, ask questions...\n\nArchitecture: ...',
            difficulty: 3,
          },
        },
        {
          type: 'md',
          md: `
---

🎓 **That's the course.** You can write Python, build and defend an API, derive backprop, read an attention paper, run models locally, fine-tune with LoRA, and ship a grounded RAG app. "Veteran" earned — go build something real, and come back through Course 2 to sharpen how you *use* these tools daily.
`,
        },
      ],
    },
  ],
}
