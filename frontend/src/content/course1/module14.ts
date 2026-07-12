import type { Module } from '../types'

export const module14: Module = {
  id: 'm14-provider-apis',
  title: 'Calling AI Providers from Python',
  summary:
    'The real Python SDKs for hosted and local models — client setup, chat, streaming, errors, and the differences that actually matter.',
  lessons: [
    {
      id: 'hosted-sdks',
      title: 'Hosted Provider SDKs',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# Talking to hosted models from Python

Every hosted provider ships a Python SDK. They rhyme, but they are **not**
identical — knowing the differences saves hours. Always read the current docs;
package names and default models move. As of now:

## OpenAI — \`pip install openai\`
~~~python
import os
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])  # never hard-code keys
resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "system", "content": "You are terse."},
              {"role": "user", "content": "Hello"}],
)
print(resp.choices[0].message.content)
~~~
**Streaming**: pass \`stream=True\` and iterate; each chunk carries a *delta*:
~~~python
for chunk in client.chat.completions.create(model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Count to 5"}], stream=True):
    piece = chunk.choices[0].delta.content or ""
    print(piece, end="", flush=True)
~~~

## Anthropic — \`pip install anthropic\`
Two real differences: \`system\` is a **top-level** argument (not a message), and
\`max_tokens\` is **required**. The reply is a list of content blocks.
~~~python
from anthropic import Anthropic
client = Anthropic()  # reads ANTHROPIC_API_KEY
msg = client.messages.create(
    model="claude-sonnet-4-5", max_tokens=1024,
    system="You are terse.",
    messages=[{"role": "user", "content": "Hello"}],
)
print(msg.content[0].text)
~~~
Streaming uses a context manager: \`with client.messages.stream(...) as s: for t in s.text_stream: ...\`

## Google Gemini — \`pip install google-genai\`
Use the **new** unified \`google-genai\` SDK (the old \`google-generativeai\` is
deprecated). Inputs are \`contents\`, and the system prompt is \`system_instruction\`.
~~~python
from google import genai
client = genai.Client()  # reads GOOGLE_API_KEY / GEMINI_API_KEY
resp = client.models.generate_content(model="gemini-2.0-flash", contents="Hello")
print(resp.text)
~~~

## OpenAI-wire-compatible providers
**Groq** (\`pip install groq\`), **xAI/Grok** (\`https://api.x.ai/v1\`), and
**Z.AI/Zhipu** all speak the OpenAI chat-completions shape. The easiest path is
often the \`openai\` client pointed at their base URL:
~~~python
client = OpenAI(base_url="https://api.x.ai/v1", api_key=os.environ["XAI_API_KEY"])
~~~
(Groq and Z.AI also publish their own SDKs — \`groq\`, \`zai-sdk\` — but the
OpenAI-compatible endpoint means you rarely need them.)

## Robustness — the same everywhere
- **Keys** come from environment variables, never source code or git.
- **Timeouts**: set one; hosted calls can hang.
- **Rate limits** return **HTTP 429** — back off (exponential) and retry a few times.
- **Errors**: wrap calls in \`try/except\` and surface a clear message.

## Honest limits
Not every provider exposes every feature. Streaming, tool-calling, structured
output, and vision vary by provider and model. Don't assume parity — check.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-hosted',
            title: 'Hosted SDK check',
            questions: [
              {
                kind: 'mcq',
                id: 'h1',
                prompt: 'In the **Anthropic** SDK, where does the system prompt go?',
                choices: [
                  'a top-level `system=` argument',
                  'a message with role "system"',
                  'the `contents` field',
                  'it is not supported',
                ],
                answerIndex: 0,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'h2',
                prompt: 'Which package is the **current** Google Gemini SDK?',
                choices: ['`google-genai`', '`google-generativeai`', '`gemini`', '`google-cloud-aiplatform`'],
                answerIndex: 0,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'h3',
                prompt: 'An HTTP **429** from a provider means…',
                choices: ['you are rate limited — back off and retry', 'the key is invalid', 'the model does not exist', 'the request succeeded'],
                answerIndex: 0,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'h4',
                prompt: 'The safest place to keep an API key is…',
                choices: ['an environment variable', 'a string literal in your script', 'a comment', 'the git history'],
                answerIndex: 0,
                difficulty: 1,
              },
            ],
          },
        },
        {
          type: 'md',
          md: 'When you **stream**, the model sends the answer in pieces. You accumulate those pieces so that if the user cancels mid-way, you still have the partial text. Practice that accumulation below — no SDK needed, we pass you the deltas.',
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-accumulate-stream',
            title: 'Accumulate a streamed response',
            instructions: String.raw`
