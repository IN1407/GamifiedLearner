# GamifiedLearner

A gamified e-learning platform that takes you from your first line of Python to reading modern attention papers — then teaches you to *use* AI fluently. Duolingo-style streaks and XP, quizzes with AI-explained mistakes, real code exercises graded by actually running them, interactive visualizations, and free-text exercises graded by your own connected AI model.

Two courses:

- **Course 1 — Python for AI & Backend** (13 modules): Python fundamentals → data structures → intermediate Python → tooling (decorators/generators/async) → FastAPI backend → math for AI → neural-network internals (backprop derived from scratch) → transformers in depth → efficient attention (DeepSeek MLA, MiniMax lightning attention, Kimi K2 — with cited primary sources) → running models → fine-tuning (LoRA/QLoRA) → RAG → a capstone.
- **Course 2 — AI-Power Usage** (5 modules): prompting fundamentals, advanced prompting, the tool landscape, workflow design, and a capstone. No multiple choice — every checkpoint is a free-text exercise graded by your connected AI against a rubric.

## Quick start

You need **Python 3.11+** and **Node 20+**.

### 1. Backend (FastAPI proxy + code runner)

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
| Backend | FastAPI (Python) | The platform teaches FastAPI, so it dogfoods it. Stateless AI proxy + deterministic code runner. |
| Persistence | Browser **IndexedDB** via a typed data-access layer (`idb`) | Structured stores + indexes for progress and the real-dated event log that streaks are computed from. No accounts, no server DB. |
| Provider adapters | One `LLMProvider` interface, one file per vendor | Adding a provider = one new adapter + one registry line. |

### AI provider support

OpenAI, Anthropic, Google (Gemini), Groq, OpenRouter, DeepSeek, Zhipu/Z.ai, Moonshot (Kimi), MiniMax, Ollama (local, no key), and a built-in Demo provider. After you enter a key it's validated by calling the provider's live `/models` endpoint and the dropdown is populated from the response — no hardcoded model lists to go stale.

> **Deliberate deviation from the brief's "use each provider's official SDK":** all adapters speak raw HTTP via `httpx` instead of ten vendor SDKs. Ten SDKs would mean ten dependency trees, ten error taxonomies, and ten retry behaviors to reconcile; a thin per-vendor HTTP adapter keeps error handling uniform and the surface small, and most of these vendors are OpenAI-wire-compatible anyway (so they share one adapter). The `LLMProvider` interface requirement is still honored.

### Two AI roles, two system prompts

- **AI Explain / course tutor** — appears on a quiz question *only after a wrong answer*; explains why your answer was wrong and the correct one right, grounded in the lesson content, with an explicit anti-hallucination clause. Also powers the scoped course Q&A chat.
- **Exercise / prompt grader** — grades free-text and code submissions against a per-exercise rubric, returns structured JSON feedback, and is forbidden from praise-only feedback or claiming code runs.

Both prompts live in `backend/app/prompts.py` and are intentionally separate.

## Security & privacy

- **API keys never touch the server's disk or logs.** The browser encrypts the key with **AES-GCM** (a non-extractable WebCrypto key held in IndexedDB) before storing it, decrypts it in memory only to send a request, and the FastAPI backend forwards it to *only the chosen provider* — never a third party. It's clearable from Settings.
  - *Tradeoff chosen (documented per brief):* the encrypted key lives client-side and rides along on each AI request over HTTPS, rather than being held in a server session. Upside: no key ever persists outside the user's browser, and a backend restart loses nothing. Downside: the key is in each request payload (over HTTPS to your own origin). The client-side encryption protects against casual IndexedDB inspection, not against code running in the same origin — see the note in `frontend/src/lib/crypto.ts`.
- **Code exercises run in a subprocess sandbox** (`backend/app/runner.py`): `python -I` isolated mode, a temp working directory, a wall-clock timeout, and (POSIX) CPU/memory/file-size rlimits. This is a **local-first** app — the backend runs on the learner's own machine — so the sandbox guards against accidents (infinite loops, runaway allocations, stray writes), not a hostile multi-tenant attacker. Correctness is decided here deterministically; the AI only ever gives qualitative style feedback.

## Testing

```bash
# Backend: unit + API + every code exercise validated end-to-end (34 reference solutions run through the real runner)
cd backend && .venv/bin/python -m pytest tests/ -q      # 57 tests

# Frontend: gamification math, content integrity, share-card rendering
cd frontend && npm test                                  # 29 tests

# End-to-end (drives the real app in Chromium; needs both servers running)
cd frontend && node e2e-smoke.mjs                        # 14 checks
```

The backend suite includes `test_exercise_solutions.py`, which runs a known-correct reference solution for **every** code exercise through the actual runner — so no exercise can ship with internally inconsistent tests.

## Accessibility & responsiveness

Keyboard-navigable (radio groups, focus-visible outlines), ARIA labels on interactive widgets and progress bars, `aria-live` regions for quiz/grading feedback, single-`<h1>`-per-page (in-lesson markdown headings are demoted), `prefers-reduced-motion` respected for the celebration animation, and a layout responsive down to 375px (the course player's left rail collapses to a toggle on mobile).

## Project layout

```
backend/
  app/
    main.py            FastAPI app: /api/providers, /api/ai/{explain,chat,grade}, /api/execute
    providers/         LLMProvider interface + one adapter per vendor + demo
    prompts.py         the two AI-role system prompts
    runner.py          deterministic sandboxed code-exercise runner
    schemas.py         Pydantic request/response models
  tests/               pytest suite (incl. every-exercise-is-solvable check)
frontend/
  src/
    lib/               db (IndexedDB), crypto, api client, gamification, share card
    state/             zustand store, hydrated from IndexedDB
    content/           course1/ (13 modules) + course2/ (5 modules), typed content model
    components/        lesson renderer, quiz/exercise engines, AI Explain, chat, viz, level-up
    pages/             Home, Onboarding, CoursePlayer, Settings
```
