import type { Module } from '../types'

export const module03: Module = {
  id: 'm03-intermediate',
  title: 'Intermediate Python',
  summary: 'Classes, error handling, files, JSON, the standard library, and environments.',
  lessons: [
    {
      id: 'classes',
      title: 'Classes & OOP Basics',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: `
# Classes

A **class** bundles data (attributes) with behavior (methods). You'll meet classes everywhere in AI code — \`nn.Module\` in PyTorch, Pydantic models in FastAPI, dataset wrappers:

\`\`\`python
class Counter:
    def __init__(self, start=0):     # constructor
        self.value = start           # instance attribute

    def increment(self, by=1):       # method — self is THIS instance
        self.value += by
        return self.value

c = Counter()          # __init__ runs; self.value = 0
c.increment()          # 1
c.increment(by=5)      # 6
d = Counter(100)       # a separate, independent instance
\`\`\`

Key ideas:

- \`self\` is the instance the method was called on. Python passes it automatically: \`c.increment()\` is really \`Counter.increment(c)\`.
- \`__init__\` runs at construction. Attributes assigned to \`self\` there belong to *each instance*.
- \`__repr__\` controls how the object prints — implement it early, debug happier.

## Inheritance

A subclass reuses and extends a parent:

\`\`\`python
class LoggingCounter(Counter):
    def increment(self, by=1):
        print(f"incrementing by {by}")
        return super().increment(by)   # call the parent's version
\`\`\`

This is exactly the shape of custom PyTorch modules: \`class MyModel(nn.Module)\` with \`super().__init__()\` — the pattern transfers directly.

## Dataclasses — less boilerplate

For classes that mostly hold data, \`@dataclass\` writes \`__init__\` and \`__repr__\` for you:

\`\`\`python
from dataclasses import dataclass

@dataclass
class TrainingConfig:
    lr: float = 3e-4
    batch_size: int = 32
    epochs: int = 10

cfg = TrainingConfig(lr=1e-4)
cfg.batch_size    # 32
\`\`\`
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-classes',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'What is `self` inside a method?',
                choices: [
                  'The class itself',
                  'The instance the method was called on',
                  'A reserved keyword that Python replaces with `None`',
                  'The parent class',
                ],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'When does `__init__` run?',
                choices: [
                  'When the module is imported',
                  'Every time any method is called',
                  'When a new instance is constructed',
                  'Only when explicitly called as `obj.__init__()`',
                ],
                answerIndex: 2,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'In a subclass method, what does `super().increment(by)` do?',
                choices: [
                  'Calls the same method on the parent class',
                  'Calls the method on a brand-new instance',
                  'Skips the method entirely',
                  'Calls the method twice',
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
            id: 'ex-bankish',
            title: 'Build an XP tracker class',
            instructions: `
Write a class \`XpTracker\`:

- \`__init__(self)\` starts \`self.xp\` at 0
- \`add(self, amount)\` adds amount to xp (ignore negative amounts entirely) and returns the new total
- \`level(self)\` returns \`self.xp // 100 + 1\`

(Yes — this is a tiny version of the system powering this very app.)
`,
            starterCode: `class XpTracker:
    def __init__(self):
        ...

    def add(self, amount):
        ...

    def level(self):
        ...
`,
            tests: [
              { name: 'starts at 0, level 1', code: 't = XpTracker()\nassert t.xp == 0 and t.level() == 1' },
              { name: 'add returns total', code: 't = XpTracker()\nassert t.add(50) == 50 and t.add(60) == 110' },
              { name: 'level advances per 100', code: 't = XpTracker()\nt.add(250)\nassert t.level() == 3' },
              { name: 'negative amounts ignored', code: 't = XpTracker()\nt.add(-40)\nassert t.xp == 0' },
              { name: 'instances independent', code: 'a, b = XpTracker(), XpTracker()\na.add(10)\nassert b.xp == 0' },
            ],
            difficulty: 2,
          },
        },
      ],
    },
    {
      id: 'errors',
      title: 'Error Handling',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: `
# Errors & Exceptions

When something goes wrong, Python **raises an exception**. Unhandled, it crashes the program with a traceback. Handled, it becomes a controlled branch:

\`\`\`python
try:
    value = int(user_input)
except ValueError:
    value = 0                     # recovery path
\`\`\`

The full anatomy:

\`\`\`python
try:
    resp = call_api()
except RateLimitError:
    time.sleep(5)                 # specific handling first
except (NetworkError, TimeoutError) as e:
    log(f"transient failure: {e}")
else:
    process(resp)                 # runs only if NO exception
finally:
    connection.close()            # runs ALWAYS — cleanup
\`\`\`

Rules that separate professionals from beginners:

1. **Catch the narrowest exception you can.** A bare \`except:\` swallows *everything* — including typos in your own code — and turns loud bugs into silent wrong answers.
2. **Catch only what you can actually handle.** If you can't recover, let it propagate.
3. **Raise your own** with \`raise ValueError("temperature must be 0–2")\` to fail fast on bad inputs.

## Custom exceptions

\`\`\`python
class InvalidAPIKeyError(Exception):
    pass

def connect(key):
    if not key.startswith("sk-"):
        raise InvalidAPIKeyError("keys must start with sk-")
\`\`\`

The backend of this app does exactly this: a \`ProviderError\` type per failure category, so the UI can show you a *specific* error instead of "something went wrong".
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-errors',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'Why is a bare `except:` considered harmful?',
                choices: [
                  'It is a syntax error in Python 3',
                  'It catches everything — including bugs you wanted to see — hiding failures silently',
                  'It only catches `ValueError`',
                  'It is slower than specific excepts',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'When does a `finally` block run?',
                choices: [
                  'Only when an exception was raised',
                  'Only when no exception was raised',
                  'Always — exception or not',
                  'Only if there is no `else` block',
                ],
                answerIndex: 2,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'What does `int("3.7")` raise?',
                choices: ['Nothing — it returns 3', '`TypeError`', '`ValueError`', '`SyntaxError`'],
                answerIndex: 2,
                difficulty: 2,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-safe-div',
            title: 'Robust parsing',
            instructions: `
Write \`parse_ratio(text)\` that parses strings like \`"3/4"\` and returns the division result as a float.

- If the text isn't in \`a/b\` form or the parts aren't integers → return \`None\`
- If b is zero → return \`None\`
- \`parse_ratio("3/4")\` → \`0.75\`

Use try/except — don't try to pre-validate every case by hand.
`,
            starterCode: `def parse_ratio(text):
    try:
        ...
    except ...:
        ...
`,
            tests: [
              { name: 'parses 3/4', code: 'assert parse_ratio("3/4") == 0.75' },
              { name: 'parses 10/5', code: 'assert parse_ratio("10/5") == 2.0' },
              { name: 'garbage returns None', code: 'assert parse_ratio("hello") is None' },
              { name: 'non-integer parts', code: 'assert parse_ratio("a/b") is None' },
              { name: 'division by zero', code: 'assert parse_ratio("1/0") is None' },
            ],
            difficulty: 2,
          },
        },
      ],
    },
    {
      id: 'files-json',
      title: 'Files, JSON & the Standard Library',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: `
# Files & JSON

## Reading and writing files

Always use \`with\` — it closes the file even if an exception hits:

\`\`\`python
with open("notes.txt", "w") as f:      # "w" write, "r" read, "a" append
    f.write("hello\\n")

with open("notes.txt") as f:           # "r" is the default
    content = f.read()                 # whole file as one string
    # or: for line in f:  — memory-friendly line iteration
\`\`\`

## JSON — the language of APIs

Every AI API speaks JSON. Python maps it directly onto dicts/lists:

\`\`\`python
import json

payload = {"model": "gpt-4o", "messages": [{"role": "user", "content": "hi"}]}
text = json.dumps(payload)             # dict -> JSON string
data = json.loads(text)                # JSON string -> dict
data["messages"][0]["content"]         # "hi"

# straight to/from files:
with open("config.json", "w") as f:
    json.dump(payload, f, indent=2)
with open("config.json") as f:
    cfg = json.load(f)
\`\`\`

Mnemonic: the **s** versions (\`dumps\`/\`loads\`) work with **s**trings; the plain ones work with files.

## Standard library greatest hits

\`\`\`python
import math
math.sqrt(2); math.exp(1); math.log(8, 2)    # 2.0-ish, e, 3.0

import random
random.seed(42)              # reproducibility — crucial in ML!
random.random()              # float in [0, 1)
random.choice(["a", "b"])    # pick one
random.shuffle(items)        # in-place shuffle (think: dataset shuffling)

from datetime import datetime, timedelta
now = datetime.now()
yesterday = now - timedelta(days=1)
now.isoformat()              # "2026-07-06T14:30:00.123456"
\`\`\`

## Virtual environments & pip

Every project gets its own isolated package sandbox, so project A's \`torch==2.1\` can't break project B:

\`\`\`bash
python -m venv .venv           # create it (once)
source .venv/bin/activate      # enter it (Windows: .venv\\Scripts\\activate)
pip install requests fastapi   # installs INTO .venv only
pip freeze > requirements.txt  # snapshot exact versions
pip install -r requirements.txt  # reproduce elsewhere
\`\`\`

If you remember one ops rule from this module: **never \`pip install\` into your system Python**. Always a venv.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-files',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'Why prefer `with open(...) as f:` over a bare `f = open(...)`?',
                choices: [
                  'It reads files faster',
                  'The file is guaranteed to be closed, even if an exception occurs',
                  'It automatically parses JSON',
                  'It creates the file if missing, which `open` cannot do',
                ],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Which converts a Python dict into a JSON **string**?',
                choices: ['`json.load`', '`json.loads`', '`json.dump`', '`json.dumps`'],
                answerIndex: 3,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'What is the point of `random.seed(42)` in ML code?',
                choices: [
                  'It makes random numbers more random',
                  'It makes runs reproducible — the same "random" sequence every time',
                  'It speeds up random generation',
                  'It is required before calling any random function',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'What problem do virtual environments solve?',
                choices: [
                  'They make Python code run in the cloud',
                  'They isolate each project’s installed packages from every other project',
                  'They encrypt your source code',
                  'They compile Python to machine code',
                ],
                answerIndex: 1,
                difficulty: 1,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-json-roundtrip',
            title: 'Config round-trip',
            instructions: `
Write \`update_config(json_text, key, value)\` that:

1. Parses \`json_text\` (a JSON object string) into a dict
2. Sets \`key\` to \`value\`
3. Returns the result serialized back to a JSON string with **sorted keys**
   (\`json.dumps(..., sort_keys=True)\`)

If \`json_text\` isn't valid JSON, return the string \`"invalid"\`.
`,
            starterCode: `import json

def update_config(json_text, key, value):
    ...
`,
            tests: [
              {
                name: 'updates a key',
                code: 'import json\nout = update_config(\'{"lr": 0.1}\', "lr", 0.01)\nassert json.loads(out) == {"lr": 0.01}',
              },
              {
                name: 'adds a key, sorted output',
                code: 'out = update_config(\'{"b": 1}\', "a", 2)\nassert out == \'{"a": 2, "b": 1}\'',
              },
              { name: 'invalid json', code: 'assert update_config("not json", "a", 1) == "invalid"' },
            ],
            difficulty: 2,
          },
        },
      ],
    },
    {
      id: 'm03-checkpoint',
      title: 'Checkpoint: A Tiny Data Pipeline',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: `
# 🏁 Module 3 Checkpoint

Everything so far, combined: classes, exceptions, JSON. You're going to build the kind of small, defensive data-handling code that surrounds every real ML system.

The exercise below simulates parsing a batch of JSON event records where **some records are corrupt** — exactly what production data looks like.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-checkpoint-3',
            title: 'Checkpoint quiz',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'A `@dataclass` mainly saves you from writing…',
                choices: [
                  '`__init__` and `__repr__` boilerplate',
                  'unit tests',
                  'import statements',
                  'exception handlers',
                ],
                answerIndex: 0,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Invalid JSON passed to `json.loads` raises…',
                choices: ['`ValueError`/`json.JSONDecodeError`', '`KeyError`', '`IOError`', 'Nothing — returns `None`'],
                answerIndex: 0,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'Your script needs `requests` but you get `ModuleNotFoundError` even though you installed it yesterday. Most likely cause?',
                choices: [
                  'The package was deleted overnight',
                  'You installed it into a different environment (venv) than the one running the script',
                  '`requests` was renamed',
                  'You must restart your computer after pip install',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-checkpoint-3',
            title: 'Checkpoint: parse a dirty event log',
            instructions: `
Write \`parse_events(lines)\` — it receives a list of strings, each *supposed* to be a JSON object
with \`"user"\` (str) and \`"xp"\` (int ≥ 0).

Return a dict with:
- \`"total_xp"\`: sum of xp across all **valid** records
- \`"users"\`: sorted list of unique user names from valid records
- \`"errors"\`: count of invalid lines (bad JSON, missing keys, negative xp, wrong types)

Handle bad lines with try/except — one corrupt record must not kill the batch.
`,
            starterCode: `import json

def parse_events(lines):
    total = 0
    users = set()
    errors = 0
    for line in lines:
        ...
    return {"total_xp": total, "users": sorted(users), "errors": errors}
`,
            tests: [
              {
                name: 'happy path',
                code: 'r = parse_events([\'{"user": "ada", "xp": 10}\', \'{"user": "bob", "xp": 5}\'])\nassert r == {"total_xp": 15, "users": ["ada", "bob"], "errors": 0}',
              },
              {
                name: 'bad json counted as error',
                code: 'r = parse_events(["{oops", \'{"user": "ada", "xp": 1}\'])\nassert r["errors"] == 1 and r["total_xp"] == 1',
              },
              {
                name: 'missing keys / negative xp are errors',
                code: 'r = parse_events([\'{"user": "x"}\', \'{"user": "y", "xp": -5}\'])\nassert r["errors"] == 2 and r["total_xp"] == 0',
              },
              {
                name: 'duplicate users deduped',
                code: 'r = parse_events([\'{"user": "ada", "xp": 1}\', \'{"user": "ada", "xp": 2}\'])\nassert r["users"] == ["ada"]',
              },
            ],
            difficulty: 3,
          },
        },
      ],
    },
  ],
}
