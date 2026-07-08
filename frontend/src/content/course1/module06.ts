import type { Module } from '../types'

export const module06: Module = {
  id: 'm06-math',
  title: 'Math for AI',
  summary: 'Vectors, matrices, derivatives, gradients, probability, and softmax — tied to where they appear in ML.',
  lessons: [
    {
      id: 'linear-algebra',
      title: 'Linear Algebra Essentials',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# Vectors & Matrices

A **vector** is an ordered list of numbers: $\mathbf{v} = [2, -1, 3]$. In ML, *everything becomes a vector*: a word becomes its embedding vector, an image becomes a vector of pixel values, your quiz answers could become a vector of scores.

A **matrix** is a grid of numbers — equivalently, a stack of vectors. A weight matrix $W$ of shape $(3, 2)$ has 3 rows and 2 columns.

## The dot product — the single most important operation in ML

$$\mathbf{a} \cdot \mathbf{b} = \sum_i a_i b_i = a_1b_1 + a_2b_2 + \cdots$$

Multiply matching components, add them up. For $[1,2,3]\cdot[4,5,6] = 4 + 10 + 18 = 32$.

**What it means:** the dot product measures *alignment*. Large positive → vectors point the same way; zero → unrelated (orthogonal); negative → opposed. When a transformer computes attention scores as $QK^\top$, it is literally asking "how aligned is this query with each key?" — millions of dot products per sentence.

## Matrix multiplication

$C = AB$ where each entry is a dot product: $C_{ij} = (\text{row } i \text{ of } A) \cdot (\text{column } j \text{ of } B)$.

Shape rule: $(n \times k)(k \times m) \to (n \times m)$ — inner dimensions must match, and they disappear.

$$\begin{bmatrix}1 & 2\\3 & 4\end{bmatrix}\begin{bmatrix}5\\6\end{bmatrix} = \begin{bmatrix}1\cdot5+2\cdot6\\3\cdot5+4\cdot6\end{bmatrix} = \begin{bmatrix}17\\39\end{bmatrix}$$

A neural network layer is exactly this: $\mathbf{y} = W\mathbf{x} + \mathbf{b}$ — a matrix multiply plus a bias vector. "Training a model" mostly means adjusting the numbers inside those $W$ matrices. When you hear a model has "7 billion parameters," those are (almost all) matrix entries.
`,
          levelVariants: {
            middle: String.raw`
# Vectors & Matrices (from scratch)

## What is a vector?

A **vector** is just a list of numbers in a fixed order, like $[2, -1, 3]$. Think of it as an arrow: starting at zero, go 2 steps right, 1 down, 3 up (in 3D). Or more simply: a row in a spreadsheet.

Why does AI care? Because computers can only do math on numbers. So AI turns *everything* into lists of numbers: the word "cat" becomes maybe 768 numbers; a photo becomes thousands of numbers (one per pixel). Once everything is a vector, one set of math tools handles words, images, and sounds alike.

## The dot product, step by step

Take two vectors of the same length, multiply the matching positions, then add everything:

$$[1, 2, 3] \cdot [4, 5, 6]$$

Step 1 — multiply position by position: $1 \times 4 = 4$, then $2 \times 5 = 10$, then $3 \times 6 = 18$.

Step 2 — add them: $4 + 10 + 18 = 32$.

That single number tells you **how similar the two vectors are**:
- Big positive number → very similar
- Around zero → unrelated
- Negative → opposites

This is *the* core trick of modern AI. When ChatGPT decides which earlier words matter for the next word, it computes dot products between word-vectors. Similar meaning = big dot product = pay attention.

## What is a matrix?

A **matrix** is a rectangle of numbers — several vectors stacked into rows. A matrix with 3 rows and 2 columns has shape $(3, 2)$.

**Matrix multiplication** means: take each row of the first matrix, dot-product it with each column of the second, and put the results in a grid. One worked example:

$$\begin{bmatrix}1 & 2\\3 & 4\end{bmatrix}\begin{bmatrix}5\\6\end{bmatrix}$$

- Top result: row $[1, 2]$ · column $[5, 6]$ = $1\times5 + 2\times6 = 17$
- Bottom result: row $[3, 4]$ · column $[5, 6]$ = $3\times5 + 4\times6 = 39$

Answer: $[17, 39]$.

A layer of a neural network is exactly this: numbers in, matrix multiply, numbers out. A "7-billion-parameter model" means its matrices hold 7 billion adjustable numbers. **Training = nudging those numbers until the outputs are good.**
`,
            grad: String.raw`
# Linear Algebra — the ML-relevant core

Assumed known: vector spaces, inner products, matrix algebra. What matters here is the *mapping to ML practice*:

- **Dot product as similarity**: attention logits are $QK^\top$ — batched inner products between query/key projections. Cosine similarity (normalized dot product) underlies embedding retrieval in RAG.
- **Layers as affine maps**: $\mathbf{y} = W\mathbf{x} + \mathbf{b}$, composed with pointwise nonlinearities. Parameter counts are dominated by the $W$s; a "7B model" ≈ 7×10⁹ matrix entries, mostly in attention projections and MLP blocks.
- **Shapes as types**: $(n \times k)(k \times m) \to (n \times m)$. Debugging deep-learning code is 80% shape bookkeeping; internalize broadcast semantics early.
- **Low-rank structure**: LoRA fine-tuning (module 11) exploits $\Delta W = BA$ with $B \in \mathbb{R}^{d\times r}, A \in \mathbb{R}^{r\times d}, r \ll d$; MLA's KV compression (module 9) is a learned low-rank projection of the KV cache. The rank-r factorization intuition pays off repeatedly.

$$\begin{bmatrix}1 & 2\\3 & 4\end{bmatrix}\begin{bmatrix}5\\6\end{bmatrix} = \begin{bmatrix}17\\39\end{bmatrix}$$
`,
          },
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-linalg',
            questions: [
              {
                kind: 'short',
                id: 'q1',
                prompt: 'Compute the dot product $[2, 3] \\cdot [4, 1]$. (type the number)',
                acceptableAnswers: ['11'],
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'A $(4 \\times 3)$ matrix times a $(3 \\times 2)$ matrix produces a matrix of shape…',
                choices: ['$(4 \\times 2)$', '$(3 \\times 3)$', '$(4 \\times 3)$', 'undefined — shapes don’t match'],
                answerIndex: 0,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'Two embedding vectors have a dot product near zero. Interpretation?',
                choices: [
                  'They represent very similar things',
                  'They are unrelated/orthogonal',
                  'They represent opposite things',
                  'One of them must be the zero vector',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'A neural network layer computes $\\mathbf{y} = W\\mathbf{x} + \\mathbf{b}$. "Training the model" primarily changes…',
                choices: ['the input $\\mathbf{x}$', 'the entries of $W$ and $\\mathbf{b}$', 'the shape of the matrices', 'the output $\\mathbf{y}$ directly'],
                answerIndex: 1,
                difficulty: 1,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-dot',
            title: 'Implement the dot product & matrix-vector multiply',
            instructions: String.raw`
No NumPy — build it yourself once, so you know exactly what the library does.

1. \`dot(a, b)\`: dot product of two equal-length lists. Raise \`ValueError\` if lengths differ.
2. \`matvec(M, x)\`: multiply matrix M (list of row-lists) by vector x — return a list where
   element i is \`dot(M[i], x)\`.
`,
            starterCode: `def dot(a, b):
    ...

def matvec(M, x):
    ...
`,
            tests: [
              { name: 'dot basic', code: 'assert dot([1,2,3], [4,5,6]) == 32' },
              { name: 'dot mismatched lengths', code: 'try:\n    dot([1], [1,2])\n    assert False\nexcept ValueError:\n    pass' },
              { name: 'matvec worked example', code: 'assert matvec([[1,2],[3,4]], [5,6]) == [17, 39]' },
              { name: 'matvec identity', code: 'assert matvec([[1,0],[0,1]], [7,8]) == [7, 8]' },
            ],
            difficulty: 2,
          },
        },
      ],
    },
    {
      id: 'calculus',
      title: 'Derivatives, Gradients & the Chain Rule',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# Derivatives → Gradients → Learning

## The derivative

The derivative $f'(x)$ is the slope of $f$ at point $x$ — how much $f$ changes per tiny change in $x$:

$$f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}$$

