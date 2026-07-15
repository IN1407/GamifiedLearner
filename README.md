# GamifiedLearner

A gamified e-learning platform that takes you from your first line of Python to reading modern attention papers — then teaches you to *use* AI fluently. Duolingo-style streaks and XP, unlockable milestone **statuses** earned by passing **checkpoint assessments** (Pythonista → Backend Wrangler → Attention Alchemist → Neural Architect → Prompt Whisperer → AI Power User), quizzes with AI-explained mistakes, code exercises **verified statically (your code is never executed) and reviewed by AI**, interactive visualizations (tokenizer, vector similarity, chunking, attention, gradient descent, softmax), a hands-on **RAG** build (chunking → embeddings → retrieval → context → generation), and free-text exercises graded by your own connected AI model — all in a sleek dark UI.

### Checkpoint assessments

After each major checkpoint you take a mixed **quiz + coding** assessment. Score **40%+** (a single centralized threshold) to unlock the matching status. Scoring is deterministic — quiz answers graded exactly, code checked by static structural analysis — so it works even in demo mode; the connected AI is optional/advisory and never decides pass/fail. Unlimited retries, your best score is kept, and a failed attempt shows exactly which modules to review.

Statuses live in **separate per-course tracks** (Python-for-AI and AI-Power-Usage), so a learner who starts with Course 2 still sees a coherent progression — the tracks are fully independent. Clear *every* status across both courses and a **hidden surprise status** reveals itself (no spoilers — it isn't shown as a locked node beforehand).

Mastery is **evidence-based**: passing quizzes/exercises and scoring on checkpoint assessments updates a per-topic mastery estimate (Python, Mathematics, AI Engineering, Prompt Engineering) shown on the home dashboard — it moves from how *correctly* you work, not from merely finishing lessons. Progress is written continuously to a checksummed, double-buffered **atomic document**; if the per-record stores are ever lost or corrupted, startup **recovers** from that document (and quarantines anything that fails validation — secrets are never written to it).

Two courses:

- **Course 1 — Python for AI & Backend** (14 modules): Python fundamentals → data structures → intermediate Python → tooling (decorators/generators/async) → FastAPI backend → math for AI → neural-network internals (backprop derived from scratch) → transformers in depth → efficient attention (DeepSeek MLA, MiniMax lightning attention, Kimi K2 — with cited primary sources) → running models → fine-tuning (LoRA/QLoRA) → RAG → calling AI providers from Python (OpenAI, Anthropic, Google GenAI, Groq, xAI, Z.AI, Ollama, llama-cpp-python, Transformers) → a capstone.
- **Course 2 — AI-Power Usage** (6 modules): prompting fundamentals, advanced prompting, the tool landscape, workflow design, reliable AI workflow engineering (context, loops, harnesses, agents, intent, verification, and reasoning styles), and a capstone. No multiple choice — every checkpoint is a free-text exercise graded by your connected AI against a rubric.

## Quick start

You need **Python 3.11+** and **Node 20+**.

### 1. Backend (FastAPI proxy + static code verifier)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The backend needs **no API key of its own** — see the security note below.

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173  (proxies /api to the backend on :8000)
```

Open http://localhost:5173. On first run you'll pick a math level and connect an AI provider. **No key? Choose "Demo mode"** — the whole app is fully clickable with a built-in fake local model, or point it at a local **Ollama** for a real, free, offline model.

### 3. Production build

```bash
cd frontend && npm run build      # outputs frontend/dist
```

Serve `frontend/dist` as static files behind the same host/origin as the backend (any reverse proxy), so the browser keeps talking to a single origin and `/api` reaches FastAPI.

## Tech stack & key decisions

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + TypeScript + Vite + Tailwind v4 | Component-driven; `react-markdown` + KaTeX for lessons; canvas for the share card. |
| Backend | FastAPI (Python) | The platform teaches FastAPI, so it dogfoods it. Stateless AI proxy + static (never-executing) code verifier. |
| Persistence | Browser **IndexedDB** via a typed data-access layer (`idb`) | Structured stores + indexes for progress and the real-dated event log that streaks are computed from. No accounts, no server DB. |
| Provider adapters | One `LLMProvider` interface, one file per vendor | Adding a provider = one new adapter + one registry line. |

### AI provider support

OpenAI, Anthropic, Google (Gemini), Groq, OpenRouter, DeepSeek, Zhipu/Z.ai, Moonshot (Kimi), MiniMax, two **local, no-key** options — **Ollama** (native API) and **llama.cpp** (its OpenAI-compatible server, run via `python -m llama_cpp.server --model your-model.gguf`) — and a built-in Demo provider. After you enter a key it's validated by calling the provider's live `/models` endpoint and the dropdown is populated from the response — no hardcoded model lists to go stale. Local providers need no key and surface an actionable error if their server isn't running.

> **Deliberate deviation from the brief's "use each provider's official SDK":** all adapters speak raw HTTP via `httpx` instead of ten vendor SDKs. Ten SDKs would mean ten dependency trees, ten error taxonomies, and ten retry behaviors to reconcile; a thin per-vendor HTTP adapter keeps error handling uniform and the surface small, and most of these vendors are OpenAI-wire-compatible anyway (so they share one adapter). The `LLMProvider` interface requirement is still honored.

### Two AI roles, two system prompts

- **AI Explain / course tutor** — appears on a quiz question *only after a wrong answer*; explains why your answer was wrong and the correct one right, grounded in the lesson content, with an explicit anti-hallucination clause. Also powers the scoped course Q&A chat.
- **Exercise / prompt grader** — grades free-text and code submissions against a per-exercise rubric, returns structured JSON feedback, and is forbidden from praise-only feedback or claiming code runs.

- **Explanation reviser** — every AI explanation has a **"Change explanation"** control: the learner types how they want it changed ("make it simpler", "use an analogy", "explain with code") and gets a tuned rewrite. The original is preserved as Version 1, every revision is kept, and the version history is navigable and **persisted** (it survives a reload). A revision only appends a version on success, so a failed generation never corrupts the history.

All three prompts live in `backend/app/prompts.py` and are intentionally separate.

## Security & privacy

- **API keys never touch the server's disk or logs.** The browser encrypts the key with **AES-GCM** (a non-extractable WebCrypto key held in IndexedDB) before storing it, decrypts it in memory only to send a request, and the FastAPI backend forwards it to *only the chosen provider* — never a third party. It's clearable from Settings.
  - *Tradeoff chosen (documented per brief):* the encrypted key lives client-side and rides along on each AI request over HTTPS, rather than being held in a server session. Upside: no key ever persists outside the user's browser, and a backend restart loses nothing. Downside: the key is in each request payload (over HTTPS to your own origin). The client-side encryption protects against casual IndexedDB inspection, not against code running in the same origin — see the note in `frontend/src/lib/crypto.ts`.
- **Learner code is never executed.** Code exercises are verified **statically** (`backend/app/syntax_check.py`, `POST /api/verify`): the submission is parsed into an AST with `ast.parse` — which does not run, import, or evaluate anything — and inspected for syntax validity and required structure (are the expected functions actually implemented? are the required constructs used?). Syntax validity is only a *supporting* signal: valid Python can still be wrong. Semantic correctness and style are judged by the connected AI, which receives the static analysis strictly as **evidence** (it is instructed never to pass code merely because it parses). The old executing runner (`backend/app/runner.py`) is retained **only** as a CI safety net that runs the *authors'* reference solutions — it is not imported by the API and no learner input can reach it.

## Testing

```bash
# Backend: unit + API + static syntax verification (incl. proof learner code is never executed)
cd backend && .venv/bin/python -m pytest tests/ -q      # 82 tests

# Frontend: gamification math, content integrity, share-card rendering, API client
cd frontend && npm test                                  # frontend unit/component tests

# End-to-end (drives the real app in Chromium; needs both servers running)
cd frontend && node e2e-smoke.mjs                        # 14 checks
```

The backend suite includes `test_exercise_solutions.py`, which runs a known-correct **author** reference solution for **every** code exercise through the CI-only runner — so no exercise can ship with internally inconsistent tests. (Learner submissions never touch that runner; they are verified statically.) `test_syntax_check.py` and `test_api.py` include tests proving learner code is never executed (a hostile submission that would write a sentinel file or loop forever returns instantly with no side effects).

## Accessibility & responsiveness

Keyboard-navigable (radio groups, focus-visible outlines), ARIA labels on interactive widgets and progress bars, `aria-live` regions for quiz/grading feedback, single-`<h1>`-per-page (in-lesson markdown headings are demoted), `prefers-reduced-motion` respected for the celebration animation, and a layout responsive down to 375px (the course player's left rail collapses to a toggle on mobile).

## Project layout

```
backend/
  app/
    main.py            FastAPI app: /api/providers, /api/ai/{explain,chat,grade}, /api/verify
    providers/         LLMProvider interface + one adapter per vendor + demo
    prompts.py         the two AI-role system prompts
    syntax_check.py    static (never-executing) AST verification of learner code
    runner.py          CI-only author-solution runner (not on any request path)
    schemas.py         Pydantic request/response models
  tests/               pytest suite (incl. every-exercise-is-solvable check)
frontend/
  src/
    lib/               db (IndexedDB), crypto, api client, gamification, share card
    state/             zustand store, hydrated from IndexedDB
    content/           course1/ (13 modules) + course2/ (6 modules), typed content model
    components/        lesson renderer, quiz/exercise engines, AI Explain, chat, viz, level-up
    pages/             Home, Onboarding, CoursePlayer, Settings
```
## License
GamifiedLearner is licensed under AGPLv3. Modifications and redistributions of the covered software must remain open source under the terms of the AGPLv3, including applicable source-code obligations for modified versions offered over a network.
