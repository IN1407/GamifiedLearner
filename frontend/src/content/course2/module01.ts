import type { Module } from '../types'

export const c2module01: Module = {
  id: 'c2m01-prompting-fundamentals',
  title: 'Prompting Fundamentals',
  summary: 'Clear instructions, few-shot examples, roles, output format control, and reasoning prompts.',
  lessons: [
    {
      id: 'clear-instructions',
      title: 'Clear Instructions & Context',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: `
# The One Skill Underneath Everything

A language model is a brilliant new contractor on their first day: enormous general competence, **zero** knowledge of your situation, and a tendency to fill gaps with plausible assumptions rather than ask. Most "bad AI output" is under-specified input.

Compare:

> ❌ "Write something about our product launch."

> ✅ "Write a 150-word launch announcement email for our project-management app *TaskFlow*, aimed at existing free-tier users, encouraging upgrade to Pro. Warm but not salesy. Mention the two new features — offline mode and calendar sync — and end with a single clear call to action. Avoid exclamation marks."

Every added constraint removed a decision the model would otherwise make for you: **length, format, audience, goal, tone, must-include content, must-avoid content.** That checklist — *task, audience, format, tone, constraints, context* — is 80% of prompting skill.

## Give context, not just commands

The model can't see your screen, your company, or your last meeting. Paste the relevant facts:

> "Here is our current pricing table: [paste]. Here are three complaints from churned users: [paste]. Draft a retention email addressing the top complaint."

Rule of thumb: **if a smart stranger couldn't do the task from your message alone, neither can the model.**

## Positive instructions beat negative ones

Models follow "do X" more reliably than "don't do Y" (and a page of don'ts crowds out the task). Say what you want: "use plain language a 12-year-old could follow" beats "don't be too technical."

## Iterate — prompting is a dialogue

The first output is a draft, not a verdict. "Shorter." "More formal." "Keep paragraph 2, rewrite the rest." Each refinement is cheap. People who are "great with AI" are mostly people who *push back* twice more than everyone else.
`,
        },
        {
          type: 'promptExercise',
          exercise: {
            id: 'c2-ex-clear',
            title: 'Rewrite a vague prompt',
            instructions: `
Here is a real (bad) prompt someone typed into a chatbot:

> "make a workout plan"

Rewrite it into a prompt that would get a genuinely useful, personalized answer on the first try.
Invent a plausible persona (fitness level, schedule, equipment, goals, constraints/injuries) and bake
it in. Specify the output format you want the plan delivered in.
`,
            rubric: `Score out of 100:
- Specificity (30): concrete persona details — fitness level, days/time available, equipment, goal
- Constraints (25): at least two real constraints (injury, equipment limits, time cap, preferences) that would change the plan
- Output format control (25): explicitly requests a structure (e.g. weekly table, per-day sections, sets/reps notation)
- Clarity (20): unambiguous, self-contained, a stranger could act on it without follow-up questions
Penalty: generic filler ("good workout plan please") without operational meaning. A one-line submission scores under 20.`,
            placeholder: 'I am a 34-year-old beginner who can train 3 evenings a week for 45 minutes...',
            difficulty: 1,
          },
        },
      ],
    },
    {
      id: 'fewshot-roles',
      title: 'Few-Shot Examples & Role Prompts',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: `
# Show, Don't (Only) Tell

## Few-shot prompting

Describing a style takes paragraphs; **showing** it takes two examples. Providing input→output pairs in the prompt is called **few-shot** prompting (zero-shot = instructions only):

\`\`\`text
Rewrite each ticket title in our internal style.

Ticket: "app crashes when i click the thing on profile"
Rewrite: "[Bug] Profile: crash on avatar click"

Ticket: "would be cool to have dark mode??"
Rewrite: "[Feature] Add dark mode"

Ticket: "cant login after password reset, very urgent!!"
Rewrite:
\`\`\`

The model infers the pattern — tag taxonomy, capitalization, terseness — far more precisely than any description. Rules for good examples:

- **2–5 examples** is the sweet spot; more helps only for weird formats.
- **Cover the variety** you expect: an edge case in your examples teaches its whole category.
- **Examples override instructions** when they conflict — the model imitates what you *showed*. Audit them: inconsistent examples produce inconsistent output.

## Role / system prompts

"You are a…" framing puts the model in a corner of its training distribution:

> "You are a senior security engineer reviewing code for OWASP top-10 vulnerabilities. You are terse and specific: file, line, issue, severity, fix."

Roles set vocabulary, priorities, and skepticism level. In apps, this lives in the **system prompt** — standing instructions that shape every reply (this platform's tutor and grader are two different system prompts on the same model — you've been watching role prompting work all course).

A role is not magic: "you are the world's best stock picker" doesn't create alpha. It selects *style and framing*, not new capabilities.
`,
        },
        {
          type: 'promptExercise',
          exercise: {
            id: 'c2-ex-fewshot',
            title: 'Design a few-shot prompt',
            instructions: `
Your team wants meeting notes converted into a strict action-item format:
\`- [OWNER] verb-first task (due: date or "none")\`

Write a complete few-shot prompt that teaches this format. Include:
1. A one-sentence instruction
2. **Two or three** example transformations (raw sentence → formatted item), at least one showing an
   edge case (no owner mentioned, or no deadline)
3. The final unlabeled input for the model to transform: "sarah said she'd send the budget by friday"
`,
            rubric: `Score out of 100:
- Example quality (35): 2-3 examples, consistent with each other AND with the stated format, verb-first, owner bracketed
- Edge-case coverage (25): at least one example demonstrates a missing owner or missing deadline and shows how to handle it
- Structure (20): clear instruction, clearly delimited examples, ends with the target input positioned for completion
- Format-spec fidelity (20): the examples exactly match \`- [OWNER] task (due: ...)\` — deviations in the learner's own examples are the main thing to penalize, since the model will imitate them`,
            placeholder: 'Convert meeting notes into action items in the format...\n\nNote: "..."\nItem: - [ALEX] ...',
            difficulty: 2,
          },
        },
      ],
    },
    {
      id: 'format-reasoning-checkpoint',
      title: 'Output Formats & Reasoning Prompts',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: `
# Controlling the Shape of the Answer

## Output format control

If output feeds anything downstream — a spreadsheet, a script, another prompt — pin the format explicitly:

> "Respond with **only** a JSON object matching: \`{"sentiment": "positive"|"negative"|"neutral", "confidence": 0-1, "quote": "<supporting excerpt>"}\`. No prose, no markdown fences."

Techniques that raise compliance:
- Show a filled-in example of the exact output (format few-shot!)
- Say what to do with unfillable fields ("use null, never invent")
- Say "only" and mean it — models love adding helpful preamble ("Here's your JSON!") that breaks parsers
- For tables: specify columns and one example row

(When you grade an exercise in this app, the grader model is under exactly such a JSON contract — that's why its feedback renders as tidy cards.)

## Reasoning prompts

For multi-step problems — logic, math, planning, tricky judgment — models do measurably better when they **work through steps before answering** than when they answer immediately. Ask for it:

> "Think through this step by step: list the constraints, check each option against them, then give your final recommendation with a one-line justification."

Two practical notes:
- Decide where reasoning should go: visible sections ("Analysis: … / Recommendation: …") or hidden ("reason privately, output only the final table").
- Modern "reasoning models" (OpenAI o-series, DeepSeek-R1, Claude's extended thinking) do this internally by default — with those, over-prescribing micro-steps can even get in the way. Know your tool; the *principle* — force deliberate checking of constraints before commitment — transfers everywhere.

---

# 🏁 Module 1 Checkpoint

One exercise, everything combined: instructions, role, examples, format control, reasoning.
`,
        },
        {
          type: 'promptExercise',
          exercise: {
            id: 'c2-checkpoint-1',
            title: 'Checkpoint: the full-stack prompt',
            instructions: `
Scenario: you run customer support and receive free-form complaint emails. You want an AI to triage
each one.

Write a single reusable **system prompt + task template** that:
1. Sets an appropriate role
2. Instructs the model to reason through the complaint before deciding (visible or hidden — your choice, but say which)
3. Outputs **strict JSON**: category (one of a fixed set you define, at least 4 categories), urgency (you define the scale), a one-sentence summary, and a suggested first reply sentence
4. Handles the edge case: email is not actually a complaint (define the behavior!)
5. Includes ONE worked example (input email → exact expected JSON)
`,
            rubric: `Score out of 100:
- Role & instruction clarity (20): role fits the task; instructions unambiguous
- Reasoning step (15): explicitly requests deliberation and states whether it appears in output; output format stays uncorrupted by it
- Format contract (25): JSON schema fully specified with an enumerated category set (≥4) and a defined urgency scale; explicitly forbids extra prose
- Edge case (15): non-complaint behavior is defined and representable within the same schema
- Worked example (25): present, complete, and exactly consistent with the schema (penalize any mismatch — the model will copy the example over the spec)`,
            placeholder: 'System: You are a support triage assistant for...\n\nFor each email: ...\n\nExample:\nEmail: "..."\nOutput: {...}',
            difficulty: 3,
          },
        },
      ],
    },
  ],
}
