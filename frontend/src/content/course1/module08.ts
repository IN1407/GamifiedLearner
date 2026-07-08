import type { Module } from '../types'

export const module08: Module = {
  id: 'm08-transformers',
  title: 'Transformers in Depth',
  summary: 'Tokenization, embeddings, positional encoding, self-attention, multi-head, KV cache, and the full block.',
  lessons: [
    {
      id: 'tokens-embeddings',
      title: 'Tokenization, Embeddings & Positions',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# From Text to Vectors

## Tokenization

Models don't see characters or words — they see **tokens**: chunks from a fixed vocabulary (~50k–150k entries) learned by algorithms like BPE (byte-pair encoding), which repeatedly merges the most frequent character pairs. Common words become single tokens ("the"), rare words split ("tokenization" → "token" + "ization").

\`\`\`text
"GamifiedLearner rocks!"  →  ["G", "am", "ified", "Learner", " rocks", "!"]  →  [38, 321, 7723, 47084, 12351, 0]
\`\`\`

Consequences you'll feel in practice:
- **Pricing & context limits are in tokens**, not words (English ≈ 0.75 words/token).
- Character-level questions ("how many r's in strawberry?") are genuinely hard for models — they never see the letters, only token IDs.
- Numbers tokenize weirdly, which is one reason arithmetic is brittle.

## Embeddings

Each token ID indexes a row in the **embedding matrix** $E \in \mathbb{R}^{V \times d}$ ($V$ = vocab size, $d$ = model width, e.g. 4096). That row — a learned vector — becomes the token's representation. During training, tokens used in similar contexts drift toward similar vectors: the famous $\text{king} - \text{man} + \text{woman} \approx \text{queen}$ arithmetic emerges without anyone programming it.

## Positional encoding

Attention (next lesson) is a *set* operation — it has no built-in notion of word order. "dog bites man" and "man bites dog" would look identical. So position must be injected explicitly:

- **Sinusoidal** (original 2017 transformer): add fixed sin/cos waves of different frequencies to each embedding — position becomes a pattern the model can read off.
- **Learned absolute**: just learn a vector per position (GPT-2).
- **RoPE (rotary)**: *rotate* each query/key vector by an angle proportional to its position; the dot product between two rotated vectors then depends on their **relative** distance. This is the modern default (Llama, Qwen, DeepSeek).

The idea to keep: **embedding = what the token means; positional encoding = where it sits.** The model needs both.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-tokens',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'Why do LLMs struggle to count letters inside a word?',
                choices: [
                  'Letters are filtered out during training',
                  'The model sees token IDs, not characters — the letters aren’t in its input',
                  'Counting requires a calculator tool',
                  'They don’t — letter counting is easy for LLMs',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Without positional encoding, a transformer treats its input as…',
                choices: ['a reversed sequence', 'an unordered set of tokens', 'a single merged token', 'characters'],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'An embedding matrix for a 100k vocabulary with model width 4096 has shape…',
                choices: ['$(4096, 4096)$', '$(100000, 4096)$', '$(100000, 100000)$', '$(4096, 100000)$ — always width first'],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'RoPE encodes position by…',
                choices: [
                  'appending the position number as an extra dimension',
                  'rotating query/key vectors by position-dependent angles, making attention depend on relative distance',
                  'sorting tokens alphabetically',
                  'adding a learned vector per position to the output logits',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-bpe',
            title: 'Mini BPE: one merge step',
            instructions: String.raw`
Implement the heart of byte-pair encoding. Write \`most_frequent_pair(tokens)\` that takes a list
of string tokens and returns the most common **adjacent pair** as a tuple (ties: any winner is fine,
tests avoid ties), and \`merge_pair(tokens, pair)\` that returns a new list with every occurrence of
that adjacent pair fused into one token (left-to-right, non-overlapping).

\`\`\`python
most_frequent_pair(["a","b","a","b","c"])   # ("a","b")
merge_pair(["a","b","a","b","c"], ("a","b")) # ["ab","ab","c"]
\`\`\`
`,
            starterCode: `def most_frequent_pair(tokens):
    ...

def merge_pair(tokens, pair):
    ...
`,
            tests: [
              { name: 'finds the pair', code: 'assert most_frequent_pair(["a","b","a","b","c"]) == ("a","b")' },
              { name: 'merges non-overlapping', code: 'assert merge_pair(["a","b","a","b","c"], ("a","b")) == ["ab","ab","c"]' },
              { name: 'no match = unchanged', code: 'assert merge_pair(["x","y"], ("a","b")) == ["x","y"]' },
              {
                name: 'greedy left-to-right on aaa',
                code: 'assert merge_pair(["a","a","a"], ("a","a")) == ["aa","a"]',
              },
            ],
            difficulty: 3,
          },
        },
      ],
    },
    {
      id: 'attention',
      title: 'Self-Attention, For Real',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# Scaled Dot-Product Attention

Every token needs context. "bank" near "river" should mean something different than "bank" near "loan". **Self-attention** lets each token gather information from every other token, weighted by relevance.

Each token's vector $x$ is projected three ways with learned matrices:

$$q = W_Q x \qquad k = W_K x \qquad v = W_V x$$

Mental model — a soft database lookup:
- **Query**: what am I looking for?
- **Key**: what do I advertise about myself?
- **Value**: what content do I hand over if you attend to me?

Stack all tokens' vectors into matrices $Q, K, V$ and the whole thing is:

$$\text{Attention}(Q, K, V) = \text{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right)V$$

Read it inside-out — every factor is something you've already built in this course:

1. $QK^\top$ — **dot products** (module 6) between every query and every key: an $n \times n$ matrix of relevance scores.
2. $/\sqrt{d_k}$ — dot products of $d_k$-dimensional random-ish vectors have variance $\propto d_k$; unscaled, softmax saturates and its **gradient vanishes** (module 7). Dividing by $\sqrt{d_k}$ keeps scores in softmax's responsive zone. Toggle this in the widget below and watch it happen.
3. $\text{softmax}$ — each row becomes a **probability distribution** (module 6): attention weights.
4. $\cdots V$ — each token's new representation is the **weighted average of all values**.

For *causal* (decoder) models like GPT, a mask sets future positions to $-\infty$ before the softmax, so token 7 can only attend to tokens 1–7: you can't peek at words you haven't generated.

## Multi-head attention

One attention pattern per layer is too little. Split $d$ into $h$ **heads** (e.g. 32 heads × 128 dims), run attention independently in each subspace, concatenate, and mix with $W_O$:

$$\text{MultiHead}(X) = \text{Concat}(\text{head}_1, \ldots, \text{head}_h)\,W_O$$

Different heads reliably learn different jobs — some track syntax, some coreference ("her" → who?), some position. The model gets $h$ different "views" of the sequence for the same total compute.
`,
        },
        { type: 'viz', viz: 'attention', caption: 'Interactive: real softmax(q·kᵀ/√d) weights. Toggle the √d scaling off to see saturation.' },
        {
          type: 'quiz',
          quiz: {
            id: 'q-attention',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'In attention-as-lookup terms, the **key** vector represents…',
                choices: [
                  'what a token is searching for',
                  'what a token advertises about itself for others to match against',
                  'the token’s final output',
                  'the token’s position',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Why divide by $\\sqrt{d_k}$?',
                choices: [
                  'To keep the outputs summing to 1',
                  'Dot-product magnitude grows with dimension; unscaled scores saturate softmax and kill gradients',
                  'To make attention faster to compute',
                  'Historical accident with no functional effect',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'The causal mask in GPT-style models exists so that…',
                choices: [
                  'attention runs faster',
                  'a position cannot attend to future positions it hasn’t generated yet',
                  'padding tokens are ignored',
                  'the model can attend to images',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'For a sequence of $n$ tokens, the attention score matrix $QK^\\top$ has how many entries?',
                choices: ['$n$', '$2n$', '$n^2$', '$d_k$'],
                answerIndex: 2,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q5',
                prompt: 'Multi-head attention (vs. one big head) buys you…',
                choices: [
                  'strictly more compute per token',
                  'several independent attention patterns per layer — different “views” for similar compute',
                  'a longer context window',
                  'protection from hallucination',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-attention',
            title: 'Implement scaled dot-product attention',
            instructions: String.raw`
Pure Python, one query at a time. Write \`attention(q, keys, values)\`:

- \`q\`: list of floats (the query)
- \`keys\`: list of key vectors, \`values\`: list of value vectors (same count)
- scores$_i$ = dot(q, keys[i]) / sqrt(len(q))
- weights = softmax(scores)  — reuse the stable softmax you wrote in module 6
- return the weighted sum of value vectors (a list)
`,
            starterCode: `import math

def softmax(xs):
    m = max(xs)
    exps = [math.exp(x - m) for x in xs]
    s = sum(exps)
    return [e / s for e in exps]

def attention(q, keys, values):
    ...
`,
            tests: [
              {
                name: 'attends to the matching key',
                code: 'out = attention([10.0, 0.0], [[10.0, 0.0], [0.0, 10.0]], [[1.0, 0.0], [0.0, 1.0]])\nassert out[0] > 0.99 and out[1] < 0.01',
              },
              {
                name: 'uniform when keys identical',
                code: 'out = attention([1.0], [[2.0], [2.0]], [[0.0], [10.0]])\nassert abs(out[0] - 5.0) < 1e-9',
              },
              {
                name: 'output dimension = value dimension',
                code: 'out = attention([1.0, 2.0], [[1.0, 0.0]], [[3.0, 4.0, 5.0]])\nassert out == [3.0, 4.0, 5.0]',
              },
            ],
            difficulty: 3,
          },
        },
      ],
    },
    {
      id: 'kv-block-checkpoint',
      title: 'KV Cache, LayerNorm & the Full Block',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# The KV Cache

Generation is **autoregressive**: predict a token, append it, predict again. Naively, each new token would recompute attention over the whole prefix — re-projecting every earlier token's $K$ and $V$ from scratch, making step $t$ cost $O(t)$ redundant work that was already done at steps $1..t-1$.

The fix: earlier tokens' keys and values **never change** (causal masking means they can't see the new token). So cache them. Each step then computes $q, k, v$ only for the *new* token, appends $k, v$ to the cache, and attends against the cached matrices.

