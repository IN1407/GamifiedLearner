import type { Module } from '../types'

export const c2module04: Module = {
  id: 'c2m04-workflow-design',
  title: 'Workflow Design',
  summary: 'Choosing the right tool per task, combining tools, and the cost/latency/privacy tradeoffs of hosted vs. local.',
  lessons: [
    {
      id: 'combining-tradeoffs',
      title: 'Combining Tools & the Three Tradeoffs',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: `
# Workflows Beat Single Prompts

Real leverage rarely comes from one magic prompt — it comes from a **workflow**: the right tool at each step, with you orchestrating and verifying at the seams. "The best stack is usually a small toolkit plus a predictable process you can repeat."

Example — a weekly competitor-analysis brief:

\`\`\`text
1. Research tool (web + citations)  → gather what competitors shipped this week (sources attached)
2. YOU                              → sanity-check the sources, drop the junk
3. Chat assistant                   → structure findings into a themed brief
4. YOU                              → add strategic judgment the model can't have
5. Image tool                       → one chart/visual for the summary slide
\`\`\`

No single tool does this well; the *combination* plus human judgment at steps 2 and 4 does. Design principles:

- **Match each step to the tool's strength** (research tool researches, chat structures, you judge).
- **Put humans at the high-stakes / high-judgment seams**, not everywhere (that kills the leverage) and not nowhere (that ships errors).
- **Keep handoffs clean** — module 1's output-format control is what makes step N's output usable as step N+1's input.
- **Automate the boring, keep the judgment.** The goal isn't "AI does everything"; it's "AI does the mechanical 80%, you do the 20% that needs a human."

# Hosted vs. Local: The Three Tradeoffs

Every "which model?" decision reduces to three axes. There's no universal winner — only a fit for *your* task.

## 1. Cost
- **Hosted APIs:** pay per token. Trivial for a few calls; it adds up fast for high-volume or long-context (recall Course 1 module 9 — long context is expensive to serve, and you pay for it). No hardware.
- **Local (Ollama/llama.cpp):** free per call after a hardware/electricity cost. Break-even favors local at high volume, hosted at low volume or when you need frontier quality you can't run.

## 2. Latency
- **Hosted:** network round-trip + queue, but massive GPUs — often faster for big models, and streaming hides much of it. Rate limits (429!) can bottleneck bursts.
- **Local:** no network hop, fully predictable, works offline — but constrained by *your* hardware, so large models can be slow or impossible.

## 3. Privacy
- **Hosted:** your data leaves your machine to a third party. Check their retention/training policy. For regulated data (health, legal, financial) or trade secrets this can be an outright blocker regardless of quality.
- **Local:** data never leaves the machine. This is the *decisive* advantage for sensitive work — a "worse" local model you can legally use beats a better hosted one you can't.

## The decision heuristic

| Your priority | Lean |
|---|---|
| Highest possible quality | Hosted frontier model |
| Sensitive / regulated data | Local |
| High volume, cost-sensitive | Local (or a cheap hosted small model) |
| Offline / air-gapped | Local |
| Prototyping / low volume | Hosted (zero setup) |
| Predictable latency, no rate limits | Local |

And you can mix: a cheap/local model for bulk extraction, a frontier hosted model for the one hard judgment step (that's prompt chaining from module 2, applied to *model selection*).
`,
        },
        {
          type: 'promptExercise',
          exercise: {
            id: 'c2-ex-tradeoffs',
            title: 'Make a hosted-vs-local call',
            instructions: `
A small law firm wants to use AI to summarize client case files and draft routine letters. They handle
privileged, confidential client data. They'd process ~200 documents/day. They have one decent
workstation with a consumer GPU, and a modest budget.

Write a recommendation: hosted, local, or a hybrid — and justify it explicitly against **all three
tradeoffs** (cost, latency, privacy) for THIS firm. If you recommend hybrid, specify which steps go
where and why. Name the single most decisive factor.
`,
            rubric: `Score out of 100:
- Addresses all three tradeoffs (36, 12 each): cost at ~200 docs/day, latency on their hardware, privacy of privileged data — each reasoned for THIS firm, not in the abstract
- Correctly weights privacy as likely decisive (24): recognizes that privileged/confidential legal data makes uncontrolled hosted processing a serious problem, and says so — OR makes a well-argued case for a compliant hosted option (enterprise/no-retention) rather than ignoring the issue
- Concrete, actionable recommendation (25): a specific architecture (which step runs where), not "it depends"; hybrid splits are justified
- Identifies the decisive factor (15): names and defends the single most important consideration
Penalize: ignoring privacy for legal data; recommending consumer hosted chat for privileged files with no caveat; vague "use AI carefully".`,
            placeholder: 'Recommendation: primarily local, with...\n\nPrivacy: privileged client data means...\nCost: at 200 docs/day...\nLatency: on a single consumer GPU...\nMost decisive factor: ...',
            difficulty: 3,
          },
        },
      ],
    },
    {
      id: 'workflow-checkpoint',
      title: 'Designing a Repeatable Workflow',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: `
# From One-Off to Repeatable

A prompt you type once is a tool use. A workflow you can hand to someone else — or run every week without rethinking it — is an **asset**. The difference:

- **Documented steps** — anyone (including future-you) can run it.
- **Defined inputs and outputs** at each step — so you know when a step failed.
- **Explicit human checkpoints** — where judgment or verification is required, marked, not assumed.
- **A quality bar** — how you know the final output is good enough, not just done.
- **A fallback** — what to do when a step produces garbage (retry? escalate to a human? switch tools?).

## Anti-patterns to avoid

- **The mega-prompt** — cramming a 6-step task into one prompt. Decompose (module 2).
- **The trust fall** — no verification anywhere; you find out it was wrong when your boss does.
- **The human bottleneck** — a human approving every trivial step; you've automated nothing.
- **Tool sprawl** — five tools where two would do; every handoff is a chance for errors and friction.
- **Silent failure** — no check that a step actually produced usable output before the next step consumes it.

## The test of a good workflow

Could you write it on an index card, hand it to a competent colleague who's never seen it, and get a
result you'd trust? If yes, you've designed a workflow. If it only works when *you* run it with
intuition you can't articulate, it's not a workflow yet — it's a skill you haven't externalized.

That externalization — turning "I'm good at using AI" into "here is the repeatable process" — is the
capstone skill of this course, and the subject of the final module.

---

# 🏁 Module 4 Checkpoint
`,
        },
        {
          type: 'promptExercise',
          exercise: {
            id: 'c2-checkpoint-4',
            title: 'Checkpoint: design a repeatable multi-tool workflow',
            instructions: `
Design a repeatable AI-assisted workflow for a recurring task (yours or invented, but realistic —
e.g. "turn weekly customer-support tickets into a product-feedback report", "produce a weekly
social-media content batch", "screen inbound job applications").

Your submission must specify:
1. The task, how often it runs, and what "done well" looks like (the quality bar)
2. Each step: what it does, which tool/model category (and hosted vs local where it matters), input → output
3. Human checkpoints — exactly where and what the human verifies or decides
4. At least one fallback: what happens when a specific step produces garbage
5. The index-card test: could a competent colleague run this from your description?
`,
            rubric: `Score out of 100:
- Repeatability (25): documented, ordered steps with defined inputs/outputs; a colleague could actually run it
- Tool/model fit per step (20): each step matched to a sensible category; hosted-vs-local addressed where it's relevant (e.g. sensitive data or high volume)
- Human checkpoints placed well (20): verification/judgment at high-stakes seams, NOT on every trivial step and NOT absent — the calibration is the point
- Quality bar + fallback (20): states how you know the output is good enough AND what to do when a step fails (retry/escalate/switch)
- Avoids the anti-patterns (15): not a mega-prompt, not a trust-fall, not a human bottleneck, not tool sprawl
Penalize: no human verification anywhere; a human gate on every step; no failure handling; "the AI does it all" with no seams.`,
            placeholder: 'Task: Weekly support tickets -> product-feedback report. Runs every Monday. Done well = ...\n\nStep 1 (extract): tool = ..., in = raw tickets export, out = ...\nHuman check: ...\nStep 2 (cluster themes): ...\nFallback if clustering is nonsense: ...',
            difficulty: 3,
          },
        },
      ],
    },
  ],
}
