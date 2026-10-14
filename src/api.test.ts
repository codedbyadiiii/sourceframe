import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, diagnoseRequest, isDiagnosisResult } from './api'
import { makeDemoResult, samples } from './incident'

describe('diagnosis response contract', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('accepts a complete result matching the backend schema', () => {
    const sample = samples[0]
    expect(isDiagnosisResult(makeDemoResult(sample.logs, sample.compose))).toBe(true)
  })

  it('rejects malformed responses instead of rendering them as analysis', () => {
    expect(isDiagnosisResult({ status: 'likely_cause', summary: 'looks good' })).toBe(false)
  })

  it('rejects citations with invalid bounds', () => {
    const sample = samples[0]
    const response = makeDemoResult(sample.logs, sample.compose)
    response.findings[0].evidence[0].end_line = 0
    expect(isDiagnosisResult(response)).toBe(false)
  })

  it('uses the existing /api/diagnose contract and exact request field names', async () => {
    const result = makeDemoResult(samples[0].logs, samples[0].compose)
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    await diagnoseRequest('http://localhost:8000/', { logs: 'runtime log', compose: 'services: {}' }, new AbortController().signal)
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/diagnose')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({ logs: 'runtime log', compose: 'services: {}' })
  })

  it('returns provider failures as errors and never substitutes a demo answer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Gemma quota exhausted' }), { status: 429, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(diagnoseRequest('http://localhost:8000', { logs: 'log', compose: 'yaml' }, new AbortController().signal)).rejects.toMatchObject({
      name: 'ApiError', status: 429, message: 'Gemma quota exhausted',
    } satisfies Partial<ApiError>)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
