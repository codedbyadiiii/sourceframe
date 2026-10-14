import yaml from 'js-yaml'
import type { DiagnosisResult, Evidence, HealthResult, IncidentVerification, OriginalErrorStatus } from './types'

export const MAX_BYTES = 100_000

export const samples = [
  {
    id: 'port', title: 'Wrong database port', badge: 'LOG FIXTURE',
    logs: 'Starting application\nDatabase connection failed: dial tcp db:5433: connect: connection refused\nStartup aborted',
    compose: `services:\n  app:\n    image: example/app:latest\n    environment:\n      DB_HOST: db\n      DB_PORT: "5433"\n      DB_NAME: appdb\n      DB_USER: app\n      DB_PASSWORD: demo-only\n    depends_on:\n      db:\n        condition: service_healthy\n  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_DB: appdb\n      POSTGRES_USER: app\n      POSTGRES_PASSWORD: demo-only\n    ports:\n      - "5433:5432"\n    healthcheck:\n      test: ["CMD-SHELL", "pg_isready -U app -d appdb"]\n      interval: 2s\n      timeout: 2s\n      retries: 10`,
  },
  {
    id: 'database', title: 'Database-name mismatch', badge: 'LOG FIXTURE',
    logs: 'Database connection established\nFATAL: database "inventory" does not exist\nStartup aborted',
    compose: `services:\n  app:\n    image: example/app:latest\n    environment:\n      DB_HOST: db\n      DB_PORT: "5432"\n      DB_NAME: inventory\n      DB_USER: app\n    depends_on:\n      db:\n        condition: service_healthy\n  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_DB: catalog\n      POSTGRES_USER: app\n    healthcheck:\n      test: ["CMD-SHELL", "pg_isready -U app -d catalog"]\n      interval: 2s\n      timeout: 2s\n      retries: 10`,
  },
  { id: 'context', title: 'Missing context', badge: 'SAMPLE INPUT', logs: 'ERROR: connection failed\nRetrying...', compose: 'services:\n  app:\n    image: example/app:latest' },
  {
    id: 'healthy', title: 'Healthy deployment', badge: 'SAMPLE INPUT',
    logs: 'GET /health 200 OK\nDatabase query succeeded',
    compose: `services:\n  app:\n    environment:\n      DB_HOST: db\n      DB_PORT: "5432"\n  db:\n    image: postgres:16-alpine\n    ports:\n      - "5433:5432"`,
  },
] as const

export type SampleId = (typeof samples)[number]['id']

export function validateSources(logs: string, compose: string): { valid: boolean; error?: string } {
  if (!logs.trim() || !compose.trim()) return { valid: false, error: 'Add both application logs and Compose YAML.' }
  if (new TextEncoder().encode(logs).byteLength > MAX_BYTES || new TextEncoder().encode(compose).byteLength > MAX_BYTES) return { valid: false, error: 'Each source must be 100 KB or smaller.' }
  try {
    const parsed: unknown = yaml.load(compose)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !('services' in parsed) || !parsed.services || typeof parsed.services !== 'object' || Array.isArray(parsed.services)) {
      return { valid: false, error: 'Compose YAML must contain a services mapping.' }
    }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Invalid Compose YAML.' }
  }
  return { valid: true }
}

export function redactText(value: string): string {
  return value
    .replace(/(\b(?:password|passwd|token|api[_-]?key|secret)\b\s*[:=]\s*)([^\s,;]+)/gi, '$1[REDACTED]')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1[REDACTED]')
    .replace(/(\/\/[^:/\s]+:)([^@/\s]+)(@)/g, '$1[REDACTED]$3')
}

export function compareIncident(originalQuotes: string[], freshLogs: string, health: HealthResult): IncidentVerification {
  let originalError: OriginalErrorStatus = 'inconclusive'
  if (freshLogs.trim() && originalQuotes.length > 0) {
    originalError = originalQuotes.some((quote) => quote.length > 0 && freshLogs.includes(quote)) ? 'present' : 'not observed'
  }
  return { originalError, applicationHealth: health, freshLogs: redactText(freshLogs), checkedAt: new Date().toISOString() }
}

export function originalLogQuotes(result: DiagnosisResult | null): string[] {
  if (!result) return []
  return result.findings.filter((finding) => finding.kind === 'observed_fact')
    .flatMap((finding) => finding.evidence.filter((evidence) => evidence.source === 'logs').map((evidence) => evidence.quote))
}

export function sourceForEvidence(result: DiagnosisResult, evidence: Evidence): string {
  return evidence.source === 'logs' ? result.redacted_logs : result.redacted_compose
}

