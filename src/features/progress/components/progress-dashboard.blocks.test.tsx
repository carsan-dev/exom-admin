import { fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProgressDashboard } from './progress-dashboard'
import type { MetricSeries } from '../metrics-overview'
import { fixturePage, fixtureSummary } from '../follow-up-tasks/fixtures'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create(() => ({ user: { id: 'staff', role: 'ADMIN' }, isAuthenticated: true, isLoading: false })) }
})
vi.mock('./metric-visual', () => ({ MetricVisual: () => <p>Gráfico del peso</p> }))
vi.mock('./adherence-evolution', () => ({ AdherenceEvolution: () => <p>Gráfico de adherencia</p> }))

const point = (date: string, value: number) => ({ date, value, quality: 'complete' as const, provenance: 'observed' })
const weight: MetricSeries = { key: 'weight_kg', label: 'Peso', unit: 'kg', group: 'body', source: 'Mediciones corporales', first: point('2025-01-01', 90), last: point('2026-10-11', 82), change: -8, count: 3, incomplete_count: 0, points: [point('2026-10-10', 82)] }
const component = { status: 'evaluable', ratio: 0.37, numerator: 37, denominator: 100, caveats: [] }
const global = { ...component, source: 'both' }
const report = { version: 1, today: '2026-10-11', start: '2026-09-12', end: '2026-10-11', aggregate: { global }, days: [], weeks: [], recentClosed: null }
const week = { week_start: '2026-10-05', trainings_assigned: 4, trainings_completed: 2, total_meals: 35, meals_completed: 21, diet_days_assigned: 7, diet_days_completed: 3 }

type Mode = 'ok' | 'fail' | 'hang'
type Block = 'historical' | 'chart' | 'adherence' | 'week' | 'recaps'
let modes: Record<Block, Mode>

function blockOf(url: string, params: Record<string, unknown>): Block | null {
  if (url.endsWith('/metrics/overview')) return params.from === undefined ? 'historical' : 'chart'
  if (url.endsWith('/adherence')) return 'adherence'
  if (url.endsWith('/week-summary')) return 'week'
  if (url === '/recaps') return 'recaps'
  return null
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-11T12:00:00Z'))
  modes = { historical: 'ok', chart: 'ok', adherence: 'ok', week: 'ok', recaps: 'ok' }
  api.get.mockReset()
  api.get.mockImplementation(async (url: string, options?: { params?: Record<string, unknown> }) => {
    const params = options?.params ?? {}
    const block = blockOf(url, params)
    if (block && modes[block] === 'hang') return new Promise(() => undefined)
    if (block && modes[block] === 'fail') throw { isAxiosError: true, response: { status: 403 } }
    const data = url.endsWith('/metrics/overview') ? { client_id: url.split('/')[3], from: params.from ?? '2025-01-01', to: '2026-10-11', chart_from: '2026-09-12', chart_to: '2026-10-11', series: [weight], page: 1, total_pages: 1 }
      : url.endsWith('/adherence') ? report : url.endsWith('/week-summary') ? week
      : url.endsWith('/summary') ? fixtureSummary : url.endsWith('/assignees') ? fixturePage([])
      : { data: [], total: 0, page: 1, totalPages: 0 }
    return { data: { success: true, data } }
  })
})
afterEach(() => { vi.useRealTimers() })

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/progress?date=2099-01-01']}><ProgressDashboard clientId="client-a" /></MemoryRouter></QueryClientProvider>)
}

describe('Dashboard: bloques con carga, error y reintento propios (caracterización)', () => {
  it('un error en la adherencia no oculta el peso y cada bloque de adherencia ofrece reintento', async () => {
    modes.adherence = 'fail'
    mount()
    expect(await screen.findByText('82 kg')).toBeInTheDocument()
    for (const label of ['la adherencia', 'la evolución de adherencia', 'las alertas de adherencia']) {
      expect(await screen.findByText(`No se pudo cargar ${label}.`)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: `Reintentar ${label}` })).toBeInTheDocument()
    }
    modes.adherence = 'ok'
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar la adherencia' }))
    expect(await screen.findByText('37 %')).toBeInTheDocument()
    expect(await screen.findByText('Gráfico de adherencia')).toBeInTheDocument()
  })

  it('un error en la semana afecta solo a los dos KPI semanales y se recupera al reintentar', async () => {
    modes.week = 'fail'
    mount()
    expect(await screen.findByText('82 kg')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Reintentar los días de dieta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar la semana' })).toBeInTheDocument()
    expect(screen.getByText('37 %')).toBeInTheDocument()
    modes.week = 'ok'
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar la semana' }))
    expect(await screen.findByText('2 / 4')).toBeInTheDocument()
    expect(screen.getByText('3 / 7')).toBeInTheDocument()
  })

  it('un error en la evolución del peso no afecta al peso actual y ofrece reintento propio', async () => {
    modes.chart = 'fail'
    mount()
    expect(await screen.findByText('82 kg')).toBeInTheDocument()
    expect(await screen.findByText('No se pudo cargar la evolución del peso.')).toBeInTheDocument()
    modes.chart = 'ok'
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar la evolución del peso' }))
    expect(await screen.findByText('Gráfico del peso')).toBeInTheDocument()
  })

  it('un error en los recaps queda dentro de Alertas importantes con su reintento', async () => {
    modes.recaps = 'fail'
    mount()
    const alerts = await screen.findByRole('region', { name: 'Alertas importantes' })
    expect(await within(alerts).findByRole('button', { name: 'Reintentar los recaps pendientes' })).toBeInTheDocument()
    expect(await screen.findByText('82 kg')).toBeInTheDocument()
  })

  it('cada bloque anuncia su propia carga sin bloquear los demás', async () => {
    modes.week = 'hang'
    modes.adherence = 'hang'
    mount()
    expect(await screen.findByText('82 kg')).toBeInTheDocument()
    for (const label of ['la semana', 'los días de dieta', 'la adherencia', 'la evolución de adherencia', 'las alertas de adherencia']) {
      expect(screen.getByText(`Cargando ${label}…`)).toBeInTheDocument()
    }
    expect(screen.queryByText('Cargando el peso histórico…')).not.toBeInTheDocument()
  })
})
