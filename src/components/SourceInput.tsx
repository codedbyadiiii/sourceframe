import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, FileCode2, FileText, FolderOpen, RotateCcw, UploadCloud } from 'lucide-react'
import { MAX_BYTES } from '../incident'
import type { SourceKind } from '../types'

type SourceInputProps = {
  kind: SourceKind
  value: string
  filename: string | null
  fileSize?: number | null
  selectedLines?: [number, number] | null
  error?: string
  onChange: (value: string) => void
  onFile: (file: File) => void
  onClear: () => void
}

export function SourceInput({ kind, value, filename, fileSize, selectedLines, error, onChange, onFile, onClear }: SourceInputProps) {
  const [dragging, setDragging] = useState(false)
  const [fileError, setFileError] = useState('')
  const picker = useRef<HTMLInputElement>(null)
  const isLogs = kind === 'logs'
  const extension = isLogs ? '.log or .txt' : '.yaml or .yml'
  const lineCount = Math.max(1, value.split('\n').length)
  const bytes = new TextEncoder().encode(value).length
  const Icon = isLogs ? FileText : FileCode2
  const accept = isLogs ? '.log,.txt,text/plain' : '.yaml,.yml,text/yaml'

  useEffect(() => setFileError(''), [value, filename])

  const readFile = async (file?: File) => {
    if (!file) return
    const supported = isLogs ? /\.(log|txt)$/i.test(file.name) : /\.(ya?ml)$/i.test(file.name)
    if (!supported) return setFileError(`Choose a ${extension} file.`)
    if (file.size > MAX_BYTES) return setFileError('Files must be 100 KB or smaller.')
    setFileError('')
    onFile(file)
  }
  const onDrop = async (event: React.DragEvent) => {
    event.preventDefault(); setDragging(false)
    await readFile(event.dataTransfer.files[0])
  }

  return <section className={`source-card ${dragging ? 'dragging' : ''} ${error ? 'has-error' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false) }} onDrop={onDrop} aria-label={isLogs ? 'Application logs input' : 'Docker Compose configuration input'}>
    <header className="source-card-head"><span className={`source-icon ${kind}`}><Icon size={17}/></span><div className="source-head-copy"><h2>{isLogs ? 'Application logs' : 'Docker Compose'}</h2><p>{isLogs ? 'Runtime output from the failing service' : 'The configuration that launched this stack'}</p></div><button className="icon-button" onClick={()=>{setFileError('');onClear()}} aria-label={`Clear ${isLogs ? 'logs' : 'Compose configuration'}`} title="Clear source"><RotateCcw size={15}/></button></header>
    {filename&&<div className="file-meta"><Icon size={13}/><span className="file-name">{filename}</span><span>{formatBytes(fileSize ?? bytes)}</span><span className="file-ready"><Check size={12}/> Loaded</span></div>}
    <div className="source-editor-wrap">
      <div className="source-gutter" aria-hidden="true">{Array.from({ length: lineCount }, (_, index) => <span key={index} className={selectedLines && index + 1 >= selectedLines[0] && index + 1 <= selectedLines[1] ? 'line-selected' : ''}>{index + 1}</span>)}</div>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} onScroll={(event) => { const gutter = event.currentTarget.previousElementSibling as HTMLElement | null; if (gutter) gutter.scrollTop = event.currentTarget.scrollTop }} spellCheck={false} aria-label={isLogs ? 'Paste application logs' : 'Paste Docker Compose YAML'} aria-describedby={`${kind}-hint${error||fileError?` ${kind}-error`:''}`} placeholder={isLogs ? 'Paste or drop the failed service output…\n\nExample:\n2025-05-18 10:32:08 ERROR connection refused' : 'Paste or drop your compose.yaml…\n\nExample:\nservices:\n  app:\n    depends_on:\n      - db'} />
    </div>
    {(error||fileError)&&<p className="source-error" id={`${kind}-error`} role="alert"><AlertCircle size={14}/>{error||fileError}</p>}
    {!value&&<div className="source-empty"><UploadCloud size={14}/><span>Paste here or drag a <b>{extension}</b> file</span></div>}
    <footer className="source-card-foot"><span id={`${kind}-hint`}>{lineCount} lines <i/> {formatBytes(bytes)} / 100 KB</span><div className="source-actions"><button className="text-button" onClick={() => picker.current?.click()}><FolderOpen size={14}/> Browse files</button><input ref={picker} className="visually-hidden" type="file" accept={accept} aria-label={`Browse ${isLogs ? 'log' : 'Compose YAML'} files`} onChange={(event) => { void readFile(event.target.files?.[0]); event.target.value = '' }}/></div></footer>
  </section>
}

function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}
