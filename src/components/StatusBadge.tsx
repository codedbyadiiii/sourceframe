import { CircleAlert, Cloud, FileText, LoaderCircle, Network, Settings2, Wifi, WifiOff } from 'lucide-react'
import type { AnalysisMode, AppView, DiagnosisResult } from '../types'

export function StatusBadge({ tone, children }: { tone: 'live'|'demo'|'neutral'|'warning'|'error'|'success'; children: React.ReactNode }) {
  return <span className={`status-badge tone-${tone}`}><i aria-hidden="true"/>{children}</span>
}

export function ConnectionBadge({ state }: { state: 'checking'|'connected'|'offline' }) {
  const Icon = state === 'checking' ? LoaderCircle : state === 'connected' ? Wifi : WifiOff
  return <span className={`connection-badge ${state}`} role="status" aria-live="polite"><Icon size={14} className={state === 'checking' ? 'spin' : ''}/><span>{state === 'checking' ? 'Checking API' : state === 'connected' ? 'Backend connected' : 'Backend offline'}</span></span>
}

const navigation: { id: AppView; label: string; icon: typeof Cloud }[] = [
  { id: 'diagnose', label: 'Diagnose', icon: CircleAlert },
  { id: 'service-map', label: 'Service Map', icon: Network },
  { id: 'report', label: 'Incident Report', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings2 },
]

export function AppShell({ view, onView, connection, mode, model, children }: {
  view: AppView
  onView: (view: AppView) => void
  connection: 'checking'|'connected'|'offline'
  mode: AnalysisMode | null
  model: string | null
  children: React.ReactNode
}) {
  return <div className="app-frame">
    <aside className="sidebar" aria-label="Primary navigation">
      <a className="brand" href="#diagnose" onClick={(event) => { event.preventDefault(); onView('diagnose') }} aria-label="CloudSage AI home">
        <span className="brand-icon"><Cloud size={20}/><span/></span><span className="brand-copy">CloudSage<span> AI</span><small>DEPLOYMENT INTELLIGENCE</small></span>
      </a>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="side-nav">{navigation.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => onView(id)} aria-current={view === id ? 'page' : undefined}><Icon size={17}/><span>{label}</span>{id === 'diagnose' && <span className="nav-pip"/>}</button>)}</nav>
      <div className="sidebar-spacer"/>
      <div className="sidebar-note"><span className="sidebar-note-icon"><Cloud size={16}/></span><div><strong>Evidence over guesses</strong><p>Trace findings to their exact source lines.</p></div></div>
      <div className="sidebar-footer"><span className="open-weight-mark"><span/> OPEN-WEIGHT AI DIAGNOSTICS</span><span className="sidebar-version">CLOUDSAGE · 0.1</span></div>
    </aside>
    <div className="mobile-topbar"><button className="mobile-brand" onClick={() => onView('diagnose')}><span className="brand-icon"><Cloud size={18}/><span/></span>CloudSage <b>AI</b></button><MobileNav view={view} onView={onView}/></div>
    <main className="main-shell">
      <header className="topbar"><div className="breadcrumbs"><span>CloudSage</span><span className="crumb-divider">/</span><strong>{navigation.find((item) => item.id === view)?.label}</strong></div><div className="topbar-right"><ConnectionBadge state={connection}/>{model&&<span className="model-pill" title="Model returned by the last analysis"><span className="model-mark">G</span><span>{model}</span></span>}<StatusBadge tone={mode === 'live' ? 'live' : mode === 'demo' ? 'demo' : 'neutral'}>{mode === 'live' ? 'LIVE ANALYSIS' : mode === 'demo' ? 'DEMO DATA' : 'NO ANALYSIS'}</StatusBadge></div></header>
      <div className="view-content">{children}</div>
    </main>
  </div>
}

function MobileNav({ view, onView }: { view: AppView; onView: (view: AppView) => void }) {
  return <nav className="mobile-nav" aria-label="Mobile navigation">{navigation.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'active' : ''} onClick={() => onView(id)} aria-current={view === id ? 'page' : undefined}><Icon size={16}/><span>{label}</span></button>)}</nav>
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot"/>{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action&&<div className="heading-action">{action}</div>}</div>
}

export function diagnosisLabel(result: DiagnosisResult): string {
  if (result.status === 'likely_cause') return 'Likely cause'
  if (result.status === 'no_failure_found') return 'No failure found'
  return 'Insufficient evidence'
}