**The tradeoff — compute for memory.** Cache size per token is
$$2 \times n_{\text{layers}} \times n_{\text{heads}} \times d_{\text{head}} \times \text{bytes}$$
For a Llama-2-7B-shaped model (32 layers, 32 heads, $d_{head}=128$, fp16) that's $2 \cdot 32 \cdot 32 \cdot 128 \cdot 2$ bytes ≈ **512 KB per token** — about 16 GB for a 32k-token context, *before* you even load the weights. This is why long context is expensive, why serving providers obsess over batch sizes, and — as you'll see next module — why DeepSeek, MiniMax, and Moonshot all attacked exactly this bottleneck from different angles.

# LayerNorm & Residual Connections

Two unglamorous components make deep transformers trainable:

**Layer normalization** re-standardizes each token's vector to mean 0, variance 1, then applies a learned scale and shift:
$$\text{LN}(x) = \gamma \odot \frac{x - \mu}{\sigma} + \beta$$
Without it, activations drift in scale layer after layer and training destabilizes. (Modern models mostly use the simpler RMSNorm — scale only, no mean subtraction.)

**Residual connections** add each sublayer's *input* to its output: $x \leftarrow x + \text{Sublayer}(x)$. Remember vanishing gradients (module 7)? The residual path is an identity highway — gradients flow straight through the additions, untouched by the multiplications inside the sublayers. Residuals are the reason 100-layer transformers train at all.