When streaming, some chunks carry text and some carry \`None\` (e.g. the final
stop chunk). Implement \`accumulate_stream(deltas)\` that joins all the non-\`None\`
pieces, in order, into the full string.

Example: \`accumulate_stream(["He", "llo", None, " world"])\` → \`"Hello world"\`
`,
            starterCode: `def accumulate_stream(deltas):
    # join every non-None piece, in order
    ...
`,
            tests: [
              { name: 'joins pieces in order', code: 'assert accumulate_stream(["He", "llo", " world"]) == "Hello world"' },
              { name: 'skips None chunks', code: 'assert accumulate_stream(["a", None, "b", None]) == "ab"' },
              { name: 'empty stream', code: 'assert accumulate_stream([]) == ""' },
            ],
            requirements: { mustDefine: [{ name: 'accumulate_stream', minArgs: 1 }] },
            difficulty: 2,
          },
        },
        {
          type: 'promptExercise',
          exercise: {
            id: 'pe-provider-choice',
            title: 'Explain a provider difference',
            instructions:
              'In 3–5 sentences, explain to a beginner **one concrete way** the Anthropic Messages API differs from the OpenAI Chat Completions API, and why it matters when writing code.',
            rubric:
              'Full marks: names a real, specific difference (e.g. top-level system vs system message, required max_tokens, content blocks vs a single string) and explains the practical coding consequence. Deduct for vague or invented differences. Accuracy matters more than length.',
            placeholder: 'One real difference is…',
            difficulty: 2,
          },
        },
      ],
    },
    {
      id: 'local-inference',
      title: 'Local Inference: Ollama, llama.cpp & Transformers',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# Running models on your own machine

Local inference means **privacy** (data never leaves your machine) and **no
per-token cost** — traded against needing the hardware and getting quality
bounded by the model you can run.

## Ollama — \`pip install ollama\`
The friendliest option. Pull a model once (\`ollama pull llama3.2\`), then:
~~~python
import ollama
resp = ollama.chat(model="llama3.2",
                   messages=[{"role": "user", "content": "Hello"}])
print(resp["message"]["content"])

# streaming:
for chunk in ollama.chat(model="llama3.2",
        messages=[{"role": "user", "content": "Hi"}], stream=True):
    print(chunk["message"]["content"], end="")
~~~
Use \`ollama.Client(host=...)\` or \`ollama.AsyncClient(...)\` to point at a
non-default server. No API key. (This platform can connect to Ollama directly.)

## llama-cpp-python — \`pip install llama-cpp-python\`
Runs **GGUF-quantized** models on CPU (or GPU) — great on modest hardware.
~~~python
from llama_cpp import Llama
llm = Llama(model_path="model.gguf", n_ctx=4096)
out = llm.create_chat_completion(
    messages=[{"role": "user", "content": "Hello"}])
print(out["choices"][0]["message"]["content"])
~~~
It can also run an **OpenAI-compatible server**
(\`python -m llama_cpp.server --model model.gguf\`) — which is exactly how this
platform's "llama.cpp (local)" provider connects.

## Hugging Face Transformers — \`pip install transformers torch\`
The most powerful and the most demanding: it's a **library**, not a hosted API,
and it downloads model weights (often gigabytes) to run locally.
~~~python
from transformers import pipeline
pipe = pipeline("text-generation", model="Qwen/Qwen2.5-0.5B-Instruct")
print(pipe("Hello", max_new_tokens=50)[0]["generated_text"])
~~~
For token-by-token streaming you use a \`TextIteratorStreamer\` on a background
thread. Big models need a GPU and lots of VRAM — pick a size your machine can
actually hold.

## Choosing
- **Ollama**: easiest local start.
- **llama.cpp**: run quantized models efficiently on CPU / modest GPUs.
- **Transformers**: full control, research, fine-tuned weights — if you have the hardware.

Local models are genuinely capable now, but a small local model will not match a
frontier hosted model on hard reasoning. Match the tool to the task.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-local',
            title: 'Local inference check',
            questions: [
              {
                kind: 'mcq',
                id: 'l1',
                prompt: 'llama-cpp-python runs models in which format, designed to be efficient on CPU?',
                choices: ['GGUF (quantized)', 'ONNX only', 'raw PyTorch checkpoints', 'CSV'],
                answerIndex: 0,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'l2',
                prompt: 'Compared with a hosted API, running a model locally mainly gives you…',
                choices: [
                  'privacy and no per-token cost',
                  'guaranteed higher quality',
                  'zero hardware requirements',
                  'an unlimited context window',
                ],
                answerIndex: 0,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'l3',
                prompt: 'Hugging Face **Transformers** is best described as…',
                choices: [
                  'a local inference/training library that downloads weights',
                  'a hosted API you call with a key',
                  'a vector database',
                  'a prompt-testing website',
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
            id: 'ex-make-messages',
            title: 'Build a messages list',
            instructions: String.raw`
Most chat SDKs (OpenAI, Groq, Ollama, llama.cpp) take the same \`messages\`
shape. Implement \`make_messages(system, user)\` that returns:

\`[{"role": "system", "content": system}, {"role": "user", "content": user}]\`
`,
            starterCode: `def make_messages(system, user):
    # return the standard two-message chat list
    ...
`,
            tests: [
              {
                name: 'builds system + user messages',
                code: 'assert make_messages("be terse", "hi") == [{"role": "system", "content": "be terse"}, {"role": "user", "content": "hi"}]',
              },
            ],
            requirements: { mustDefine: [{ name: 'make_messages', minArgs: 2 }] },
            difficulty: 1,
          },
        },
      ],
    },
    {
      id: 'provider-agnostic-checkpoint',
      title: 'Checkpoint: One Interface, Many Providers',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# One interface, many providers

Because most providers share the \`messages\` shape, you can write **one**
function and swap providers behind it — hosted for quality, local for privacy.
That's exactly the pattern this platform's backend uses: a single
\`LLMProvider\` interface with one small adapter per vendor.

The judgment call — **hosted vs local** — comes down to four axes:

- **Latency**: local can be faster (no network) or slower (weak hardware).
- **Cost**: local is free per token; hosted bills per token.
- **Privacy**: local keeps data on your machine.
- **Quality/hardware**: frontier quality needs hosted or serious local hardware.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-checkpoint-14',
            title: 'Checkpoint quiz',
            questions: [
              {
                kind: 'mcq',
                id: 'c1',
                prompt: 'Why can one wrapper function serve OpenAI, Groq, and Ollama with little change?',
                choices: [
                  'they share the `messages` list shape',
                  'they use the same API key',
                  'they run on the same server',
                  'they return identical model names',
                ],
                answerIndex: 0,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'c2',
                prompt: 'You must process sensitive medical notes with zero data leaving the building. Best choice?',
                choices: ['a local model (Ollama / llama.cpp)', 'the cheapest hosted API', 'whichever has the biggest context', 'a random provider'],
                answerIndex: 0,
                difficulty: 2,
              },
            ],
          },
        },
        {
          type: 'promptExercise',
          exercise: {
            id: 'pe-hosted-vs-local',
            title: 'Checkpoint: make the call',
            instructions:
              'A startup is building a coding assistant for enterprise customers who are strict about data privacy but also expect strong quality. In 4–6 sentences, recommend hosted, local, or a hybrid approach, and justify it using at least two of: latency, cost, privacy, quality/hardware.',
            rubric:
              'Full marks: gives a clear recommendation and justifies it with at least two of the four axes (latency, cost, privacy, quality/hardware), acknowledging the privacy/quality tension (e.g. a hybrid: local for sensitive data, hosted for hard tasks). Deduct for a one-sided answer that ignores the stated privacy constraint or the quality expectation.',
            placeholder: 'I would recommend…',
            difficulty: 3,
          },
        },
      ],
    },
  ],
}
