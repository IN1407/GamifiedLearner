import type { Module } from '../types'

export const module09: Module = {
  id: 'm09-efficient-attention',
  title: 'Efficient Attention & Modern Optimizations',
  summary: 'Why the KV cache became THE bottleneck, and how DeepSeek (MLA + MoE), MiniMax (lightning attention), and Moonshot (Kimi K2) attacked it — with primary sources.',
  lessons: [
    {
      id: 'mla-moe',
      title: "DeepSeek: Multi-Head Latent Attention & MoE",
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# The Bottleneck, Named

From module 8: vanilla multi-head attention (MHA) caches **every head's full key and value vector for every token in every layer**. Per-token cache ≈ $2 \cdot n_{layers} \cdot n_{heads} \cdot d_{head}$ values. At 32k–128k context this dwarfs everything else in GPU memory, capping batch size — and batch size *is* serving throughput. Two earlier industry mitigations set the stage:

- **MQA** (multi-query attention): all query heads share ONE key/value head — cache shrinks ~$n_{heads}\times$, quality suffers.
- **GQA** (grouped-query attention): groups of query heads share K/V heads — the middle ground used by Llama-2-70B and many others ([Ainslie et al., 2023, arXiv:2305.13245](https://arxiv.org/abs/2305.13245)).

Both trade quality for memory by *deleting* K/V diversity. DeepSeek's bet was different: keep the diversity, **compress** it.

# Multi-Head Latent Attention (MLA)

Introduced in **DeepSeek-V2** ([DeepSeek-AI, 2024, arXiv:2405.04434](https://arxiv.org/abs/2405.04434)). Core idea: instead of caching each head's keys and values, learn a **low-rank joint compression** — project each token's hidden state down into a small shared **latent vector** $c^{KV}$, cache only that, and reconstruct per-head keys and values from it with learned up-projection matrices when needed:

$$c^{KV}_t = W^{DKV} h_t \qquad k^C_t = W^{UK} c^{KV}_t, \quad v^C_t = W^{UV} c^{KV}_t$$

where $c^{KV}_t$ has dimension $d_c \ll n_{heads} \cdot d_{head}$. (A separate small rotary-position component is carried alongside, because RoPE can't be folded into the low-rank reconstruction — see §2.1.2 of the paper.) This is module 6's low-rank factorization idea, deployed at trillion-token scale.

**Reported results** (from the paper's abstract and §1): compared with DeepSeek 67B (a standard MHA model), DeepSeek-V2 **reduces the KV cache by 93.3%** and **boosts maximum generation throughput to 5.76×**, while achieving *stronger* performance — the paper argues MLA outperforms MHA, not just approximates it. Each query head still gets its own effective K/V (reconstructed from the latent), so head diversity survives; what's stored is the compressed latent.

The design stuck: DeepSeek-V3 kept MLA ([arXiv:2412.19437](https://arxiv.org/abs/2412.19437)), and — as the next lesson shows — even a competitor adopted it.

# DeepSeekMoE: sparse experts, finer-grained

The same models pair MLA with **DeepSeekMoE** (introduced in [arXiv:2401.06066](https://arxiv.org/abs/2401.06066), used in V2/V3). A **Mixture-of-Experts** layer replaces the transformer block's single MLP with many expert MLPs plus a **router** that sends each token to a few of them — so total parameters grow huge while per-token compute stays small. DeepSeek-V2: 236B total, **21B activated per token**; DeepSeek-V3: 671B total, **37B activated** (per each paper's abstract).

DeepSeekMoE's two distinctive routing/architecture choices:

1. **Fine-grained expert segmentation** — slice experts smaller and activate more of them, so token→expert combinations multiply and experts specialize more sharply (2401.06066, §3.1).
2. **Shared experts** — a few experts every token always passes through, absorbing common knowledge so routed experts don't all redundantly learn it (§3.2).

DeepSeek-V3 added an **auxiliary-loss-free load-balancing strategy** (2412.19437, §2.1.2): instead of an extra loss term nudging the router toward balanced expert usage (which distorts gradients and hurts quality), it adjusts per-expert bias terms dynamically to keep load even.

**Why it matters for the KV-cache story:** MoE cuts *compute* per token; MLA cuts *memory* per token. Serving cost has both terms, and DeepSeek attacked both at once — that combination is the headline of the V2 paper's title ("Economical and Efficient").
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-mla',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'How does MLA differ from GQA/MQA in its approach to shrinking the KV cache?',
                choices: [
                  'It deletes more K/V heads than MQA',
                  'It compresses K/V into a learned low-rank latent vector and reconstructs per-head K/V from it, rather than sharing/deleting heads',
                  'It quantizes the cache to 4-bit',
                  'It shortens the context window',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Per the DeepSeek-V2 paper (arXiv:2405.04434), MLA reduced the KV cache relative to DeepSeek 67B by…',
                choices: ['about 50%', 'about 75%', '93.3%', '99.9%'],
                answerIndex: 2,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'In an MoE layer, the router’s job is to…',
                choices: [
                  'compress the KV cache',
                  'select which few experts process each token',
                  'order the experts by size',
                  'merge experts after training',
                ],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'DeepSeekMoE’s "shared experts" exist to…',
                choices: [
                  'serve as backups when routed experts fail',
                  'absorb common knowledge every token needs, so routed experts can specialize',
                  'reduce the vocabulary size',
                  'store the KV cache',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
              {
                kind: 'mcq',
                id: 'q5',
                prompt: 'MoE reduces ______ per token; MLA reduces ______ per token.',
                choices: ['memory / compute', 'compute / memory', 'latency / accuracy', 'parameters / tokens'],
                answerIndex: 1,
                difficulty: 2,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-kv-math',
            title: 'KV-cache arithmetic: MHA vs GQA vs MLA-style',
            instructions: String.raw`
Make the memory numbers concrete. Write three functions returning **bytes per token** of KV cache:

- \`kv_mha(layers, heads, d_head, bytes_per_val)\` = 2 · layers · heads · d_head · bytes_per_val
- \`kv_gqa(layers, kv_heads, d_head, bytes_per_val)\` = same formula but with the (smaller) number of K/V heads
- \`kv_latent(layers, d_latent, bytes_per_val)\` = layers · d_latent · bytes_per_val
  (one shared latent per token per layer instead of 2·heads·d_head values — the MLA idea in
  simplified form; the real model also carries a small RoPE component we ignore here)

Then \`context_gb(bytes_per_token, n_tokens)\` → total gigabytes (divide by 1024³), rounded to 2 decimals.
`,
            starterCode: `def kv_mha(layers, heads, d_head, bytes_per_val):
    ...

def kv_gqa(layers, kv_heads, d_head, bytes_per_val):
    ...

def kv_latent(layers, d_latent, bytes_per_val):
    ...

def context_gb(bytes_per_token, n_tokens):
    ...
`,
            tests: [
              {
                name: 'MHA: llama-7b-ish = 512KB/token',
                code: 'assert kv_mha(32, 32, 128, 2) == 524288',
              },
              {
                name: 'GQA with 8 kv-heads = 4x smaller',
                code: 'assert kv_gqa(32, 8, 128, 2) == 131072',
              },
              {
                name: 'latent d=512 is far smaller still',
                code: 'assert kv_latent(32, 512, 2) == 32768',
              },
              {
                name: '32k context in GB (MHA)',
                code: 'assert context_gb(524288, 32768) == 16.0',
              },
            ],
            difficulty: 2,
          },
        },
      ],
    },
    {
      id: 'linear-attention-checkpoint',
      title: 'MiniMax Lightning Attention & Kimi K2',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# MiniMax: Attack the O(n²) Itself

DeepSeek compressed what gets cached. MiniMax went after the deeper cost: softmax attention is **quadratic** — the $QK^\top$ matrix has $n^2$ entries, so 4M-token contexts are hopeless for vanilla attention no matter how well you compress the cache.

**Linear attention** (a research lineage going back to [Katharopoulos et al., 2020, arXiv:2006.16236](https://arxiv.org/abs/2006.16236)) removes the softmax. Without it, associativity lets you regroup:

$$\underbrace{(QK^\top)V}_{O(n^2)} \;=\; \underbrace{Q(K^\top V)}_{O(n)}$$

$K^\top V$ is a small $d \times d$ matrix — a fixed-size running **state** you update token by token, like an RNN. Consequences: compute linear in sequence length, and the "KV cache" becomes **constant-size** regardless of context. The historical catch: pure linear attention underperforms softmax attention on recall-heavy tasks, and naive implementations of the causal version are slow on GPUs.

**MiniMax-01** ([MiniMax, 2025, arXiv:2501.08313](https://arxiv.org/abs/2501.08313), "Scaling Foundation Models with Lightning Attention") is the first *frontier-scale* deployment of this idea. Per the paper:

- **Lightning attention** is an I/O-aware implementation of a linear-attention variant (TransNormer lineage) — tiled to fit GPU memory hierarchies, sidestepping the slow cumulative-sum operation of naive causal linear attention.
- The architecture is a **hybrid**: one softmax-attention transformer block after every **seven** lightning-attention blocks — keeping a slice of exact attention for the recall abilities pure linear attention lacks, while paying quadratic cost on only ⅛ of layers.
- Scale: **456B parameters, 45.9B activated per token** (MoE with 32 experts), trained with context up to **1M tokens** and inference extrapolation to **4M tokens** — the long-context headroom is exactly what the linear layers buy.

The follow-up reasoning model **MiniMax-M1** ([arXiv:2506.13585](https://arxiv.org/abs/2506.13585)) keeps the hybrid-lightning design and markets the same advantage: test-time compute (long chains of thought) is much cheaper when attention doesn't blow up quadratically.

# Moonshot's Kimi K2: a different bet entirely

**Kimi K2** ([Kimi Team, 2025, arXiv:2507.20534](https://arxiv.org/abs/2507.20534)) is instructive precisely because Moonshot *didn't* invent a new attention mechanism. Per the technical report:

- K2 is a **1.04-trillion-parameter MoE with 32B activated**, and its attention is **MLA — the DeepSeek design** (the report describes the architecture as similar to DeepSeek-V3). When a direct competitor adopts your mechanism, that's the field voting.
- Where they pushed instead: **sparsity scaling** — their scaling-law analysis found more, smaller experts kept helping, so K2 uses **384 experts** vs. V3's 256 (with 8 routed per token); and **fewer attention heads** than V3 to cut long-context overhead.
- Their headline innovation is the **MuonClip optimizer**: the token-efficient Muon optimizer plus **QK-Clip**, a stability mechanism that rescales the query/key projections when attention logits explode — the report shows a 15.5-trillion-token pre-training run with "no observable loss spikes". Connect this to module 8: attention logits are dot products that can grow too large; training-time QK-Clip is a cousin of the same saturation problem the $\sqrt{d}$ scaling addresses at inference.

# The comparison that makes it stick

| | Vanilla MHA | DeepSeek MLA | MiniMax hybrid-lightning | Kimi K2 |
|---|---|---|---|---|
| Attention math | softmax$(QK^\top/\sqrt{d})V$ | same, over reconstructed K/V | linear (kernel) attention in ⅞ of layers | softmax over MLA latents |
| KV cache per token | full: 2·layers·heads·d | **compressed latent** (−93.3% vs 67B baseline) | constant-size state for linear layers | compressed latent (MLA) |
| Attention compute | $O(n^2)$ | $O(n^2)$ (cheaper constants) | ~$O(n)$ in lightning layers | $O(n^2)$, fewer heads |
| Bottleneck attacked | memory | memory | compute *and* memory at extreme context | training stability + sparsity |
| Source | — | arXiv:2405.04434 | arXiv:2501.08313 | arXiv:2507.20534 |

One sentence to carry away: **everyone is paying down the same debt — attention's cost in memory and compute — DeepSeek by compressing the cache, MiniMax by linearizing most layers, Moonshot by adopting the best available compression and spending their novelty budget on optimizer stability and expert sparsity.**

*All specific claims above are drawn from the cited papers; the papers are the source of truth. If you use the AI-explain feature on this module, note that a well-behaved assistant should decline to add architecture details beyond what's cited here.*

---

# 🏁 Module 9 Checkpoint
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-checkpoint-9',
            title: 'Checkpoint quiz',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'The associativity trick $(QK^\\top)V = Q(K^\\top V)$ only becomes usable for linear-time attention when…',
                choices: [
                  'the softmax between $QK^\\top$ and $V$ is removed (or replaced by a kernel)',
                  'the sequence is shorter than $d$',
                  'the model is MoE',
                  'RoPE is disabled',
                ],
                answerIndex: 0,
                difficulty: 3,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Per arXiv:2501.08313, MiniMax-01’s architecture interleaves…',
                choices: [
                  'one lightning block after every seven softmax blocks',
                  'one softmax-attention block after every seven lightning-attention blocks',
                  'alternating lightning and softmax blocks 1:1',
                  'lightning attention only, no softmax anywhere',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'Why does MiniMax keep any softmax-attention layers at all?',
                choices: [
                  'Regulatory requirements',
                  'Pure linear attention historically underperforms on recall-heavy capabilities; the hybrid keeps some exact attention',
                  'Softmax layers are cheaper',
                  'To stay compatible with the OpenAI API',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'Which attention mechanism does Kimi K2 (arXiv:2507.20534) use?',
                choices: [
                  'Lightning attention',
                  'MLA — the DeepSeek design',
                  'A novel Moonshot mechanism called K2-attention',
                  'Vanilla MHA with 1024 heads',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q5',
                prompt: 'MuonClip’s QK-Clip component addresses…',
                choices: [
                  'KV-cache memory growth',
                  'exploding attention logits destabilizing training',
                  'tokenizer inefficiency',
                  'expert load imbalance',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
              {
                kind: 'mcq',
                id: 'q6',
                prompt: 'For a 4M-token context, the fundamental reason MLA alone (without linear attention) still struggles is…',
                choices: [
                  'the latent vectors stop compressing',
                  'attention compute is still quadratic in sequence length',
                  'RoPE breaks past 1M tokens',
                  'MoE routers overflow',
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
            id: 'ex-checkpoint-9',
            title: 'Checkpoint: implement linear-attention state updates',
            instructions: String.raw`
Feel the O(n) mechanism in your fingers. In (unnormalized, 1-D-feature) linear attention, you keep a
running state and update per token:

- state $S \mathrel{+}= k_t \cdot v_t$ (outer product; here with scalars per-dim for simplicity)
- output $y_t = q_t \cdot S$

Write \`linear_attention(qs, ks, vs)\` for **scalar** q/k/v sequences (lists of floats):
maintain \`S = 0.0\`; for each t: \`S += ks[t] * vs[t]\`, then \`y_t = qs[t] * S\`. Return the list of y's.

Note the causal property falls out for free: $y_t$ only ever saw tokens ≤ t. And the "cache" is a
single number no matter how long the sequence — that's the entire point.
`,
            starterCode: `def linear_attention(qs, ks, vs):
    S = 0.0
    ys = []
    ...
    return ys
`,
            tests: [
              {
                name: 'runs causally',
                code: 'ys = linear_attention([1.0, 1.0], [2.0, 3.0], [10.0, 100.0])\nassert ys == [20.0, 320.0]',
              },
              {
                name: 'first output ignores the future',
                code: 'a = linear_attention([1.0], [5.0], [7.0])\nb = linear_attention([1.0, 9.9], [5.0, 9.9], [7.0, 9.9])\nassert a[0] == b[0] == 35.0',
              },
              {
                name: 'zero keys contribute nothing',
                code: 'ys = linear_attention([1.0, 1.0, 1.0], [1.0, 0.0, 0.0], [4.0, 99.0, 99.0])\nassert ys == [4.0, 4.0, 4.0]',
              },
            ],
            difficulty: 3,
          },
        },
      ],
    },
  ],
}
