import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowRight, Check, FileText, LoaderCircle, Play, ShieldCheck, Sparkles } from 'lucide-react'
import { ApiError, checkBackend, defaultApiBase, diagnoseRequest } from './api'
import { AppShell, PageHeading, StatusBadge } from './components/StatusBadge'
import { DiagnosisSummary } from './components/DiagnosisSummary'
import { FixDiff } from './components/FixDiff'
import { ReportView } from './components/ReportView'
import { ServiceMap } from './components/ServiceMap'
import { SettingsView } from './components/SettingsView'
import { SourceInput } from './components/SourceInput'
import { SourceViewer } from './components/SourceViewer'
import { VerificationPanel } from './components/VerificationPanel'
import { compareIncident, exportReport, makeDemoResult, originalLogQuotes, samples, validateSources } from './incident'
import type { AnalysisMode, AppView, DiagnosisResult, Evidence, HealthResult, IncidentVerification, SourceKind } from './types'
import './style.css'

type Inputs = { logs: string; compose: string }
type FileInfo = { name: string; size: number } | null

export default function App() {
  const [view, setView] = useState<AppView>('diagnose')
  const [inputs, setInputs] = useState<Inputs>({ logs: '', compose: '' })
  const [files, setFiles] = useState<Record<SourceKind, FileInfo>>({ logs: null, compose: null })
  const [result, setResult] = useState<DiagnosisResult|null>(null)
  const [mode, setMode] = useState<AnalysisMode|null>(null)
  const [analyzedInputs, setAnalyzedInputs] = useState<Inputs|null>(null)
  const [createdAt, setCreatedAt] = useState<string|null>(null)
  const [verification, setVerification] = useState<IncidentVerification|null>(null)
  const [activeEvidence, setActiveEvidence] = useState<Evidence|null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [apiBase, setApiBase] = useState(defaultApiBase)
  const [connection, setConnection] = useState<'checking'|'connected'|'offline'>('checking')
  const [checkingConnection, setCheckingConnection] = useState(false)
  const requestId = useRef(0)
  const healthRequestId = useRef(0)
  const controller = useRef<AbortController|null>(null)
  const timer = useRef<number|undefined>(undefined)

  const validation = useMemo(() => validateSources(inputs.logs, inputs.compose), [inputs])
  const stale = Boolean(result && analyzedInputs && (inputs.logs !== analyzedInputs.logs || inputs.compose !== analyzedInputs.compose))
  const visibleInputs = result && !stale ? { logs: result.redacted_logs, compose: result.redacted_compose } : inputs

  const cancelAnalysis = useCallback(() => {
    requestId.current += 1
    controller.current?.abort()
    controller.current = null
    if (timer.current) window.clearTimeout(timer.current)
    setBusy(false)
  }, [])

  const onCheck = useCallback(async (base = apiBase) => {
    const checkId = ++healthRequestId.current
    setCheckingConnection(true); setConnection('checking')
    const checkController = new AbortController()
    const timeout = window.setTimeout(() => checkController.abort(), 5_000)
    try {
      await checkBackend(base, checkController.signal)
      if (checkId === healthRequestId.current) setConnection('connected')
    } catch {
      if (checkId === healthRequestId.current) setConnection('offline')
    } finally {
      window.clearTimeout(timeout)
      if (checkId === healthRequestId.current) setCheckingConnection(false)
    }
  }, [apiBase])

  useEffect(() => {
    void onCheck()
    return () => { controller.current?.abort(); if (timer.current) window.clearTimeout(timer.current) }
  }, []) // Initial backend reachability is checked once; it never implies model readiness.

  const updateInput = (source: SourceKind, value: string) => {
    cancelAnalysis()
    setInputs((current) => ({ ...current, [source]: value }))
    setFiles((current) => ({ ...current, [source]: null }))
    setError('')
  }
  const clearInput = (source: SourceKind) => updateInput(source, '')
  const onFile = async (source: SourceKind, file: File) => {
    const text = await file.text()
    cancelAnalysis()
    setInputs((current) => ({ ...current, [source]: text }))
    setFiles((current) => ({ ...current, [source]: { name: file.name, size: file.size } }))
    setError('')
  }
  const loadSample = (sampleId: string) => {
    const sample = samples.find((entry) => entry.id === sampleId)
    if (!sample) return
    cancelAnalysis()
    setInputs({ logs: sample.logs, compose: sample.compose })
    setFiles({ logs: null, compose: null })
    setError('')
    setActiveEvidence(null)
    setView('diagnose')
    // Loading a fixture only changes inputs; it never claims an analysis occurred.
  }

  const finishAnalysis = (next: DiagnosisResult, nextMode: AnalysisMode, snapshot: Inputs) => {
    setResult(next)
    setMode(nextMode)
    setAnalyzedInputs(snapshot)
    setCreatedAt(new Date().toISOString())
    setVerification(null)
    setActiveEvidence(null)
    setError('')
    setView('diagnose')
  }

  const runDiagnosis = async () => {
    if (!validation.valid) { setError(validation.error ?? 'Input is not ready.'); return }
    cancelAnalysis()
    const currentId = requestId.current
    const activeController = new AbortController()
    controller.current = activeController
    const snapshot = { ...inputs }
    setBusy(true); setError('')
    timer.current = window.setTimeout(() => activeController.abort(), 50_000)
    try {
      const response = await diagnoseRequest(apiBase, snapshot, activeController.signal)
      if (currentId !== requestId.current) return
      finishAnalysis(response, 'live', snapshot)
    } catch (requestError) {
      if (currentId !== requestId.current) return
      if (requestError instanceof DOMException && requestError.name === 'AbortError') setError('Analysis timed out or was cancelled. Check the backend/provider connection and retry.')
      else if (requestError instanceof ApiError) setError(requestError.message)
      else setError('The diagnosis request failed unexpectedly. No saved result was substituted.')
    } finally {
      if (timer.current) window.clearTimeout(timer.current)
      if (currentId === requestId.current) { setBusy(false); controller.current = null }
    }
  }

  const previewDemo = () => {
    cancelAnalysis()
    const sample = samples.find((entry) => entry.id === 'port')!
    const demoInputs = { logs: sample.logs, compose: sample.compose }
    setInputs(demoInputs)
    setFiles({ logs: null, compose: null })
    finishAnalysis(makeDemoResult(demoInputs.logs, demoInputs.compose), 'demo', demoInputs)
  }

  const onEvidence = (evidence: Evidence) => {
    setActiveEvidence(evidence)
    window.requestAnimationFrame(() => {
      const viewer = document.getElementById('evidence-source-viewer')
      if (viewer && typeof viewer.scrollIntoView === 'function') viewer.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const compare = (freshLogs: string, health: HealthResult) => {
    if (!result || stale) return
    setVerification(compareIncident(originalLogQuotes(result), freshLogs, health))
  }

  const exportIncident = () => {
    if (!result || !mode) return
    const content = exportReport(result, mode, verification, createdAt ?? new Date().toISOString())
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }))
    link.download = 'cloudsage-incident-report.md'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const applyApiBase = (value: string) => {
    setApiBase(value || defaultApiBase())
    setConnection('checking')
  }

  return <AppShell view={view} onView={setView} connection={connection} mode={stale ? null : mode} model={!stale&&mode === 'live' ? result?.model_identifier ?? null : null}>
    {view === 'diagnose'&&<>
      <PageHeading eyebrow="DEPLOYMENT INVESTIGATION" title="Diagnose deployment failures with evidence." description="Connect runtime errors to Compose configuration. Review traceable findings, then verify the change yourself." action={<div className="privacy-chip"><ShieldCheck size={14}/> Hosted analysis · best-effort redaction</div>}/>
      <ProgressSteps inputsValid={validation.valid} analyzed={Boolean(result&&!stale)} verified={Boolean(verification&&!stale)} mode={mode}/>
      <section className="samples-bar"><div className="samples-label"><span className="section-overline">START WITH A CASE</span><small>Samples fill inputs only</small></div><div className="sample-buttons">{samples.map((sample)=><button key={sample.id} className="sample-button" onClick={()=>loadSample(sample.id)}><span className="sample-dot"/>{sample.title}<small>{sample.badge}</small></button>)}</div><button className="demo-preview-button" disabled={busy} onClick={previewDemo}><Play size={13}/> Preview demo results</button></section>
      <div className="workspace-grid">
        <section className="input-workspace"><div className="section-row workspace-title"><div><span className="section-overline">01 / ADD EVIDENCE</span><h2>Incident sources</h2></div><span className="input-limit">100 KB max each</span></div>
          <SourceInput kind="logs" value={visibleInputs.logs} filename={files.logs?.name??null} fileSize={files.logs?.size} error={visibleInputs.logs.trim()&&new TextEncoder().encode(inputs.logs).byteLength>100_000?'Logs exceed the 100 KB limit.':undefined} onChange={(value)=>updateInput('logs',value)} onFile={(file)=>void onFile('logs',file)} onClear={()=>clearInput('logs')} selectedLines={!stale&&activeEvidence?.source==='logs'?[activeEvidence.start_line,activeEvidence.end_line]:null}/>
          <SourceInput kind="compose" value={visibleInputs.compose} filename={files.compose?.name??null} fileSize={files.compose?.size} error={visibleInputs.compose.trim()&&new TextEncoder().encode(inputs.compose).byteLength>100_000?'Compose YAML exceeds the 100 KB limit.':undefined} onChange={(value)=>updateInput('compose',value)} onFile={(file)=>void onFile('compose',file)} onClear={()=>clearInput('compose')} selectedLines={!stale&&activeEvidence?.source==='compose'?[activeEvidence.start_line,activeEvidence.end_line]:null}/>
          {inputs.compose.trim()&&!validation.valid&&<div className="input-validation" role="alert"><AlertCircle size={14}/>{validation.error}</div>}
          {error&&<div className="request-error" role="alert"><AlertCircle size={15}/><span>{error}</span></div>}
          <div className="analysis-actions"><button className="button-primary diagnose-button" disabled={!validation.valid||busy} onClick={()=>void runDiagnosis()}>{busy?<><LoaderCircle size={16} className="spin"/> Diagnosing with Gemma…</>:<><Sparkles size={16}/> Diagnose deployment <ArrowRight size={15}/></>}</button><p><ShieldCheck size={13}/> Hosted analysis sends redacted inputs to the configured AI provider. Secret masking is best-effort.</p></div>
        </section>
        <section className="results-workspace"><div className="section-row results-title"><div><span className="section-overline">02 / DIAGNOSE</span><h2>Analysis results</h2></div>{result&&<StatusBadge tone={mode==='demo'?'demo':'live'}>{mode==='demo'?'DEMO DATA':'LIVE ANALYSIS'}</StatusBadge>}</div>
          {busy?<div className="analysis-loading" role="status" aria-live="polite"><div className="loading-orbit"><LoaderCircle size={22}/></div><h3>Following the evidence trail</h3><p>Sending best-effort redacted sources to the hosted model. This can take a moment.</p><span>Request timeout · 50 seconds</span></div>:result?<>
            {mode==='demo'&&<div className="demo-banner" role="status"><span className="demo-indicator"/><div><b>Demo Data — no live AI call</b><span>Synthetic preview only. Click Diagnose deployment to request a live analysis.</span></div></div>}
            <DiagnosisSummary result={result} onEvidence={onEvidence} stale={stale}/>
            <SourceViewer logs={result.redacted_logs} compose={result.redacted_compose} active={activeEvidence}/>
            <section className="result-subpanel"><div className="section-row"><div><span className="section-overline">03 / PROPOSED FIX</span><h2>Review before applying</h2></div></div><FixDiff changes={result.proposed_changes}/></section>
            <section className="result-subpanel"><div className="section-row"><div><span className="section-overline">04 / VERIFY RECOVERY</span><h2>Compare after the change</h2></div></div><VerificationPanel key={`${createdAt}-${mode}`} value={verification} onCompare={compare} stale={stale}/></section>
          </>:<div className="results-empty"><div className="empty-graphic"><div className="empty-file"><FileText size={20}/><span/></div><div className="empty-dash dash-one"/><div className="empty-dash dash-two"/><div className="empty-target"><Sparkles size={18}/></div></div><span className="section-overline">READY WHEN YOU ARE</span><h3>Your evidence, connected.</h3><p>Add logs and Compose YAML, then run a live diagnosis. Findings will link back to the exact redacted source lines.</p><div className="empty-points"><span><Check size={13}/> Traceable evidence</span><span><Check size={13}/> Minimal fix review</span><span><Check size={13}/> Manual verification</span></div></div>}
        </section>
      </div>
      <div className="disclaimer-strip"><AlertCircle size={14}/><span>Source matching supports traceability, not causality. Review suggestions and verify application health independently.</span></div>
    </>}
    {view==='service-map'&&<><PageHeading eyebrow="CONFIGURATION TOPOLOGY" title="Service Map" description="Inspect backend-supplied deployment checks without inferring unverified service health."/><ServiceMap result={result} stale={stale}/></>}
    {view==='report'&&<ReportView result={result} mode={mode} verification={verification} createdAt={createdAt} stale={stale} onExport={exportIncident}/>}
    {view==='settings'&&<SettingsView apiBase={apiBase} setApiBase={applyApiBase} connection={connection} checking={checkingConnection} onCheck={()=>void onCheck(apiBase)} result={result} mode={mode}/>}
    <footer className="workspace-footer"><span><span className="footer-mark"/> CloudSage AI</span><span>Open-weight AI diagnostics <i/> Incident content stays in this tab only</span></footer>
  </AppShell>
}

function ProgressSteps({ inputsValid, analyzed, verified, mode }: { inputsValid: boolean; analyzed: boolean; verified: boolean; mode: AnalysisMode|null }) {
  const steps = [
    { label: 'Add evidence', complete: inputsValid, active: !inputsValid },
    { label: 'Diagnose', complete: analyzed, active: inputsValid&&!analyzed },
    { label: 'Verify recovery', complete: verified, active: analyzed&&!verified },
  ]
  return <nav className="progress-steps" aria-label="Diagnosis progress">{steps.map((step,index)=><div key={step.label} className={`progress-step ${step.complete?'complete':''} ${step.active?'active':''}`} aria-current={step.active?'step':undefined}><span className="progress-index">{step.complete?<Check size={13}/>:`0${index+1}`}</span><span>{step.label}</span>{index===1&&mode==='demo'&&<small>DEMO</small>}{index<steps.length-1&&<i className="progress-connector"/>}</div>)}</nav>
}
