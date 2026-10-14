import { ArrowDown, CircleHelp, GitBranch, Info } from 'lucide-react'
import type { DiagnosisResult } from '../types'

export function ServiceMap({ result, stale }: { result: DiagnosisResult|null; stale: boolean }) {
  return <section className="map-panel">
    <div className="map-legend"><span><i className="legend-declared"/> Declared dependency</span><span><i className="legend-inferred"/> Inferred connection</span><span><i className="legend-unknown"/> Health unknown</span></div>
    {result&&result.deterministic_checks.length>0?<div className="map-checks"><div className="map-empty-graphic"><div className="map-node"><b>Compose facts</b><small>Deterministic checks</small></div><ArrowDown size={18}/><div className="map-node muted-node"><b>Service graph unavailable</b><small>Current API returns check strings, not structured services or edges.</small></div></div><div className="map-fact-list"><div className="section-overline">BACKEND-SUPPLIED CHECKS{stale?' · STALE SNAPSHOT':''}</div>{result.deterministic_checks.map((check,index)=><p key={index}><GitBranch size={14}/>{check}</p>)}</div></div>:<div className="map-empty"><div className="map-empty-graphic"><div className="map-node"><b>Compose configuration</b><small>Service relationships not supplied</small></div><ArrowDown size={18}/><div className="map-node muted-node"><b>Unknown</b><small>Health not established</small></div></div><div className="map-empty-message"><CircleHelp size={18}/><h2>{result?'No backend configuration checks were returned':'Run a diagnosis to inspect configuration facts'}</h2><p>The current diagnosis response does not contain structured service nodes or dependency edges, so CloudSage won’t infer or fabricate a service map.</p></div></div>}
    <div className="map-contract-note"><Info size={14}/> Explicit dependencies and inferred network connections require structured relationship data from the backend. A single error does not establish service health.</div>
  </section>
}