# The Full Transformer Block

$$\begin{aligned} x &\leftarrow x + \text{MultiHeadAttention}(\text{Norm}(x)) \\ x &\leftarrow x + \text{MLP}(\text{Norm}(x)) \end{aligned}$$

\`\`\`text
input x ──┬─▶ Norm ─▶ Multi-Head Attention ─▶ + ──┬─▶ Norm ─▶ MLP ─▶ + ──▶ output
          └───────────────(residual)──────────────┘──────(residual)───┘
\`\`\`

- **Attention** mixes information *across tokens* (the only place tokens interact!).
- The **MLP** (two linear layers with GELU between, hidden dim ≈ 4×d) processes each token *independently* — most of the parameters live here.
- Stack this block $N$ times (32× for 7B models, ~100+× for frontier models), put the token+position embedding at the bottom and a final projection back to vocabulary logits at the top, softmax → next-token distribution. **That is the entire GPT architecture.** Everything you've built in modules 6–8 — dot products, softmax, gradients, attention — assembles into this.

---

# 🏁 Module 8 Checkpoint
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-checkpoint-8',
            title: 'Checkpoint quiz',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'The KV cache stores…',
                choices: [
                  'the model weights in compressed form',
                  'each already-processed token’s key and value vectors, per layer and head',
                  'the tokenizer vocabulary',
                  'previous conversations',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Why can keys/values of earlier tokens be cached without ever updating them?',
                choices: [
                  'They are rounded to integers',
                  'Causal masking means earlier tokens never see later ones, so their K/V never change',
                  'The cache recomputes them in the background',
                  'They can’t — the cache is approximate',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'The KV cache trades…',
                choices: ['accuracy for speed', 'memory for compute — store K/V instead of recomputing them', 'context length for quality', 'training time for inference time'],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'Residual connections help deep networks train because…',
                choices: [
                  'they add more parameters',
                  'gradients can flow through the identity path without shrinking through every sublayer',
                  'they normalize activations to variance 1',
                  'they prevent overfitting',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
              {
                kind: 'mcq',
                id: 'q5',
                prompt: 'In a transformer block, which component is the ONLY place tokens exchange information?',
                choices: ['the MLP', 'LayerNorm', 'attention', 'the embedding layer'],
                answerIndex: 2,
                difficulty: 2,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-checkpoint-8',
            title: 'Checkpoint: simulate a KV cache',
            instructions: String.raw`
