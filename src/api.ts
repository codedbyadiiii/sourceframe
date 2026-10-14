import type { DiagnosisResult } from './types'

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'ApiError'
  }
}

export const defaultApiBase = () => {
  const env = import.meta.env as ImportMetaEnv & { VITE_API_BASE_URL?: string; VITE_API_URL?: string }
  return (env.VITE_API_BASE_URL || env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
}

export function isDiagnosisResult(value: unknown): value is DiagnosisResult {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  if (!['likely_cause', 'insufficient_evidence', 'no_failure_found'].includes(String(data.status))) return false
  if (typeof data.summary !== 'string' || typeof data.model_identifier !== 'string' || typeof data.analysis_source !== 'string') return false
  if (typeof data.redacted_logs !== 'string' || typeof data.redacted_compose !== 'string' || typeof data.caveat !== 'string') return false
  if (!Array.isArray(data.findings) || !Array.isArray(data.proposed_changes) || !Array.isArray(data.verification_steps) || !Array.isArray(data.missing_information) || !Array.isArray(data.deterministic_checks)) return false
  if (![data.verification_steps, data.missing_information, data.deterministic_checks].every((items) => (items as unknown[]).every((item) => typeof item === 'string'))) return false
  return data.findings.every((item) => {
    if (!item || typeof item !== 'object') return false
    const finding = item as Record<string, unknown>
    if (typeof finding.title !== 'string' || typeof finding.explanation !== 'string') return false
    if (!['observed_fact', 'hypothesis'].includes(String(finding.kind)) || typeof finding.source_matched !== 'boolean' || !Array.isArray(finding.evidence)) return false
    if (finding.beginner_note != null && typeof finding.beginner_note !== 'string') return false
    if (finding.severity != null && typeof finding.severity !== 'string') return false
    return finding.evidence.every((evidence) => {
      if (!evidence || typeof evidence !== 'object') return false
      const citation = evidence as Record<string, unknown>
      return ['logs', 'compose'].includes(String(citation.source)) && Number.isInteger(citation.start_line) && Number.isInteger(citation.end_line) && Number(citation.start_line) > 0 && Number(citation.end_line) >= Number(citation.start_line) && typeof citation.quote === 'string' && citation.quote.length > 0
    })
  }) && data.proposed_changes.every((item) => {
    if (!item || typeof item !== 'object') return false
    const change = item as Record<string, unknown>
    return typeof change.explanation === 'string' && typeof change.before === 'string' && typeof change.after === 'string' && typeof change.yaml_valid === 'boolean'
  })
}

async function requestJson(baseUrl: string, path: string, init: RequestInit, signal?: AbortSignal): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, { ...init, signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('Cannot reach the CloudSage backend. Check that it is running and the API URL is correct.')
  }
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ApiError('The backend returned an unreadable response. No diagnosis was displayed.', response.status)
  }
  if (!response.ok) {
    const detail = payload && typeof payload === 'object' && 'detail' in payload && typeof payload.detail === 'string' ? payload.detail : ''
    const message = response.status === 429
      ? detail || 'Gemma quota or rate limit reached. Check provider quota and retry later.'
      : response.status === 503
        ? detail || 'The backend is not ready for analysis.'
        : response.status === 502
          ? detail || 'Gemma returned an unavailable or invalid response. No diagnosis was shown.'
          : detail || `Backend request failed (${response.status}).`
    throw new ApiError(message, response.status)
  }
  return payload
}

export async function diagnoseRequest(baseUrl: string, inputs: { logs: string; compose: string }, signal: AbortSignal): Promise<DiagnosisResult> {
  const payload = await requestJson(baseUrl, '/api/diagnose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputs),
  }, signal)
  if (!isDiagnosisResult(payload)) throw new ApiError('The backend response did not match the diagnosis contract. No results were displayed.')
  return payload
}

export async function checkBackend(baseUrl: string, signal?: AbortSignal): Promise<{ status: string }> {
  const payload = await requestJson(baseUrl, '/api/health', { method: 'GET' }, signal)
  if (!payload || typeof payload !== 'object' || !('status' in payload) || typeof payload.status !== 'string') {
    throw new ApiError('Backend health response did not match its contract.')
  }
  return payload as { status: string }
}
