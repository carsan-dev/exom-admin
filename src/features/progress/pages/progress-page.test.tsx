import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider, useSearchParams } from 'react-router'
import { fixtureAssignee, fixturePage, fixtureSummary, fixtureTask } from '../follow-up-tasks/fixtures'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '@/types/auth'
import type { AdherenceConfig, AdherenceReport } from '../../clients/adherence.types'
import { ProgressPage } from './progress-page'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }))
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
vi.mock('../components/progress-dashboard', () => ({ ProgressDashboard: () => <p>Dashboard existente</p> }))
vi.mock('../components/progress-overview-cards', () => ({ ProgressOverviewCards: () => null }))
vi.mock('../components/progress-calendar', () => ({ ProgressCalendar: ({ year, month, onDateSelect }: { year: number; month: number; onDateSelect: (date: string) => void }) => <button onClick={() => onDateSelect('2020-01-04')}>Calendario {year}-{month}</button> }))
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
  const router = createMemoryRouter([{ path: '/progress', element: <><ProgressPage /><RouteProbe /></> }], { initialEntries: [`/progress?${query}`] })
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
  return router
}
function params() {
  return new URLSearchParams(screen.getByLabelText('Ruta actual').textContent ?? '')
}
function reportCalls() {
  return api.get.mock.calls.filter(([url]) => String(url).endsWith('/adherence'))
}
beforeEach(() => {
  window.localStorage.clear()
  api.get.mockReset(); api.put.mockReset(); api.post.mockReset()
  api.get.mockImplementation((url: string) => Promise.resolve({ data: { success: true, data:
    url.endsWith('/follow-up-tasks/summary') ? fixtureSummary : url.endsWith('/follow-up-tasks/assignees') ? fixturePage([fixtureAssignee]) : url.endsWith('/follow-up-tasks') ? fixturePage([fixtureTask]) : url.endsWith('/config') ? config : report,
  } }))
})

