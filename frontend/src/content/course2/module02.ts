import type { Module } from '../types'

export const c2module02: Module = {
  id: 'c2m02-advanced-prompting',
  title: 'Advanced Prompting',
  summary: 'Iterative refinement, task decomposition, prompt chaining, and guarding against hallucination.',
  lessons: [
    {
      id: 'refinement-decomposition',
      title: 'Refinement & Decomposition',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: `
# The Skill Is Iteration

Beginners treat the first answer as final. Experts treat it as a first draft in a conversation. The gap between a mediocre AI user and a great one is almost entirely **how they respond to the first output.**

## Targeted refinement

Vague follow-ups ("make it better") waste turns. Name the axis and the direction:

| Instead of | Say |
|---|---|
| "make it better" | "cut it to 100 words and lead with the benefit, not the feature" |
| "I don't like it" | "keep the structure, but the tone is too corporate — make it sound like one human emailing another" |
| "fix the code" | "the sort is O(n²); rewrite the inner loop to use a dict for O(n) lookups" |
| "more detail" | "expand only section 3, add a concrete worked example, leave the rest" |

**Quote what to keep.** "Keep paragraph 2 verbatim; rewrite everything else" preserves the parts that worked. Otherwise the model may "improve" the one line you loved.

## Decomposition: split big asks into steps

Ask for a 20-page business plan in one prompt and you get shallow everything. Real complex work is a sequence:

1. "First, just list the 6 sections this plan needs and one line on each. Don't write them yet."
2. *(you review and adjust the outline)*
3. "Now write section 1 (market analysis) in full, ~400 words."
4. …

Why this beats one mega-prompt:
- **You steer at each junction** instead of discovering at the end that the whole thing went sideways.
- **Each step has the full model attention** rather than 1/20th of it.
- **Errors are caught early and cheaply** — a wrong outline costs one turn to fix; a wrong 20-page draft costs everything.

This is the same "decompose then solve" instinct from programming — and it's the manual version of what "agents" (module 3) automate.

## The clarifying-questions trick

For ambiguous tasks, flip the direction of questions:

> "Before you write anything, ask me up to 5 questions whose answers would most change how you approach this."

The model surfaces the assumptions it was about to make silently — you correct them *before* they cost you a bad draft. Astonishingly effective, wildly underused.
`,
        },
        {
          type: 'promptExercise',
          exercise: {
            id: 'c2-ex-decompose',
            title: 'Decompose a big task',
            instructions: `
A friend says: "I used AI to write my whole 3,000-word conference talk in one prompt and it's generic
mush."

Write the **sequence of prompts** (4–6 steps) you'd use instead to produce a strong talk, showing how
you'd decompose it and where you'd insert your own review/steering between steps. For each step, give
the actual prompt you'd send (not just a description), and note in one line what you'd check before
moving on.
`,
            rubric: `Score out of 100:
- Genuine decomposition (30): 4-6 distinct steps that build on each other (e.g. audience+goal -> outline -> section drafts -> tightening), not one task sliced arbitrarily
- Real prompts (25): each step is an actual prompt you could paste, not a vague label
- Steering/review points (25): explicitly identifies what the human checks/adjusts between steps
- Ordering logic (20): the sequence makes sense — cheap/structural decisions before expensive/detailed ones
Penalize: a single mega-prompt lightly reworded; steps with no human checkpoint; "then ask AI to make it better" as a step.`,
            placeholder: 'Step 1 — Nail the audience and one core message:\nPrompt: "I\'m giving a 25-minute talk to ... The single thing I want them to remember is ... Ask me 3 questions that would sharpen this before we outline."\nCheck: ...',
            difficulty: 2,
          },
        },
      ],
    },
    {
      id: 'chaining-hallucination-checkpoint',
      title: 'Prompt Chaining & Guarding Against Hallucination',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: `
# Prompt Chaining

**Chaining** = the output of one prompt becomes the input to the next, each step doing one job well. Unlike interactive decomposition (you in the loop), chains are designed to run as a **pipeline**:

\`\`\`text
[raw transcript] → Prompt A: extract every decision & action item
                 → Prompt B: for each action item, draft a calendar entry
                 → Prompt C: format all entries as a table
\`\`\`

Each stage has a narrow contract, is separately testable, and can use a different model (cheap model for extraction, strong model for judgment). This is literally how AI *products* are built under the hood — and recognizing it lets you replicate their results by hand.

Chain design principles:
- **One responsibility per link.** "Extract, then separately classify" beats "extract and classify at once" — cleaner, debuggable.
- **Validate between links.** If step A must output JSON, check it parses before feeding step B (garbage propagates and amplifies).
- **Make each link's output the exact input the next expects** — this is where output-format control (module 1) earns its keep.

# Guarding Against Hallucination

Models generate *fluent* text, which is not the same as *true* text. They will state wrong facts, invent citations, fabricate API methods, and misquote sources — all with total confidence. Your defenses:

1. **Ground it.** "Answer only from the text I paste below; if it's not there, say 'not in the source'." (RAG, module 12 of Course 1, is this industrialized.) The single most effective guard.
2. **Ask for uncertainty.** "Rate your confidence in each claim and flag anything you're unsure about." Well-tuned models will actually distinguish.
3. **Demand verifiability.** "Quote the exact sentence that supports each claim." Fabrications can't produce a real supporting quote.
4. **Separate facts from generation.** Get facts from a source of truth (search, docs, a database); use the model to *phrase and structure*, not to *remember*.
5. **Verify anything that matters.** Names, numbers, legal/medical/financial claims, code that touches production, citations — check independently. Always.

## Evaluating output critically

Treat every answer as a claim to be tested, and calibrate scrutiny to stakes: a brainstorm needs little; a contract clause or a medication dose needs full verification.

Fluency-blindness is the trap — the better the writing, the *more* you should check, because polish disables suspicion. Red flags: suspiciously specific statistics with no source, citations you can't find, unhedged claims about niche topics, code using methods you've never heard of. The good news: it's easier to *verify* a specific claim than to *generate* it from scratch — which is exactly why AI + a critical human is so powerful.

---

# 🏁 Module 2 Checkpoint
`,
        },
        {
          type: 'promptExercise',
          exercise: {
            id: 'c2-checkpoint-2',
            title: 'Checkpoint: design a hallucination-resistant research prompt',
            instructions: `
Someone will use an AI (with web access) to research "the current state of solid-state battery
commercialization" for a report their boss will act on.

Write the prompt(s) you'd give it to get a **trustworthy, verifiable** result. Your submission must
demonstrate at least THREE distinct anti-hallucination techniques from the lesson, and specify the
exact output structure (so claims and their sources are inspectable). Explain in one line why each
technique is there.
`,
            rubric: `Score out of 100:
- Anti-hallucination techniques (40): at least three DISTINCT guards actually present in the prompt (grounding/source-restriction, per-claim citation or quote, confidence flagging, separating retrieval from phrasing, explicit "say if unknown"). Name and count them.
- Verifiability of output (25): output format forces every factual claim to carry a checkable source/quote so the reader can audit it
- Fitness for stakes (20): reflects that a decision-maker will act on it — hedging, dates, "as of" framing, distinguishing shipped vs announced vs speculative
- Clarity (15): unambiguous and usable as-is
Penalize: relying on a single guard; assuming the model "just knows"; no way for the reader to verify.`,
            placeholder: 'Research prompt:\n"Using only sources you retrieve and can link, summarize... For every factual claim, include the source URL and a one-sentence quote. If you cannot find a source, write [UNVERIFIED] and explain..."',
            difficulty: 3,
          },
        },
      ],
    },
  ],
}
