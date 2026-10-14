import { useState } from 'react'
import { AlertCircle, CheckCircle2, CircleDashed, Info, RefreshCw, ShieldCheck } from 'lucide-react'
import type { HealthResult, IncidentVerification } from '../types'

export function VerificationPanel({ value, onCompare, stale }: { value: IncidentVerification|null; onCompare: (logs: string, health: HealthResult) => void; stale: boolean }) {
  const [logs, setLogs] = useState('')
  const [health, setHealth] = useState<HealthResult>('not checked')
  return <section className="verification-card">
    <div className="verification-copy"><span className="section-overline">AFTER YOU APPLY A CHANGE</span><h2>Verify the recovery</h2><p>Paste fresh logs and record the result of a health check you ran yourself. CloudSage does not run the check.</p></div>
    {stale&&<div className="inline-warning"><Info size={14}/> This diagnosis is stale. Run a new diagnosis before comparing fresh logs.</div>}
    <label className="field-label" htmlFor="fresh-log-input">Fresh application logs</label><textarea id="fresh-log-input" className="fresh-log-area" value={logs} onChange={(event)=>setLogs(event.target.value)} placeholder="Paste logs collected after applying the change…" spellCheck={false}/>
    <div className="verification-controls"><label htmlFor="health-outcome">Application health <span>Manually supplied result</span></label><select id="health-outcome" value={health} onChange={(event)=>setHealth(event.target.value as HealthResult)}><option value="not checked">Not checked</option><option value="passed">Passed</option><option value="failed">Failed</option></select><button className="button-primary" onClick={()=>onCompare(logs, health)} disabled={(!logs.trim()&&health==='not checked')||stale}><RefreshCw size={14}/> {logs.trim()?'Compare logs':'Record health'}</button></div>
    {value&&<div className="verification-outcome" aria-live="polite"><Outcome icon={value.originalError==='present'?<AlertCircle size={17}/>:value.originalError==='not observed'?<CheckCircle2 size={17}/>:<CircleDashed size={17}/>} label="Original error" value={value.originalError} tone={value.originalError==='present'?'error':value.originalError==='not observed'?'warning':'neutral'}/><Outcome icon={value.applicationHealth==='passed'?<ShieldCheck size={17}/>:value.applicationHealth==='failed'?<AlertCircle size={17}/>:<CircleDashed size={17}/>} label="Application health" value={value.applicationHealth} tone={value.applicationHealth==='passed'?'success':value.applicationHealth==='failed'?'error':'neutral'} detail={value.applicationHealth==='not checked'?'Not checked':`Manually reported ${value.applicationHealth}`}/><p className="verification-caveat">“Not observed” only means the cited original signature wasn’t found. An error disappearing from logs does not prove the application is healthy.</p></div>}
    <div className="verification-note"><Info size={14}/><span>Original error and application health are independent results. Health is never inferred from quiet logs.</span></div>
  </section>
}

function Outcome({ icon, label, value, tone, detail }: { icon: React.ReactNode; label: string; value: string; tone: string; detail?: string }) {
  return <div className={`outcome-cell outcome-${tone}`}><span className="outcome-label">{icon}{label}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</div>
}