Rules you need (and only these): $\frac{d}{dx}x^n = nx^{n-1}$, derivatives are linear, and the chain rule below. Example: $f(x) = x^2 \Rightarrow f'(x) = 2x$. At $x=3$ the slope is 6: increasing $x$ slightly increases $f$ about 6× as fast.

## The gradient

For a function of many variables — say a loss $L(w_1, w_2, \ldots, w_n)$ over *all the weights of a network* — the **gradient** $\nabla L$ is the vector of all partial derivatives:

$$\nabla L = \left[\frac{\partial L}{\partial w_1}, \frac{\partial L}{\partial w_2}, \ldots\right]$$

It points in the direction of **steepest increase**. So $-\nabla L$ points downhill — toward lower loss. That observation *is* deep learning's engine:

$$w \leftarrow w - \eta \nabla L(w)$$

Take the gradient, step opposite to it, scaled by the **learning rate** $\eta$. Repeat a few million times. That's gradient descent — try it live below.

## The chain rule

Networks are compositions: $L = f(g(h(x)))$. The chain rule says composed functions multiply their derivatives:

$$\frac{dL}{dx} = f'(g(h(x))) \cdot g'(h(x)) \cdot h'(x)$$

**Backpropagation (module 7) is nothing but the chain rule applied systematically** through every layer, reusing intermediate results. If the chain rule makes sense to you, backprop will too — it's bookkeeping, not new math.
`,
          levelVariants: {
            middle: String.raw`
