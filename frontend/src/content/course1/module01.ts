import type { Module } from '../types'

export const module01: Module = {
  id: 'm01-fundamentals',
  title: 'Python Fundamentals',
  summary: 'Variables, types, operators, control flow, loops, functions, and scope — the bedrock.',
  lessons: [
    {
      id: 'variables-types',
      title: 'Variables, Types & Operators',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: `
# Variables, Types & Operators

A **variable** is a name bound to a value. Python figures out the type from the value — no declarations needed:

\`\`\`python
name = "Ada"        # str  (text)
age = 36            # int  (whole number)
height = 1.68       # float (decimal number)
is_admin = False    # bool (True/False)
nothing = None      # NoneType ("no value here")
\`\`\`

Check any value's type with \`type(x)\`. Convert between types with \`int("42")\`, \`str(3.14)\`, \`float("2.5")\` — this is called **casting**, and it fails loudly if the conversion makes no sense (\`int("hello")\` raises \`ValueError\`).

## Operators

| Operator | Meaning | Example | Result |
|---|---|---|---|
| \`+\` \`-\` \`*\` | arithmetic | \`7 * 6\` | \`42\` |
| \`/\` | true division (always float) | \`7 / 2\` | \`3.5\` |
| \`//\` | floor division | \`7 // 2\` | \`3\` |
| \`%\` | remainder (modulo) | \`7 % 2\` | \`1\` |
| \`**\` | power | \`2 ** 10\` | \`1024\` |
| \`==\` \`!=\` \`<\` \`>\` \`<=\` \`>=\` | comparison | \`3 == 3.0\` | \`True\` |
| \`and\` \`or\` \`not\` | boolean logic | \`True and not False\` | \`True\` |

Two traps worth knowing on day one:

1. \`=\` **assigns**, \`==\` **compares**. Writing \`if x = 3:\` is a syntax error — Python protects you here.
2. \`/\` always returns a float, even for \`8 / 2\` → \`4.0\`. Use \`//\` when you want an integer result.

## Strings

Strings are sequences of characters. The most useful day-one tools:

\`\`\`python
s = "machine learning"
len(s)              # 16
s.upper()           # "MACHINE LEARNING"
s.split(" ")        # ["machine", "learning"]
"AI: " + s          # concatenation
f"{s} has {len(s)} chars"   # f-string interpolation — use these everywhere
\`\`\`

f-strings (\`f"..."\`) are how modern Python builds text from values. You'll use them constantly, including for prompt templates later in this course.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-variables',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'What does `7 // 2` evaluate to?',
                choices: ['`3.5`', '`3`', '`4`', '`1`'],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Which expression checks whether `x` equals 10?',
                choices: ['`x = 10`', '`x == 10`', '`x := 10`', '`x.equals(10)`'],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'short',
                id: 'q3',
                prompt: 'What is the value of `10 % 3`? (type the number)',
                acceptableAnswers: ['1'],
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'What does `int("hello")` do?',
                choices: [
                  'Returns 0',
                  'Returns `None`',
                  'Raises a `ValueError`',
                  'Returns the ASCII codes of the letters',
                ],
                answerIndex: 2,
                difficulty: 2,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-fstring',
            title: 'Your first function of the course',
            instructions: `
Write a function \`describe(name, age)\` that returns the string
\`"<name> is <age> years old"\` using an **f-string**.

Example: \`describe("Ada", 36)\` → \`"Ada is 36 years old"\`
`,
            starterCode: `def describe(name, age):
    # use an f-string: f"..."
    ...
`,
            tests: [
              { name: 'describe("Ada", 36)', code: 'assert describe("Ada", 36) == "Ada is 36 years old"' },
              { name: 'describe("Grace", 45)', code: 'assert describe("Grace", 45) == "Grace is 45 years old"' },
              { name: 'works with age 0', code: 'assert describe("Baby", 0) == "Baby is 0 years old"' },
            ],
            difficulty: 1,
          },
        },
      ],
    },
    {
      id: 'control-flow',
      title: 'Control Flow: if / elif / else',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: `
# Making Decisions

Programs branch with \`if\` / \`elif\` / \`else\`. Python uses **indentation** (4 spaces) instead of braces — the indentation *is* the block structure:

\`\`\`python
def grade(score):
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 70:
        return "C"
    else:
        return "F"
\`\`\`

Conditions are checked **top to bottom**; the first match wins and the rest are skipped. That's why \`score = 95\` returns \`"A"\` even though \`95 >= 80\` is also true.

## Truthiness

Every value can act as a condition. These count as **falsy**: \`False\`, \`0\`, \`0.0\`, \`""\`, \`[]\`, \`{}\`, \`None\`. Everything else is truthy:

\`\`\`python
items = []
if not items:
    print("nothing to do")   # runs — empty list is falsy
\`\`\`

This idiom (\`if not items\` rather than \`if len(items) == 0\`) is everywhere in real Python code.

## Combining conditions

\`\`\`python
if 0 <= x <= 100:          # chained comparison — very Pythonic
    ...
if user is not None and user.active:
    ...
\`\`\`

Use \`is\` / \`is not\` only for comparing with \`None\` — use \`==\` for values. \`and\`/\`or\` **short-circuit**: in \`a and b\`, \`b\` is never evaluated if \`a\` is falsy. The \`user is not None and user.active\` pattern relies on this — if the first check fails, Python never touches \`user.active\`, avoiding a crash.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-controlflow',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'Which of these values is **truthy**?',
                choices: ['`0`', '`""`', '`[0]`', '`None`'],
                answerIndex: 2,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt:
                  'In `if a and b:`, when is `b` evaluated?',
                choices: [
                  'Always — Python evaluates both sides',
                  'Only when `a` is truthy (short-circuit)',
                  'Only when `a` is falsy',
                  'Never — `and` only looks at `a`',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt:
                  'With the `grade` function from the lesson, what does `grade(80)` return?',
                choices: ['`"A"`', '`"B"`', '`"C"`', '`"F"`'],
                answerIndex: 1,
                difficulty: 1,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-fizzbuzz-ish',
            title: 'Classify a number',
            instructions: `
Write \`classify(n)\` that returns:
- \`"zero"\` if n is 0
- \`"negative"\` if n is below 0
- \`"small"\` if n is 1–9 (inclusive)
- \`"big"\` otherwise

Think about the **order** of your checks.
`,
            starterCode: `def classify(n):
    ...
`,
            tests: [
              { name: 'classify(0)', code: 'assert classify(0) == "zero"' },
              { name: 'classify(-5)', code: 'assert classify(-5) == "negative"' },
              { name: 'classify(3)', code: 'assert classify(3) == "small"' },
              { name: 'classify(9)', code: 'assert classify(9) == "small"' },
              { name: 'classify(10)', code: 'assert classify(10) == "big"' },
            ],
            difficulty: 1,
          },
        },
      ],
    },
    {
      id: 'loops',
      title: 'Loops',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: `
# Repeating Work

## for loops

\`for\` iterates over any sequence:

\`\`\`python
for ch in "abc":          # strings are sequences
    print(ch)

for i in range(5):        # 0, 1, 2, 3, 4  (stop is exclusive!)
    print(i)

for i in range(2, 10, 2): # 2, 4, 6, 8  (start, stop, step)
    print(i)
\`\`\`

Two functions you'll use daily:

\`\`\`python
names = ["ada", "grace", "linus"]
for i, name in enumerate(names):   # index AND value
    print(i, name)

scores = [90, 85, 77]
for name, score in zip(names, scores):  # parallel iteration
    print(name, score)
\`\`\`

## while loops

\`while\` repeats until a condition turns false — use it when you don't know the iteration count in advance (polling an API, training until convergence):

\`\`\`python
loss = 100.0
while loss > 1.0:
    loss = loss * 0.5     # pretend training step
\`\`\`

## break and continue

- \`break\` exits the loop immediately.
- \`continue\` skips to the next iteration.

\`\`\`python
for line in lines:
    if not line.strip():
        continue          # skip blanks
    if line == "END":
        break             # stop entirely
    process(line)
\`\`\`

## Accumulator pattern

The single most common loop shape — build up a result across iterations:

\`\`\`python
total = 0
for x in [1, 2, 3, 4]:
    total += x            # total is the accumulator
\`\`\`

Gradient descent, loss averaging, token counting — all accumulator loops at heart.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-loops',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'What numbers does `range(3)` produce?',
                choices: ['1, 2, 3', '0, 1, 2', '0, 1, 2, 3', '1, 2'],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Inside a loop, what does `continue` do?',
                choices: [
                  'Exits the loop entirely',
                  'Restarts the loop from the first iteration',
                  'Skips the rest of this iteration and moves to the next',
                  'Pauses the loop until user input',
                ],
                answerIndex: 2,
                difficulty: 1,
              },
              {
                kind: 'short',
                id: 'q3',
                prompt: 'Which built-in gives you `(index, value)` pairs while looping? (one word)',
                acceptableAnswers: ['enumerate', 'enumerate()'],
                difficulty: 2,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-sum-evens',
            title: 'Accumulator practice',
            instructions: `
Write \`sum_evens(numbers)\` that returns the sum of only the **even** numbers in the list.
(A number is even when \`n % 2 == 0\`.)

Example: \`sum_evens([1, 2, 3, 4, 5, 6])\` → \`12\`
`,
            starterCode: `def sum_evens(numbers):
    total = 0
    # loop, check evenness, accumulate
    ...
    return total
`,
            tests: [
              { name: 'mixed list', code: 'assert sum_evens([1, 2, 3, 4, 5, 6]) == 12' },
              { name: 'no evens', code: 'assert sum_evens([1, 3, 5]) == 0' },
              { name: 'empty list', code: 'assert sum_evens([]) == 0' },
              { name: 'negatives count too', code: 'assert sum_evens([-2, -1, 4]) == 2' },
            ],
            difficulty: 1,
          },
        },
      ],
    },
    {
      id: 'functions-checkpoint',
      title: 'Functions, Scope & Checkpoint',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: `
# Functions & Scope

Functions are named, reusable blocks that take inputs (**parameters**) and give back a result (**return value**):

\`\`\`python
def mean(numbers, default=0.0):     # default parameter value
    if not numbers:
        return default
    return sum(numbers) / len(numbers)

mean([1, 2, 3])          # 2.0    — positional argument
mean([], default=-1.0)   # -1.0   — keyword argument
\`\`\`

A function without an explicit \`return\` returns \`None\`. **\`print\` is not \`return\`** — printing shows a value on screen; returning hands it back to the caller. Mixing these up is the #1 beginner bug.

## Scope: where names live

Names created inside a function are **local** — they vanish when the function ends:

\`\`\`python
x = 10                # global

def f():
    x = 99            # different, local x — shadows the global
    return x

f()                   # 99
print(x)              # still 10
\`\`\`

Python resolves names with the **LEGB rule**: **L**ocal → **E**nclosing function → **G**lobal → **B**uilt-in. Reading a global inside a function is fine; *reassigning* one requires \`global x\` (which you should almost never do — pass values in and return them out instead).

## One warning for later

Never use a **mutable** default like \`def f(items=[])\` — the list is created once and shared across all calls. Use \`None\`:

\`\`\`python
def f(items=None):
    if items is None:
        items = []
\`\`\`

---

# 🏁 Module 1 Checkpoint

You've covered variables, types, operators, branching, loops, functions, and scope. Clear the quiz and the exercise below to finish the module.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-checkpoint-1',
            title: 'Checkpoint quiz',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'A function with no `return` statement returns…',
                choices: ['`0`', '`""`', '`None`', 'nothing — it crashes'],
                answerIndex: 2,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt:
                  '```python\nx = 5\ndef f():\n    x = 1\n    return x\nf()\nprint(x)\n```\nWhat gets printed?',
                choices: ['`1`', '`5`', '`None`', 'It raises an error'],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'Why is `def f(items=[])` dangerous?',
                choices: [
                  'Empty lists are not allowed as defaults',
                  'The same list object is shared across every call to `f`',
                  'It makes `items` a global variable',
                  'It only works in Python 2',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'In the LEGB rule, what does Python check **first** when resolving a name?',
                choices: ['Built-in scope', 'Global scope', 'Local scope', 'Enclosing scope'],
                answerIndex: 2,
                difficulty: 2,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-checkpoint-1',
            title: 'Checkpoint: temperature stats',
            instructions: `
Write \`temp_report(temps)\` that takes a list of temperatures and returns a dict:

- \`"count"\`: how many readings
- \`"mean"\`: their average (as a float)
- \`"above_freezing"\`: how many are strictly greater than 0

If \`temps\` is empty, return \`{"count": 0, "mean": 0.0, "above_freezing": 0}\`.

This combines everything from the module: functions, loops/accumulators, branching, and returning values.
`,
            starterCode: `def temp_report(temps):
    ...
`,
            tests: [
              {
                name: 'typical readings',
                code: 'assert temp_report([10, -5, 0, 20]) == {"count": 4, "mean": 6.25, "above_freezing": 2}',
              },
              {
                name: 'empty input',
                code: 'assert temp_report([]) == {"count": 0, "mean": 0.0, "above_freezing": 0}',
              },
              {
                name: 'all below zero',
                code: 'assert temp_report([-1, -2]) == {"count": 2, "mean": -1.5, "above_freezing": 0}',
              },
            ],
            difficulty: 2,
          },
        },
      ],
    },
  ],
}
