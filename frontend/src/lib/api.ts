/**
 * Backend API client. Every failure is surfaced as a typed ApiError with a
 * user-facing message — no silent failures, no generic "something went wrong".
 */
import { decryptSecret } from './crypto'
import type { AIConfig } from './db'

export type ApiErrorType =
  | 'invalid_key'
  | 'rate_limited'
  | 'network'
  | 'provider_error'
  | 'bad_request'
  | 'not_found'
  | 'offline'
  | 'backend_down'

export class ApiError extends Error {
  type: ApiErrorType
  constructor(type: ApiErrorType, message: string) {
    super(message)
    this.type = type
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!navigator.onLine) {
    throw new ApiError(
      'offline',
      'You appear to be offline. Lessons you already loaded still work; AI features and code running need a connection.',
    )
  }
  let resp: Response
  try {
    resp = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new ApiError(
      'backend_down',
      'Could not reach the GamifiedLearner backend. Is it running? Start it with: uvicorn app.main:app (in the backend folder).',
    )
  }
  if (!resp.ok) {
    let type: ApiErrorType = 'provider_error'
    let message = `Request failed (${resp.status}).`
    try {
      const body = await resp.json()
      if (body?.error?.type) {
        type = body.error.type
        message = body.error.message
      } else if (body?.detail) {
        type = 'bad_request'
        message = typeof body.detail === 'string' ? body.detail : 'Invalid request.'
      }
    } catch {
      /* keep defaults */
    }
    throw new ApiError(type, message)
  }
  return resp.json() as Promise<T>
}

export interface ProviderInfo {
  id: string
  label: string
  needs_key: boolean
  default_base_url: string
  key_hint: string
}

export function fetchProviders(): Promise<ProviderInfo[]> {
  return request<ProviderInfo[]>('/api/providers')
}

export function validateProvider(
  provider: string,
  apiKey: string,
  baseUrl?: string,
): Promise<{ ok: boolean; models: string[] }> {
  return request('/api/providers/validate', {
    method: 'POST',
    body: JSON.stringify({ provider, api_key: apiKey || null, base_url: baseUrl || null }),
  })
}

/** Decrypt the stored key for a single request; plaintext never persists. */
async function authFields(config: AIConfig) {
  let apiKey: string | null = null
  if (config.encryptedKey && config.iv) {
    apiKey = await decryptSecret(config.encryptedKey, config.iv)
  }
  return {
    provider: config.provider,
    api_key: apiKey,
    base_url: config.baseUrl,
    model: config.model,
  }
}

export async function aiExplain(
  config: AIConfig,
  payload: {
    question: string
    choices: string[]
    userAnswer: string
    correctAnswer: string
    lessonContext: string
  },
): Promise<string> {
  const auth = await authFields(config)
  const res = await request<{ explanation: string }>('/api/ai/explain', {
    method: 'POST',
    body: JSON.stringify({
      ...auth,
      question: payload.question,
      choices: payload.choices,
      user_answer: payload.userAnswer,
      correct_answer: payload.correctAnswer,
      lesson_context: payload.lessonContext,
    }),
  })
  return res.explanation
}

export async function aiChat(
  config: AIConfig,
  question: string,
  lessonContext: string,
  history: { role: 'user' | 'assistant'; content: string }[],
): Promise<string> {
  const auth = await authFields(config)
  const res = await request<{ answer: string }>('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ ...auth, question, lesson_context: lessonContext, history }),
  })
  return res.answer
}

export interface GradeResult {
  score: number | null
  verdict: string
  strengths: string[]
  improvements: string[]
  suggested_rewrite: string
  unverified: string[]
  raw: string
}

export async function aiGrade(
  config: AIConfig,
  payload: {
    task: string
    rubric: string
    submission: string
    kind: 'prompt' | 'code'
    /** static syntax/structure analysis passed as evidence only (never a verdict) */
    codeEvidence?: string
  },
): Promise<GradeResult> {
  const auth = await authFields(config)
  return request<GradeResult>('/api/ai/grade', {
    method: 'POST',
    body: JSON.stringify({
      ...auth,
      task: payload.task,
      rubric: payload.rubric,
      submission: payload.submission,
      kind: payload.kind,
      code_evidence: payload.codeEvidence ?? null,
    }),
  })
}

export interface VerifyCheck {
  label: string
  passed: boolean
  detail: string
}

export interface VerifyResult {
  valid: boolean
  error: { message: string; lineno: number | null; offset: number | null; text: string | null } | null
  facts: {
    functions: string[]
    classes: string[]
    imports: string[]
    constructs: string[]
    num_statements: number
  }
  checks: VerifyCheck[]
  all_checks_passed: boolean
  changed: boolean
  /** deterministic completion signal: valid AND all checks pass AND changed. NOT a correctness claim. */
  passed: boolean
  summary: string
}

/** Structural requirements an exercise may declare to override starter-derived checks. */
export interface CodeRequirements {
  mustDefine?: { name: string; minArgs?: number }[]
  mustUse?: ('loop' | 'comprehension' | 'conditional' | 'try' | 'with' | 'return')[]
  mustNotImport?: string[]
}

/**
 * Statically verify learner code. The backend NEVER executes it — it parses the
 * AST and runs structural checks only. Correctness is judged separately by AI.
 */
export function verifyCode(
  code: string,
  starterCode: string,
  requirements?: CodeRequirements,
): Promise<VerifyResult> {
  const body: Record<string, unknown> = { code, starter_code: starterCode }
  if (requirements) {
    body.requirements = {
      must_define: (requirements.mustDefine ?? []).map((m) => ({
        name: m.name,
        min_args: m.minArgs ?? 0,
      })),
      must_use: requirements.mustUse ?? [],
      must_not_import: requirements.mustNotImport ?? [],
    }
  }
  return request<VerifyResult>('/api/verify', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