# Slopes, and Why AI Cares

## What is a derivative?

Imagine walking on a hill. At any spot, the ground has a **slope**: steep up, gentle up, flat, or downhill. The **derivative** of a function is exactly that — the slope at one point.

For $f(x) = x^2$ (a U-shaped curve):
- At $x = 3$, the curve rises steeply → slope is $6$ (positive, big)
- At $x = 0$, the bottom of the U → slope is $0$ (flat)
- At $x = -3$ → slope is $-6$ (going downhill as x increases)

There's a formula pattern: for $f(x) = x^2$, the slope at any $x$ is $2x$. (For $x^3$ it's $3x^2$ — bring the power down front, lower the power by one. That single rule covers most of what we need.)

## Why does AI care about slopes?

An AI model has millions of adjustable numbers (weights). For any setting of those numbers, we can measure how *wrong* the model is — a number called the **loss**. Picture the loss as a hilly landscape where every location is one setting of the weights, and the height is how wrong the model is.

**Training = walking downhill in that landscape.**

The **gradient** is the "which way is uphill?" arrow, computed from slopes — one slope per weight. So we step the *opposite* way:

$$\text{new weight} = \text{old weight} - \text{learning rate} \times \text{slope}$$

The **learning rate** is your step size. Too small: you inch forever. Too big: you leap across the valley and land higher than you started. Play with it in the interactive demo below — you'll feel it immediately.

## The chain rule (preview)

One more idea: when functions are chained ("do $h$, then $g$, then $f$"), the total slope is the *product* of each step's slope. Neural networks are long chains, and "backpropagation" — the famous training algorithm — is just multiplying slopes along the chain. You'll meet it properly in the next module.
`,
            hs910: String.raw`
# Derivatives, Gradients & the Chain Rule

## Derivatives, quickly but carefully

The derivative $f'(x)$ is the slope of the graph of $f$ at $x$ — the rate of change right at that point. Formally, take the slope between two nearby points, and let them squeeze together:

$$f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}$$

You don't need to compute limits by hand — one pattern covers us: **the power rule**, $\frac{d}{dx}x^n = nx^{n-1}$.

Worked examples:
- $f(x) = x^2 \Rightarrow f'(x) = 2x$. At $x=3$: slope $6$.
- $f(x) = x^3 - 4x \Rightarrow f'(x) = 3x^2 - 4$ (differentiate each term separately).
- Slope $0$ happens at flat points — bottoms of valleys, tops of hills. Those are where minima live.

## From slope to gradient

A network's **loss** $L$ depends on millions of weights $w_1, w_2, \ldots$ The **gradient** $\nabla L$ collects the slope with respect to each weight — "if I nudge this weight, how does the loss change?" — into one vector. It points uphill; its negative points downhill:

$$w \leftarrow w - \eta \nabla L(w)$$

Step every weight slightly downhill, scaled by the learning rate $\eta$. Repeat millions of times: that is literally how GPT was trained.

## The chain rule

For chained functions, slopes multiply. If $y = g(x)$ and $L = f(y)$:

$$\frac{dL}{dx} = \frac{dL}{dy} \cdot \frac{dy}{dx}$$

Example: $L = (x^2 + 1)^3$. Let $y = x^2+1$, so $L = y^3$. Then $\frac{dL}{dy} = 3y^2$ and $\frac{dy}{dx} = 2x$, giving $\frac{dL}{dx} = 3(x^2+1)^2 \cdot 2x$.

