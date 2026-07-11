# GamifiedLearner — Implementation Plan (`implementation.md`)

## 1. Objective

Extend the existing GamifiedLearner platform (FastAPI backend + React/TypeScript/Vite/Tailwind frontend) with:

1. A centralized **milestone status / achievement system** integrated into the streak UI and the screenshotable/shareable achievement screen.
2. **Checkpoint assessments** (quiz + coding exercises) after every major curriculum checkpoint, with an explicit 40% pass threshold that unlocks the corresponding status.
3. A hard pivot of all learner-code verification to **Python syntax-only verification** — learner code must never be executed — combined with rubric/AI grading.
4. Beginner-friendly **RAG pipeline exercises** (`.txt` → chunking → embeddings → vector store → retrieval → context → generation).
5. **Local AI provider support**: Ollama via its official Python library and `llama-cpp-python`, integrated into the existing provider abstraction.
6. **Curriculum expansion** teaching the Python SDKs/APIs of hosted and local providers (OpenAI, Google GenAI, Ollama, llama-cpp-python, Hugging Face Transformers, Groq, xAI, Z.AI, Anthropic, plus providers already supported).
7. Additional **simulations and educational visuals** (tokenization, embeddings, similarity, chunking, retrieval, context windows, streaming, RAG, local vs hosted).
8. A **grade-based, AI-relevant mathematics curriculum** (Grade 5 → College) with diagnostic assessment, prerequisite graphs, and mastery-based adaptation.
9. **Hierarchical topic-level mastery tracking** with a deterministic, centralized update algorithm.
10. An **adaptive curriculum loop** (grade level → entry point → diagnostics → mastery → lesson selection → remediation/advancement) with explainable recommendations.
11. A **"Change Explanation" system** with persistent, navigable explanation version history.
12. A **status progression bar** derived from the milestone system.
13. **Real-time, crash-safe, atomic progress persistence** with strict validation, schema versioning, migrations, import/recovery, and visible save-state.
14. A full UI transition to a **sleek, modern dark mode**, replacing the current light theme.
15. Exactly **three sequential manual bug scan/fix cycles** (`Scan 1 → Fix 1 → Scan 2 → Fix 2 → Scan 3 → Fix 3`), final validation, and a single clean commit at the end.

## 2. Non-Negotiable Safety and Execution Constraints

These constraints override any conflicting instruction elsewhere in this document:

1. **Learner-submitted Python code MUST NEVER be executed** — not in a sandbox, not with rlimits, not in a subprocess, not via `eval`/`exec`, not indirectly through test harnesses. Verification is syntax-only (see §8). Any existing execution path for learner code must be removed or repurposed so that learner submissions cannot reach it.
2. **Syntax verification is only a supporting signal. It must never be treated as the primary measure of code quality or correctness. Syntactically valid Python can still be logically incorrect, inefficient, insecure, irrelevant to the exercise, or otherwise poor-quality code.** The AI grader receives syntax results as contextual evidence only and must not auto-pass syntactically valid code.
3. **Secrets are never persisted to the progress file/document** — no API keys, tokens, passwords, or provider credentials. Provider secrets continue to use the application's existing secure key mechanism (expected: client-side AES-GCM encrypted storage — verify on inspection).
4. **No keyless provider may prompt for an API key** (expected keyless set includes Ollama and Demo; llama-cpp-python is also keyless). Never log or echo keys.
5. **Progress writes must be atomic and crash-safe** (§14). A crash immediately after an acknowledged progress update must not routinely lose that update.
6. **Do not commit until** implementation, all three scan/fix cycles, and final validation are complete. One clean final commit (or a small series of logically grouped commits made only at the end) on the designated branch.
7. **Preserve correct existing functionality.** Do not duplicate systems that already exist; extend them.
8. **The AI model must not directly and unpredictably control curriculum progression or mastery.** Deterministic application logic makes final decisions; AI outputs are structured evidence only.
9. Imported progress files are **untrusted input**: parse safely, validate strictly, never let invalid imports replace valid current progress.

## 3. Fresh Repository Setup and Discovery

The repository has changed since any previous clone. **Discard all assumptions from stale state.**

1. Clone the repository fresh (or `git fetch --all && git status` and hard-reset a fresh working copy of the designated branch). Work on branch `claude/gamified-learner-platform-4fobt5`; create it from the latest default branch if it does not exist, or check it out and rebase/reset onto the latest remote state as appropriate. Never push to any other branch.
2. Read `README.md`, any `.claude/` hooks/settings, `backend/requirements.txt`, `frontend/package.json`, and CI/config files to learn the actual build, test, lint, and type-check commands. **Do not invent commands** — derive them from `package.json` scripts and the backend test layout.
3. Map the actual structure before writing any code. Expected shape from the project's history (VERIFY EVERY PATH — treat as hypotheses, not facts):
   - Backend: `backend/app/` with `main.py` (FastAPI endpoints), `schemas.py` (Pydantic), `prompts.py` (EXPLAIN/GRADE system prompts), `runner.py` (sandboxed code runner — the component §8 removes from learner flow), `providers/` (a `base.py` `LLMProvider` ABC, an OpenAI-compatible base with vendor subclasses, Anthropic, Google, Ollama-over-HTTP, Demo). Tests in `backend/tests/`.
   - Frontend: `frontend/src/` with `lib/` (`db.ts` IndexedDB via `idb`, `crypto.ts` AES-GCM key storage, `api.ts`, `gamification.ts` streak/XP/level math, `shareCard.ts` canvas share card, `lessonContext.ts`), `state/useStore.ts` (Zustand with IndexedDB write-through), `content/` (typed course/module/lesson blocks; `course1/` ~13 modules, `course2/` ~5 modules; `types.ts` with `lessonMaxXp`, `progressKey`), `components/` (LessonView, QuizBlock, ExerciseBlock, PromptExerciseBlock, AIExplain, ChatDrawer, LevelUpOverlay, viz/ with Attention/GradientDescent/Softmax visualizations, Markdown, ErrorBanner, CodeEditor), `pages/` (Home, Onboarding, CoursePlayer, Settings, App). Tests via Vitest; an e2e Playwright smoke script.
4. From the fresh code, discover and record the **actual**: route map, IndexedDB store names and schemas, Zustand store actions, content block type union, XP formulas, streak computation, checkpoint lesson `kind`, provider registry and keyless set, grading request/response schemas, and existing math-level personalization (`levelVariants` on markdown blocks keyed by a `MathLevel` type — expected values like `middle`, `hs910`, `hs1112`, `college`).
5. Produce a short written audit (working notes, not committed) of which requested features already exist wholly, partially, or not at all, and derive the delta to implement. Extend existing systems (e.g., `MathLevel` → grade levels; LevelUpOverlay/shareCard → status presentation; `gamification.ts` → milestone engine; Zustand+IndexedDB → crash-safe progress document).

## 4. Existing-System Audit Checklist

