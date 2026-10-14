// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { makeDemoResult, samples } from './incident'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CloudSage diagnosis workspace', () => {
  it('loads sample inputs without pretending a diagnosis has run', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    render(<App/>)
    await userEvent.click(screen.getByRole('button', { name: /Wrong database port/i }))
    expect((screen.getByRole('textbox', { name: 'Paste application logs' }) as HTMLTextAreaElement).value).toContain('db:5433')
    expect(screen.getByText('READY WHEN YOU ARE')).toBeTruthy()
    expect(fetchMock.mock.calls.every(([url]) => String(url).endsWith('/api/health'))).toBe(true)
    expect((screen.getByRole('button', { name: /Diagnose deployment/i }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('renders live contract results, navigates to exact evidence, and keeps health separate', async () => {
    const sample = samples[0]
    const result = makeDemoResult(sample.logs, sample.compose)
    result.summary = 'The app is attempting the database connection on an unexpected port.'
    result.model_identifier = 'gemma-test-model'
    result.analysis_source = 'Gemma via Google Gen AI'
    result.findings[0].title = 'Database port rejected'
    result.findings[0].kind = 'observed_fact'
    result.findings[0].source_matched = true
    result.findings[0].evidence = [{ source: 'logs', start_line: 2, end_line: 2, quote: 'Database connection failed: dial tcp db:5433: connect: connection refused' }]
    result.proposed_changes[0] = { ...result.proposed_changes[0], explanation: 'Use the database container port.' }

    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<App/>)
    await user.click(screen.getByRole('button', { name: /Wrong database port/i }))
    await user.click(screen.getByRole('button', { name: /Diagnose deployment/i }))
    expect(await screen.findByRole('heading', { name: 'Database port rejected' })).toBeTruthy()
    expect(screen.getAllByText('gemma-test-model').length).toBeGreaterThan(0)
    expect(screen.getByText('The app is attempting the database connection on an unexpected port.')).toBeTruthy()
    expect(screen.getByText('Use the database container port.')).toBeTruthy()
    expect(screen.getByText('Source matched')).toBeTruthy()
    const request = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(request).toBeDefined()
    expect(JSON.parse(request?.[1]?.body as string)).toEqual({ logs: sample.logs, compose: sample.compose })

    await user.click(screen.getByRole('button', { name: 'Open logs lines 2 to 2' }))
    await waitFor(() => expect(document.querySelector('.viewer-row.highlighted')?.textContent).toContain('connection refused'))

    const freshLogs = screen.getByRole('textbox', { name: 'Fresh application logs' })
    fireEvent.change(freshLogs, { target: { value: 'Database connection failed: dial tcp db:5433: connect: connection refused' } })
    await user.click(screen.getByRole('button', { name: 'Compare logs' }))
    expect(await screen.findByText('present')).toBeTruthy()
    expect(screen.getByText('not checked')).toBeTruthy()
    expect(screen.getByText(/does not prove the application is healthy/i)).toBeTruthy()

    await user.click(screen.getAllByRole('button', { name: 'Service Map' })[0])
    expect(screen.getByText(/does not contain structured service nodes or dependency edges/i)).toBeTruthy()
    await user.click(screen.getAllByRole('button', { name: 'Incident Report' })[0])
    expect(screen.getByRole('heading', { name: 'Incident report' })).toBeTruthy()
    expect(screen.getByText(/manually supplied/i)).toBeTruthy()
  })

  it('marks an explicit synthetic preview as demo data, not live analysis', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<App/>)
    await user.click(screen.getByRole('button', { name: /Preview demo results/i }))
    expect((await screen.findAllByText('Demo Data — no live AI call')).length).toBeGreaterThan(0)
    expect(fetchMock.mock.calls.every(([url]) => String(url).endsWith('/api/health'))).toBe(true)
  })
})
