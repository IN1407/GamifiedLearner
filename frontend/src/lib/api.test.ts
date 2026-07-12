// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifyCode, aiGrade } from './api'
import type { AIConfig } from './db'

function mockFetch(jsonBody: unknown) {
  const calls: { url: string; init?: RequestInit }[] = []
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    return {
      ok: true,
      json: async () => jsonBody,
    } as Response
  })
  globalThis.fetch = fn as unknown as typeof fetch
  return calls
}

afterEach(() => {
  vi.restoreAllMocks()
})

const demoConfig: AIConfig = {
  id: 'current',
  provider: 'demo',
  model: 'demo-tutor-1',
  baseUrl: 'local://demo',
  encryptedKey: null,
  iv: null,
  updatedAt: 0,
}

describe('verifyCode', () => {
  it('posts to /api/verify (never /api/execute) with starter + requirements', async () => {
    const calls = mockFetch({
      valid: true,
      error: null,
      facts: { functions: ['solve'], classes: [], imports: [], constructs: ['loop'], num_statements: 1 },
      checks: [{ label: 'Implements solve(…)', passed: true, detail: '' }],
      all_checks_passed: true,
      changed: true,
      passed: true,
      summary: 'SYNTAX: valid',
    })

    const res = await verifyCode('def solve(x):\n    return x', 'def solve(x):\n    pass', {
      mustDefine: [{ name: 'solve', minArgs: 1 }],
      mustUse: ['loop'],
    })

    expect(res.passed).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/verify')
    expect(calls[0].url).not.toContain('execute')
    const body = JSON.parse(calls[0].init!.body as string)
    expect(body.starter_code).toContain('pass')
    expect(body.requirements.must_define).toEqual([{ name: 'solve', min_args: 1 }])
    expect(body.requirements.must_use).toEqual(['loop'])
  })
})

describe('aiGrade', () => {
  it('sends static analysis as code_evidence, not execution results', async () => {
    const calls = mockFetch({
      score: 70,
      verdict: 'ok',
      strengths: [],
      improvements: [],
      suggested_rewrite: '',
      unverified: [],
      raw: '',
    })

    await aiGrade(demoConfig, {
      task: 't',
      rubric: 'r',
      submission: 'def f():\n    return 1',
      kind: 'code',
      codeEvidence: 'SYNTAX: valid (parsed only — NOT executed)',
    })

    expect(calls[0].url).toBe('/api/ai/grade')
    const body = JSON.parse(calls[0].init!.body as string)
    expect(body.code_evidence).toContain('NOT executed')
    expect(body).not.toHaveProperty('execution_results')
  })
})
