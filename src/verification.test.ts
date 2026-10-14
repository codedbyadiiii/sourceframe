import { describe, expect, it } from 'vitest'
import { compareIncident } from './incident'

describe('before/after comparison', () => {
  it('does not equate an unobserved error with healthy application status', () => {
    expect(compareIncident(['connection refused'], 'Started successfully', 'not checked')).toMatchObject({
      originalError: 'not observed',
      applicationHealth: 'not checked',
    })
  })

  it('reports the original exact signature independently of manually reported health', () => {
    expect(compareIncident(['FATAL: database missing'], 'FATAL: database missing', 'passed')).toMatchObject({
      originalError: 'present',
      applicationHealth: 'passed',
    })
  })

  it('marks empty new logs as inconclusive', () => {
    expect(compareIncident(['original error'], '', 'failed')).toMatchObject({ originalError: 'inconclusive', applicationHealth: 'failed' })
  })

  it('does not invent a failure signature when diagnosis has no log citations', () => {
    expect(compareIncident([], 'Fresh logs without an original signature', 'not checked')).toMatchObject({ originalError: 'inconclusive', applicationHealth: 'not checked' })
  })
})
