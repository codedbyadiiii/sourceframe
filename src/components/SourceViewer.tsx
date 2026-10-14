import { useEffect, useRef } from 'react'
import { FileCode2, FileText, Quote, ScanLine } from 'lucide-react'
import type { Evidence, SourceKind } from '../types'

export function SourceViewer({ logs, compose, active, onReady }: { logs: string; compose: string; active: Evidence | null; onReady?: () => void }) {
  const rowRefs = useRef(new Map<number, HTMLElement>())
  const source: SourceKind = active?.source ?? 'logs'
  const content = source === 'logs' ? logs : compose
  const rows = content.split('\n')
  useEffect(() => {
    if (!active || active.source !== source) return
    const target = rowRefs.current.get(active.start_line)
    if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    onReady?.()
  }, [active, source, onReady])
  return <section className="source-viewer" id="evidence-source-viewer" aria-label="Analyzed source snapshot">
    <header className="viewer-head"><div className="viewer-title"><span className="mini-eyebrow"><ScanLine size={13}/> ANALYZED SOURCE SNAPSHOT</span><span className="viewer-name">{source === 'logs' ? <FileText size={14}/> : <FileCode2 size={14}/>} {source === 'logs' ? 'Application logs' : 'Compose YAML'}</span></div><span className="snapshot-label">Redacted · {rows.length} lines</span></header>
    {active&&<div className="quote-strip"><Quote size={14}/><span>{active.quote}</span><small>LINES {active.start_line}{active.end_line !== active.start_line ? `–${active.end_line}` : ''}</small></div>}
    <div className="viewer-code" role="region" aria-label={`${source} source lines`} tabIndex={0}>{rows.map((line, index) => {
      const lineNumber = index + 1
      const highlighted = active?.source === source && lineNumber >= active.start_line && lineNumber <= active.end_line
      return <div key={lineNumber} ref={(node) => { if (node) rowRefs.current.set(lineNumber, node); else rowRefs.current.delete(lineNumber) }} className={`viewer-row ${highlighted ? 'highlighted' : ''}`} aria-current={highlighted ? 'location' : undefined}><span className="viewer-line-number">{lineNumber}</span><code>{line || ' '}</code></div>
    })}</div>
    {!active&&<div className="viewer-hint">Choose a citation to jump to its exact source lines.</div>}
  </section>
}