Build the bookkeeping of autoregressive decoding. Write a class \`KVCache\`:

- \`__init__(self)\`: empty lists \`self.keys\`, \`self.values\`
- \`step(self, k, v)\`: append this step's key/value, then return the pair
  \`(len(self.keys), naive_ops)\` where \`naive_ops\` is the number of K/V projections a
  cache-less implementation would have computed **in total** after this many steps
  (step 1: 1, step 2: 1+2=3, step 3: 6 … i.e. the running triangular sum) —
  while the cached version only ever computed \`len(self.keys)\`.

This makes the O(n²) vs O(n) difference concrete.
`,
            starterCode: `class KVCache:
    def __init__(self):
        self.keys = []
        self.values = []

    def step(self, k, v):
        ...
`,
            tests: [
              {
                name: 'cache grows by one per step',
                code: 'c = KVCache()\nc.step([1], [1])\nn, _ = c.step([2], [2])\nassert n == 2 and c.keys == [[1],[2]]',
              },
              {
                name: 'naive ops are triangular',
                code: 'c = KVCache()\nassert c.step([0],[0])[1] == 1\nassert c.step([0],[0])[1] == 3\nassert c.step([0],[0])[1] == 6\nassert c.step([0],[0])[1] == 10',
              },
              {
                name: 'values stored too',
                code: 'c = KVCache()\nc.step([1,2],[3,4])\nassert c.values == [[3,4]]',
              },
            ],
            difficulty: 2,
          },
        },
      ],
    },
  ],
}
