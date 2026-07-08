import type { Module } from '../types'

export const module07: Module = {
  id: 'm07-neural-nets',
  title: 'Neural Network Internals',
  summary: 'Perceptron → MLP, forward pass, loss, backprop derived step by step, SGD and Adam.',
  lessons: [
    {
      id: 'perceptron-mlp',
      title: 'From Perceptron to MLP',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# The Perceptron

The simplest "neuron" (1958!): weight each input, sum, add a bias, threshold:

$$y = \begin{cases}1 & \text{if } \mathbf{w}\cdot\mathbf{x} + b > 0\\0 & \text{otherwise}\end{cases}$$

That's a dot product (module 6!) plus a step function. Geometrically it draws a straight line (hyperplane) through input space: everything on one side → 1, other side → 0. Which exposes its famous limit — it can only solve **linearly separable** problems. XOR, whose positive cases sit diagonal from each other, is impossible for a single perceptron. That observation stalled neural nets for a decade.

## The fix: layers + nonlinearity

Stack neurons into **layers**, and replace the harsh step with a smooth **activation function**:

$$\mathbf{h} = \sigma(W_1\mathbf{x} + \mathbf{b}_1) \qquad \mathbf{y} = W_2\mathbf{h} + \mathbf{b}_2$$

This is a **multi-layer perceptron (MLP)**. The hidden layer $\mathbf{h}$ learns intermediate features; the nonlinearity $\sigma$ is what buys expressive power.

**Why must $\sigma$ be nonlinear?** Compose two linear maps and you get… a linear map: $W_2(W_1\mathbf{x}) = (W_2W_1)\mathbf{x}$. A 100-layer purely-linear network collapses into a single matrix. The nonlinearity between layers prevents the collapse — it's load-bearing, not decoration.

Common activations:

| Name | Formula | Notes |
|---|---|---|
| ReLU | $\max(0, x)$ | default choice; cheap; can "die" at 0 |
| Sigmoid | $1/(1+e^{-x})$ | squashes to $(0,1)$; saturates → vanishing gradients |
| GELU | $x \cdot \Phi(x)$ | smooth ReLU-ish; used in transformers (GPT, BERT) |

## The forward pass, concretely

A 2-input, 2-hidden, 1-output MLP with ReLU:

$$\mathbf{x} = [1, 2],\quad W_1 = \begin{bmatrix}1 & -1\\0 & 2\end{bmatrix},\ \mathbf{b}_1 = [0, -1]$$

1. $W_1\mathbf{x} + \mathbf{b}_1 = [1\cdot1 + (-1)\cdot2,\ 0\cdot1 + 2\cdot2] + [0,-1] = [-1, 3]$
2. ReLU: $\mathbf{h} = [\max(0,-1), \max(0,3)] = [0, 3]$
3. Output layer: another dot product on $\mathbf{h}$.

Numbers in → matrix multiply → clip negatives → repeat. That mechanical process, scaled to billions of parameters, is every forward pass ever run.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-mlp',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'Why can’t a single perceptron learn XOR?',
                choices: [
                  'XOR needs more than two inputs',
                  'XOR’s classes are not separable by a single straight line',
                  'Perceptrons cannot take binary inputs',
                  'It can — it just takes many epochs',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Remove all activation functions from a 50-layer MLP. The network is now equivalent to…',
                choices: [
                  'a 50× faster deep network',
                  'a single linear layer',
                  'a random forest',
                  'nothing — it stops producing output',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'short',
                id: 'q3',
                prompt: 'What is $\\text{ReLU}(-4)$? (number)',
                acceptableAnswers: ['0'],
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'Which activation is standard inside modern transformer MLP blocks?',
                choices: ['step function', 'GELU', 'sign', 'absolute value'],
                answerIndex: 1,
                difficulty: 2,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-forward',
            title: 'Implement a forward pass',
            instructions: String.raw`
Using your \`dot\`/matrix skills from module 6, implement:

1. \`relu(v)\` — elementwise $\max(0, x)$ on a list
2. \`mlp_forward(x, W1, b1, W2, b2)\` — computes $W_2 \,\text{ReLU}(W_1 x + b_1) + b_2$
   where matrices are lists of rows, and returns the output list.

This is a complete neural network inference engine in ~10 lines.
`,
            starterCode: `def relu(v):
    ...

def _matvec_add(M, x, b):
    return [sum(m_i * x_i for m_i, x_i in zip(row, x)) + bi for row, bi in zip(M, b)]

def mlp_forward(x, W1, b1, W2, b2):
    ...
`,
            tests: [
              { name: 'relu clips negatives', code: 'assert relu([-1.0, 0.0, 2.5]) == [0.0, 0.0, 2.5]' },
              {
                name: 'lesson worked example (hidden layer)',
                code: 'h = relu(_matvec_add([[1,-1],[0,2]], [1,2], [0,-1]))\nassert h == [0, 3]',
              },
              {
                name: 'full forward pass',
                code: 'out = mlp_forward([1,2], [[1,-1],[0,2]], [0,-1], [[1,1]], [0.5])\nassert out == [3.5]',
              },
              {
                name: 'identity-ish network',
                code: 'out = mlp_forward([2], [[1]], [0], [[1]], [0])\nassert out == [2]',
              },
            ],
            difficulty: 3,
          },
        },
      ],
    },
    {
      id: 'loss-backprop',
      title: 'Loss & Backpropagation, Derived',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# Loss Functions

A **loss function** turns "how wrong is the model?" into a single differentiable number.

**Mean squared error** (regression):
$$L = \frac{1}{n}\sum_i (\hat{y}_i - y_i)^2$$

**Cross-entropy** (classification/language modeling) — the negative log probability the model assigned to the correct answer:
$$L = -\log p_{\text{correct}}$$

If the model gave the true next token probability 0.9, loss $= -\log 0.9 \approx 0.105$ (good). Probability 0.01 → loss $\approx 4.6$ (bad). LLM training minimizes exactly this, averaged over trillions of tokens. (The "perplexity" metric is just $e^{L}$.)

# Backpropagation, Actually Derived

Take the smallest network that shows everything — one input, one hidden neuron (sigmoid), one output, MSE loss on a single example:

$$z = wx + b, \qquad h = \sigma(z), \qquad \hat{y} = vh, \qquad L = (\hat{y} - y)^2$$

We want $\frac{\partial L}{\partial v}$, $\frac{\partial L}{\partial w}$, $\frac{\partial L}{\partial b}$. Chain rule, applied from the loss backwards:

**Step 1 — output layer.** $L$ depends on $v$ through $\hat{y}$:
$$\frac{\partial L}{\partial \hat{y}} = 2(\hat{y} - y) \qquad \frac{\partial \hat{y}}{\partial v} = h \qquad \Rightarrow\ \boxed{\frac{\partial L}{\partial v} = 2(\hat{y}-y)\,h}$$

**Step 2 — through the hidden neuron.** $L$ depends on $w$ through the chain $z \to h \to \hat{y} \to L$. Multiply the local derivatives along the chain:
$$\frac{\partial \hat{y}}{\partial h} = v, \qquad \frac{\partial h}{\partial z} = \sigma'(z) = \sigma(z)(1 - \sigma(z)), \qquad \frac{\partial z}{\partial w} = x$$
$$\boxed{\frac{\partial L}{\partial w} = 2(\hat{y}-y)\cdot v \cdot \sigma(z)(1-\sigma(z)) \cdot x}$$

and identically for $b$ with $\frac{\partial z}{\partial b} = 1$.

**The insight that makes it an algorithm:** the factor $2(\hat{y}-y)\cdot v \cdot \sigma'(z)$ was needed for *both* $w$ and $b$ — compute it once, reuse it. In a deep network, each layer computes its "upstream gradient" once and passes it back; every layer then multiplies in only its local derivatives. One backward sweep computes *all* millions of gradients for about the same cost as one forward pass. That reuse is backpropagation. No magic — the chain rule plus caching.

## Vanishing gradients — read it off the formula

Notice $\sigma'(z) = \sigma(z)(1-\sigma(z)) \le 0.25$, always. In a 20-layer sigmoid network the backward product picks up twenty such factors: $0.25^{20} \approx 10^{-12}$ — gradients effectively vanish and early layers never learn. This is *why* ReLU (derivative exactly 1 for positive inputs) took over, and why residual connections (module 8) give gradients a highway around the multiplications.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-backprop',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'A language model assigns probability 0.5 to the correct next token. Its cross-entropy loss on that token is…',
                choices: ['$0.5$', '$-\\log 0.5 \\approx 0.69$', '$0$', '$2$'],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Backprop is efficient because…',
                choices: [
                  'it skips layers that don’t need gradients',
                  'each layer’s upstream gradient is computed once and reused for all its parameters',
                  'it only computes gradients for a random subset of weights',
                  'it avoids the chain rule',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'Why do deep sigmoid networks suffer vanishing gradients?',
                choices: [
                  'Sigmoid outputs are negative',
                  "σ′ ≤ 0.25, and backprop multiplies one such factor per layer — the product shrinks exponentially",
                  'The loss is not differentiable',
                  'Weights are initialized to zero',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'In the derived example, $\\partial L/\\partial v = 2(\\hat{y}-y)\\,h$. The $h$ appears because…',
                choices: [
                  '$\\hat{y} = vh$, so nudging $v$ changes $\\hat{y}$ in proportion to $h$',
                  'it is a normalization constant',
                  'the loss depends on $h$ directly',
                  'convention — it could be omitted',
                ],
                answerIndex: 0,
                difficulty: 3,
              },
            ],
          },
        },
        {
          type: 'exercise',
          exercise: {
            id: 'ex-backprop',
            title: 'Backprop by hand (then let code check you)',
            instructions: String.raw`
Implement the tiny network's gradients from the lesson. Given scalars
\`x, y, w, b, v\`, with $z = wx+b$, $h = \sigma(z)$, $\hat{y} = vh$, $L = (\hat{y}-y)^2$:

Write \`grads(x, y, w, b, v)\` returning the tuple \`(dL_dv, dL_dw, dL_db)\` using the
boxed formulas. Implement \`sigmoid(z)\` first.
`,
            starterCode: `import math

def sigmoid(z):
    return 1 / (1 + math.exp(-z))

def grads(x, y, w, b, v):
    z = w * x + b
    h = sigmoid(z)
    y_hat = v * h
    ...
    return dL_dv, dL_dw, dL_db
`,
            tests: [
              {
                name: 'matches finite differences',
                code: `import math
def _num_grad(f, args, i, eps=1e-6):
    a1 = list(args); a2 = list(args)
    a1[i] += eps; a2[i] -= eps
    return (f(*a1) - f(*a2)) / (2 * eps)
def _loss(x, y, w, b, v):
    h = 1 / (1 + math.exp(-(w * x + b)))
    return (v * h - y) ** 2
args = (1.5, 0.7, 0.3, -0.2, 0.8)
dv, dw, db = grads(*args)
x, y, w, b, v = args
assert abs(dv - _num_grad(lambda x,y,w,b,v: _loss(x,y,w,b,v), args, 4)) < 1e-4
assert abs(dw - _num_grad(lambda x,y,w,b,v: _loss(x,y,w,b,v), args, 2)) < 1e-4
assert abs(db - _num_grad(lambda x,y,w,b,v: _loss(x,y,w,b,v), args, 3)) < 1e-4`,
              },
              {
                name: 'zero loss -> zero gradients',
                code: 'import math\nh = 1/(1+math.exp(-(0.5*1.0+0.0)))\ndv, dw, db = grads(1.0, h, 0.5, 0.0, 1.0)\nassert abs(dv) < 1e-12 and abs(dw) < 1e-12 and abs(db) < 1e-12',
              },
            ],
            difficulty: 3,
          },
        },
      ],
    },
    {
      id: 'optimizers-checkpoint',
      title: 'SGD, Momentum & Adam',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# Gradient Descent Variants

## SGD — stochastic gradient descent

True gradient descent needs the gradient over the *entire* dataset per step — hopeless at trillion-token scale. **SGD** estimates it from a small random **batch**:

$$w_{t+1} = w_t - \eta \, \nabla L_{\text{batch}}(w_t)$$

Noisy, but cheap — and the noise even helps escape bad regions. Batch size trades gradient quality against steps per second.

## Momentum

Plain SGD zigzags across ravines in the loss surface. **Momentum** keeps a running velocity so consistent directions accumulate and oscillations cancel:

$$v_{t+1} = \beta v_t + \nabla L(w_t) \qquad w_{t+1} = w_t - \eta\, v_{t+1}$$

with $\beta \approx 0.9$ — a heavy ball rolling downhill rather than a hiker recomputing direction each step.

## Adam — the default for training transformers

**Adam** keeps *two* exponential moving averages — of the gradient (first moment $m$) and its square (second moment $s$) — and scales each parameter's step by its own noise level:

$$m_t = \beta_1 m_{t-1} + (1-\beta_1) g_t$$
$$s_t = \beta_2 s_{t-1} + (1-\beta_2) g_t^2$$
$$\hat{m}_t = \frac{m_t}{1-\beta_1^t}, \quad \hat{s}_t = \frac{s_t}{1-\beta_2^t} \qquad \text{(bias correction)}$$
$$w_{t+1} = w_t - \eta \, \frac{\hat{m}_t}{\sqrt{\hat{s}_t} + \epsilon}$$

Defaults: $\beta_1 = 0.9$, $\beta_2 = 0.999$, $\epsilon = 10^{-8}$. Intuition: parameters with large, noisy gradients get their steps shrunk by the $\sqrt{\hat{s}_t}$ denominator; parameters with small consistent gradients effectively get larger relative steps. The bias correction fixes the early-step underestimate caused by initializing $m_0 = s_0 = 0$.

In practice, LLMs train with **AdamW** (Adam with weight decay applied directly to weights rather than mixed into the gradient) plus a **learning-rate schedule** — warmup then decay. When a paper says "AdamW, lr 3e-4, cosine schedule, warmup 2000 steps," you can now read every word of that sentence.

---

# 🏁 Module 7 Checkpoint

Forward pass, loss, backprop derivation, and the optimizer family. Next stop: the transformer.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-checkpoint-7',
            title: 'Checkpoint quiz',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'The "stochastic" in SGD refers to…',
                choices: [
                  'random initialization of the weights',
                  'estimating the gradient from a random batch instead of the full dataset',
                  'randomly skipping layers',
                  'adding noise to the loss function',
                ],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Momentum helps primarily by…',
                choices: [
                  'increasing the learning rate over time',
                  'accumulating consistent gradient directions while cancelling oscillations',
                  'computing exact gradients',
                  'reducing memory usage',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'Adam’s per-parameter adaptive step comes from dividing by…',
                choices: [
                  'the parameter count',
                  '$\\sqrt{\\hat{s}_t}$ — the root of the running average of squared gradients',
                  'the batch size',
                  'the loss value',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'Why does Adam apply bias correction ($\\hat{m}_t = m_t / (1-\\beta_1^t)$)?',
                choices: [
                  'To keep gradients positive',
                  'Because $m$ starts at 0, early averages underestimate the true moment',
                  'To prevent division by zero',
                  'To normalize the loss',
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
            id: 'ex-checkpoint-7',
            title: 'Checkpoint: implement SGD with momentum',
            instructions: String.raw`
Implement \`momentum_descent(grad_fn, x0, lr, beta, steps)\` for a scalar parameter:

- $v \leftarrow \beta v + \text{grad\_fn}(x)$  (v starts at 0)
- $x \leftarrow x - \eta v$
- repeat \`steps\` times, return final x

Test target: $f(x) = x^2$ with \`grad_fn = lambda x: 2*x\` should converge to 0.
`,
            starterCode: `def momentum_descent(grad_fn, x0, lr, beta, steps):
    x = x0
    v = 0.0
    ...
    return x
`,
            tests: [
              {
                name: 'converges on x^2',
                code: 'x = momentum_descent(lambda x: 2*x, 10.0, 0.05, 0.9, 200)\nassert abs(x) < 0.01, f"got {x}"',
              },
              {
                name: 'beta=0 reduces to plain SGD',
                code: 'a = momentum_descent(lambda x: 2*x, 4.0, 0.1, 0.0, 1)\nassert abs(a - (4.0 - 0.1*8.0)) < 1e-12',
              },
              {
                name: 'velocity accumulates',
                code: '# two steps with beta=1: v = g1 + g2\nxs = []\ndef g(x):\n    xs.append(x)\n    return 1.0\nx = momentum_descent(g, 0.0, 0.1, 1.0, 2)\n# step1: v=1, x=-0.1; step2: v=2, x=-0.3\nassert abs(x - (-0.3)) < 1e-12',
              },
            ],
            difficulty: 3,
          },
        },
      ],
    },
  ],
}
