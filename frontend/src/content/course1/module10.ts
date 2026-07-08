import type { Module } from '../types'

export const module10: Module = {
  id: 'm10-running-models',
  title: 'Running Models',
  summary: 'Hosted APIs via Python SDKs, local models with Ollama and llama.cpp, and quantization.',
  lessons: [
    {
      id: 'hosted-apis',
      title: 'Hosted APIs from Python',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# Calling Hosted Models

Every provider ships a Python SDK, and they share one conceptual shape: **client → messages in → completion out**. Two dialects dominate.

## The OpenAI-compatible dialect

OpenAI's API shape became a de-facto standard. Groq, OpenRouter, DeepSeek, Moonshot, MiniMax, Zhipu, and even local Ollama all expose OpenAI-compatible endpoints, so the *same SDK* covers them by swapping \`base_url\`:

\`\`\`python
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
# Same code, different vendor:
# client = OpenAI(api_key=..., base_url="https://api.deepseek.com/v1")
# client = OpenAI(api_key=..., base_url="https://api.groq.com/openai/v1")
# client = OpenAI(api_key="unused", base_url="http://localhost:11434/v1")  # Ollama!

resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are terse."},
        {"role": "user", "content": "Why is the sky blue?"},
    ],
    max_tokens=200,
)
print(resp.choices[0].message.content)
\`\`\`

## The Anthropic dialect

\`\`\`python
import anthropic

client = anthropic.Anthropic()   # reads ANTHROPIC_API_KEY from env
resp = client.messages.create(
    model="claude-sonnet-5",
    max_tokens=1024,
    system="You are terse.",                      # system is a top-level field
    messages=[{"role": "user", "content": "Why is the sky blue?"}],
)
print(resp.content[0].text)                        # content is a list of blocks
\`\`\`

Same ideas, different shapes: system prompt placement, response structure (\`choices[0].message.content\` vs \`content[0].text\`), and header names differ. Google's \`google-genai\` SDK is a third dialect. This is exactly why this app's backend defines one \`LLMProvider\` interface with a thin adapter per vendor — the pattern to copy in your own projects.

## Streaming & the knobs that matter

All providers support **streaming** (tokens arrive as generated — the difference between a 20-second blank stare and instant feedback). The parameters you'll actually tune:

| Param | Effect |
|---|---|
| \`max_tokens\` | hard output cap — also caps your bill |
| \`temperature\` | module 6's softmax temperature: 0 ≈ deterministic, higher = more varied |
| \`system\` prompt | standing instructions, separate from user input |

And the failure modes you must code for (module 5!): **401** bad key, **429** rate limit (back off and retry), **5xx** provider outage (retry with exponential backoff), network timeouts. The retry decorator you wrote in module 4's checkpoint is production-relevant verbatim.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-hosted',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'Why can one OpenAI SDK client talk to Groq, DeepSeek, and Ollama?',
                choices: [
                  'They secretly run OpenAI models',
                  'They expose OpenAI-compatible endpoints, so only `base_url` (and key) changes',
                  'The SDK translates protocols automatically per vendor',
                  'It can’t — each needs its own SDK',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'In Anthropic’s API, the system prompt goes…',
                choices: [
                  'as the first message with role "system"',
                  'in a top-level `system` field, separate from `messages`',
                  'in the URL',
                  'Anthropic does not support system prompts',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'Your batch job hits HTTP 429 mid-run. The correct response is…',
                choices: [
                  'switch API keys and continue immediately',
                  'wait (ideally with exponential backoff) and retry',
                  'treat it as success with empty output',
                  'reduce max_tokens to 1',
                ],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'Streaming responses primarily improve…',
                choices: ['total generation speed', 'perceived latency — users see tokens immediately', 'model accuracy', 'cost'],
                answerIndex: 1,
                difficulty: 2,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-adapter',
            title: 'Build a provider adapter (the pattern this app uses)',
            instructions: String.raw`
No network in this sandbox — so we exercise the *pattern*. You get two fake vendor SDKs with
different response shapes. Write a unified adapter:

\`unified_chat(vendor, prompt)\` →
- if vendor == "openai_like": call \`openai_like_api(prompt)\` and extract the text from
  \`resp["choices"][0]["message"]["content"]\`
- if vendor == "anthropic_like": call \`anthropic_like_api(prompt)\` and extract from
  \`resp["content"][0]["text"]\`
- any other vendor: raise \`ValueError\`

Both fakes are defined for you in the starter code.
`,
            starterCode: `def openai_like_api(prompt):
    return {"choices": [{"message": {"content": f"[openai] {prompt}"}}]}

def anthropic_like_api(prompt):
    return {"content": [{"type": "text", "text": f"[anthropic] {prompt}"}]}

def unified_chat(vendor, prompt):
    ...
`,
            tests: [
              { name: 'openai shape', code: 'assert unified_chat("openai_like", "hi") == "[openai] hi"' },
              { name: 'anthropic shape', code: 'assert unified_chat("anthropic_like", "hi") == "[anthropic] hi"' },
              {
                name: 'unknown vendor raises',
                code: 'try:\n    unified_chat("mystery", "hi")\n    assert False\nexcept ValueError:\n    pass',
              },
            ],
            difficulty: 2,
          },
        },
      ],
    },
    {
      id: 'local-models-checkpoint',
      title: 'Local Models & Quantization',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# Running Models on Your Own Machine

## Ollama — the easy path

Ollama wraps model download, quantization, and serving into one tool:

\`\`\`bash
ollama pull llama3.2        # fetch a quantized model
ollama run llama3.2         # chat in the terminal
ollama serve                # HTTP server on :11434
\`\`\`

From Python, either the official \`ollama\` library or — because Ollama exposes an OpenAI-compatible endpoint — the same OpenAI SDK you already know:

\`\`\`python
import ollama
resp = ollama.chat(model="llama3.2", messages=[{"role": "user", "content": "hi"}])
print(resp["message"]["content"])
\`\`\`

(This app's Ollama provider does exactly this over HTTP — pick it in Settings and everything runs free and offline.)

## llama.cpp — the layer below

Ollama is built on **llama.cpp**, a C/C++ inference engine that runs transformers on CPUs and consumer GPUs using the **GGUF** file format. Use it directly (via \`llama-cpp-python\`) when you need fine control — custom sampling, grammars, exact memory mapping:

\`\`\`python
from llama_cpp import Llama
llm = Llama(model_path="llama-3.2-3b.Q4_K_M.gguf", n_ctx=8192)
out = llm.create_chat_completion(messages=[{"role": "user", "content": "hi"}])
\`\`\`

## Quantization — why a 7B model fits on your laptop

Weights train in 16-bit floats: 7B params × 2 bytes = **14 GB** — too big for most consumer GPUs. **Quantization** stores weights at lower precision:

| Precision | Bytes/param | 7B model | Quality |
|---|---|---|---|
| FP16 | 2 | ~14 GB | reference |
| INT8 (Q8) | 1 | ~7 GB | nearly indistinguishable |
| Q4 (e.g. Q4_K_M) | ~0.5 | ~4 GB | small, usually acceptable loss |

That \`Q4_K_M\` suffix in GGUF filenames is the quantization recipe. Rule of thumb: a bigger model at Q4 usually beats a smaller model at FP16 for the same memory. (Bonus connection: quantizing the *KV cache* is yet another answer to module 9's memory bottleneck.)

## Where Unsloth fits

[Unsloth](https://github.com/unslothai/unsloth) is an open-source library that optimizes **fine-tuning** (not inference) of open models — hand-written GPU kernels and memory optimizations that make LoRA/QLoRA training substantially faster and lighter than stock implementations, letting single consumer GPUs fine-tune 7B models. That's your bridge to module 11.

---

# 🏁 Module 10 Checkpoint
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-checkpoint-10',
            title: 'Checkpoint quiz',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'Roughly how much memory do the weights of a 7B model need at FP16 vs Q4?',
                choices: ['~28 GB vs ~14 GB', '~14 GB vs ~4 GB', '~7 GB vs ~7 GB', '~2 GB vs ~0.5 GB'],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'The relationship between Ollama and llama.cpp is…',
                choices: [
                  'competitors with incompatible formats',
                  'Ollama builds on llama.cpp, adding model management and an HTTP server',
                  'llama.cpp is Ollama’s cloud service',
                  'they are unrelated projects',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'GGUF is…',
                choices: [
                  'a Python package manager',
                  'the file format llama.cpp uses for (usually quantized) model weights',
                  'a GPU driver',
                  'an API protocol',
                ],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'Unsloth primarily accelerates…',
                choices: ['inference serving', 'fine-tuning (LoRA/QLoRA) of open models', 'tokenization', 'vector search'],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q5',
                prompt: 'Hosted API vs local model: which consideration most favors LOCAL?',
                choices: [
                  'zero setup effort',
                  'access to the largest frontier models',
                  'data never leaves your machine (privacy) and no per-token cost',
                  'automatic scaling under load',
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
            id: 'ex-checkpoint-10',
            title: 'Checkpoint: a model-memory calculator',
            instructions: String.raw`
Write \`fits_in_vram(n_params_b, quant, vram_gb, overhead_gb=1.5)\`:

- \`n_params_b\`: parameters in billions (float)
- \`quant\`: one of "fp16" (2 bytes/param), "q8" (1), "q4" (0.5) — anything else raises \`ValueError\`
- weights_gb = n_params_b × bytes_per_param (1 GB = 10⁹ bytes here, keep it simple)
- return the tuple \`(weights_gb, fits)\` where fits is whether weights_gb + overhead_gb ≤ vram_gb
`,
            starterCode: `def fits_in_vram(n_params_b, quant, vram_gb, overhead_gb=1.5):
    ...
`,
            tests: [
              { name: '7B fp16 needs 14GB weights', code: 'w, fits = fits_in_vram(7, "fp16", 16)\nassert w == 14.0 and fits is True' },
              { name: '7B fp16 does NOT fit in 8GB', code: 'w, fits = fits_in_vram(7, "fp16", 8)\nassert fits is False' },
              { name: '7B q4 fits in 8GB', code: 'w, fits = fits_in_vram(7, "q4", 8)\nassert w == 3.5 and fits is True' },
              {
                name: 'unknown quant raises',
                code: 'try:\n    fits_in_vram(7, "q2", 8)\n    assert False\nexcept ValueError:\n    pass',
              },
            ],
            difficulty: 2,
          },
        },
      ],
    },
  ],
}