Neural networks are long chains of functions, and **backpropagation is the chain rule applied layer by layer**. Master this and module 7 is bookkeeping.
`,
          },
        },
        { type: 'viz', viz: 'gradientDescent', caption: 'Interactive: gradient descent on a non-convex loss. Break it on purpose — crank the learning rate.' },
        {
          type: 'quiz',
          quiz: {
            id: 'q-calculus',
            questions: [
              {
                kind: 'short',
                id: 'q1',
                prompt: 'If $f(x) = x^2$, what is the slope at $x = 5$? (number)',
                acceptableAnswers: ['10'],
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'The gradient $\\nabla L$ points…',
                choices: [
                  'toward the minimum',
                  'in the direction of steepest increase of $L$',
                  'in a random downhill direction',
                  'always toward zero',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'In $w \\leftarrow w - \\eta \\nabla L$, a learning rate that is far too large causes…',
                choices: [
                  'slow but steady convergence',
                  'overshooting — the loss can oscillate or explode',
                  'the gradient to become zero',
                  'nothing; learning rate only affects speed, never stability',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'Backpropagation is essentially…',
                choices: [
                  'the chain rule applied systematically through the network',
                  'a genetic algorithm',
                  'random search over weights',
                  'matrix inversion',
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
            id: 'ex-graddesc',
            title: 'Implement gradient descent',
            instructions: String.raw`
Implement 1-D gradient descent for $f(x) = (x - 3)^2$, whose derivative is $f'(x) = 2(x - 3)$
and whose minimum is at $x = 3$.