Inspect and document each of the following before designing changes. For each item, record: current behavior, files involved, and whether it will be extended, modified, or left alone.

- [ ] Curriculum hierarchy: courses, modules, lessons, checkpoint lessons, block types, XP model, unlock/sequencing logic.
- [ ] Progression logic: `isLessonUnlocked`, mastery %, `firstIncomplete`, completion flow in the course player.
- [ ] Streak screen(s): where streak/XP/level are displayed (home stat tiles, course player rails, overlay).
- [ ] Screenshotable achievement screen: the Level-Up overlay and canvas share card renderer (data fields, layout, export path).
- [ ] AI provider abstraction: base interface, registration, model listing, validation endpoint, keyless handling, error taxonomy.
- [ ] Grading pipeline: grade endpoint, grader system prompt, JSON contract, robust parse logic, frontend GradeCard.
- [ ] Python verification: the existing execution-based runner and every call site (endpoint, ExerciseBlock, backend tests including reference-solution tests). This whole path changes in §8.
- [ ] Quizzes: MCQ/short-answer formats, retry/XP behavior, AI-explain gating (explain only after a wrong answer — preserve this rule).
- [ ] Exercises: code exercise schema (starter code, tests, difficulty), prompt exercise schema (rubric).
- [ ] Simulations: existing viz components, lazy loading, accessibility patterns.
- [ ] Image support: whether Markdown rendering supports images/SVG; asset organization.
- [ ] Persistence: IndexedDB stores, write-through store, export/import JSON, reset flow.
- [ ] Profile: math level, weekly commitment, onboarding steps.
- [ ] Tests: backend pytest suites, frontend vitest suites, e2e smoke script; how they are run.
- [ ] Documentation: README claims that will become stale (esp. sandboxed execution, light-mode screenshots, provider list).

## 5. Architecture and Data-Model Changes

High-level deltas (all names below are **proposals** — align to actual conventions found in the repo):

1. **Milestone engine** (frontend `lib/` module + content-level config): pure functions computing unlocked/current/next status from progress + assessment results. No hardcoded milestone conditions in components.
2. **Checkpoint assessment content type**: new content structures for assessments attached to major checkpoints, plus a runner-less scoring engine.
3. **Syntax-only verification**: backend endpoint replacing execution for learner code; `ast`-based analysis service producing structured facts for the AI grader.
4. **Grade level & mastery**: extend profile with `gradeLevel` (grade5…grade12, college); new hierarchical mastery store and deterministic update algorithm; adaptive recommendation engine.
5. **Explanation versioning**: persistent store of explanation version chains keyed by a stable explanation site identifier.
6. **Progress document**: a single canonical, versioned, validated progress document with atomic double-buffered writes, migrations, export/import, and a save-state indicator. This becomes the source of truth that the Zustand store hydrates from and writes through to (replacing or wrapping the current scattered IndexedDB writes — decide after inspection; prefer wrapping the existing stores behind one `progressRepository` so components cannot bypass it).
7. **Dark mode**: global theme replacement (§13).
8. **New curriculum**: Course 3 (grade-adaptive AI math) and Course 4 (provider SDKs) — or extension of existing courses if the existing course structure makes that cleaner; decide after inspecting how courses are registered and how home-page course cards render.

Data flow after changes:

```
UI event (quiz submit / exercise submit / lesson complete / assessment finish / explanation revision)
  → Zustand action (single mutation point)
    → deterministic engines (scoring, mastery update, milestone recompute, recommendation refresh)
    → progressRepository.apply(mutation)      // synchronous state update
    → progressRepository.persist()            // immediate, queued, atomic (§14)
  → UI re-render (status bar, streak, mastery dashboards, save indicator)
```

## 6. Milestone Status and Achievement System

### 6.1 Discovery first

Enumerate the full curriculum hierarchy from the fresh content files (all courses/modules, including the new courses added by this plan) and choose the final checkpoint list. The milestone set must cover at least: end of Course 1 Module 5, end of Course 1 Module 9, end of Course 1 (full course), end of Course 2, and terminal milestones for the new math and provider-SDK courses. Add intermediate milestones only where a checkpoint is genuinely major.

### 6.2 Centralized, data-driven config

Create one config module (e.g., alongside content types) exporting an ordered array of milestone definitions:

```ts
interface MilestoneDef {
  id: string                    // stable, never renamed once shipped (e.g. 'c1m5-python-core')
  title: string                 // display name
  subtitle?: string             // one-line flavor text for the share card
  order: number                 // strict total order; precedence = highest order unlocked
  trigger:
    | { kind: 'assessment-passed'; assessmentId: string }
    | { kind: 'course-complete'; courseId: string }      // fallback triggers if an assessment is absent
  icon?: string                 // emoji or asset reference consistent with existing UI
}
```

- Primary trigger is **passing the checkpoint assessment** (§7). Where an assessment exists, module/course completion alone does not unlock the status.
- **Title direction** (finalize after seeing the whole curriculum; keep the "cool technical nickname" tone — no job titles, no certifications, not goofy). Candidate progression, improving the given examples:
  - After Module 5 assessment: **"Pythonista"** (improves "Python Developer" — less job-title-like)
  - After Module 9 assessment: **"Gradient Wrangler"** or keep **"AI Mathematician"**
  - After Course 1: **"Transformer Whisperer"** or **"Neural Architect"**
  - After Course 2: **"Prompt Surgeon"** or **"AI Power User"**
  - After math course: **"Math Mode Unlocked"**-style is too goofy — prefer **"Vector Sage"**
  - After provider-SDK course: **"API Polyglot"**
  - Terminal (everything complete): **"Full-Stack AI Builder"**
  The implementing model should refine names for coherence but must keep stable `id`s decoupled from display titles so renames never break persistence.

### 6.3 Current-status calculation

- `unlockedMilestones: { id, unlockedAt }[]` persisted in the progress document.
- Current status = unlocked milestone with the highest `order`. Next target = lowest-order locked milestone. Derive both with pure functions; never store a separate "current status" value that can drift (recompute on load; the persisted `currentStatus` field, if stored for the share card, must be recomputed and overwritten on every load).
- **Backfill for existing users**: on first load after this feature ships (detected via progress schema migration, §14), evaluate all milestone triggers against existing progress. For milestones whose trigger is an assessment the user has never taken, do **not** auto-unlock — instead mark them "available" and surface the assessment. For pure course-completion triggers already satisfied, unlock retroactively with `unlockedAt = migrationTime` and a flag `retroactive: true`.
- **Duplicate prevention**: unlock is idempotent — an `unlock(id)` on an already-unlocked id is a no-op (assert by id set membership). Assessment retries after passing never re-trigger animations or duplicate records.
- **Curriculum changes**: unknown milestone ids found in persisted progress are preserved but ignored for display (forward compatibility); removed milestones stay in the unlocked list (history) but drop out of the progression bar; new milestones appear locked.
- **Skipped/partial progress**: triggers are evaluated only from actual evidence (assessment results / completion records), never from position in the course.