export function makeDemoResult(logs: string, compose: string): DiagnosisResult {
  const redactedCompose = redactText(compose)
  const redactedLogs = redactText(logs)
  const composeLines = redactedCompose.split(/\r?\n/)
  const logsLines = redactedLogs.split(/\r?\n/)
  const logLine = Math.max(1, logsLines.findIndex((line) => /connection failed|refused|fatal/i.test(line)) + 1)
  const portIndex = composeLines.findIndex((line) => /DB_PORT/.test(line))
  const portLine = Math.max(1, portIndex + 1)
  const quoteAt = (source: string[], index: number) => source[index - 1] || source[0] || ''
  let proposedChanges: DiagnosisResult['proposed_changes'] = []
  try {
    const config = yaml.load(redactedCompose) as Record<string, unknown>
    const services = config?.services as Record<string, { environment?: Record<string, unknown>; ports?: unknown[] }> | undefined
    const app = services?.app
    const db = services?.db
    const environment = app?.environment
    const currentPort = environment && !Array.isArray(environment) ? String(environment.DB_PORT ?? '') : ''
    const published = db?.ports?.[0]
    let targetPort = ''
    if (typeof published === 'string') {
      const bits = published.split(':')
      targetPort = bits.length > 1 ? bits[bits.length - 1] : bits[0]
    } else if (published && typeof published === 'object' && 'target' in published) {
      targetPort = String((published as { target: unknown }).target)
    }
    if (currentPort && targetPort && currentPort !== targetPort && portIndex >= 0) {
      const before = composeLines.join('\n')
      const escaped = currentPort.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const after = before.replace(new RegExp(`(DB_PORT:\\s*["']?)${escaped}(["']?)`), `$1${targetPort}$2`)
      const syntaxValid = (() => { try { yaml.load(after); return true } catch { return false } })()
      proposedChanges = [{
        explanation: 'Demo-only example: a container should connect to the database service on its target/container port.',
        before, after, yaml_valid: syntaxValid,
      }]
    }
  } catch {
    // Demo preview remains illustrative; input validation is handled before this helper is called.
  }
  return {
    status: 'likely_cause',
    summary: 'Demo preview only: compare the configured database port with the database container port.',
    findings: [{
      title: 'Check the app’s internal database port',
      explanation: 'This synthetic preview illustrates the evidence layout. Run a real diagnosis to get Gemma analysis for your inputs.',
      kind: 'hypothesis',
      evidence: [
        { source: 'logs', start_line: logLine, end_line: logLine, quote: quoteAt(logsLines, logLine) },
        { source: 'compose', start_line: portLine, end_line: portLine, quote: quoteAt(composeLines, portLine) },
      ],
      beginner_note: 'A published host port is for connecting from outside Docker; containers on a Compose network normally use the container target port.',
      source_matched: false,
    }],
    proposed_changes: proposedChanges,
    verification_steps: ['Run a new analysis with live backend access for input-specific findings.'],
    missing_information: [],
    model_identifier: 'Synthetic preview',
    analysis_source: 'Demo Data — no live AI call',
    redacted_logs: redactedLogs,
    redacted_compose: redactedCompose,
    deterministic_checks: [],
    caveat: 'Demo data is illustrative only; it is not a diagnosis of your deployment.',
  }
}

export function exportReport(result: DiagnosisResult, mode: 'live' | 'demo', verification: IncidentVerification | null, createdAt: string): string {
  const findings = result.findings.map((finding) => {
    const citations = finding.evidence.map((evidence) => `- ${evidence.source === 'logs' ? 'Logs' : 'Compose'} lines ${evidence.start_line}–${evidence.end_line}: “${redactText(evidence.quote)}” (Source matched: ${finding.source_matched ? 'yes' : 'no'})`).join('\n')
    return `### ${redactText(finding.title)} — ${finding.kind.replace('_', ' ')}\n\n${redactText(finding.explanation)}${finding.beginner_note ? `\n\n${redactText(finding.beginner_note)}` : ''}\n\n${citations || 'No source citations.'}`
  }).join('\n\n')
  const changes = result.proposed_changes.map((change) => `### ${redactText(change.explanation)}\n\nSyntax validation: ${change.yaml_valid ? 'valid' : 'invalid'}\n\n\`\`\`yaml\n${redactText(change.after)}\n\`\`\``).join('\n\n')
  const verificationText = verification?.freshLogs
    ? `Fresh logs (redacted):\n\n${redactText(verification.freshLogs).split('\n').map((line) => `> ${line}`).join('\n')}`
    : 'Fresh logs: not provided.'
  return [
    '# CloudSage AI incident report',
    `Analysis timestamp: ${createdAt}`,
    `Analysis source: ${mode === 'demo' ? 'Demo Data — no live AI call' : result.analysis_source}`,
    `Model: ${result.model_identifier}`,
    '', '## Summary', redactText(result.summary), `Status: ${result.status.replaceAll('_', ' ')}`,
    '', '## Findings', findings || 'No findings returned.',
    '', '## Proposed changes', changes || 'No proposed changes.',
    '', '## Recommended verification', ...(result.verification_steps.length ? result.verification_steps.map((step) => `- ${redactText(step)}`) : ['No verification steps returned.']),
    '', '## Deterministic configuration checks', ...(result.deterministic_checks.length ? result.deterministic_checks.map((check) => `- ${redactText(check)}`) : ['No deterministic checks returned.']),
    '', '## Verification',
    `Original error: ${verification?.originalError ?? 'inconclusive'}`,
    `Application health: ${verification?.applicationHealth ?? 'not checked'} (manually supplied)`,
    '', verificationText,
    '', '## Missing information', ...(result.missing_information.length ? result.missing_information.map((item) => `- ${redactText(item)}`) : ['None returned.']),
    '', `Caveat: ${redactText(result.caveat)}`,
    'Matching evidence supports traceability but does not prove causal correctness. Error absence does not establish application health.',
  ].join('\n') + '\n'
}
