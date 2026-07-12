import type { Module } from '../types'

export const c2module06: Module = {
  id: 'c2m06-engineering-patterns',
  title: 'Engineering Reliable AI Workflows',
  summary: 'Context, loops, harnesses, agents, intent, verification, and deliberate reasoning-style prompts.',
  lessons: [
    {
      id: 'context-loop-harness-engineering',
      title: 'Context, Loop, and Harness Engineering',
      kind: 'lesson',
      blocks: [
        { type: 'md', md: `
# Context engineering

Prompt engineering is the visible layer. **Context engineering** is the system design layer: deciding what information reaches the model, in what order, at what size, with what freshness, and with what trust level. Good context design separates durable instructions, retrieved evidence, user intent, tool outputs, and scratch artifacts so the model can use each correctly.

# Loop engineering

A single prompt is rarely a production workflow. **Loop engineering** designs the cycle: draft → critique → revise, retrieve → answer → verify, plan → act → observe → update. Loops need stop conditions, escalation rules, retry budgets, and a way to preserve useful partial output when a step fails.

# Harness engineering

A harness wraps prompts with repeatable inputs, fixtures, graders, logging, and regression tests. It lets you ask: did this change improve the workflow, or did it only work once? A harness is how prompt work becomes engineering instead of vibes.
` },
        { type: 'promptExercise', exercise: {
          id: 'c2-context-loop-harness-design',
          title: 'Design an AI workflow harness',
          instructions: 'Pick a recurring AI task and describe the context packet, the processing loop, and the harness you would use to test whether changes improve it. Include at least three fixtures and one failure case.',
          rubric: 'Score out of 100. Award 30 for clear context boundaries and source trust labels, 25 for a loop with stop/retry/escalation rules, 25 for a concrete harness with fixtures and expected properties, and 20 for realistic failure handling. Penalize vague descriptions that cannot be tested.',
          placeholder: 'Task: triage customer feedback. Context packet: policy excerpt, user message, account tier, recent incidents... Loop: classify -> retrieve policy -> draft -> verify... Harness fixtures: ...',
          difficulty: 2,
        } },
      ],
    },
    {
      id: 'agentic-intent-verification-engineering',
      title: 'Agentic, Intent, and Verification Engineering',
      kind: 'lesson',
      blocks: [
        { type: 'md', md: `
# Agentic engineering

**Agentic engineering** designs model-driven systems that can choose tools, inspect results, and decide the next action. The engineering challenge is not making the model "autonomous"; it is bounding autonomy with permissions, budgets, typed tool contracts, observable state, and human approval gates for irreversible actions.

# Intent engineering

**Intent engineering** turns ambiguous user goals into an explicit operating target: task, audience, constraints, success criteria, non-goals, and acceptable tradeoffs. The system should ask clarifying questions when intent is under-specified instead of guessing silently.

# Verification engineering

**Verification engineering** defines how outputs are checked before use: deterministic validators, citation checks, unit tests, pairwise comparisons, rubric graders, human review, and red-team cases. Verification should be cheaper than the damage caused by an unchecked error.
` },
        { type: 'promptExercise', exercise: {
          id: 'c2-agentic-verification-plan',
          title: 'Bound an agentic workflow',
          instructions: 'Design a small agentic workflow. Specify its tools, allowed actions, forbidden actions, intent clarification questions, verification checks, and human approval gates.',
          rubric: 'Score out of 100. Award 25 for bounded tool/action design, 20 for strong intent clarification, 25 for layered verification, 20 for appropriate human approval gates, and 10 for concise operational clarity. Cap at 60 if the workflow allows irreversible actions without approval.',
          placeholder: 'Workflow: research and draft a vendor comparison. Tools: web search, document reader, spreadsheet writer. Forbidden: emailing vendors, purchasing, deleting files...',
          difficulty: 3,
        } },
      ],
    },
    {
      id: 'reasoning-style-prompts',
      title: 'Prompting for Reasoning Styles Without Leaking Scratchwork',
      kind: 'checkpoint',
      blocks: [
        { type: 'md', md: `
# Reasoning-style prompts

You can ask a model to use a **reasoning style** without asking it to reveal private chain-of-thought. Safer patterns ask for a brief rationale, a checklist, assumptions, alternatives considered, or a final decision tree summary.

- **Chain-of-thought style**: ask the model to think step by step internally, then provide a concise answer with key reasons and checks.
- **Tree-of-thought style**: ask it to consider multiple solution paths internally, compare them against criteria, and report the best option plus a short comparison.
- **Verification-first style**: ask it to state acceptance checks before drafting, then verify the final output against those checks.

The goal is better work, not longer hidden scratchwork. Ask for inspectable artifacts: assumptions, tests, citations, tradeoffs, and final rationale.
` },
        { type: 'promptExercise', exercise: {
          id: 'c2-reasoning-styles-checkpoint',
          title: 'Write reasoning-style prompts for one task',
          instructions: 'For a meaningful task, write three prompts: one chain-of-thought-style prompt that requests only a concise rationale, one tree-of-thought-style prompt that requests alternatives and selection criteria, and one verification-first prompt. Explain when each is safest to use.',
          rubric: 'Score out of 100. Award 25 for a safe chain-of-thought-style prompt that does not request hidden scratchwork verbatim, 25 for a tree-of-thought-style prompt with alternatives and criteria, 25 for a verification-first prompt with acceptance checks, and 25 for matching each style to an appropriate risk level. Penalize prompts that ask for private hidden reasoning instead of concise rationale or inspectable summaries.',
          placeholder: 'Task: choose an architecture for a study-plan generator. Prompt 1 (step-by-step internally + concise rationale): ... Prompt 2 (consider three approaches and compare): ... Prompt 3 (write acceptance checks first): ...',
          difficulty: 3,
        } },
      ],
    },
  ],
}