### 6.4 UI integration

- **Streak/stats surfaces** (home stat tiles + course-player right rail): add a status chip/tile showing current status title and the status progression bar (§6.5).
- **Level-Up overlay & share card**: when a milestone unlocks, the celebration overlay must feature the new status title prominently; extend the canvas share card renderer to draw the status title (and icon) alongside existing level/XP/streak stats. Keep the no-screen-capture constraint: pure canvas drawing, `toBlob`, Web Share with download fallback. Update share-card tests to assert the status text is drawn.
- Visual treatment must be screenshot-worthy: large type, gradient/glow accent consistent with the new dark theme (§13), responsive from 320px width up, `role`/`aria-label`s on the status bar (progressbar semantics), reduced-motion respected for the unlock animation.

### 6.5 Status progression bar

- One horizontal (vertical on very narrow screens if needed) bar with a node per milestone in `order`, filled through the current status, next target highlighted, and — where the next milestone's assessment has partial best-score history — a sub-progress hint ("best attempt 32% / need 40%").
- Derived entirely from milestone config + unlocked set + assessment attempt history. No independent counter.
- On unlock: persist first, then animate (fill advance + node pop), update share screen. Users beyond the final milestone see a "max status" treatment.
- Accessible: `role="progressbar"` or a list with `aria-current`, text alternatives for every node, keyboard-focusable nodes with tooltips naming the milestone.

### 6.6 Tests

- Milestone engine unit tests: ordering, current/next calculation, idempotent unlock, retroactive backfill, unknown/removed/new milestone ids, assessment-pass trigger at exactly the threshold.
- Component tests: status chip renders current title; progression bar node states; share card draws status text (extend existing canvas-stub test).
- Backward compatibility: progress documents from the pre-milestone schema migrate and display correctly.

## 7. Checkpoint Assessment System

### 7.1 Content model

Add an assessment definition per major checkpoint (co-located with course content, typed in the content type module):

```ts
interface CheckpointAssessment {
  id: string                       // stable, referenced by MilestoneDef.trigger
  courseId: string
  afterModuleId: string            // placement
  title: string
  reviewMap: { topicId: string; moduleId: string; lessonIds?: string[] }[]  // for failure feedback
  questions: AssessmentQuestion[]  // reuse existing quiz schema (MCQ + short) where possible
  exercises: AssessmentExercise[]  // reuse existing code-exercise schema minus executable tests
  weights?: { quiz: number; exercises: number }   // default: proportional to point totals
}
```

- Each question/exercise carries `points` and `topicIds` (feeding mastery §12.2 and review guidance).
- Exercises use the syntax-only + AI grading path (§8): starter code, requirements list, rubric, structural expectations (required function names/signatures, expected constructs) — **no executable test cases**.
- Substantial size: roughly 8–15 quiz questions + 2–4 coding exercises per assessment, drawn from the checkpoint's modules.

### 7.2 Scoring

- Centralize the threshold: `ASSESSMENT_PASS_THRESHOLD = 0.4` in one config module (check whether the repo already centralizes tunables; put it beside XP constants if so). All comparisons use `score >= threshold` on a 0–1 fraction computed as `earnedPoints / totalPoints`.
- Quiz question scoring is deterministic (existing correctness logic). Exercise scoring converts the AI grade (expected existing contract: score 0–100 or similar — verify) into points, gated by deterministic checks: syntax-invalid submissions cap the exercise at a low floor (e.g., ≤20% of its points) regardless of AI score; empty/starter-identical submissions score 0 deterministically.
- **Boundary behavior is exact**: 39.99…% fails, 40.00% passes. Add unit tests for a point distribution where one question flips the result across the boundary (the "39% vs 40%" tests in §16).

### 7.3 Attempt lifecycle & state machine

States: `not-started → in-progress → grading → passed | failed`, with `failed → in-progress` on retry (unlimited retries; no cooldown). Persisted per assessment:

```ts
interface AssessmentState {
  assessmentId: string
  attempts: { startedAt: number; finishedAt: number; scoreFraction: number;
              perItem: { itemId: string; earned: number; max: number; topicIds: string[] }[] }[]
  bestScore: number
  passed: boolean
  passedAt?: number
}
```

- Keep full attempt history (the app already tracks events/history — verify and reuse the events store pattern).
- In-progress answers may live in component state; an abandoned attempt is simply not recorded (or recorded as an unfinished draft only if the existing architecture already has a drafts concept — do not invent one).

### 7.4 Pass/fail behavior

- **Pass**: unlock milestone (idempotent), persist immediately, show the milestone celebration (Level-Up overlay variant with the status title), advance status bar, update share screen.
- **Fail**: show score, per-section breakdown, and a **review panel** built from `reviewMap` + the lowest-scoring `topicIds` — direct links to the specific modules/lessons to revisit. Offer "Retry now" and "Review first" actions. Assessment remains re-enterable from the course outline at any time.
- **No hard gating**: assessments do not block continuing the curriculum (the existing sequential lesson unlock remains as-is for lessons; verify whether checkpoints currently gate — preserve existing behavior for lessons, but statuses are earned only via the assessment).

### 7.5 UI

