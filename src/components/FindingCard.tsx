import { ArrowUpRight, BookOpenText, CheckCircle2, CircleHelp, Quote } from 'lucide-react'
import type { Evidence, Finding } from '../types'

export function EvidenceReference({ evidence, sourceMatched, onClick }: { evidence: Evidence; sourceMatched: boolean; onClick: (evidence: Evidence) => void }) {
  return <button className="evidence-reference" onClick={() => onClick(evidence)} aria-label={`Open ${evidence.source === 'logs' ? 'logs' : 'Compose'} lines ${evidence.start_line} to ${evidence.end_line}`}><Quote size={13}/><span>{evidence.source === 'logs' ? 'Logs' : 'Compose'} · lines {evidence.start_line}{evidence.end_line !== evidence.start_line ? `–${evidence.end_line}` : ''}</span>{sourceMatched&&<span className="matched-mark" title="Citation quote verified against the submitted redacted source"><CheckCircle2 size={13}/> Source matched</span>}<ArrowUpRight size={12} className="evidence-arrow"/></button>
}

export function FindingCard({ finding, index, onEvidence }: { finding: Finding; index: number; onEvidence: (evidence: Evidence) => void }) {
  const observed = finding.kind === 'observed_fact'
  return <article className="finding-card">
    <div className="finding-card-top"><span className={`finding-kind ${observed ? 'fact' : 'hypothesis'}`}>{observed ? <CheckCircle2 size={13}/> : <CircleHelp size={13}/>} {observed ? 'OBSERVED FACT' : 'AI HYPOTHESIS'}</span>{finding.severity&&<span className={`severity severity-${finding.severity.toLowerCase()}`}>{finding.severity}</span>}<span className="finding-index">{String(index + 1).padStart(2, '0')}</span></div>
    <h3>{finding.title}</h3><p>{finding.explanation}</p>
    {finding.beginner_note&&<div className="concept-note"><BookOpenText size={14}/><span>{finding.beginner_note}</span></div>}
    <div className="evidence-list" aria-label="Evidence references">{finding.evidence.length ? finding.evidence.map((evidence, evidenceIndex) => <EvidenceReference key={`${evidence.source}-${evidence.start_line}-${evidenceIndex}`} evidence={evidence} sourceMatched={finding.source_matched} onClick={onEvidence}/>) : <span className="no-citation">No source citation supplied</span>}</div>
  </article>
}
