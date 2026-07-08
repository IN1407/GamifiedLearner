import type { Module } from '../types'

export const module02: Module = {
  id: 'm02-data-structures',
  title: 'Data Structures',
  summary: 'Lists, tuples, dicts, sets, and comprehensions — how Python holds data.',
  lessons: [
    {
      id: 'lists-tuples',
      title: 'Lists & Tuples',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: `
# Lists & Tuples

## Lists — mutable sequences

\`\`\`python
langs = ["python", "rust", "go"]
langs[0]          # "python"      (indexing starts at 0)
langs[-1]         # "go"          (negative = from the end)
langs[0:2]        # ["python", "rust"]  (slice: start inclusive, stop exclusive)
langs.append("zig")
langs.pop()       # removes & returns "zig"
len(langs)        # 3
"rust" in langs   # True — membership test
sorted(langs)     # new sorted list; langs.sort() sorts in place
\`\`\`

Slicing works on any sequence and never errors on out-of-range bounds: \`langs[1:999]\` just gives what exists.

## Tuples — immutable sequences

\`\`\`python
point = (3, 4)
x, y = point            # unpacking
point[0] = 99           # TypeError! tuples can't change
\`\`\`

Use a tuple when the data is fixed-shape — a coordinate, an (id, score) pair, multiple return values:

\`\`\`python
def min_max(nums):
    return min(nums), max(nums)   # returns a tuple

lo, hi = min_max([3, 1, 4])
\`\`\`

## The aliasing trap

Assignment never copies — it points another name at the *same object*:

\`\`\`python
a = [1, 2, 3]
b = a             # same list!
b.append(4)
print(a)          # [1, 2, 3, 4]  😱
c = a.copy()      # actual (shallow) copy
\`\`\`

This matters enormously later: NumPy arrays, model configs, and dataset dicts all alias the same way.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-lists',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'What is `[10, 20, 30, 40][1:3]`?',
                choices: ['`[20, 30, 40]`', '`[20, 30]`', '`[10, 20, 30]`', '`[30, 40]`'],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt:
                  '```python\na = [1, 2]\nb = a\nb.append(3)\n```\nWhat is `a` now?',
                choices: ['`[1, 2]`', '`[1, 2, 3]`', '`[3]`', 'It raises an error'],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'Which operation is **not allowed** on a tuple?',
                choices: ['Indexing `t[0]`', 'Unpacking `x, y = t`', 'Item assignment `t[0] = 5`', 'Membership `5 in t`'],
                answerIndex: 2,
                difficulty: 1,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-slice',
            title: 'Slice practice',
            instructions: `
Write \`middle(items)\` that returns a **new list** with the first and last elements removed.
If the list has fewer than 3 items, return an empty list.

Example: \`middle([1, 2, 3, 4, 5])\` → \`[2, 3, 4]\`

Hint: one slice expression does the whole job.
`,
            starterCode: `def middle(items):
    ...
`,
            tests: [
              { name: 'five items', code: 'assert middle([1, 2, 3, 4, 5]) == [2, 3, 4]' },
              { name: 'three items', code: 'assert middle(["a", "b", "c"]) == ["b"]' },
              { name: 'two items -> empty', code: 'assert middle([1, 2]) == []' },
              { name: 'does not mutate input', code: 'xs = [1,2,3,4]\nmiddle(xs)\nassert xs == [1,2,3,4]' },
            ],
            difficulty: 1,
          },
        },
      ],
    },
    {
      id: 'dicts-sets',
      title: 'Dictionaries & Sets',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: `
# Dictionaries & Sets

## Dicts — key → value maps

The most important data structure in Python. JSON objects, API payloads, model configs, and keyword arguments are all dicts:

\`\`\`python
config = {"model": "llama3", "temperature": 0.7}
config["model"]              # "llama3"
config["max_tokens"] = 512   # insert
config.get("seed")           # None (no crash!)
config.get("seed", 42)       # 42 (default)
"model" in config            # True — checks KEYS
del config["temperature"]
\`\`\`

\`config["missing"]\` raises \`KeyError\`; \`config.get("missing")\` returns \`None\`. Choose deliberately: \`[]\` when the key *must* exist (fail fast), \`.get()\` when absence is normal.

Iterating:

\`\`\`python
for key in config:                    # keys
for key, value in config.items():    # pairs — most common
for value in config.values():        # values
\`\`\`

## Counting — the classic dict pattern

\`\`\`python
counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1
\`\`\`

This exact pattern is a baby tokenizer-frequency counter — you'll meet it again in the transformers module.

## Sets — unique, unordered, fast membership

\`\`\`python
seen = {"a", "b"}
seen.add("c")
"a" in seen          # True — O(1), even with millions of items
set([1, 2, 2, 3])    # {1, 2, 3} — dedupe a list

a = {1, 2, 3}; b = {2, 3, 4}
a & b   # {2, 3}   intersection
a | b   # {1, 2, 3, 4}  union
a - b   # {1}      difference
\`\`\`

Membership tests on a **list** scan every element (O(n)); on a **set or dict** they hash straight to the answer (O(1)). When code that checks \`x in collection\` in a loop is slow, this is almost always why.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-dicts',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'What does `d["missing_key"]` do when the key is absent?',
                choices: ['Returns `None`', 'Returns `0`', 'Raises `KeyError`', 'Adds the key with value `None`'],
                answerIndex: 2,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'What is `set([1, 1, 2, 3, 3])`?',
                choices: ['`[1, 2, 3]`', '`{1, 2, 3}`', '`{1, 1, 2, 3, 3}`', '`(1, 2, 3)`'],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'Why is `x in my_set` much faster than `x in my_list` for large collections?',
                choices: [
                  'Sets are stored in sorted order',
                  'Sets use hashing — membership is O(1) instead of O(n)',
                  'Lists are stored on disk',
                  'It is not faster — they are identical',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'short',
                id: 'q4',
                prompt: 'Which dict method returns key–value pairs for looping? (one word, no parentheses)',
                acceptableAnswers: ['items', '.items', 'items()'],
                difficulty: 1,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-wordcount',
            title: 'Word frequency counter',
            instructions: `
Write \`word_counts(text)\` that lowercases the text, splits it on whitespace, and returns a dict
mapping each word to how many times it appears.

Example: \`word_counts("the cat the dog")\` → \`{"the": 2, "cat": 1, "dog": 1}\`
`,
            starterCode: `def word_counts(text):
    counts = {}
    ...
    return counts
`,
            tests: [
              {
                name: 'basic counting',
                code: 'assert word_counts("the cat the dog") == {"the": 2, "cat": 1, "dog": 1}',
              },
              { name: 'case-insensitive', code: 'assert word_counts("Hi hi HI") == {"hi": 3}' },
              { name: 'empty text', code: 'assert word_counts("") == {}' },
            ],
            difficulty: 2,
          },
        },
      ],
    },
    {
      id: 'comprehensions-checkpoint',
      title: 'Comprehensions & Checkpoint',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: `
# Comprehensions

A **comprehension** builds a collection from a loop in one readable expression:

\`\`\`python
# list comprehension:        [expression  for item in iterable  if condition]
squares = [x**2 for x in range(6)]              # [0, 1, 4, 9, 16, 25]
evens   = [x for x in nums if x % 2 == 0]       # filter
words   = [w.strip().lower() for w in raw]       # transform

# dict comprehension
lengths = {w: len(w) for w in ["ai", "data"]}    # {"ai": 2, "data": 4}

# set comprehension
first_letters = {w[0] for w in words}
\`\`\`

Read them as: "*expression* for each *item*, keeping those where *condition*". They replace 3–4 line accumulator loops, and you'll see them constantly in ML code:

\`\`\`python
# normalize a batch of texts before tokenization — one line
clean = [t.strip().lower() for t in batch if t.strip()]
\`\`\`

Rule of thumb: if the logic fits in one readable line, use a comprehension. If you need nested conditions or multiple statements, write the explicit loop — clarity beats cleverness.

---

# 🏁 Module 2 Checkpoint

Lists, tuples, dicts, sets, comprehensions. The exercise below is a realistic mini-task: cleaning and shaping data — 80% of what real ML engineering actually is.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-checkpoint-2',
            title: 'Checkpoint quiz',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'What is `[x * 2 for x in range(4)]`?',
                choices: ['`[0, 2, 4, 6]`', '`[2, 4, 6, 8]`', '`[0, 1, 2, 3]`', '`[0, 2, 4, 6, 8]`'],
                answerIndex: 0,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Which builds a **dict** mapping each word to its length?',
                choices: [
                  '`[w: len(w) for w in words]`',
                  '`{w: len(w) for w in words}`',
                  '`{w, len(w) for w in words}`',
                  '`(w: len(w) for w in words)`',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'You need to dedupe a list of user IDs and then repeatedly check membership. Best structure?',
                choices: ['list', 'tuple', 'set', 'str'],
                answerIndex: 2,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'What is `[x for x in [1, 2, 3, 4] if x > 2]`?',
                choices: ['`[1, 2]`', '`[3, 4]`', '`[2, 3, 4]`', '`[4]`'],
                answerIndex: 1,
                difficulty: 1,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-checkpoint-2',
            title: 'Checkpoint: clean a messy dataset',
            instructions: `
You get a list of raw user records (dicts) like:

\`\`\`python
[{"name": "  Ada ", "age": 36}, {"name": "", "age": 20}, {"name": "Bob", "age": -1}]
\`\`\`

Write \`clean_users(records)\` that returns a **new list** keeping only valid records
(non-empty name after stripping, age ≥ 0), with each name stripped and title-cased
(\`.strip().title()\`).

Expected for the example: \`[{"name": "Ada", "age": 36}]\` … wait — check Bob's age again. 😉
`,
            starterCode: `def clean_users(records):
    ...
`,
            tests: [
              {
                name: 'filters and cleans',
                code: 'assert clean_users([{"name": "  ada ", "age": 36}, {"name": "", "age": 20}, {"name": "bob", "age": -1}]) == [{"name": "Ada", "age": 36}]',
              },
              {
                name: 'keeps valid records',
                code: 'assert clean_users([{"name": "grace", "age": 0}]) == [{"name": "Grace", "age": 0}]',
              },
              { name: 'empty input', code: 'assert clean_users([]) == []' },
              {
                name: 'does not mutate input',
                code: 'orig = [{"name": " x ", "age": 1}]\nclean_users(orig)\nassert orig == [{"name": " x ", "age": 1}]',
              },
            ],
            difficulty: 2,
          },
        },
      ],
    },
  ],
}
