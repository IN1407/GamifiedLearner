import type { Module } from '../types'

export const c2module03: Module = {
  id: 'c2m03-tool-landscape',
  title: 'The Tool Landscape',
  summary: 'Coding assistants, research/writing tools, image/video generation, and automation agents — what each is good and bad at.',
  lessons: [
    {
      id: 'categories',
      title: 'The Categories & Current Players',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: `
# A Map of the AI Tool Landscape

This space moves *fast* — specific product names below are current as of mid-2026 and **will drift**; the durable skill is recognizing the **categories** and what each is fundamentally good and bad at. Verify current leaders yourself before betting real work on a name.

## 1. Chat assistants (general-purpose)
The all-rounders: ChatGPT, Claude, Gemini, and open models (Llama, Qwen, DeepSeek, Kimi) you can self-host.
- **Good at:** drafting, explaining, brainstorming, summarizing, coding help, being a thinking partner.
- **Bad at:** anything needing *current* facts without web access; precise arithmetic; guaranteeing truth; remembering across sessions unless the product adds memory.
- **Choose by:** raw reasoning (frontier models), cost/speed (smaller/open models), privacy (local), or ecosystem.

## 2. Coding assistants
Two sub-shapes (per current developer reviews — [Faros AI, 2026](https://www.faros.ai/blog/best-ai-coding-agents-2026), [Qodo, 2026](https://www.qodo.ai/blog/best-ai-coding-assistant-tools/)):
- **In-editor autocomplete/chat** — GitHub Copilot, Cursor, JetBrains AI, Tabnine, Gemini Code Assist, Amazon Q. Fast, low-friction, small-to-medium edits in your flow.
- **Agentic / repo-level** — Claude Code, Cursor's agent, Aider, OpenAI Codex, Devin. Multi-file refactors, "implement this feature", spawning sub-agents. And **app builders** — Lovable, Replit Agent, v0 by Vercel — go prompt → deployed app.
- **The 2026 caveat everyone repeats:** these generate code *faster than teams can verify it*. Review discipline is now the bottleneck, not generation.

## 3. Research & writing assistants
Tools with live web access and source-tracking: ChatGPT/Gemini/Claude with search, Perplexity (answer-with-citations), NotebookLM (grounded in *your* documents), plus writing-specialized tools.
- **Good at:** synthesizing many sources, first drafts, literature scans, "explain this field".
- **Bad at:** being *trusted* without checking — citations can still be wrong or hallucinated; recency ≠ accuracy. Grounded tools (NotebookLM, Perplexity) reduce but don't eliminate this.

## 4. Image & video generation
- **Image** (per [current comparisons, 2026](https://www.gradually.ai/en/ai-image-models/)): Midjourney (aesthetic gold standard), FLUX.1/.2 (leading open-source, strong photorealism + typography), Stable Diffusion / SD 3.5+ (most customizable, biggest LoRA/fine-tune ecosystem), plus DALL·E and others in chat tools.
- **Video** (per [current comparisons, 2026](https://aiviewer.ai/guides/best-ai-video-generator-2026-sora-runway-veo-pika-and-kling-compared/)): Google Veo, Runway (Gen-3/4, editor-favorite motion control), Kling, Pika, Luma — with the field churning constantly (OpenAI's Sora, the category pioneer, has been winding down its consumer surfaces per recent reporting; verify status before relying on any one).
- **Good at:** concept art, mood boards, marketing visuals, storyboards, B-roll.
- **Bad at:** exact text-in-image (improving but historically weak), precise consistency across shots, anything requiring literal factual accuracy, hands/fine details occasionally. A widely-repeated pro workflow: open/local models to explore cheaply, closed premium models for final renders.

## 5. Automation agents
Tools that *act* — call APIs, browse, run code, chain steps toward a goal: agent frameworks and the "computer use" / browser-agent features in frontier products. The AI-agent market hit ~$7.6B in 2025 and is growing fast ([DataCamp, 2026](https://www.datacamp.com/blog/best-ai-agents)).
- **Good at:** repetitive multi-step digital tasks with clear success criteria and reversible actions.
- **Bad at:** open-ended judgment, irreversible/high-stakes actions without a human gate, anything where a confident wrong step is expensive. Reliability drops as step count grows (errors compound).

*Sources are cited so you can check currency; treat every product name as a snapshot, not a permanent fact.*
`,
        },
        {
          type: 'promptExercise',
          exercise: {
            id: 'c2-ex-categorize',
            title: 'Match tasks to categories',
            instructions: `
For EACH of these five real tasks, name which tool **category** (chat assistant / coding assistant /
research-writing / image-video / automation agent) you'd reach for, a current example tool, and — most
importantly — the **main risk** to watch with that choice:

1. "Refactor a 12-file Python module to use async."
2. "Produce a cited briefing on new EU AI regulations for my manager."
3. "Generate 6 hero-image options for a coffee brand landing page."
4. "Every morning, pull my unread newsletters and summarize them into one digest."
5. "Help me think through whether to take a new job offer."
`,
            rubric: `Score out of 100 (20 per task):
For each task, award full marks only if the learner (a) picks the correct/defensible category, (b) names a plausibly-current example tool, AND (c) states a REAL risk specific to that choice (e.g. #1: unreviewed multi-file changes; #2: hallucinated citations; #3: text-in-image/consistency; #4: compounding errors + acting on wrong summary; #5: no memory/over-trusting a fluent answer on a personal decision).
Half marks if category+tool right but risk is generic or missing. Zero for a task if the category is wrong.
Do not reward name-dropping without the risk analysis — the risk is the point.`,
            placeholder: '1. Refactor 12-file module: Coding assistant (agentic) — e.g. Claude Code / Cursor agent. Risk: it can touch all 12 files faster than I can review; ...',
            difficulty: 2,
          },
        },
      ],
    },
    {
      id: 'strengths-weaknesses-checkpoint',
      title: 'Reading a Tool Honestly',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: `
# Evaluating Any AI Tool (Even Ones That Don't Exist Yet)

Product names churn; a good evaluation framework doesn't. Before trusting a tool with real work, answer:

**Capability & fit**
- What is it *actually* optimized for (vs. its marketing)? A tool great at brainstorming may be mediocre at precise extraction.
- What's the failure mode, and how *visible* is it? A coding tool that writes obviously-broken code is safer than one that writes subtly-broken code.

**Trust & verification**
- Can I verify its output, and how expensive is that? (Cheap to verify → safe to use aggressively. Expensive → use cautiously.)
- Does it show its sources / reasoning, or is it a black box?
- What happens when it's *confidently wrong* — who catches it, and before or after damage?

**Data & privacy**
- Where does my input go? Is it trained on? Retained? For proprietary/personal data this can be disqualifying regardless of quality — the exact tradeoff you'll quantify in module 4.

**Cost & lock-in**
- Per-use cost at my real volume (not the demo)?
- How hard to switch later? Proprietary formats, workflow entanglement, and prompt-tuning to one model's quirks are all lock-in.

## The meta-skill: calibrated trust

The entire game is **matching your trust level to the tool's actual reliability on *this* task** — not its reliability in general, not the demo, not the hype. Same tool, different tasks, different appropriate trust:

- ChatGPT summarizing an article you'll skim → trust freely, low stakes, easy to spot-check.
- ChatGPT stating a drug interaction → verify every word against a real source.

Over-trust ships hallucinations to your boss. Under-trust means you hand-do work the tool would nail, wasting the leverage. **Calibrated skepticism** — high scrutiny where it's cheap-to-be-wrong-about-being-wrong, low where errors are cheap and visible — is the whole skill this course builds toward.

---

# 🏁 Module 3 Checkpoint
`,
        },
        {
          type: 'promptExercise',
          exercise: {
            id: 'c2-checkpoint-3',
            title: 'Checkpoint: evaluate a tool for a real decision',
            instructions: `
Pick a real task you actually do (work or personal). Then write a short **tool-evaluation memo**
(200–400 words) deciding whether and how to use AI for it. Your memo must:

1. State the task and the stakes (what happens if the output is wrong?)
2. Name the tool category and a specific current tool you'd try
3. Work through **capability fit, verification cost, and data/privacy** for your case
4. Land on a concrete recommendation: use it fully / use it with a specific human check / don't use it — and WHY
5. State the trust level you'd extend and how you'd verify

The point is calibrated judgment, not enthusiasm.
`,
            rubric: `Score out of 100:
- Task & stakes clarity (20): concrete task; honest about consequences of a wrong output
- Tool selection (15): sensible category + current example
- Multi-axis evaluation (30): genuinely reasons through capability fit AND verification cost AND data/privacy for THIS task (not generic pros/cons)
- Calibrated recommendation (25): a specific decision matched to the stakes, with an explicit verification/human-check plan; over-trust or under-trust is called out if present
- Honesty (10): acknowledges the tool's failure mode rather than hand-waving it
Penalize: pure hype ("it's amazing, use it"), ignoring privacy for sensitive data, or a recommendation that doesn't match the stated stakes.`,
            placeholder: 'Task: Drafting first-pass responses to customer support tickets. Stakes: a wrong/rude reply damages a real relationship...\n\nTool: ...\nCapability fit: ...\nVerification cost: ...\nData/privacy: ...\nRecommendation: ...',
            difficulty: 3,
          },
        },
      ],
    },
  ],
}
