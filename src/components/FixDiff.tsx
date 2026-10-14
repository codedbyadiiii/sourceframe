import { useState } from 'react'
import { AlertCircle, Check, CheckCircle2, Clipboard, Download, LockKeyhole, X } from 'lucide-react'
import type { ProposedChange } from '../types'

export function FixDiff({ changes }: { changes: ProposedChange[] }) {
  const [copied, setCopied] = useState<number|null>(null)
  const [copyError, setCopyError] = useState('')
  const save = (index: number, value: string) => {
    const link = document.createElement('a')
    const objectUrl = URL.createObjectURL(new Blob([value], { type: 'text/yaml;charset=utf-8' }))
    link.href = objectUrl
    link.download = `cloudsage-proposed-compose-${index + 1}.yaml`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }
  const copy = async (value: string, index: number) => {
    try { await navigator.clipboard.writeText(value); setCopied(index); setCopyError(''); window.setTimeout(() => setCopied(null), 1800) }
    catch { setCopied(null); setCopyError('Clipboard access was denied. Select and copy the YAML manually.') }
  }
  if (!changes.length) return <div className="empty-card fix-empty"><AlertCircle size={18}/><div><b>No configuration change proposed</b><p>Review the evidence and missing context before changing deployment configuration.</p></div></div>
  return <div className="fix-stack">{changes.map((change, index)=><article className="fix-card" key={`${index}-${change.after}`}>
    <div className="fix-explanation"><span className="fix-icon"><LockKeyhole size={16}/></span><div><span className="section-overline">SUGGESTED CHANGE · REVIEW AND APPLY MANUALLY</span><p>{change.explanation}</p></div></div>
    <div className={`syntax-check ${change.yaml_valid ? 'valid' : 'invalid'}`}>{change.yaml_valid ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>}<span>YAML syntax {change.yaml_valid ? 'valid' : 'invalid'}</span><small>{change.yaml_valid ? 'Syntax only · Runtime behavior not verified' : 'Do not apply until YAML syntax is corrected'}</small></div>
    <div className="diff-grid"><DiffPane tone="removed" title="BEFORE" content={change.before}/><div className="diff-divider" aria-hidden="true"><span>→</span></div><DiffPane tone="added" title="AFTER" content={change.after}/></div>
    <footer className="diff-actions"><span><LockKeyhole size={13}/> Nothing is applied automatically.</span><div><button className="button-secondary" onClick={() => void copy(change.after, index)}>{copied === index ? <Check size={14}/> : <Clipboard size={14}/>} {copied === index ? 'Copied' : 'Copy YAML'}</button><button className="button-secondary" onClick={() => save(index, change.after)}><Download size={14}/> Download</button></div></footer>{copyError&&<p className="source-error" role="status">{copyError}</p>}
  </article>)}</div>
}

function DiffPane({ tone, title, content }: { tone: 'removed'|'added'; title: string; content: string }) {
  return <section className={`diff-pane ${tone}`}><header><span className="diff-icon">{tone === 'removed' ? <X size={13}/> : <Check size={13}/>}</span>{title}<span className="diff-count">{content.split('\n').length} lines</span></header><pre tabIndex={0} aria-label={`${title} YAML`}>{content.split('\n').map((line, index)=><code key={index}><span className="diff-sign">{tone === 'removed' ? '−' : '+'}</span><span>{line || ' '}</span></code>)}</pre></section>
}