- Entry point: an assessment node in the course outline after its module, visually distinct (flag/trophy icon), reachable when its module's lessons are complete (mirror existing unlock conventions).
- Assessment view: intro screen (what it covers, threshold, retry policy), question flow reusing existing quiz/exercise components where feasible, a submit-all step, a grading state with per-exercise progress ("Grading exercise 2 of 3…"), and a results screen.
- States to implement explicitly: loading, grading (AI calls in flight, cancellable), partial-grading failure (one exercise's AI call failed → allow re-grading just that item; never lose entered answers), offline/backend-down (reuse existing typed API error banners), pass, fail.
- Accessibility: focus management between steps, `aria-live` for grading status and results, keyboard-complete flow.

### 7.6 Tests

- Scoring math (weights, totals, boundary), state transitions, retry preserves history, milestone unlock on pass, no unlock below threshold, no duplicate unlock on repeat passes, review-map rendering from weak topics, persistence of attempts across reload, grading-failure recovery.

## 8. Python Syntax-Only Verification and AI Grading

### 8.1 Remove learner-code execution

- Locate the existing execution path (expected: a backend runner module using `python -I` subprocesses with rlimits, an `/api/execute`-style endpoint, and the frontend exercise component calling it). **Remove learner submissions from every execution path.**
- Decide, after inspection, whether to delete the runner module or retain it strictly for internal/CI validation of author-provided reference content (never reachable from any API that accepts learner input). If any endpoint that executes arbitrary code remains reachable, that is a release blocker — Scan 3 explicitly re-checks this.
- Existing backend tests that execute reference solutions through the runner must be reworked: reference solutions can still be validated in CI (author code, not learner code) **only if** the runner is retained as an internal test utility; otherwise convert those tests to syntax/structure assertions.

### 8.2 Syntax verification service

Backend module + endpoint (e.g., `/api/verify-syntax` — name per existing route conventions):

- Use `ast.parse(source)` (and optionally `compile(source, '<learner>', 'exec')` — compilation to bytecode without execution is safe; never call the resulting code object).
- Return structured results: `{ valid: boolean, error?: { message, lineno, offset, text }, facts: SyntaxFacts }`.
- `SyntaxFacts` from a read-only AST visit: defined function names + arg counts, defined classes, imports, presence of loops/comprehensions/with/try, docstrings, approximate cyclomatic hints, calls to named functions. These are **evidence for the grader**, not a grade.
- Enforce input limits (max source size, parse timeout via reasonable guard) and never log full learner source at info level.

### 8.3 Grading architecture (no execution)

For each code exercise, grading combines:

1. **Syntax validity** (hard signal; invalid syntax → capped score + targeted feedback quoting the SyntaxError location).
2. **Deterministic structural checks** declared per exercise in content: required function names/signatures present, required constructs used (e.g., "uses a loop or comprehension"), forbidden shortcuts (e.g., "does not import a library that trivializes the task"). Implement as checks against `SyntaxFacts`.
3. **AI semantic evaluation** via the existing grade endpoint/prompt: send exercise requirements, rubric, learner code, and the syntax/structural results labeled explicitly as *"contextual evidence — syntactic validity does NOT imply correctness; grade semantics against the rubric."* Update the grader system prompt accordingly (preserve the existing `[MODE:GRADE]` marker/JSON contract conventions — verify).
4. **Score composition** is deterministic application logic: e.g., structural gate first, then AI rubric score scaled into the remaining points. The AI never sees or sets the pass threshold.

Include the mandated statement in code comments/docs where the grading pipeline is defined: syntax verification is a supporting signal only (verbatim text in §2 item 2).

### 8.4 Frontend changes

- ExerciseBlock: replace "Run tests" with "Check & Submit" → syntax check (fast, local round-trip) shown inline with error line highlighting in the code editor, then AI grading with the rubric-based GradeCard. Preserve XP semantics (verify existing best-score/retry XP rules and keep them).
- Demo provider must keep full parity: extend its canned `[MODE:GRADE]` responses to handle the new grading payload deterministically.

### 8.5 Proof-of-no-execution tests

- Backend tests submitting hostile code (`import os; os.system(...)`, file writes to a sentinel path, infinite loops, `while True: pass`, top-level `print`) to the syntax endpoint and grading pipeline, asserting: response is fast, sentinel file never created, no side effects, output contains no evidence of execution.
- A test asserting the app module (post-change) has no route that spawns a subprocess/exec with request-supplied code (e.g., import-time scan of route handlers or a targeted grep-style test — choose an approach consistent with the repo's test style).
- Frontend tests: exercise flow never calls any execute endpoint (mock fetch and assert URLs).

## 9. RAG Curriculum Exercises

First verify no equivalent module exists. Then add a RAG module (inside Course 2 or the new provider-SDK course — place where the prerequisite flow fits best after inspecting curriculum ordering; RAG requires: Python basics, embeddings/vectors math, provider API lessons).

### 9.1 Lesson arc (each with objectives, prose, and exercises)

1. **Why RAG** — context windows, knowledge cutoffs, grounding; interactive context-window visualization (§12 of this doc / §8 requirement).
2. **Loading & chunking a `.txt`** — exercise: implement `chunk_text(text, chunk_size, overlap) -> list[str]`; starter code provided; incremental tasks (fixed-size → overlap → paragraph-aware).
3. **Embeddings** — exercise: write code that calls an embeddings API (or Ollama local embeddings) to embed chunks; deterministic checks: function shape, batching loop, no key hardcoding.
4. **Vector store & similarity** — exercise: implement cosine similarity and a naive in-memory top-k retrieval (`retrieve(query_vec, store, k)`); this is pure-math code, ideal for structural + AI grading.
5. **Context construction & generation** — exercise: build the prompt from retrieved chunks with citations and call a chat API; rubric checks prompt structure, context injection, and answer grounding instructions.
6. **Full pipeline + failure cases** — capstone prompt exercise: learner assembles the whole flow; lesson prose covers common failures (bad chunk size, missing overlap, retrieving too much, prompt-stuffing, hallucination despite retrieval).

### 9.2 Grading under the no-execution constraint

- Every RAG exercise ships: starter code, explicit requirements list, structural expectations (required functions/args, required use of loops/slicing, no hardcoded answers), a rubric for the AI grader emphasizing algorithmic correctness reasoning ("trace the code mentally against this sample input; verify overlap arithmetic"), and 1–2 worked input/output examples embedded in the grader prompt so the AI can reason about expected behavior without running anything.
- Feedback must cite concrete issues (off-by-one in overlap, normalization missing in cosine) rather than generic praise.

### 9.3 Tests

- Content-shape tests (exercises have rubrics, structural specs, topicIds), grading-pipeline tests with known-good and known-flawed sample submissions (assert the deterministic layers flag the flawed ones; AI layer mocked/demo), and the §8.5 no-execution proofs cover these exercises automatically.

## 10. Local AI Provider Support

Inspect the existing provider abstraction first (base ABC, registry, keyless set, model-listing contract, timeout conventions, error taxonomy).

### 10.1 Ollama

- Expected existing: an Ollama provider speaking HTTP directly. Requirement: use the **official `ollama` Python library**. Verify the current package name/API on PyPI/docs at implementation time. Refactor the existing Ollama provider to use the library (list models, chat, embeddings if used by RAG lessons), preserving the existing provider interface, configurable base URL (default `http://localhost:11434`), long timeouts for local inference, and keyless behavior.
- Availability detection: a lightweight health check (list models or version call) surfaced through the existing validate endpoint; UI shows "Ollama not reachable at <url>" with actionable guidance.

### 10.2 llama-cpp-python

- Add a new provider using `llama-cpp-python` (verify current package/API). Architectural decision to make after inspecting how the backend process runs: **prefer the OpenAI-compatible server mode** (`llama_cpp.server`) consumed via the existing OpenAI-compatible adapter with a configurable base URL, because in-process model loading in a request-serving FastAPI app blocks workers and complicates cancellation. If in-process is chosen instead, it must run generation in a thread/executor with cancellation flags and never block the event loop. Document the chosen approach and rationale in the README.
- Keyless; model selection = whatever the server/model file exposes; configuration = base URL (server mode) or model path (in-process, exposed via backend env config only — never a browser-entered filesystem path executed server-side without validation).
- Make `llama-cpp-python` an **optional dependency** if it complicates installs (import lazily; provider reports "not installed" as a distinct availability state).

### 10.3 Cross-cutting

- **Streaming**: add streaming support to the provider interface only if the app gains streaming UI (see §12.4 explanation generation and chat). Decide after inspection: if the existing chat/explain flow is non-streaming end-to-end, implement provider-level streaming with server-sent events for the chat drawer and explanation generation, with: chunk processing, partial-output accumulation, a cancel control that aborts the upstream request, and **preservation of already-generated partial output** in the UI (clearly marked "generation interrupted"). Partial explanation output is stored only as a recoverable draft, never as a completed version (§12.5).
- Timeouts: per-provider defaults (local providers get generous defaults); typed errors mapped into the existing `ProviderError`/API error taxonomy; no secrets in error messages.
- UI: provider connect screen gains the new provider(s) with keyless flows, base-URL fields with validation, health-check feedback states (checking / reachable+models / unreachable / not installed).
- Tests: adapter unit tests with mocked library/HTTP, keyless validation, health-check failure paths, streaming chunk assembly + cancellation + partial preservation, timeout behavior.
- Docs: update README provider table and setup instructions.

## 11. Hosted and Local Provider Curriculum Expansion

New course (working title: "Talking to Models: Python SDKs for AI Providers") or a major module set appended to Course 2 — decide from how courses render on Home and how large the content gets (recommend a distinct course).

**Before writing lessons, verify current official package names, import paths, and canonical usage patterns via web search / official docs for every SDK.** Do not teach from memory. Expected (verify): `openai`, `google-genai` (not the deprecated `google-generativeai`), `ollama`, `llama-cpp-python`, `transformers` (+ `torch`), `groq`, xAI (OpenAI-compatible API and/or `xai-sdk` — verify), Z.AI/Zhipu (`zai-sdk` / `zhipuai` — verify which is current and whether an international SDK exists; if none is appropriate, teach the raw HTTP/OpenAI-compatible endpoint and say so), `anthropic`.

Lesson structure per provider (kept honest about differences — do **not** present providers as identical):

1. Install + client setup + auth (env vars, never hardcoded keys; keyless local providers explicitly need none).
2. Basic generation and chat/message APIs (note structural differences: e.g., Anthropic's top-level `system` and content blocks vs OpenAI chat messages vs Gemini's `contents`/`systemInstruction`; Transformers being a local inference library with pipelines/`generate`, not a hosted API).
3. Streaming: iterate chunks, accumulate partial output, print incrementally; cancellation (client-side abort / breaking the iterator / provider-specific interrupt) and preserving already-received text; note where true server-side cancellation is not supported.
4. Robustness: timeouts, typed errors, rate limits (429 + `Retry-After`), bounded exponential-backoff retries, idempotency considerations.
5. Provider-specific notes: model naming/selection, context-window differences, local vs hosted trade-offs (latency, cost, privacy, hardware), responsible usage (don't hammer free tiers; GPU/RAM realities for Transformers and llama.cpp).

Cross-cutting lessons: "local vs hosted inference" conceptual lesson (pairs with a §12 visualization), secure key handling, choosing a model. Exercises throughout: code exercises graded via §8 (structural checks: correct client construction, env-var usage, streaming loop shape, try/except around calls) + prompt exercises with rubrics. All code samples must pass syntax verification (add a content test that `ast.parse`s every Python code block in the new lessons — author content, safe to parse; still never executed).

## 12. Simulations and Educational Visuals

Inspect the existing viz system first (expected: a `VizBlock` dispatcher lazy-loading SVG/Canvas components with a11y patterns and reduced-motion support). New visualizations must reuse that architecture: one component per viz, registered in the block dispatcher, lazy-loaded, responsive, keyboard-operable controls, `aria` labels, text summaries for screen readers, and dark-theme-native colors (§13). Follow the repo's dataviz/palette conventions if present.

Prioritized new visualizations (each placed in the lesson that teaches the concept):

1. **Tokenization explorer** — type text, see it split into tokens (approximate BPE-style segmentation computed deterministically in JS), token count vs character count. (Course 1 tokenization module + provider course context-window lesson.)
2. **Embedding space / vector similarity** — 2D scatter of preset word/phrase vectors; click two points to see cosine similarity computed live; supports the math course's vectors topic and RAG retrieval lesson.
3. **Chunking visualizer** — a sample `.txt` rendered with adjustable chunk size/overlap sliders showing chunk boundaries and overlap regions. (RAG lesson 2.)
4. **Retrieval/RAG pipeline animation** — interactive stepper: query → embed → nearest chunks highlighted in the vector scatter → context assembly → answer; each step advanced by the learner. (RAG capstone.)
5. **Context-window meter** — visual budget bar filling with system prompt / history / retrieved context / response headroom. (Prompt-engineering + RAG lessons.)
6. **Streaming generation simulator** — token-by-token output with pause/cancel, illustrating partial-output preservation. (Provider course streaming lesson.)
7. **Local vs hosted inference diagram** — interactive toggle showing request path (browser → API → datacenter GPU vs machine-local runtime), latency/cost/privacy annotations. (Provider course.)
8. **Neural network flow** — if the existing attention/gradient-descent/softmax visualizations don't already cover forward-pass flow, add a small layered-network animation with activations flowing; otherwise skip (no duplication).

Rules: only add a visual where it materially teaches; no decorative images. If static images/diagrams are added, store them under an organized asset directory, reference with meaningful alt text, and prefer inline SVG (theme-aware) over raster. Performance: lazy-load all viz components (existing pattern), avoid re-render storms from slider inputs (throttle), respect `prefers-reduced-motion`. Tests: smoke-render each viz (jsdom), verify deterministic math helpers (tokenizer segmentation, cosine, chunk boundaries) with unit tests.

## 13. UI/UX Integration — Full Dark Mode Transition

**Mandatory: replace the current light theme with a sleek, modern dark mode across the entire application.** This is a full transition, not a toggle-added-alongside (a toggle may be added only if trivial within the chosen architecture; dark is the default and the designed-for theme).

1. Inspect current styling: Tailwind version/config, `index.css` custom layers (`.gl-prose`, animations), and the color vocabulary used across components (expected: slate/indigo light palette with `bg-white` surfaces).
2. Define a design-token layer: background scale (near-black base, elevated surface, overlay), text scale (high/medium/low emphasis), a saturated accent (evolve the existing indigo toward a luminous indigo/violet suitable on dark), semantic colors (success/warn/error tuned for dark backgrounds), borders as low-alpha white. Implement via CSS variables + Tailwind theme extension rather than find-replacing hundreds of class names ad hoc — but where components hardcode light classes (`bg-white`, `text-slate-900`, `border-slate-200`), they must all be migrated. Grep exhaustively; no stray light surfaces may remain (modals, drawers, code editor, markdown prose, KaTeX output, grade cards, error banners, share card backdrop, viz components, scrollbars where styled).
3. Contrast: all text meets WCAG AA against its background (verify the accent-on-dark and muted-text choices numerically). Focus rings must be clearly visible on dark.
4. Code editor and code blocks: dark syntax-appropriate styling (dark editor background, light text, distinct gutter).
5. Visualizations: recolor for dark (sequential ramps and gradients validated for dark backgrounds; keep existing validated-ramp discipline).
6. Share card: redesign the canvas card as dark-native (it's the marketing surface — dark gradient, glowing accent, status title front and center). Update canvas tests for any changed text.
7. `index.html`/meta: `color-scheme: dark`, themed meta tags; ensure no white flash on load.
8. New features (status bar, assessments, mastery dashboard, explanation history, save indicator) are designed dark-first.
9. E2E smoke and component tests updated for any selectors/assertions tied to old styling.

Also in this section's scope: coherent placement of all new UI — status bar on Home near streak/XP tiles; mastery summary on Home and/or a dedicated progress view (decide from existing IA); assessment entries in course outline; "Change Explanation" affordance on every AI explanation surface; save-state indicator in the header (subtle).

## 14. Persistence, Migration, and Backward Compatibility

### 14.1 Canonical progress document

The frontend is a browser app persisting to IndexedDB (verify). Interpret the "progress file" requirement as a **single canonical, serialized progress document** with file-grade durability semantics, plus true file export/import for user-controlled recovery. Do not scatter progress across ad-hoc stores anymore: define one `ProgressDocument` schema (TypeScript type + runtime validator) containing: `schemaVersion`, data version, profile (grade level, commitment, preferences — no secrets), diagnostic state, curriculum position, completed lessons/modules/courses, quiz/exercise attempts, assessment states, unlocked statuses (+ recomputed current status), topic mastery records + minimal evidence log, streak events (or aggregates + recent events — decide from existing streak computation needs), explanation version histories + current-version pointers + drafts, and timestamps. Existing IndexedDB stores may remain as the physical layer, but all reads/writes go through one `progressRepository`; alternatively consolidate into a document store — choose whichever is the smaller safe change after inspection, but the logical schema, validation, and atomicity requirements below are non-negotiable.

**Secrets exclusion**: the AI config's encrypted key material stays in its existing separate mechanism and is explicitly excluded from the progress document, export files, and logs. Add a test asserting the serialized document (and export payload) contains no key/iv/credential fields.

### 14.2 Startup flow

`App start → repository.load() → locate document → parse → validate schema version → run migrations if older → validate full schema + invariants → hydrate store`.
- Missing document → create a fresh valid default, persist it, continue (preserving current onboarding flow).
- Invalid/corrupted/unreadable/failed-validation → **do not load it**; copy the bad payload to a quarantine record (`progress-quarantine-<timestamp>`) when practical, then create + persist a fresh valid state and show a non-destructive notice ("Previous progress could not be read; it was preserved for recovery"). If a last-known-good backup (§14.3) validates, prefer restoring it over starting fresh — never silently discard recoverable progress.
- Never hydrate partially-valid state field-by-field.

### 14.3 Atomic writes & write serialization

`serialize → validate serialized state → write to inactive slot (double-buffer: slot A/B records + integrity metadata: length + checksum) → verify write → atomically flip the active-slot pointer (single small record update, which IndexedDB commits transactionally) → confirm`.
- Keep the previous slot as last-known-good until the next successful write.
- All writes flow through a **single async write queue** (mutex): one in-flight write; rapid mutations coalesce to the latest state **only after** each acknowledged mutation is captured in the state being written (coalescing must never drop an acknowledged update — the queue writes the newest full document, which by construction contains all prior mutations).
- IndexedDB transactions provide the atomic-replace primitive; document this mapping in code comments. If the repo has any Node/desktop persistence path instead, use temp-file + fsync + `rename` there.

### 14.4 Immediate save semantics

Every meaningful mutation (lesson/exercise/quiz completion, mastery update, status unlock, grade-level change, diagnostic completion, explanation revision completed, explanation version selection, streak event, curriculum position change) triggers `persist()` immediately through the queue. Shutdown/`visibilitychange` handlers may add a final flush but are not the primary mechanism. Centralize: components mutate only via Zustand actions; actions call the repository; direct DB access from components is removed/forbidden (enforce by module structure and a lint-able convention).

### 14.5 Save-state indicator & failure behavior

Header indicator: idle (hidden or subtle check) / `Saving…` / `Saved` (brief) / `Save failed` (persistent warning with Retry). On failure: keep in-memory state, bounded retries with backoff (e.g., 3 attempts), previous valid document remains untouched (double-buffer guarantees this), never show "Saved" falsely, log diagnostics without secrets, block overlapping conflicting saves via the queue.

### 14.6 Schema versioning & migrations

- `schemaVersion` integer; ordered migration functions `v1→v2→…`; validate after the chain; persist migrated result atomically; snapshot a backup record before any destructive migration.
- **v1 = the current shipped shape** (existing profile/progress/events/meta stores). The first migration composes them into the new document, maps the existing math level to the new grade levels (expected mapping: `middle→grade7`, `hs910→grade9`, `hs1112→grade11`, `college→college` — verify actual enum on inspection), backfills milestones (§6.3), and initializes empty mastery/explanation structures. Existing users must lose nothing: XP, streaks, completed lessons all survive — covered by migration tests using a fixture of the old shape.
- Newer-than-supported schema → refuse to load/modify it, show a clear "progress was created by a newer version" error, offer export.
- Unknown fields policy: preserve-and-ignore (round-trip unknown keys) to stay forward-compatible.
- Renamed/removed topic or status ids: migrations carry an id-mapping table; unmapped ids are preserved in an `orphaned` section rather than deleted.

### 14.7 Export / Import / Recovery

Extend the existing export/import JSON flow (verify current behavior) to the new document: export = current validated document (+ integrity checksum, no secrets). Import = untrusted: parse safely (size limit, try/catch), validate, detect schema version, migrate if supported, on any failure show a specific error and keep current progress untouched; on success back up current progress (quarantine-style record) → atomically activate imported state → fully re-hydrate the app (reload or full store reset). Confirm with the user before replacement (destructive action).

## 15. Error Handling and Edge Cases

Beyond per-feature states already specified, explicitly handle:

- **Assessment edge cases**: submitting with unanswered items (confirm dialog; unanswered = 0 points), AI grading partial failure (per-item retry), provider switched mid-attempt, offline mid-attempt (answers preserved in memory; grading retryable), score exactly at threshold (pass), retake after pass (recorded, no re-unlock, best score retained).
- **Mastery edge cases**: first-ever evidence (low confidence), repeated identical question attempts (§12.2 anti-farming), conflicting evidence (recent weighted over old), unknown topicId in evidence (ignored + logged), mastery clamped to [0,1].
- **Explanation system**: generation failure (original untouched, error inline, retry), interruption (partial preserved as draft only), rapid repeated requests (disable submit while in flight), empty instruction (validation message), version navigation at ends (buttons disabled), history for a lesson whose content changed (versions retained, flagged stale if the underlying block hash changed — store a content hash per explanation site).
- **Persistence**: quota exceeded (surface specific guidance + export prompt), private-browsing/IndexedDB unavailable (in-memory session with a persistent warning banner), simultaneous tabs (detect via a lock record or BroadcastChannel; make the second tab read-only or last-writer-wins with warning — decide after inspecting; never corrupt), crash mid-write (recovered via double-buffer on next load).
- **Providers**: unreachable local runtimes (typed, actionable errors), streaming disconnects (partial preserved), model list empty, base-URL typos (validation feedback).
- **Grade level**: user changes grade level later (recompute recommended entry point and explanation complexity; never delete mastery or completion data; show what changed and why).
- All errors use the existing typed API-error/banner system (extend its error-type union as needed).

## 16. Testing and Validation Strategy

Use the repository's existing tooling — discover exact commands from `package.json` and the backend test setup before running anything (expected: pytest for `backend/tests`, vitest for frontend, an e2e Playwright smoke script, oxlint or the repo's configured linter, `tsc`/build via Vite). Do not invent commands.

Required coverage (new tests; keep existing tests passing or update them where behavior legitimately changed — especially runner-related tests affected by §8):

- **Milestones**: engine calculations, boundaries, idempotency, backfill, unknown ids, share-card status rendering.
- **Assessments**: scoring math; explicit **39% fails / 40% passes** boundary tests; weighted totals; unlimited retries preserving history; unlock integration; UI state transitions.
- **Syntax verification**: valid/invalid parses with correct line numbers; SyntaxFacts extraction; input limits; **proof-of-no-execution suite** (§8.5).
- **AI grading**: prompt payload includes syntax evidence with the "not proof of correctness" framing; deterministic caps applied for invalid syntax; demo-provider parity.
- **RAG exercises**: content-shape tests; grading of known-good/known-bad samples through deterministic layers.
- **Providers**: mocked Ollama-library and llama-cpp adapters; keyless validation; health checks; streaming assembly, cancellation, partial-output preservation; timeout and error mapping; hosted-provider regressions (existing adapter tests still pass).
- **Grade/math curriculum**: grade-level initialization per profile; entry-point mapping; prerequisite-graph integrity (every math topic has ≥1 downstream AI dependency — content test); exclusion test (no orphan topics); diagnostic scoring → initial mastery.
- **Mastery**: update algorithm determinism, boundaries, confidence growth, anti-farming (repeat identical item yields diminishing updates), evidence-type weighting, remediation/advancement triggers, grade-assumption override.
- **Adaptivity**: recommendation engine returns explainable reasons; skip-if-mastered; prerequisite-review insertion.
- **Explanations**: revision preserves V1; multiple revisions ordered deterministically; navigation; persistence across simulated restart (re-hydrate from storage); failed/interrupted generation never corrupts history; Enter-to-submit; drafts vs completed versions.
- **Status bar**: derived-only (mutating unlocked set updates bar; no independent counter to desync); multi-unlock after migration; max-status state.
- **Persistence**: missing/valid/invalid/corrupted/truncated document; wrong field types; out-of-range mastery; invalid status ids; broken version references; atomic double-buffer flip; simulated crash between slot write and pointer flip (recovers last-known-good); concurrent mutation serialization; save-failure path (mock storage error) with retry; quarantine behavior; migration chain from a v1 fixture; failed migration (backup intact); future-schema rejection; import valid/invalid/malicious (oversized, wrong types, script-bearing strings treated as data); **secret-exclusion test**.
- **UI/a11y**: component tests for new surfaces; keyboard flows; `aria-live` announcements; e2e smoke extended for dark mode, assessment happy path, and status unlock.
- **Static gates**: build succeeds, lint clean, type-check clean, formatting per repo convention.

## 17. Exact Implementation Order

Execute strictly in this order (later steps depend on earlier ones):

1. Fresh clone, discovery, audit (§3–4). Record findings.
2. **Progress document layer** (§14): schema, validator, repository, atomic writer, migrations from current shape, startup flow, save indicator plumbing (indicator UI can land with step 12). All later features write through it.
3. **Syntax-only verification pivot** (§8): backend service/endpoint, remove learner-code execution, rework grading pipeline + prompts, frontend ExerciseBlock changes, demo parity, no-execution tests. (Do this early — many later features build on the new grading path.)
4. **Milestone engine + config** (§6.1–6.3) with temporary triggers (course-completion) so it's testable before assessments exist.
5. **Checkpoint assessments** (§7), wiring assessment-pass triggers into milestones.
6. **Mastery model + grade levels + diagnostics + adaptive engine** (§12.1–12.3 requirements; sections 5/14/15 here): profile extension, taxonomy from the real curriculum, update algorithm, recommendation engine, migration of math level.
7. **Math curriculum content** (grade-adaptive course): prerequisite graph, lessons, exercises, diagnostic assessment content.
8. **Local providers** (§10) including streaming/cancellation infrastructure.
9. **Explanation revision + version history** (§12.4–12.5 requirements): depends on providers (streaming optional) and persistence.
10. **RAG exercises** (§9) and **provider-SDK curriculum** (§11) — content-heavy, depends on grading pivot + providers; verify SDK facts via web first.
11. **Simulations/visuals** (§12) alongside the lessons that use them.
12. **Status progression bar + share-card/streak integration** (§6.4–6.5) and remaining UI surfaces (mastery dashboard, review panels, save indicator).
13. **Dark mode transition** (§13) — after feature UI exists so nothing is styled twice; migrate every surface.
14. Documentation updates (README: providers, no-execution grading model, new courses, dark UI screenshots/description, progress file semantics).
15. Full test pass; then Scan 1 (§18).

## 18. Manual Bug Scan 1 → Fix 1 — Functional and Integration Bugs

Perform a manual, file-by-file inspection of the **current modified repository state** (not memory of what you wrote). Focus:

- Broken functionality across all new/changed flows; incorrect progression logic; assessment scoring math; status unlock logic; provider integrations (each adapter's request/response mapping); RAG exercise flows; syntax verification correctness and its call sites; persistence (every mutation actually triggers a queued save); state management (stale closures, missed store updates, hydration order); error handling (every fetch has typed failure paths); the migration from the pre-change schema.
- Trace at least these end-to-end paths in code: onboarding → grade selection → diagnostic → recommendation; lesson → exercise → syntax check → AI grade → mastery update → save; module complete → assessment → pass at 40% → milestone unlock → status bar + share card; explanation → revise → navigate history → reload → restored; provider connect (hosted, Ollama, llama-cpp) → validate → chat/grade.

Then **Fix 1**: fix every actionable issue found, adding/updating tests for each fix, before starting Scan 2. Record for the cycle: files/systems inspected, issues found (severity, root cause), fix applied, tests added, validation performed. Do not claim "no issues" for any system not actually inspected.

## 19. Manual Bug Scan 2 → Fix 2 — Edge Cases, UI/UX, and Regression Bugs

Re-inspect the repository state **as modified by Fix 1**. Focus:

- Retry behavior (assessments, saves, explanation generation); partial progress (mid-assessment abandonment, half-finished lessons); existing-user migration (run the v1-fixture migration mentally and via tests — every legacy field lands somewhere); duplicate achievements (retake-after-pass, migration double-run idempotency); boundary scores (39/40, 0%, 100%, empty assessment); responsive layouts (320px → wide; nav rails, assessment view, status bar, viz components); accessibility (focus traps in modals/popovers, aria-live, keyboard-only completion of every new flow, contrast in dark mode); loading and empty states (no mastery yet, no statuses yet, empty model lists); provider failure paths (unreachable, mid-stream disconnect); streaming interruption and partial-output preservation; regressions in pre-existing features (XP totals, streak math, lesson unlock, AI-explain-after-wrong-answer gating, chat drawer, settings export/import, demo mode parity).

Then **Fix 2**: fix all actionable findings + tests before Scan 3. Record the same cycle log fields as §18.

## 20. Manual Bug Scan 3 → Fix 3 — Final Integration, Maintainability, and Release Readiness

Re-inspect the repository state **as modified by Fix 2**. Focus:

- Cross-feature integration (mastery ↔ recommendations ↔ assessments ↔ milestones ↔ status bar ↔ share card ↔ persistence all consistent); architectural consistency with the repo's patterns; dead code (especially remnants of the execution runner and old light-theme utilities); duplicated logic (thresholds, grade mappings, milestone conditions defined once); **no hardcoded milestone rules in components**; security (no learner-code execution path reachable — re-verify explicitly; no secrets in progress/export/logs; imported files treated as untrusted; provider keys never rendered); test coverage gaps against §16's list; documentation consistency (README matches reality); build/lint/type-check/test all green; remaining regressions.

Then **Fix 3**: fix everything actionable before final validation. Record the cycle log. The order is strictly `Scan 1 → Fix 1 → Scan 2 → Fix 2 → Scan 3 → Fix 3` — never batch scans before fixing.

## 21. Final Validation

After Fix 3, run the complete validation suite using the repo's actual commands discovered in §3:

1. Backend test suite — all pass.
2. Frontend unit/component tests — all pass.
3. Type check and production build — clean.
4. Lint (and formatter check if configured) — clean.
5. E2E smoke (extended for the new flows and dark mode) against a locally running backend+frontend — all checks pass.
6. Manual spot verification with both servers running: demo-mode end-to-end (onboarding → lesson → exercise graded without execution → assessment pass → status unlock → share card render → reload restores everything, including an explanation revision history).
7. Confirm the three cycle logs are complete and accurate.

Any failure returns to fixing (still before commit); re-run the affected validation after each fix.

## 22. Commit Procedure

Only after §18–21 are fully complete:

1. `git status` / `git diff` review of the **entire** final diff, hunk by hunk.
2. Confirm no unrelated files were modified; revert accidental changes.
3. Remove temporary files, debug output/console noise, scratch scripts, generated artifacts (builds, caches), and scan for accidental secrets in the diff.
4. Verify the working tree contains only intentional changes and intended new files (including `implementation.md` only if the repository is meant to carry it — otherwise exclude it).
5. Re-run the final validation gates (tests, lint, type-check, build) one last time on the exact tree being committed.
6. Commit to `claude/gamified-learner-platform-4fobt5` with a clear message summarizing the feature set (milestones/assessments, syntax-only grading, RAG + provider curriculum, local providers, adaptive math curriculum + mastery, explanation history, crash-safe persistence, dark mode). Push with `git push -u origin claude/gamified-learner-platform-4fobt5`, retrying on network failure up to 4 times with exponential backoff (2s/4s/8s/16s). Do not create a pull request unless explicitly asked.

## 23. Definition of Done

All of the following are true:

- Fresh repository state was inspected; existing functionality preserved; no duplicated systems; existing architectural patterns followed.
- Centralized, data-driven milestone system: stable ids, ordered progression of technical-nickname titles, assessment-pass triggers, idempotent unlocks, retroactive backfill for existing users, integrated into streak surfaces and a redesigned screenshotable share card.
- Every major checkpoint has a substantial quiz+coding assessment; pass threshold is exactly 40% from a single config constant; passing unlocks and persists the status with clear feedback; failing shows targeted review guidance with unlimited retries and no curriculum lockout.
- Learner Python code is verified by syntax-only analysis and **never executed**, with tests proving it; grading combines syntax evidence, deterministic structural checks, and rubric-based AI evaluation; syntactic validity alone never passes an exercise.
- Beginner RAG exercises exist covering `.txt` → chunking → embeddings → vector store → retrieval → context → generation, gradeable without execution.
- Ollama (official Python library) and llama-cpp-python integrate into the existing provider system: keyless, configurable, health-checked, with streaming, cancellation, partial-output preservation, timeouts, and typed errors.
- Curriculum teaches the current, verified Python SDKs/APIs for OpenAI, Google GenAI, Ollama, llama-cpp-python, Hugging Face Transformers, Groq, xAI, Z.AI (or documented alternative), Anthropic, and existing providers — honestly noting provider-specific differences and limitations.
- New interactive simulations/visuals (tokenization, embeddings/similarity, chunking, retrieval/RAG, context window, streaming, local-vs-hosted, plus network flow if missing) follow the existing viz architecture with accessibility and lazy loading.
- Learners select a grade level (5–12, College) that sets an AI-relevant math entry point; every math topic has a downstream AI justification; demonstrated mastery overrides grade assumptions; diagnostics, remediation, and advancement work as specified.
- Hierarchical, evidence-based mastery tracking exists with a deterministic, centralized, farming-resistant update algorithm influencing recommendations, difficulty, remediation, explanations, and dashboards.
- Every AI explanation has a visible "Change Explanation" control (Enter-to-submit) that revises the existing explanation using learner context, preserving V1 and all revisions in a persistent, navigable, restart-surviving version history; failed/interrupted generations never corrupt history.
- The status progression bar is derived solely from the milestone system, advances on unlock with celebration feedback, handles migrated multi-unlocks, and cannot desync.
- Progress persists immediately after every meaningful mutation through a centralized repository with atomic double-buffered writes, last-known-good backup, strict centralized validation, quarantine of invalid state, schema versioning with ordered migrations, untrusted import/recovery flow, visible Saving/Saved/Save-failed indicator with bounded retries, and zero secrets in persisted or exported data.
- The entire UI is a sleek, modern dark mode with AA contrast, dark-native visualizations, code editor, and share card; no light-mode surfaces remain.
- Exactly three sequential scan→fix cycles were performed on live repository state, each fully logged (systems inspected, issues, severity, root cause, fixes, tests, validation).
- Build, lint, type-check, all backend/frontend tests, and the extended e2e smoke all pass; documentation matches the shipped behavior.
- One clean, reviewed commit containing only intentional changes was created and pushed to the designated branch after all validation completed.
