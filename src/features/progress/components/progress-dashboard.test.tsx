import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProgressDashboard } from './progress-dashboard'
import type { MetricSeries } from '../metrics-overview'
import { FollowUpPanel } from '../follow-up-tasks/follow-up-panel'
import { fixturePage, fixtureSummary, fixtureTask } from '../follow-up-tasks/fixtures'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create(() => ({ user: { id: 'staff', role: 'ADMIN' }, isAuthenticated: true, isLoading: false })) }
})
vi.mock('./metric-visual', () => ({ MetricVisual: ({ series, chartPeriod }: { series: { key: string }[]; chartPeriod: string }) => <p>Gráfico {series.map((s) => s.key).join()} {chartPeriod}</p> }))
vi.mock('./adherence-evolution', () => ({ AdherenceEvolution: ({ days }: { days: { date: string }[] }) => <p>Evolución {days.map((d) => d.date).join()}</p> }))
const point = (date: string, value: number) => ({ date, value, quality: 'complete' as const, provenance: 'observed' })
const weight: MetricSeries = { key: 'weight_kg', label: 'Peso', unit: 'kg', group: 'body', source: 'Mediciones corporales', first: point('2025-01-01', 90), last: point('2026-10-11', 82), change: -8, count: 3, incomplete_count: 0, points: [point('2026-10-10', 82)] }
const component = { status: 'evaluable', ratio: 0.37, numerator: 37, denominator: 100, caveats: [] }
const global = { ...component, source: 'both' }
const day = (date: string, period = 'closed', calendar = 'partial') => ({ date, calendar, schedule: { training: 'assigned', nutrition: 'assigned' }, evaluation: { period, training: component, nutrition: component, global } })
let report: Record<string, unknown>
let summary = fixtureSummary
let week: Record<string, unknown>
let metrics = weight
let error = false
let calls: { url: string; params: Record<string, unknown> }[]
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-11T12:00:00Z'))
  metrics = weight; summary = fixtureSummary; error = false; calls = []
  week = { week_start: '2026-10-05', trainings_assigned: 4, trainings_completed: 2, total_meals: 35, meals_completed: 21, diet_days_assigned: 7, diet_days_completed: 3 }
  report = { version: 1, today: '2026-10-11', start: '2026-09-12', end: '2026-10-11', aggregate: { global }, days: [day('2026-10-10'), day('2026-10-12', 'future'), day('2026-10-11', 'provisional')], weeks: [], recentClosed: { start: '2026-10-04', end: '2026-10-10', status: 'low', coverage: { available: 7, expected: 7, evaluable: 6, insufficient: 1, not_applicable: 0 } } }
  api.get.mockReset()
  api.get.mockImplementation(async (url: string, options?: { params?: Record<string, unknown> }) => {
    calls.push({ url, params: options?.params ?? {} })
    if (error) throw { isAxiosError: true, response: { status: 403 } }
    const data = url.endsWith('/metrics/overview') ? { client_id: url.split('/')[3], from: options?.params?.from ?? '2025-01-01', to: '2026-10-11', chart_from: '2026-09-12', chart_to: '2026-10-11', series: [metrics], page: 1, total_pages: 1 }
      : url.endsWith('/adherence') ? report : url.endsWith('/week-summary') ? week
      : url.endsWith('/summary') ? summary : url.endsWith('/assignees') ? fixturePage([])
      : url.endsWith('/follow-up-tasks') ? fixturePage([fixtureTask])
      : { data: [], total: 0, page: 1, totalPages: 0 }
    return { data: { success: true, data } }
  })
})
function mount(clientId = 'client-a', followUp = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const node = (id: string) => <QueryClientProvider client={client}><MemoryRouter initialEntries={['/progress?period=3m&date=2099-01-01']}><ProgressDashboard key={id} clientId={id} />{followUp && <FollowUpPanel clientId={id} onGuard={() => {}} />}</MemoryRouter></QueryClientProvider>
  return { client, ...render(node(clientId)), node }
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
describe('Dashboard: presentación canónica', () => {
  it('separa histórico, treinta días y semana actual; usa días y conserva enlaces exactos', async () => {
    mount()
    expect(await screen.findByText('82 kg')).toBeInTheDocument()
    expect(screen.getByText('-8 kg')).toBeInTheDocument()
    expect(screen.getByText('37 %')).toBeInTheDocument()
    expect(screen.getByText('2 / 4')).toBeInTheDocument()
    expect(screen.getByText('3 / 7')).toBeInTheDocument()
    expect(calls.filter((c) => c.url.endsWith('/metrics/overview')).map((c) => c.params.from)).toEqual([undefined, '2026-09-12'])
    expect(calls.find((c) => c.url.endsWith('/week-summary'))?.params).toEqual({ week_start: '2026-10-05' })
    const link = new URL(screen.getByRole('link', { name: 'Ver adherencia' }).getAttribute('href')!, 'https://example.invalid')
    expect(link.searchParams.get('adherence_start')).toBe('2026-09-12')
    expect(link.searchParams.get('adherence_end')).toBe('2026-10-11')
    expect(link.searchParams.get('date')).toBe('2099-01-01')
    expect(screen.getByRole('link', { name: 'Ver peso desde inicio' })).toHaveAttribute('href', expect.stringContaining('period=all'))
  })
  it('agrupa alertas cerradas y respeta solo el veredicto de baja adherencia del servidor', async () => {
    mount()
    await screen.findByText('Baja adherencia global')
    const alerts = screen.getByRole('region', { name: 'Alertas importantes' })
    expect(within(alerts).getByText('Baja adherencia global')).toBeInTheDocument()
    fireEvent.click(within(alerts).getByText('Ver días con entrenamiento o dieta pendientes'))
    expect(within(alerts).getByRole('link', { name: /2026-10-10/ })).toBeInTheDocument()
    expect(within(alerts).queryByText(/2026-10-12|2026-10-11/)).not.toBeInTheDocument()
    expect(within(alerts).getByRole('link', { name: /Próxima tarea canónica/ })).toBeInTheDocument()
    expect(within(alerts).queryByRole('link', { name: /Revisión canónica/ })).not.toBeInTheDocument()
  })
  it('no inventa baja adherencia al faltar recentClosed o por un ratio bajo', async () => {
    delete report.recentClosed
    mount()
    await screen.findByText('37 %')
    expect(screen.queryByText('Baja adherencia global')).not.toBeInTheDocument()
    expect(screen.getByText(/Clasificación reciente no disponible/)).toBeInTheDocument()
  })
  it('datos ausentes, cliente nuevo y sin pauta no son éxito ni ceros ficticios', async () => {
    metrics = { ...weight, first: null, last: null, change: null, count: 0, points: [] }
    week = { ...week, trainings_assigned: 0, diet_days_assigned: 0 }
    report = { ...report, days: [], aggregate: { global: { ...global, status: 'not_applicable', ratio: null } } }
    mount()
    await screen.findByText('Sin registros de peso')
    expect(screen.getAllByText('Sin pauta esta semana')).toHaveLength(2)
    expect(screen.getByText('Sin componentes evaluables')).toBeInTheDocument()
    expect(screen.queryByText(/Todo al día|100 %/)).not.toBeInTheDocument()
  })
  it('un servidor anterior sin campos de días no se interpreta como comidas ni cero', async () => {
    delete week.diet_days_assigned; delete week.diet_days_completed
    mount()
    expect(await screen.findByText('Días de dieta no disponibles')).toBeInTheDocument()
    expect(screen.queryByText('21 / 35')).not.toBeInTheDocument()
  })
  it('la semana UTC conserva el denominador canónico al cruzar mes y una dieta asignada vacía', async () => {
    vi.setSystemTime(new Date('2026-10-01T12:00:00Z'))
    week = { ...week, week_start: '2026-09-28', diet_days_assigned: 4, diet_days_completed: 2 }
    mount()
    await waitFor(() => expect(screen.getByText('Días de dieta esta semana').nextElementSibling).toHaveTextContent('2 / 4'))
    expect(calls.find((call) => call.url.endsWith('/week-summary'))?.params).toEqual({ week_start: '2026-09-28' })
    expect(screen.getByText(/28\/09\/2026 – 04\/10\/2026/)).toBeInTheDocument()
    // Empty assigned diets remain in the service denominator, not reconstructed from meals.
    const status = screen.getByText('Días de dieta esta semana').nextElementSibling
    expect(status).toHaveTextContent('2 / 4')
  })
  it('error con recuperación explícita, sin ocultar datos ausentes', async () => {
    error = true
    mount()
    await screen.findByText('No se pudo cargar el peso histórico.')
    error = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar el peso histórico' }))
    expect(await screen.findByText('82 kg')).toBeInTheDocument()
  })
  it.each([fixtureSummary, { ...fixtureSummary, next_task: null, next_review: null }, { ...fixtureSummary, next_task: { ...fixtureSummary.next_task!, due_date: '2026-10-05', overdue: false } }])('Seguimiento y Dashboard muestran la misma respuesta canónica sin selector propio (%#)', async (payload) => {
    summary = payload
    mount('client-a', true)
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Próximos pasos' })).getByText('Próxima tarea')).toBeInTheDocument())
    const dashboard = screen.getByRole('region', { name: 'Próximos pasos' })
    const follow = screen.getByRole('region', { name: 'Seguimiento del cliente' })
    for (const label of ['Próxima tarea', 'Próxima revisión']) {
      const value = within(dashboard).getByText(label).nextElementSibling?.textContent
      expect(within(follow).getByText(label).nextElementSibling?.textContent).toBe(value)
    }
  })
  it('cambiar de cliente no presenta un resumen del cliente anterior', async () => {
    const { rerender, node } = mount()
    await within(screen.getByRole('region', { name: 'Próximos pasos' })).findByText(/Próxima tarea canónica, fuera/)
    summary = { ...fixtureSummary, next_task: { ...fixtureSummary.next_task!, title: 'Solo cliente B' } }
    rerender(node('client-b'))
    expect(screen.queryByText(/Próxima tarea canónica, fuera/)).not.toBeInTheDocument()
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Próximos pasos' })).getByText(/Solo cliente B/)).toBeInTheDocument())
  })
  it('la presentación compacta conserva gráfico y datos accesibles sin duplicar el detalle inicial', async () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
    const { MetricVisual } = await vi.importActual<typeof import('./metric-visual')>('./metric-visual')
    render(<MetricVisual compact series={[weight]} period="30 días" chartPeriod="12/09/2026 – 11/10/2026" />)
    expect(screen.queryByRole('combobox', { name: 'Medición' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Peso, kg/ })).toBeInTheDocument()
    const disclosure = screen.getByText('Ver datos, semanas y procedencia').closest('details')
    expect(disclosure).not.toHaveAttribute('open')
    expect(screen.getByText('Primera observación').closest('details')).toBe(disclosure)
    fireEvent.click(screen.getByText('Ver datos, semanas y procedencia'))
    expect(screen.getByRole('region', { name: 'Datos de la medición' })).toBeInTheDocument()
  })
})