describe('Progreso: contexto y navegación', () => {
  it('abre Dashboard sin sección y conserva filtros y acceso explícito a Resumen', () => {
    mount('clientId=client-a&period=3m&date=2020-01-03&historyPage=2')
    expect(screen.getByRole('tab', { name: 'Dashboard' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Dashboard existente')).toBeInTheDocument()
    expect(params().get('period')).toBe('3m')
    expect(params().get('date')).toBe('2020-01-03')
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Resumen' }), { button: 0, ctrlKey: false })
    expect(params().get('section')).toBe('resumen')
    expect(params().get('historyPage')).toBe('2')
  })

  it('mantiene Métricas como fallback de sección desconocida', () => {
    mount('clientId=client-a&section=unknown&period=3m')
    expect(screen.getByRole('tab', { name: 'Métricas' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Métricas existentes')).toBeInTheDocument()
    expect(params().get('period')).toBe('3m')
  })

  it('abre Seguimiento por URL, preserva navegación y confirma descarte al cambiar cliente', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    mount('clientId=client-a&section=seguimiento&period=3m&date=2020-01-03')
    expect(screen.getByRole('tab', { name: 'Seguimiento' })).toHaveAttribute('aria-selected', 'true')
    await screen.findByRole('button', { name: fixtureTask.title })
    fireEvent.click(screen.getByRole('button', { name: 'Nueva tarea' }))
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Draft A' } })
    // The sheet modal isolates the background; route changes exercise the same
    // navigation blocker as browser back and external client deep links.
    fireEvent.click(screen.getByText('Seleccionar cliente B'))
    expect(confirm).toHaveBeenCalled()
    expect(params().get('clientId')).toBe('client-a')
    expect(screen.getByLabelText('Título')).toHaveValue('Draft A')
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByText('Seleccionar cliente B'))
    await waitFor(() => expect(params().get('clientId')).toBe('client-b'))
    expect(screen.queryByLabelText('Título')).not.toBeInTheDocument()
    expect(params().get('section')).toBe('seguimiento')
    expect(params().get('period')).toBe('3m')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('habilita Seguimiento sin cambiar entrada, URL ni Dashboard pendiente', () => {
    mount('clientId=client-a&section=metricas&period=3m&date=2020-01-03')
    expect(screen.getByRole('tab', { name: 'Seguimiento' })).toBeEnabled()
    expect(params().get('section')).toBe('metricas')
    expect(params().get('period')).toBe('3m')
    expect(screen.getByRole('tab', { name: 'Dashboard' })).toBeEnabled()
  })
  // Contract change: the native <select> inside <details> was replaced by the shared, always visible
  // PeriodSelector (usePeriodParam). Changing the range still restarts history paging and keeps other filters.
  it('mantiene el periodo activo visible y conserva los filtros al cambiarlo', async () => {
    mount('clientId=client-a&section=metricas&period=custom&from=2020-01-01&to=2020-01-05&historyPage=2')
    const selector = screen.getByRole('combobox', { name: 'Periodo de métricas y entrenamiento' })
    expect(selector).toHaveTextContent('Personalizado')
    expect(selector.closest('details')).toBeNull()
    expect(screen.getByText(/Se aplica a Métricas y Entrenamiento/)).toBeVisible()
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2020-01-02' } })
    await waitFor(() => expect(params().get('historyPage')).toBe('1'))
    expect(params().get('from')).toBe('2020-01-02')
    expect(params().get('period')).toBe('custom')
    expect(params().get('clientId')).toBe('client-a')
    expect(params().get('section')).toBe('metricas')
    expect(screen.getByRole('tab', { name: 'Dashboard' })).toBeEnabled()
  })

  it('no oculta la validación de fechas del periodo', () => {
    mount('clientId=client-a&section=metricas&period=custom&from=2020-01-06&to=2020-01-05')
    expect(screen.getByRole('alert')).toHaveTextContent('La fecha de inicio debe ser anterior o igual a la de fin.')
    expect(screen.getByRole('alert').closest('details')).toBeNull()
  })

  it('abre el mes de la fecha URL y conserva periodo y parámetros al seleccionar otro día', () => {
    mount('clientId=client-a&section=resumen&date=2020-01-03&period=3m&historyPage=2')
    fireEvent.click(screen.getByRole('button', { name: 'Calendario 2020-1' }))
    expect(Object.fromEntries(params())).toEqual({ clientId: 'client-a', section: 'resumen', date: '2020-01-04', period: '3m', historyPage: '2' })
  })
})

describe('Progreso: pestaña Adherencia canónica', () => {
  it('abre la ruta directa, habilita Adherencia y monta la consulta del cliente/rango UTC y su periodo anterior', async () => {
    mount('clientId=client-a&section=adherencia&date=2020-01-03&period=3m&adherence_start=2020-01-01&adherence_end=2020-01-05')
    const tab = screen.getByRole('tab', { name: 'Adherencia' })
    expect(tab).toBeEnabled()
    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByText('Adherencia · pendiente')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Dashboard' })).toBeEnabled()
    expect(screen.getByRole('tab', { name: 'Seguimiento' })).toBeEnabled()
    const summary = await screen.findByRole('region', { name: 'Periodo cerrado' })
    expect(within(summary).getByText('37 %')).toBeInTheDocument()
    // Legacy adherence_start/end links load as custom; the previous period (5 days before) is the only extra call.
    await waitFor(() => expect(reportCalls()).toHaveLength(2))
    expect(api.get).toHaveBeenCalledWith('/admin/clients/client-a/adherence', expect.objectContaining({ params: { start: '2020-01-01', end: '2020-01-05' } }))
    expect(api.get).toHaveBeenCalledWith('/admin/clients/client-a/adherence', expect.objectContaining({ params: { start: '2019-12-27', end: '2019-12-31' } }))
  })

  it('persiste selección y rango propio sin perder los parámetros de Progreso', async () => {
    mount('clientId=client-a&section=metricas&date=2020-01-03&period=custom&from=2019-01-01&to=2020-01-05&historyPage=2&adherence_period=custom&adherence_start=2020-01-01&adherence_end=2020-01-10')
    expect(reportCalls()).toHaveLength(0)
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Adherencia' }), { button: 0, ctrlKey: false })
    const heading = await screen.findByRole('heading', { name: 'Adherencia' })
    fireEvent.change(await within(heading.parentElement as HTMLElement).findByLabelText('Hasta'), { target: { value: '2020-01-05' } })
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/admin/clients/client-a/adherence', expect.objectContaining({ params: { start: '2020-01-01', end: '2020-01-05' } })))
    expect(Object.fromEntries(params())).toEqual({ clientId: 'client-a', section: 'adherencia', date: '2020-01-03', period: 'custom', from: '2019-01-01', to: '2020-01-05', historyPage: '2', adherence_period: 'custom', adherence_start: '2020-01-01', adherence_end: '2020-01-05' })
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Métricas' }), { button: 0, ctrlKey: false })
    expect(screen.queryByRole('heading', { name: 'Adherencia' })).not.toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Adherencia' }), { button: 0, ctrlKey: false })
    expect(screen.getByRole('heading', { name: 'Adherencia' })).toBeInTheDocument()
    expect(params().get('adherence_end')).toBe('2020-01-05')
    expect(params().get('section')).toBe('adherencia')
  })

  it.each(['all', '3m', 'custom'])('no entrega el periodo métrico %s al endpoint de 31 días', async (period) => {
    mount(`clientId=client-a&section=adherencia&period=${period}&from=2019-01-01&to=2020-01-05`)
    await screen.findByRole('region', { name: 'Periodo cerrado' })
    const today = new Date()
    // Adherence owns its period (default last 30 UTC days); the metrics period is never forwarded.
    const end = today.toISOString().slice(0, 10)
    const start = new Date(Date.parse(end) - 29 * 86_400_000).toISOString().slice(0, 10)
    await waitFor(() => expect(reportCalls()).toHaveLength(2))
    expect(api.get).toHaveBeenCalledWith('/admin/clients/client-a/adherence', expect.objectContaining({ params: { start, end } }))
  })

  it('mantiene la validación canónica de rangos URL mayores de 31 días', async () => {
    mount('clientId=client-a&section=adherencia&adherence_start=2020-01-01&adherence_end=2020-02-01')
    expect(await screen.findByRole('alert')).toHaveTextContent('31 días')
    // The invalid range is never requested; the default period is shown instead.
    await screen.findByRole('region', { name: 'Periodo cerrado' })
    expect(api.get).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ params: expect.objectContaining({ start: '2020-01-01' }) }))
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
    expect(reportCalls().map(([url]) => url)).toEqual([
      '/admin/clients/client-a/adherence', '/admin/clients/client-a/adherence',
      '/admin/clients/client-b/adherence', '/admin/clients/client-b/adherence',
    ])
  })
})
