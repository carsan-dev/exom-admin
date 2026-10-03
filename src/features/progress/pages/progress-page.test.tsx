import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useSearchParams } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '@/types/auth'
import type { AdherenceConfig, AdherenceReport } from '../../clients/adherence.types'
import { ProgressPage } from './progress-page'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create(() => ({
    user: { id: 'synthetic-staff', email: 'staff@example.invalid', role: 'ADMIN', profile: null } satisfies AuthUser,
    isAuthenticated: true, isLoading: false,
  })) }
})
vi.mock('../../clients/api', () => ({ useClientProfile: () => ({ data: undefined, isLoading: false }) }))
vi.mock('../api', () => ({
  useClientCalendarMonth: () => ({ data: undefined, isLoading: false }),
  useClientDayProgress: () => ({ data: undefined, isLoading: false }),
  useClientWeekSummary: () => ({ data: undefined, isLoading: false }),
}))
vi.mock('../components/client-selector', () => ({
  ClientSelector: ({ onSelect }: { onSelect: (id: string) => void }) => <button onClick={() => onSelect('client-b')}>Seleccionar cliente B</button>,
  EmptyClientState: () => <p>Selecciona un cliente</p>,
}))
vi.mock('../components/progress-overview-cards', () => ({ ProgressOverviewCards: () => null }))
vi.mock('../components/progress-calendar', () => ({ ProgressCalendar: () => null }))
vi.mock('../components/day-progress-detail', () => ({ DayProgressDetail: () => null }))
vi.mock('../components/metrics-overview', () => ({ MetricsOverviewPanel: () => <p>Métricas existentes</p> }))
vi.mock('../components/metrics-table', () => ({ MetricsTable: () => null }))
vi.mock('../components/training-progress-panel', () => ({ TrainingProgressPanel: () => null }))
vi.mock('../components/streak-section', () => ({ StreakSection: () => null }))
vi.mock('../components/progress-photos-panel', () => ({ ProgressPhotosPanel: () => null }))

const config: AdherenceConfig = {
  version: 2, known: true, source: 'revision', effective_date: '2020-01-01', steps_goal: null,
  calorie_lower_percent: 10, calorie_upper_percent: 10, protein_min_percent: 90,
  steps_min_percent: 100, low_global_percent: 80,
}
const component = { status: 'evaluable' as const, numerator: 1, denominator: 1, ratio: 0.37, caveats: [] }
const report: AdherenceReport = {
  version: 1, start: '2020-01-01', end: '2020-01-05', today: '2020-01-06', evaluated_at: '2020-01-06T12:00:00Z',
  aggregate: { training: { ...component, ratio: 0.6 }, nutrition: { ...component, ratio: 0.14 }, global: { ...component, source: 'both' } },
  days: [], weeks: [],
}
function RouteProbe() {
  const [params] = useSearchParams()
  return <output aria-label="Ruta actual">{params.toString()}</output>
}
function mount(query: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[`/progress?${query}`]}>
    <ProgressPage /><RouteProbe />
  </MemoryRouter></QueryClientProvider>)
}
function params() {
  return new URLSearchParams(screen.getByLabelText('Ruta actual').textContent ?? '')
}
function reportCalls() {
  return api.get.mock.calls.filter(([url]) => String(url).endsWith('/adherence'))
}
beforeEach(() => {
  api.get.mockReset(); api.put.mockReset()
  api.get.mockImplementation((url: string) => Promise.resolve({ data: { success: true, data: url.endsWith('/config') ? config : report } }))
})

