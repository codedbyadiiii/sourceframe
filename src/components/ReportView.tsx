import { Download, FileText, LockKeyhole } from 'lucide-react'
import type { AnalysisMode, DiagnosisResult, IncidentVerification } from '../types'
import { PageHeading, StatusBadge, diagnosisLabel } from './StatusBadge'

export function ReportView({ result, mode, verification, createdAt, stale, onExport }: { result: DiagnosisResult|null; mode: AnalysisMode|null; verification: IncidentVerification|null; createdAt: string|null; stale: boolean; onExport: () => void }) {
  return <>
    <PageHeading eyebrow="INCIDENT ARTIFACT" title="Incident report" description="A portable, redacted summary of one analysis session." action={<button className="button-primary" disabled={!result||!mode} onClick={onExport}><Download size={15}/> Download Markdown</button>}/>
    {!result||!mode?<div className="report-empty"><span><FileText size={24}/></span><h2>No report to export</h2><p>Run a live diagnosis or explicitly preview demo results. Reports are created in memory and only include redacted content.</p><StatusBadge tone="neutral">EXPORT UNAVAILABLE</StatusBadge></div>:<div className="report-preview">
      <div className="report-preview-top"><div><span className="section-overline">CLOUDSAGE AI · INCIDENT REPORT</span><h2>{result.summary}</h2><p>Analysis timestamp · {createdAt ? new Date(createdAt).toLocaleString() : 'Unknown'}</p></div><StatusBadge tone={mode==='demo'?'demo':'live'}>{mode==='demo'?'DEMO DATA':'LIVE ANALYSIS'}</StatusBadge></div>
      {stale&&<div className="inline-warning">The current inputs have changed since this report’s analysis snapshot.</div>}
      <div className="report-meta-grid"><span>Model<b>{result.model_identifier}</b></span><span>Status<b>{diagnosisLabel(result)}</b></span><span>Source<b>{mode==='demo'?'Synthetic preview':result.analysis_source}</b></span></div>
      <div className="report-section"><h3>Findings</h3>{result.findings.length?result.findings.map((finding,index)=><article key={index}><span className={`finding-kind ${finding.kind==='observed_fact'?'fact':'hypothesis'}`}>{finding.kind.replace('_',' ')}</span><h4>{finding.title}</h4><p>{finding.explanation}</p><small>{finding.evidence.map((item)=>`${item.source==='logs'?'Logs':'Compose'} L${item.start_line}–${item.end_line}${finding.source_matched?' · source matched':''}`).join(' · ')||'No citations provided'}</small></article>):<p>No findings returned.</p>}</div>
      <div className="report-section"><h3>Suggested changes</h3>{result.proposed_changes.length?result.proposed_changes.map((change,index)=><article key={index}><p>{change.explanation}</p><small>YAML syntax {change.yaml_valid?'valid':'invalid'} · review and apply manually</small><pre>{change.after}</pre></article>):<p>No changes proposed.</p>}</div>
      <div className="report-section"><h3>Recommended verification</h3>{result.verification_steps.length?<ul>{result.verification_steps.map((step,index)=><li key={index}>{step}</li>)}</ul>:<p>No model verification steps returned.</p>}</div>
      <div className="report-section"><h3>Missing information</h3>{result.missing_information.length?<ul>{result.missing_information.map((item,index)=><li key={index}>{item}</li>)}</ul>:<p>None returned.</p>}</div>
      <div className="report-section report-verify"><h3>Verification</h3><p>Original error: <b>{verification?.originalError??'inconclusive'}</b></p><p>Application health: <b>{verification?.applicationHealth??'not checked'}</b> <small>(manually supplied)</small></p></div>
      <div className="report-footnote"><LockKeyhole size={14}/> Redacted evidence only · Matching evidence does not prove causality · Error absence does not prove health.</div>
    </div>}
  </>
}
