import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { MetricsOverviewPanel } from './components/metrics-overview'
import { ProgressPage } from './pages/progress-page'
import { metricsPeriod, type MetricsOverview } from './metrics-overview'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))
vi.mock('../clients/api', () => ({ useClientProfile: () => ({ data: { profile: { first_name: 'Cliente', last_name: 'Prueba' } } }) }))
vi.mock('./components/client-selector', () => ({
  ClientSelector: ({ selectedClientId, onSelect }: { selectedClientId: string, onSelect: (id: string) => void }) =>
    <select aria-label="Cliente" value={selectedClientId} onChange={(e) => onSelect(e.target.value)}><option value="a">A</option><option value="b">B</option></select>,
  EmptyClientState: () => <p>Selecciona un cliente</p>,
}))
vi.mock('./components/progress-overview-cards', () => ({ ProgressOverviewCards: () => <p>Resumen anterior</p> }))
vi.mock('./components/progress-calendar', () => ({ ProgressCalendar: () => <p>Calendario anterior</p> }))
vi.mock('./components/day-progress-detail', () => ({ DayProgressDetail: () => <p>Detalle y respuestas del coach</p> }))
vi.mock('./components/streak-section', () => ({ StreakSection: () => <p>Racha anterior</p> }))
vi.mock('./components/metrics-table', () => ({ MetricsTable: () => <p>Registros originales</p> }))

function fixture(client = 'a', value = 0): MetricsOverview {
  const point = { date: '2026-09-07', end_date: '2026-09-13', value, quality: 'complete' as const, provenance: 'weekly_recap' }
  return { client_id: client, from: '2026-09-01', to: '2026-09-16', chart_from: '2026-09-01', chart_to: '2026-09-16', page: 1, total_pages: 1,
    series: [{ key: 'average_daily_steps', label: 'Pasos · media diaria semanal', unit: 'pasos/día', group: 'habits', source: 'Recap semanal enviado',
      first: point, last: point, change: null, count: 1, incomplete_count: 0, points: [] },
    { key: 'weight_kg', label: 'Peso', unit: 'kg', group: 'body', source: 'Registro corporal', first: null, last: null, change: null, count: 0, incomplete_count: 0, points: [] }] }
}
const response = (data: unknown) => ({ data: { success: true, data, timestamp: '' } })
function queryClient() { return new QueryClient({ defaultOptions: { queries: { retry: false } } }) }
function Location() { return <output aria-label="URL">{useLocation().search}</output> }

beforeEach(() => {
  vi.mocked(api.get).mockReset()
  vi.mocked(api.get).mockImplementation(async (url) => response(String(url).endsWith('/overview') ? fixture() : null))
})

describe('P1 period and metrics UI', () => {
  it('calculates inclusive four weeks, calendar months and leap-day bounds', () => {
    expect(metricsPeriod(new URLSearchParams('period=4w'), '2026-09-16').from).toBe('2026-08-20')
    expect(metricsPeriod(new URLSearchParams('period=3m'), '2026-05-31').from).toBe('2026-02-28')
    expect(metricsPeriod(new URLSearchParams('period=custom&from=2026-02-30&to=2026-03-01')).valid).toBe(false)
    expect(metricsPeriod(new URLSearchParams('period=custom&from=2026-09-02&to=2026-09-01')).valid).toBe(false)
  })
  it('distinguishes observed zero, no data and a non-comparable singleton', async () => {
    render(<QueryClientProvider client={queryClient()}><MetricsOverviewPanel clientId="a" to="2026-09-16" page={1} valid onPageChange={() => {}} /></QueryClientProvider>)
    const table = await screen.findByRole('table', { name: 'Comparativa de métricas del periodo' })
    expect(within(table).getAllByText('Sin datos')).toHaveLength(2)
    expect(within(table).getAllByText('No comparable')).toHaveLength(1)
    expect(within(table).queryByText('0 pasos/día')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hábitos' }))
    expect(screen.getByRole('button', { name: 'Hábitos' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(table).getAllByText('0 pasos/día')).toHaveLength(2)
    expect(within(table).getAllByText('No comparable')).toHaveLength(1)
    expect(within(table).queryByText('Peso')).not.toBeInTheDocument()
    expect(within(table).getAllByText('07/09/2026 – 13/09/2026')).toHaveLength(2)
    expect(screen.queryByText(/Masa grasa/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Evolución corporal' }))
    expect(within(table).getAllByText('Sin datos')).toHaveLength(2)
  })
  it('isolates cache and late responses when switching clients', async () => {
    let resolveA: ((value: ReturnType<typeof response>) => void) | undefined
    vi.mocked(api.get).mockImplementation((url) => String(url).includes('/a/') ? new Promise((resolve) => { resolveA = resolve }) : Promise.resolve(response(fixture('b', 9000))))
    const client = queryClient()
    const panel = (id: string) => <QueryClientProvider client={client}><MetricsOverviewPanel clientId={id} to="2026-09-16" page={1} valid onPageChange={() => {}} /></QueryClientProvider>
    const view = render(panel('a'))
    expect(screen.getByRole('status')).toHaveTextContent('Cargando')
    view.rerender(panel('b'))
    fireEvent.click(await screen.findByRole('button', { name: 'Hábitos' }))
    await screen.findAllByText('9000 pasos/día')
    await act(async () => { resolveA?.(response(fixture('a', 123))); await Promise.resolve() })
    expect(screen.queryByText('123 pasos/día')).not.toBeInTheDocument()
    expect(screen.getAllByText('9000 pasos/día')).toHaveLength(2)
    expect(client.getQueryData<MetricsOverview>(['admin-progress', 'b', 'metrics-overview', 'all', '2026-09-16', 1])?.client_id).toBe('b')
  })
  it('shows errors separately from empty history and supports retry', async () => {
    vi.mocked(api.get).mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } })
    render(<QueryClientProvider client={queryClient()}><MetricsOverviewPanel clientId="a" to="2026-09-16" page={1} valid onPageChange={() => {}} /></QueryClientProvider>)
    await screen.findByRole('alert')
    expect(screen.queryByText('Sin datos')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await screen.findByRole('table')
  })
  it('preserves URL period on client/section changes and keeps existing destinations', async () => {
    render(<QueryClientProvider client={queryClient()}><MemoryRouter initialEntries={['/progress?clientId=a&section=metricas&period=custom&from=2026-09-01&to=2026-09-16']}><ProgressPage /><Location /></MemoryRouter></QueryClientProvider>)
    await screen.findByRole('table', { name: 'Comparativa de métricas del periodo' })
    expect(screen.getByRole('tab', { name: /Dashboard/ })).toBeDisabled()
    expect(screen.getByRole('tab', { name: /Fotos/ })).toBeDisabled()
    fireEvent.change(screen.getByRole('combobox', { name: 'Cliente' }), { target: { value: 'b' } })
    expect(screen.getByLabelText('URL').textContent).toContain('clientId=b')
    expect(screen.getByLabelText('URL').textContent).toContain('from=2026-09-01')
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Racha' }), { button: 0, ctrlKey: false })
    await waitFor(() => expect(screen.getByLabelText('URL').textContent).toContain('section=racha'))
    expect(screen.getByText('Racha anterior')).toBeVisible()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Resumen' }), { button: 0, ctrlKey: false })
    expect(await screen.findByText('Detalle y respuestas del coach')).toBeVisible()
  })
})