describe('Progreso: pestaña Adherencia canónica', () => {
  it('abre la ruta directa, habilita Adherencia y monta una única consulta del cliente/rango UTC', async () => {
    mount('clientId=client-a&section=adherencia&date=2020-01-03&period=3m&adherence_start=2020-01-01&adherence_end=2020-01-05')
    const tab = screen.getByRole('tab', { name: 'Adherencia' })
    expect(tab).toBeEnabled()
    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByText('Adherencia · pendiente')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Dashboard · pendiente' })).toBeDisabled()
    expect(screen.getByRole('tab', { name: 'Seguimiento · pendiente' })).toBeDisabled()
    const summary = await screen.findByRole('region', { name: 'Periodo cerrado' })
    expect(within(summary).getByText('37 %')).toBeInTheDocument()
    expect(reportCalls()).toHaveLength(1)
    expect(api.get).toHaveBeenCalledWith('/admin/clients/client-a/adherence', expect.objectContaining({ params: { start: '2020-01-01', end: '2020-01-05' } }))
  })

  it('persiste selección y rango propio sin perder los parámetros de Progreso', async () => {
    mount('clientId=client-a&section=metricas&date=2020-01-03&period=custom&from=2019-01-01&to=2020-01-05&historyPage=2')
    expect(reportCalls()).toHaveLength(0)
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Adherencia' }), { button: 0, ctrlKey: false })
    await screen.findByLabelText('Desde (UTC)')
    fireEvent.change(screen.getByLabelText('Desde (UTC)'), { target: { value: '2020-01-01' } })
    fireEvent.change(screen.getByLabelText('Hasta (UTC)'), { target: { value: '2020-01-05' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar periodo' }))
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/admin/clients/client-a/adherence', expect.objectContaining({ params: { start: '2020-01-01', end: '2020-01-05' } })))
    expect(Object.fromEntries(params())).toEqual({ clientId: 'client-a', section: 'adherencia', date: '2020-01-03', period: 'custom', from: '2019-01-01', to: '2020-01-05', historyPage: '2', adherence_start: '2020-01-01', adherence_end: '2020-01-05' })
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Métricas' }), { button: 0, ctrlKey: false })
    expect(screen.queryByLabelText('Desde (UTC)')).not.toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Adherencia' }), { button: 0, ctrlKey: false })
    expect(screen.getByLabelText('Desde (UTC)')).toHaveValue('2020-01-01')
    expect(params().get('section')).toBe('adherencia')
  })

  it.each(['all', '3m', 'custom'])('no entrega el periodo métrico %s al endpoint de 31 días', async (period) => {
    mount(`clientId=client-a&section=adherencia&period=${period}&from=2019-01-01&to=2020-01-05`)
    await screen.findByRole('region', { name: 'Periodo cerrado' })
    const today = new Date()
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().slice(0, 10)
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)
    expect(reportCalls()).toHaveLength(1)
    expect(api.get).toHaveBeenCalledWith('/admin/clients/client-a/adherence', expect.objectContaining({ params: { start, end } }))
  })

  it('mantiene la validación canónica de rangos URL mayores de 31 días', async () => {
    mount('clientId=client-a&section=adherencia&adherence_start=2020-01-01&adherence_end=2020-02-01')
    expect(await screen.findByRole('alert')).toHaveTextContent('1 a 31 días')
    expect(reportCalls()).toHaveLength(0)
  })

  it('desmonta el borrador del cliente anterior y consulta solo la identidad seleccionada', async () => {
    mount('clientId=client-a&section=adherencia&adherence_start=2020-01-01&adherence_end=2020-01-05')
    const input = await screen.findByLabelText('Objetivo de pasos')
    fireEvent.change(input, { target: { value: '7777' } })
    expect(input).toHaveValue(7777)
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar cliente B' }))
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/admin/clients/client-b/adherence', expect.objectContaining({ params: { start: '2020-01-01', end: '2020-01-05' } })))
    const next = await screen.findByLabelText('Objetivo de pasos')
    expect(next).not.toBe(input)
    expect(input).not.toBeInTheDocument()
    expect(next).toHaveValue(null)
    expect(params().get('clientId')).toBe('client-b')
    expect(params().get('section')).toBe('adherencia')
    expect(reportCalls().map(([url]) => url)).toEqual(['/admin/clients/client-a/adherence', '/admin/clients/client-b/adherence'])
  })
})
