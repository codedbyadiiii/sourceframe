export type SourceKind = 'logs' | 'compose'
export type DiagnosisStatus = 'likely_cause' | 'insufficient_evidence' | 'no_failure_found'
export type FindingKind = 'observed_fact' | 'hypothesis'
export type HealthResult = 'passed' | 'failed' | 'not checked'
export type OriginalErrorStatus = 'present' | 'not observed' | 'inconclusive'

export interface Evidence {
  source: SourceKind
  start_line: number
  end_line: number
  quote: string
}

export interface Finding {
  title: string
  explanation: string
  kind: FindingKind
  evidence: Evidence[]
  beginner_note?: string | null
  source_matched: boolean
  severity?: string
}

export interface ProposedChange {
  explanation: string
  before: string
  after: string
  yaml_valid: boolean
}

export interface DiagnosisResult {
  status: DiagnosisStatus
  summary: string
  findings: Finding[]
  proposed_changes: ProposedChange[]
  verification_steps: string[]
  missing_information: string[]
  model_identifier: string
  analysis_source: string
  redacted_logs: string
  redacted_compose: string
  deterministic_checks: string[]
  caveat: string
}

export interface IncidentVerification {
  originalError: OriginalErrorStatus
  applicationHealth: HealthResult
  freshLogs: string
  checkedAt: string
}

export type AppView = 'diagnose' | 'service-map' | 'report' | 'settings'
export type AnalysisMode = 'live' | 'demo'
