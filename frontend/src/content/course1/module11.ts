import type { Module } from '../types'

export const module11: Module = {
  id: 'm11-finetuning',
  title: 'Fine-Tuning & Training',
  summary: 'Dataset prep, the training loop, LoRA/QLoRA, and a real fine-tune recipe with transformers + Unsloth.',
  lessons: [
    {
      id: 'data-training-loop',
      title: 'Datasets & the Training Loop',
      kind: 'lesson',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# When (and When Not) to Fine-Tune

Fine-tuning continues training a pretrained model on your own examples. Reach for it to change **behavior** — style, format, domain vocabulary, a niche task. Do **not** reach for it to inject **knowledge** that changes (use RAG, next module) or when a better prompt would do (always try prompting first — it's 100× cheaper to iterate).

## Dataset preparation

Supervised fine-tuning (SFT) data is conversations, one JSON object per line (**JSONL**):

\`\`\`json
{"messages": [{"role": "system", "content": "You are a SQL assistant."},
               {"role": "user", "content": "Count users who signed up in 2024."},
               {"role": "assistant", "content": "SELECT COUNT(*) FROM users WHERE ..."}]}
\`\`\`

What separates datasets that work from ones that don't:

1. **Quality over quantity** — a few hundred excellent, *consistent* examples beat tens of thousands of sloppy ones for style/format tasks.
2. **Match the deployment distribution** — train on inputs shaped like what production will send (same format, same length range, same messiness).
3. **Hold out an eval split** (5–10%) *before* training. If you evaluate on training data you learn nothing except your model's ability to memorize.
4. **Deduplicate and scrub** — duplicates skew the loss; secrets/PII get memorized and can be regurgitated.

## The training loop, conceptually

Everything from module 7, in a for-loop:

\`\`\`python
for epoch in range(epochs):
    for batch in dataloader:                 # module 4's batch generator!
        logits = model(batch.inputs)         # forward pass (module 7)
        loss = cross_entropy(logits, batch.targets)   # -log p(correct token)
        loss.backward()                      # backprop (module 7)
        optimizer.step()                     # AdamW update (module 7)
        optimizer.zero_grad()                # clear gradients for next step
\`\`\`

For LLMs, the targets are the input **shifted one token left** — predict token $t{+}1$ from tokens $1..t$ — with the loss masked so only *assistant* tokens count (you don't want the model learning to imitate user typos).

The curves to watch: training loss ↓ and eval loss ↓ together = learning; training ↓ while eval ↑ = **overfitting** — stop, reduce epochs, or get more data.
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-datasets',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'Your product needs answers grounded in docs that change weekly. Fine-tune or RAG?',
                choices: [
                  'Fine-tune weekly',
                  'RAG — retrieval handles changing knowledge; fine-tuning bakes it in stale',
                  'Neither is applicable',
                  'Train from scratch',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q2',
                prompt: 'Why must the eval split be held out BEFORE training?',
                choices: [
                  'To speed up training',
                  'Evaluating on trained-on data measures memorization, not generalization',
                  'The optimizer requires it',
                  'JSONL files cannot exceed one split',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'Training loss keeps falling while eval loss starts rising. Diagnosis?',
                choices: ['underfitting', 'overfitting', 'learning rate too low', 'the data is shuffled wrong'],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: 'In LLM SFT, the loss is typically masked so that…',
                choices: [
                  'only assistant-turn tokens contribute — the model learns to answer, not to imitate users',
                  'only user tokens contribute',
                  'punctuation is ignored',
                  'the first 100 tokens are skipped',
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
            id: 'ex-dataprep',
            title: 'Dataset validation & splitting',
            instructions: String.raw`
Write \`prep_dataset(records, eval_fraction)\`:

- Keep only valid records: dicts with a "messages" list of ≥ 2 dicts, each having non-empty
  string "role" and "content", and the **last** message's role must be "assistant"
- Deduplicate exact duplicates (same JSON content — hint: \`json.dumps(r, sort_keys=True)\`)
- Split: the first \`int(len(valid) * (1 - eval_fraction))\` (after filtering, preserving order)
  go to train, the rest to eval
- Return \`{"train": [...], "eval": [...], "dropped": <count of invalid + duplicate records>}\`
`,
            starterCode: `import json

def prep_dataset(records, eval_fraction):
    ...
`,
            tests: [
              {
                name: 'filters invalid and splits',
                code: `ok = {"messages": [{"role": "user", "content": "q"}, {"role": "assistant", "content": "a"}]}
bad1 = {"messages": [{"role": "user", "content": "q"}]}
bad2 = {"nope": True}
out = prep_dataset([ok, bad1, bad2, ok, dict(ok)], 0.5)
# ok appears 3x -> deduped to 1 valid; 2 invalid + 2 dupes dropped
assert out["dropped"] == 4 and len(out["train"]) + len(out["eval"]) == 1`,
              },
              {
                name: '80/20 split preserves order',
                code: `recs = [{"messages": [{"role": "user", "content": str(i)}, {"role": "assistant", "content": "a" + str(i)}]} for i in range(10)]
out = prep_dataset(recs, 0.2)
assert len(out["train"]) == 8 and len(out["eval"]) == 2
assert out["train"][0]["messages"][0]["content"] == "0"`,
              },
              {
                name: 'last message must be assistant',
                code: `r = {"messages": [{"role": "assistant", "content": "a"}, {"role": "user", "content": "q"}]}
out = prep_dataset([r], 0.0)
assert out["dropped"] == 1`,
              },
            ],
            difficulty: 3,
          },
        },
      ],
    },
    {
      id: 'lora-checkpoint',
      title: 'LoRA, QLoRA & a Real Recipe',
      kind: 'checkpoint',
      blocks: [
        {
          type: 'md',
          md: String.raw`
# LoRA: Low-Rank Adaptation

Full fine-tuning updates **all** weights — for a 7B model that means 14 GB of weights *plus* optimizer state (AdamW keeps two moments per parameter — module 7), landing around 4–6× the model size in GPU memory. Out of reach for most.

**LoRA** ([Hu et al., 2021, arXiv:2106.09685](https://arxiv.org/abs/2106.09685)) freezes the pretrained weights entirely and learns only a low-rank *delta* per targeted matrix:

$$W' = W + \Delta W = W + \frac{\alpha}{r} B A$$

with $B \in \mathbb{R}^{d \times r}$, $A \in \mathbb{R}^{r \times d}$, and rank $r$ tiny (8–64). Count the parameters: a $4096 \times 4096$ attention projection has ~16.8M entries; its rank-16 LoRA pair has $2 \times 4096 \times 16 \approx 131k$ — **0.8%**. Across a whole model, trainable parameters drop ~100×, optimizer state shrinks proportionally, and the low-rank structure is module 6's factorization idea one more time (the same trick as MLA, aimed at training instead of inference).

Bonus: the LoRA **adapter** is a small separate file (tens of MB). Ship one base model + many adapters; merge or swap at will.

**QLoRA** ([Dettmers et al., 2023, arXiv:2305.14314](https://arxiv.org/abs/2305.14314)) goes further: quantize the *frozen* base model to 4-bit (module 10!), keep the LoRA adapters in higher precision, and backprop through the quantized weights. Their headline: fine-tuning a 65B model on a single 48 GB GPU while matching 16-bit fine-tune quality.

# The Recipe (transformers + Unsloth)

What a real QLoRA run looks like with Unsloth's optimized kernels (per the [Unsloth docs](https://docs.unsloth.ai/)):

\`\`\`python
from unsloth import FastLanguageModel
from trl import SFTTrainer
from transformers import TrainingArguments

model, tokenizer = FastLanguageModel.from_pretrained(
    "unsloth/llama-3-8b-bnb-4bit",     # pre-quantized 4-bit base
    max_seq_length=2048,
    load_in_4bit=True,
)
model = FastLanguageModel.get_peft_model(     # attach LoRA adapters
    model, r=16, lora_alpha=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
)
trainer = SFTTrainer(
    model=model, tokenizer=tokenizer,
    train_dataset=dataset,                    # your JSONL from last lesson
    args=TrainingArguments(
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,        # effective batch = 8
        learning_rate=2e-4, num_train_epochs=3,
        output_dir="outputs",
    ),
)
trainer.train()
model.save_pretrained("my-adapter")           # tiny adapter file
\`\`\`

Read every line with what you now know: 4-bit base (module 10), LoRA rank/alpha (above), target modules = the attention and MLP projections (module 8's block!), gradient accumulation = simulating a bigger batch (module 7's SGD), learning rate 2e-4 (module 6's η). **Nothing in this script is magic to you anymore.**

---

# 🏁 Module 11 Checkpoint
`,
        },
        {
          type: 'quiz',
          quiz: {
            id: 'q-checkpoint-11',
            title: 'Checkpoint quiz',
            questions: [
              {
                kind: 'mcq',
                id: 'q1',
                prompt: 'During LoRA training, the base model’s original weights are…',
                choices: ['updated slowly', 'frozen — only the low-rank A and B matrices train', 'deleted', 'quantized to 1-bit'],
                answerIndex: 1,
                difficulty: 1,
              },
              {
                kind: 'short',
                id: 'q2',
                prompt: 'A 1000×1000 weight matrix gets a rank-10 LoRA. How many trainable parameters in its A and B combined? (number)',
                acceptableAnswers: ['20000', '20,000'],
                difficulty: 3,
              },
              {
                kind: 'mcq',
                id: 'q3',
                prompt: 'QLoRA’s key addition over LoRA is…',
                choices: [
                  'training the quantized weights directly',
                  'a 4-bit-quantized frozen base with higher-precision adapters — slashing memory again',
                  'removing the optimizer',
                  'longer context windows',
                ],
                answerIndex: 1,
                difficulty: 2,
              },
              {
                kind: 'mcq',
                id: 'q4',
                prompt: '`gradient_accumulation_steps=4` with batch size 2 means…',
                choices: [
                  'the learning rate is divided by 4',
                  'gradients from 4 mini-batches are summed before one optimizer step — effective batch 8',
                  'every 4th batch is skipped',
                  'training runs 4 epochs',
                ],
                answerIndex: 1,
                difficulty: 3,
              },
              {
                kind: 'mcq',
                id: 'q5',
                prompt: 'Why is full fine-tuning so much more memory-hungry than its weight count suggests?',
                choices: [
                  'Weights are stored twice for safety',
                  'AdamW keeps extra state (two moments) per trainable parameter, plus gradients',
                  'The dataset must fit in VRAM',
                  'It is not — memory equals weight size',
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
            id: 'ex-checkpoint-11',
            title: 'Checkpoint: LoRA parameter accounting',
            instructions: String.raw`
Write \`lora_params(d, r, n_matrices)\` returning a dict:

- \`"full"\`: trainable params if you fine-tuned all \`n_matrices\` square d×d matrices fully
- \`"lora"\`: trainable params with rank-r LoRA on each (2·d·r per matrix)
- \`"ratio"\`: lora / full, rounded to 4 decimal places

Then sanity-check your own intuition with the tests.
`,
            starterCode: `def lora_params(d, r, n_matrices):
    ...
`,
            tests: [
              {
                name: 'single 4096 matrix, rank 16',
                code: 'out = lora_params(4096, 16, 1)\nassert out["full"] == 4096*4096 and out["lora"] == 2*4096*16',
              },
              {
                name: 'ratio is under 1%',
                code: 'out = lora_params(4096, 16, 1)\nassert out["ratio"] == round(131072/16777216, 4) and out["ratio"] < 0.01',
              },
              {
                name: 'scales across matrices',
                code: 'out = lora_params(1000, 10, 7)\nassert out["full"] == 7_000_000 and out["lora"] == 140_000 and out["ratio"] == 0.02',
              },
            ],
            difficulty: 2,
          },
        },
      ],
    },
  ],
}
