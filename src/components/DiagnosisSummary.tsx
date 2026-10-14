import { AlertTriangle, Check, CheckCircle2, CircleHelp, Info, ListChecks } from 'lucide-react'
import type { DiagnosisResult } from '../types'
import { diagnosisLabel, StatusBadge } from './StatusBadge'
import { FindingCard } from './FindingCard'

export function DiagnosisSummary({ result, onEvidence, stale }: { result: DiagnosisResult; onEvidence: (evidence: import('../types').Evidence) => void; stale: boolean }) {
  const statusIcon = result.status === 'likely_cause' ? <AlertTriangle size={19}/> : result.status === 'no_failure_found' ? <CheckCircle2 size={19}/> : <CircleHelp size={19}/>
  return <div className="diagnosis-stack">
    {stale&&<div className="stale-banner" role="status"><Info size={15}/><span><b>Inputs changed after this analysis.</b> Citations still refer to the redacted snapshot below; rerun diagnosis to analyze your current inputs.</span></div>}
    <section className={`diagnosis-summary status-${result.status}`} aria-live="polite"><div className="summary-icon">{statusIcon}</div><div className="summary-main"><div className="summary-label"><span>DIAGNOSIS</span><StatusBadge tone={result.status === 'likely_cause' ? 'warning' : result.status === 'no_failure_found' ? 'success' : 'neutral'}>{diagnosisLabel(result)}</StatusBadge></div><h2>{result.summary}</h2><p>{result.caveat}</p></div></section>
    <div className="result-meta"><span className="model-result"><span className="model-mark">G</span><span>Analyzed with <b>{result.model_identifier}</b></span><i/> {result.analysis_source}</span><span className="citation-caveat"><Info size={13}/> Source match does not prove causality.</span></div>
    {result.deterministic_checks.length>0&&<section className="deterministic-checks"><div className="section-mini-heading"><ListChecks size={15}/><span>DETERMINISTIC CONFIGURATION CHECKS</span></div><ul>{result.deterministic_checks.map((item, index)=><li key={index}><span className="check-bullet"/>{item}</li>)}</ul></section>}
    {result.verification_steps.length>0&&<section className="verification-steps"><div className="section-mini-heading"><CheckCircle2 size={15}/><span>RECOMMENDED VERIFICATION · NOT RUN</span></div><ul>{result.verification_steps.map((item, index)=><li key={index}><Check size={13}/>{item}</li>)}</ul></section>}
    <section className="findings-section"><div className="section-row"><div><div className="section-overline">EVIDENCE & REASONING</div><h2>What we found</h2></div><span className="finding-total">{result.findings.length} {result.findings.length === 1 ? 'finding' : 'findings'}</span></div>
      {result.findings.length ? <div className="finding-list">{result.findings.map((finding, index)=><FindingCard key={`${finding.kind}-${index}`} finding={finding} index={index} onEvidence={onEvidence}/>)}</div> : <div className="empty-card"><CircleHelp size={18}/><div><b>No findings returned</b><p>Review the source and missing-information notes, then try again with additional context.</p></div></div>}
    </section>
    {result.missing_information.length>0&&<section className="missing-panel"><div className="section-mini-heading"><CircleHelp size={15}/><span>MORE CONTEXT MAY HELP</span></div><ul>{result.missing_information.map((item, index)=><li key={index}>{item}</li>)}</ul></section>}
  </div>
}
