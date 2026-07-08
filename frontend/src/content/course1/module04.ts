import type { Module } from '../types'

export const module04: Module = {
  id: 'm04-tooling',
  title: 'Python for Tooling',
  summary: 'Decorators, generators, context managers, and asyncio — the machinery FastAPI is built on.',
  lessons: [
    {
      id: 'decorators',
      title: 'Decorators',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: `
# Decorators

Functions in Python are values — you can pass them around, return them, and wrap them. A **decorator** is a function that takes a function and returns an enhanced version of it:

\`\`\`python
import time

def timed(fn):
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = fn(*args, **kwargs)
        print(f"{fn.__name__} took {time.perf_counter() - start:.3f}s")
        return result
    return wrapper

@timed                      # sugar for: slow_op = timed(slow_op)
def slow_op(n):
    return sum(range(n))
\`\`\`

Every call to \`slow_op\` now runs through \`wrapper\`: timing happens *around* the original function without touching its body.

- \`*args, **kwargs\` means "accept anything and pass it through" — that's what makes the decorator generic.
- \`@timed\` above a \`def\` is exactly equivalent to reassigning the name after the def.

## Why this matters for the rest of this course

FastAPI's routing **is** decorators:

\`\`\`python
@app.get("/health")          # registers the function as the handler for GET /health
async def health():
    return {"ok": True}
\`\`\`

When you read \`@app.get(...)\`, you now know precisely what's happening: \`app.get("/health")\` returns a decorator, which receives \`health\` and registers it in the app's routing table. No magic.

Decorators that take arguments are just one more layer of nesting — a function that returns a decorator that returns a wrapper.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-decorators',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: '`@timed` above `def f():` is equivalent to…',
                choices: ['`f = timed(f)`', '`timed = f(timed)`', '`f = timed()`', '`f.timed = True`'],
                answerIndex: 0,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Why do decorator wrappers use `*args, **kwargs`?',
                choices: [
                  'It is required syntax for any nested function',
                  'So the wrapper can accept and forward whatever arguments the wrapped function takes',
                  'To make the function run faster',
                  'To prevent the function from being called twice',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'In FastAPI, what does `@app.get("/users")` actually do?',
                choices: [
                  'Immediately sends a GET request to /users',
                  'Registers the decorated function as the handler for GET /users',
                  'Creates a /users database table',
                  'Renames the function to "users"',
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
            id: 'ex-decorator',
            title: 'Write a call-counting decorator',
            instructions: `
Write a decorator \`counted\` that adds a \`.calls\` attribute to the wrapped function,
incremented on every call, while still returning the original result.

\`\`\`python
@counted
def greet(name):
    return f"hi {name}"

greet("a"); greet("b")
greet.calls   # 2
\`\`\`
`,
            starterCode: `def counted(fn):
    def wrapper(*args, **kwargs):
        ...
    wrapper.calls = 0
    return wrapper
`,
            tests: [
              {
                name: 'counts calls',
                code: '@counted\ndef f(x):\n    return x * 2\nf(1); f(2); f(3)\nassert f.calls == 3',
              },
              {
                name: 'result preserved',
                code: '@counted\ndef g(a, b=1):\n    return a + b\nassert g(2, b=3) == 5',
              },
              {
                name: 'independent counters',
                code: '@counted\ndef h1():\n    pass\n@counted\ndef h2():\n    pass\nh1()\nassert h1.calls == 1 and h2.calls == 0',
              },
            ],
            difficulty: 3,
          },
        },
      ],
    },
    {
      id: 'generators-context',
      title: 'Generators & Context Managers',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: `
# Generators

A function with \`yield\` becomes a **generator** — it produces values one at a time, on demand, instead of building the whole collection in memory:

\`\`\`python
def countdown(n):
    while n > 0:
        yield n          # pause here, hand out n, resume on next request
        n -= 1

for x in countdown(3):   # 3, 2, 1
    print(x)
\`\`\`

Each \`next()\` runs the body until the next \`yield\`. State (local variables, position) is frozen between calls.

Why they matter in AI work:

- **Datasets too big for RAM**: yield one sample at a time. PyTorch \`DataLoader\`s wrap exactly this idea.
- **Streaming LLM tokens**: an API that streams a response hands you a generator of chunks:

\`\`\`python
def read_large_file(path):
    with open(path) as f:
        for line in f:
            yield line.strip()      # one line in memory at a time
\`\`\`

Generator *expressions* look like comprehensions with parentheses: \`(x**2 for x in range(10**9))\` — instant to create, computes lazily.

# Context Managers

\`with\` blocks guarantee setup/teardown — you've used them for files. Writing your own is one decorator away:

\`\`\`python
from contextlib import contextmanager
import time

@contextmanager
def timer(label):
    start = time.perf_counter()
    yield                                   # body of the with-block runs here
    print(f"{label}: {time.perf_counter() - start:.3f}s")

with timer("training epoch"):
    train_one_epoch()
\`\`\`

Everything before \`yield\` is setup; everything after is teardown (and runs even if the body raises, when wrapped in try/finally). Database transactions, GPU memory scopes (\`torch.no_grad()\`), and file locks all use this pattern.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-generators',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'What makes a function a generator?',
                choices: [
                  'Using the `@generator` decorator',
                  'Containing at least one `yield`',
                  'Returning a list',
                  'Being defined inside another function',
                ],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'The key advantage of a generator over returning a full list is…',
                choices: [
                  'Generators are always faster to fully consume',
                  'Values are produced lazily — only one item needs to exist in memory at a time',
                  'Generators can be indexed like lists',
                  'Generators automatically parallelize',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'In a `@contextmanager` function, code **after** the `yield` acts as…',
                choices: ['setup', 'teardown/cleanup', 'the with-block body', 'dead code — it never runs'],
                answerIndex: 1,
                difficulty: 2,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-generator',
            title: 'Batch generator (mini DataLoader)',
            instructions: `
Write a generator \`batches(items, size)\` that yields consecutive lists of length \`size\`
(the final batch may be shorter). This is the core of every dataset loader you'll ever use.

\`\`\`python
list(batches([1,2,3,4,5], 2))   # [[1,2], [3,4], [5]]
\`\`\`
`,
            starterCode: `def batches(items, size):
    ...
    yield ...
`,
            tests: [
              { name: 'even split', code: 'assert list(batches([1,2,3,4], 2)) == [[1,2],[3,4]]' },
              { name: 'ragged tail', code: 'assert list(batches([1,2,3,4,5], 2)) == [[1,2],[3,4],[5]]' },
              { name: 'size larger than list', code: 'assert list(batches([1,2], 10)) == [[1,2]]' },
              { name: 'empty input', code: 'assert list(batches([], 3)) == []' },
              {
                name: 'is actually a generator',
                code: 'import types\nassert isinstance(batches([1], 1), types.GeneratorType)',
              },
            ],
            difficulty: 2,
          },
        },
      ],
    },
    {
      id: 'asyncio-checkpoint',
      title: 'Async Basics & Checkpoint',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: `
# asyncio — Concurrency for I/O

Most backend time is spent **waiting** — for a database, a disk, or an LLM API that takes 3 seconds to respond. \`asyncio\` lets one thread juggle thousands of waiting operations by *pausing* tasks at await-points and running others meanwhile.

\`\`\`python
import asyncio

async def fetch_model_reply(prompt):     # "async def" = coroutine
    await asyncio.sleep(1)               # pretend API latency; yields control!
    return f"reply to: {prompt}"

async def main():
    # Sequential: ~3 seconds
    a = await fetch_model_reply("q1")
    b = await fetch_model_reply("q2")
    c = await fetch_model_reply("q3")

    # Concurrent: ~1 second — all three wait at the same time
    a, b, c = await asyncio.gather(
        fetch_model_reply("q1"),
        fetch_model_reply("q2"),
        fetch_model_reply("q3"),
    )

asyncio.run(main())
\`\`\`

The mental model:

- \`async def\` defines a **coroutine** — calling it creates a task-to-be, it doesn't run yet.
- \`await\` means "start this, and let *other* coroutines run while I wait".
- \`asyncio.gather\` runs several concurrently and collects the results.
- This is **concurrency for I/O**, not parallel CPU work — one thread, cleverly scheduled. CPU-heavy math (training!) needs different tools (NumPy/GPU), not asyncio.

Why learn it now? **FastAPI handlers are coroutines.** When your endpoint does \`await call_llm(...)\`, the server keeps handling other users' requests during those seconds. That single fact is why async servers scale.

Two rules to avoid the classic traps:

1. Never call blocking code (\`time.sleep\`, heavy loops, sync HTTP) inside \`async def\` — it freezes *everyone*. Use \`await asyncio.sleep\`, async clients (\`httpx.AsyncClient\`).
2. Forgetting \`await\` gives you a coroutine object instead of a result — if you see \`<coroutine object ...>\` where you expected data, you dropped an \`await\`.

---

# 🏁 Module 4 Checkpoint

Decorators, generators, context managers, async — you now read framework code, not just application code.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-checkpoint-4',
            title: 'Checkpoint quiz',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'What happens at an `await` inside a coroutine?',
                choices: [
                  'The whole program blocks until the operation finishes',
                  'The coroutine pauses and the event loop can run other coroutines meanwhile',
                  'A new thread is spawned',
                  'The expression is skipped if it takes too long',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Three API calls of 1s each with `asyncio.gather` take roughly…',
                choices: ['3 seconds', '1 second', '0.33 seconds', 'It depends on CPU core count'],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'You call a coroutine function without `await` and get `<coroutine object f at 0x...>`. What happened?',
                choices: [
                  'The function ran and this is its return value',
                  'The coroutine was created but never executed — you forgot `await`',
                  'Python crashed silently',
                  'The event loop is closed',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'Which task is asyncio the WRONG tool for?',
                choices: [
                  'Calling 50 LLM APIs concurrently',
                  'A chat server holding 10k idle connections',
                  'Multiplying large matrices faster',
                  'Polling a slow database',
                ],
                answerIndex: 2,
                difficulty: 3,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-checkpoint-4',
            title: 'Checkpoint: retry decorator',
            instructions: `
Real API calls fail transiently. Write a decorator \`retry(times)\` that re-calls the wrapped
function up to \`times\` **total attempts** if it raises, and re-raises the last exception if all fail.

\`\`\`python
@retry(3)
def flaky():
    ...
\`\`\`

Note this decorator takes an argument — you need the extra nesting layer from the lesson.
`,
            starterCode: `def retry(times):
    def decorator(fn):
        def wrapper(*args, **kwargs):
            ...
        return wrapper
    return decorator
`,
            tests: [
              {
                name: 'succeeds after failures',
                code: 'attempts = []\n@retry(3)\ndef flaky():\n    attempts.append(1)\n    if len(attempts) < 3:\n        raise ValueError("boom")\n    return "ok"\nassert flaky() == "ok" and len(attempts) == 3',
              },
              {
                name: 'raises after exhausting retries',
                code: '@retry(2)\ndef always_fails():\n    raise RuntimeError("nope")\ntry:\n    always_fails()\n    assert False, "should have raised"\nexcept RuntimeError:\n    pass',
              },
              {
                name: 'no retries needed',
                code: 'calls = []\n@retry(5)\ndef fine(x):\n    calls.append(1)\n    return x + 1\nassert fine(1) == 2 and len(calls) == 1',
              },
            ],
            difficulty: 3,
          },
        },
      ],
    },
  ],
}
