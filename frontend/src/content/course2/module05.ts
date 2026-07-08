import type { Module } from '../types'

export const c2module05: Module = {
  id: 'c2m05-capstone',
  title: 'Capstone: Design a Real Workflow',
  summary: 'Put it all together — design, document, and defend a complete multi-step AI-assisted workflow.',
  lessons: [
    {
      id: 'capstone',
      title: 'The AI-Power-User Capstone',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: `
# Capstone: Your Signature Workflow

You've learned to write clear, example-driven, format-controlled prompts (module 1); to refine,
decompose, chain, and guard against hallucination (module 2); to read the tool landscape honestly
(module 3); and to combine tools and weigh cost/latency/privacy into repeatable workflows (module 4).

Now assemble it into one substantial, documented workflow for a **real task in your own life or work** —
the thing you'll actually keep using after this course.

## What makes a capstone-grade workflow

It's genuinely multi-step (at least 3 AI-involved steps), uses **more than one prompting technique**
from this course, has real human judgment at the right seams, handles failure, and — crucially — is
documented well enough that **someone else could run it**. It should reflect the calibrated-trust
mindset: aggressive automation where errors are cheap and visible, careful verification where they're
expensive.

## Before you submit — self-check against everything you learned

- **Prompting quality** (m1): are the actual prompts in your workflow clear, with format control and examples where useful?
- **Advanced technique** (m2): does it decompose or chain, and does it guard against hallucination where facts matter?
- **Tool fit** (m3): is each step's tool matched to its real strength and failure mode?
- **Tradeoffs** (m4): did you consider cost/latency/privacy where they matter, and place humans well?
- **Repeatability**: could a colleague run it from your doc and trust the result?

## The submission

Write a complete **workflow design document** (400–700 words). Structure it however serves it best, but
it must contain everything the rubric checks. Include at least one **actual prompt** from a key step
(not just a description of it) so the grader can assess your prompting directly.

This is the "veteran" checkpoint for Course 2. Make it something you're proud to hand to a colleague.
`,
        },
        {
          type: 'promptExercise',
          exercise: {
            id: 'c2-capstone',
            title: 'Submit your workflow design document',
            instructions: `
Write and submit your capstone **workflow design document** (400–700 words) for a real, recurring task
you care about. It must include:

1. **The task & goal** — what it is, how often, and what a great result looks like (the quality bar)
2. **The full workflow** — every step, the tool/model category for each (hosted vs local where it
   matters), and how each step's output feeds the next
3. **At least one actual prompt** — paste a real prompt you'd use at a key step, demonstrating the
   prompting techniques from Course 2 (clear instructions, examples, format control, and/or
   anti-hallucination guards as appropriate)
4. **Human checkpoints** — where you verify or exercise judgment, and why there specifically
5. **Failure handling** — what you do when a step produces bad output
6. **A tradeoff you made** — and the alternative you rejected, with reasoning

The connected AI grades this against the rubric. This is your Course 2 capstone — bring everything.
`,
            rubric: `Score out of 100. This is the Course 2 capstone; hold a high bar.
- Task & quality bar (12): concrete recurring task with an articulated standard for "done well"
- Multi-step workflow (20): at least 3 AI-involved steps that genuinely build on each other with clean input->output handoffs; tool/model category fits each step
- Prompting quality of the included prompt (23): the pasted real prompt demonstrates techniques from the course — clear instructions AND at least one of: few-shot examples, explicit output-format control, anti-hallucination grounding. Judge the actual prompt, not the description of it.
- Human checkpoints (15): verification/judgment placed at high-stakes or high-judgment seams, calibrated (not everywhere, not nowhere)
- Failure handling (12): concrete fallback for at least one step's bad output
- Tradeoff reasoning (18): a real tradeoff (cost/latency/privacy or tool choice or automation-vs-control) with the rejected alternative and WHY; considers privacy/cost where relevant
Do NOT award points for length, enthusiasm, or buzzwords. If no actual prompt is included, cap the prompting-quality criterion near zero and say so. Flag anything you cannot verify. Provide a concrete suggested improvement to the weakest part.`,
            placeholder: 'Task: Turn my weekly reading (10-15 articles) into a personal knowledge digest + 3 draft social posts. Runs Sunday evening. Great result = ...\n\nWorkflow:\nStep 1 (extract + summarize each article): local model because volume + I paste full text; prompt below...\n\nKey prompt (Step 1):\n"""\nSummarize the article between <article> tags in exactly 3 bullets... If a claim is a statistic, quote it verbatim; if the article does not state its source, mark it [unsourced].\n<article>{text}</article>\n"""\n\nHuman checkpoint: ...\nFailure handling: ...\nTradeoff: chose local over frontier because ... rejected ... because ...',
            difficulty: 3,
          },
        },
        {
          type: 'md',
          md: `
---

🎓 **Course 2 complete.** You can now direct AI deliberately instead of hoping for good output: specify
precisely, decompose and chain, pick the right tool for the job, weigh the real tradeoffs, verify with
calibrated skepticism, and package it all into workflows you can repeat and share. That's what it means
to be *fluent at using AI* — not knowing every tool, but knowing how to think about any of them.
`,
        },
      ],
    },
  ],
}