Write \`gradient_descent(x0, lr, steps)\` that starts at \`x0\`, repeats
\`x = x - lr * grad(x)\` for \`steps\` iterations, and returns the final x.

Define the derivative as its own function \`grad(x)\` first.
`,
            starterCode: `def grad(x):
    # derivative of (x - 3)**2
    ...

def gradient_descent(x0, lr, steps):
    ...
`,
            tests: [
              { name: 'grad correct', code: 'assert grad(5) == 4 and grad(3) == 0' },
              {
                name: 'converges near 3',
                code: 'result = gradient_descent(10.0, 0.1, 100)\nassert abs(result - 3) < 0.01, f"got {result}"',
              },
              {
                name: 'zero steps returns start',
                code: 'assert gradient_descent(7.0, 0.1, 0) == 7.0',
              },
              {
                name: 'works from the left side too',
                code: 'assert abs(gradient_descent(-20.0, 0.2, 200) - 3) < 0.01',
              },
            ],
            difficulty: 2,
          },
        },
      ],
    },
    {
      id: 'probability-checkpoint',
      title: 'Probability, Expectation & Softmax',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# Probability for Language Models

## Distributions

A **probability distribution** assigns each possible outcome a number in $[0, 1]$, with all outcomes summing to exactly 1. A fair die: each face gets $1/6$.

This matters because **a language model's entire output is a probability distribution over its vocabulary** — roughly 100k numbers that sum to 1, one per possible next token. "Generating text" = repeatedly sampling from that distribution.

## Expectation

The **expected value** is the probability-weighted average of outcomes:

$$\mathbb{E}[X] = \sum_i p_i x_i$$

A die's expectation: $\frac{1}{6}(1+2+3+4+5+6) = 3.5$. In ML, the loss you minimize is an expectation — the *average* wrongness over the training distribution, approximated by averaging over batches.

## Softmax — turning scores into a distribution

Networks output raw scores (**logits**) — arbitrary real numbers like $[2.3, -1.1, 0.7]$. Softmax converts them into a valid probability distribution:

$$\text{softmax}(z)_i = \frac{e^{z_i}}{\sum_j e^{z_j}}$$

Why exponentials? Three reasons that all matter:
1. $e^z > 0$ always — no negative probabilities.
2. Dividing by the sum forces the outputs to total exactly 1.
3. It's smooth and differentiable — gradients flow through it (see previous lesson!).

With a **temperature** $T$, $\text{softmax}(z/T)$: low $T$ sharpens the distribution toward the argmax (deterministic), high $T$ flattens it (creative/random). This is precisely the \`temperature\` parameter in every LLM API. Explore it below.
`,
          levelVariants: {
            middle: String.raw`
# Probability for Language Models (from scratch)

## Probability basics

A probability is a number between 0 and 1 saying how likely something is: 0 = impossible, 1 = certain, 0.5 = coin flip. A **distribution** lists probabilities for *all* possible outcomes — and they must add up to exactly 1 (something has to happen!).

Fair die: each of the 6 faces gets probability $1/6 \approx 0.167$. Check: $6 \times 1/6 = 1$. ✓

Here's the mind-opening part: when ChatGPT writes, at every step it computes a probability for **every word it knows** (~100,000 of them) — "cat: 0.3%, the: 12%, …" — all summing to 1. Then it picks one, adds it to the text, and repeats. That's all "generating" is.

## Averages, weighted by probability

The **expected value** is a weighted average: multiply each outcome by its probability and add up.

Die example: $\frac{1}{6}\times1 + \frac{1}{6}\times2 + \cdots + \frac{1}{6}\times6 = 3.5$. You can never roll 3.5 — it's the *long-run average* if you rolled forever.

## Softmax: making scores into probabilities

A neural network's raw outputs (called **logits**) are just scores — they can be negative, huge, whatever: $[2.3, -1.1, 0.7]$. To pick a word we need proper probabilities. **Softmax** fixes that in two moves:

1. Push every score through $e^x$ (the exponential function) — this makes everything positive, and bigger scores get *much* bigger.
2. Divide each result by the total — now they sum to exactly 1.

$$\text{softmax}(z)_i = \frac{e^{z_i}}{\sum_j e^{z_j}}$$

The **temperature** slider you may have seen in AI apps divides the scores before softmax. Low temperature → the biggest score dominates → predictable output. High temperature → scores even out → surprising output. Try it yourself below.
`,
          },
        },
        { type: 'viz', viz: 'softmax', caption: 'Interactive: logits → softmax probabilities, with the temperature knob every LLM API exposes.' },
        {
          type: 'md',
          md: `
---

# 🏁 Module 6 Checkpoint

Dot products, gradients, chain rule, distributions, softmax. Every one of these reappears in the next two modules — this is the foundation the transformer sits on.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-checkpoint-6',
            title: 'Checkpoint quiz',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'Which is a valid probability distribution over 3 outcomes?',
                choices: ['$[0.5, 0.3, 0.3]$', '$[0.7, 0.2, 0.1]$', '$[0.9, 0.2, -0.1]$', '$[1.0, 1.0, 1.0]$'],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Why does softmax exponentiate the logits (rather than, say, just dividing each by the sum)?',
                choices: [
                  'Exponentials are faster to compute',
                  'It guarantees positivity, works for negative logits, and stays smoothly differentiable',
                  'It makes all outputs equal',
                  'Tradition — any function would work identically',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'Setting temperature very close to 0 in an LLM API makes generation…',
                choices: [
                  'nearly deterministic — the top token almost always wins',
                  'more creative and varied',
                  'slower but otherwise identical',
                  'output raw logits',
                ],
                answerIndex: 0,
                difficulty: 2,
              },
              {
                kind: 'short',
                id: 'q4',
                prompt: 'A spinner lands on 10 with probability 0.2 and on 0 with probability 0.8. What is the expected value? (number)',
                acceptableAnswers: ['2', '2.0'],
                difficulty: 2,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-checkpoint-6',
            title: 'Checkpoint: implement softmax',
            instructions: String.raw`
Implement \`softmax(logits)\` returning a list of probabilities.

For **numerical stability**, subtract the max logit from every logit first
($e^{1000}$ overflows; $e^{z - \max z}$ never does — and the subtraction provably
doesn't change the result, because the factors $e^{-\max z}$ cancel in the ratio).

Use \`math.exp\`. Your outputs must sum to ~1.
`,
            starterCode: `import math

def softmax(logits):
    ...
`,
            tests: [
              {
                name: 'sums to 1',
                code: 'p = softmax([2.0, 1.0, 0.1])\nassert abs(sum(p) - 1.0) < 1e-9',
              },
              {
                name: 'order preserved',
                code: 'p = softmax([2.0, 1.0, 0.1])\nassert p[0] > p[1] > p[2]',
              },
              {
                name: 'uniform for equal logits',
                code: 'p = softmax([5.0, 5.0])\nassert abs(p[0] - 0.5) < 1e-9 and abs(p[1] - 0.5) < 1e-9',
              },
              {
                name: 'numerically stable at huge logits',
                code: 'p = softmax([1000.0, 999.0])\nassert abs(sum(p) - 1.0) < 1e-9 and p[0] > p[1]',
              },
              {
                name: 'known values',
                code: 'import math\np = softmax([1.0, 0.0])\nexpected = math.exp(1) / (math.exp(1) + 1)\nassert abs(p[0] - expected) < 1e-9',
              },
            ],
            difficulty: 3,
          },
        },
      ],
    },
  ],
}
