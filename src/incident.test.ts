import { describe, expect, it } from 'vitest'
import { compareIncident, exportReport, makeDemoResult, redactText, samples, validateSources } from './incident'

describe('frontend incident workflow helpers', () => {
  it('requires non-empty inputs, size bounds, and a services mapping', () => {
    expect(validateSources('', 'services: {}').valid).toBe(false)
    expect(validateSources('log', 'not: [valid').valid).toBe(false)
    expect(validateSources('log', 'services: []').valid).toBe(false)
    expect(validateSources('log', 'services:\n  web: {}').valid).toBe(true)
    expect(validateSources('x'.repeat(100_001), 'services:\n  web: {}').valid).toBe(false)
  })

  it('marks sample text as a fixture and previews the internal-port correction explicitly as demo', () => {
    const sample = samples[0]
    const result = makeDemoResult(sample.logs, sample.compose)
    expect(sample.badge).toContain('FIXTURE')
    expect(result.analysis_source).toContain('no live AI call')
    expect(result.proposed_changes[0]?.after).toContain('DB_PORT: "5432"')
    expect(result.findings[0].source_matched).toBe(false)
  })

  it('reports an absent error separately from manual health and redacts exported values', () => {
    const verification = compareIncident(['connection refused'], 'Service restarted\nPASSWORD=hunter2', 'not checked')
    expect(verification).toMatchObject({ originalError: 'not observed', applicationHealth: 'not checked' })
    expect(verification.freshLogs).not.toContain('hunter2')
    const sample = samples[0]
    const result = makeDemoResult(sample.logs, sample.compose)
    const report = exportReport(result, 'demo', verification, '2025-01-01T00:00:00.000Z')
    expect(report).toContain('Demo Data — no live AI call')
    expect(report).toContain('Application health: not checked')
    expect(report).not.toContain('hunter2')
  })

  it('keeps no-signature comparisons inconclusive and not healthy by default', () => {
    expect(compareIncident([], 'fresh and quiet', 'not checked')).toMatchObject({ originalError: 'inconclusive', applicationHealth: 'not checked' })
  })

  it('masks bearer tokens and URL passwords', () => {
    const redacted = redactText('Authorization: Bearer abc.def\npostgres://user:secret@db/app')
    expect(redacted).not.toContain('abc.def')
    expect(redacted).not.toContain(':secret@')
  })
})
