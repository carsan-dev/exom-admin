import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider, useSearchParams } from 'react-router'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProgressPage } from './progress-page'

const props = vi.hoisted(() => ({ metrics: [] as Record<string, unknown>[], training: [] as Record<string, unknown>[] }))
vi.mock('@/lib/api', () => ({ api: { get: vi.fn(() => new Promise(() => {})), put: vi.fn(), post: vi.fn() } }))
vi.mock('../../clients/api', () => ({ useClientProfile: () => ({ data: undefined, isLoading: false }) }))
vi.mock('../api', () => ({
  useClientCalendarMonth: () => ({ data: undefined, isLoading: false }),
  useClientDayProgress: () => ({ data: undefined, isLoading: false }),
  useClientWeekSummary: () => ({ data: undefined, isLoading: false }),
}))
vi.mock('../components/client-selector', () => ({ ClientSelector: () => null, EmptyClientState: () => <p>Selecciona un cliente</p> }))
vi.mock('../components/progress-dashboard', () => ({ ProgressDashboard: () => <p>Sección dashboard</p> }))
vi.mock('../components/progress-overview-cards', () => ({ ProgressOverviewCards: () => <p>Sección resumen</p> }))
vi.mock('../components/progress-calendar', () => ({ ProgressCalendar: () => null }))
vi.mock('../components/day-progress-detail', () => ({ DayProgressDetail: () => null }))
vi.mock('../components/progress-photos-panel', () => ({ ProgressPhotosPanel: () => <p>Sección fotos</p> }))
vi.mock('../components/streak-section', () => ({ StreakSection: () => <p>Sección racha</p> }))
vi.mock('../components/metrics-overview', () => ({ MetricsOverviewPanel: (p: Record<string, unknown>) => { props.metrics.push(p); return <p>Métricas</p> } }))
vi.mock('../components/metrics-table', () => ({ MetricsTable: () => null }))
vi.mock('../components/training-progress-panel', () => ({ TrainingProgressPanel: (p: Record<string, unknown>) => { props.training.push(p); return <p>Entrenamiento</p> } }))
vi.mock('../../clients/components/client-adherence-tab', () => ({ ClientAdherenceTab: () => <p>Sección adherencia</p> }))
vi.mock('../follow-up-tasks/follow-up-panel', () => ({ FollowUpPanel: () => <p>Sección seguimiento</p> }))

const DAY = 86_400_000
const today = () => new Date().toISOString().slice(0, 10)
const shift = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10)
function RouteProbe() {
  const [params] = useSearchParams()
  return <output aria-label="Ruta actual">{params.toString()}</output>
}
function mount(query: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([{ path: '/progress', element: <><ProgressPage /><RouteProbe /></> }], { initialEntries: [`/progress?${query}`] })
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
}
const params = () => new URLSearchParams(screen.getByLabelText('Ruta actual').textContent ?? '')
const lastMetrics = () => props.metrics[props.metrics.length - 1]
const lastTraining = () => props.training[props.training.length - 1]

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.setPointerCapture = () => undefined
  Element.prototype.releasePointerCapture = () => undefined
  Element.prototype.scrollIntoView = () => undefined
})
beforeEach(() => {
  window.localStorage.clear()
  props.metrics = []
  props.training = []
})

describe('Progreso: periodo compartido de Métricas y Entrenamiento', () => {
  it.each(['metricas', 'entrenamiento'])('muestra el selector de periodo de la página en %s', (section) => {
    mount(`clientId=client-a&section=${section}`)
    expect(screen.getByRole('combobox', { name: 'Periodo de métricas y entrenamiento' })).toBeInTheDocument()
  })

  it.each(['dashboard', 'resumen', 'fotos', 'adherencia', 'racha', 'seguimiento'])('oculta el selector de periodo de la página en %s', (section) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      mount(`clientId=client-a&section=${section}`)
      // La sección debe renderizarse de verdad: si el ErrorBoundary de React Router sustituye la página, el test falla.
      expect(screen.getByText(`Sección ${section}`)).toBeInTheDocument()
      expect(screen.queryByText(/Unexpected Application Error/)).not.toBeInTheDocument()
      expect(screen.queryByRole('combobox', { name: 'Periodo de métricas y entrenamiento' })).not.toBeInTheDocument()
      expect(consoleError.mock.calls.flat().join(' ')).not.toMatch(/ErrorBoundary|No ".*" export is defined/)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('sin periodo en la URL usa los últimos 30 días UTC', () => {
    mount('clientId=client-a&section=metricas')
    expect(screen.getByRole('combobox', { name: 'Periodo de métricas y entrenamiento' })).toHaveTextContent('Últimos 30 días')
    expect(lastMetrics()).toEqual(expect.objectContaining({ from: shift(today(), -29), to: today() }))
  })

  it('un enlace antiguo period=3m restaura 90 días y compara Entrenamiento con el periodo anterior', () => {
    mount('clientId=client-a&section=entrenamiento&period=3m')
    expect(screen.getByRole('combobox', { name: 'Periodo de métricas y entrenamiento' })).toHaveTextContent('Últimos 90 días')
    const from = shift(today(), -89)
    expect(lastTraining()).toEqual(expect.objectContaining({
      from, to: today(), valid: true, previousFrom: shift(from, -90), previousTo: shift(from, -1),
    }))
  })

  it('Todo el historial recorre ventanas de 366 días y no compara con un periodo anterior', () => {
    mount('clientId=client-a&section=entrenamiento&period=all')
    expect(screen.getByLabelText('Ventanas consecutivas desde inicio')).toBeInTheDocument()
    expect(lastTraining()).toEqual(expect.objectContaining({ to: today(), from: shift(today(), -365), previousFrom: undefined, previousTo: undefined }))
  })

  it('un rango personalizado mayor de 366 días muestra un aviso en Entrenamiento en lugar de pedirlo', () => {
    mount('clientId=client-a&section=entrenamiento&period=custom&from=2020-01-01&to=2021-01-01')
    expect(screen.getByRole('alert')).toHaveTextContent('El periodo seleccionado tiene 367 días y Entrenamiento admite hasta 366')
    expect(props.training).toHaveLength(0)
  })

  it('un rango personalizado de 366 días se consulta con su periodo anterior equivalente', () => {
    mount('clientId=client-a&section=entrenamiento&period=custom&from=2020-01-01&to=2020-12-31')
    expect(lastTraining()).toEqual(expect.objectContaining({ from: '2020-01-01', to: '2020-12-31', previousFrom: '2018-12-31', previousTo: '2019-12-31' }))
  })

  it('cambiar el preset actualiza la URL y reinicia la paginación del histórico', async () => {
    mount('clientId=client-a&section=metricas&period=30d&historyPage=3&trainingWindow=2')
    await userEvent.click(screen.getByRole('combobox', { name: 'Periodo de métricas y entrenamiento' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Últimos 7 días' }))
    await waitFor(() => expect(params().get('historyPage')).toBe('1'))
    expect(params().get('period')).toBe('7d')
    expect(params().get('trainingWindow')).toBe('0')
    expect(lastMetrics()).toEqual(expect.objectContaining({ from: shift(today(), -6), page: 1 }))
  })

  it('restaurar la URL no reinicia la página del histórico', () => {
    mount('clientId=client-a&section=metricas&period=7d&historyPage=3')
    expect(lastMetrics()).toEqual(expect.objectContaining({ page: 3 }))
    expect(params().get('historyPage')).toBe('3')
  })
})

describe('Progreso: selección persistida en la URL', () => {
  it('pasa metric_group, metric y compare al panel y los actualiza en la URL', async () => {
    mount('clientId=client-a&section=metricas&metric_group=body&metric=waist_cm&compare=hips_cm')
    expect(lastMetrics()).toEqual(expect.objectContaining({ selection: { group: 'body', metric: 'waist_cm', compare: 'hips_cm' } }))
    const onSelectionChange = lastMetrics().onSelectionChange as (updates: Record<string, string | null>) => void
    act(() => onSelectionChange({ group: 'habits', metric: null, compare: null }))
    await waitFor(() => expect(params().get('metric_group')).toBe('habits'))
    expect(params().has('metric')).toBe(false)
    expect(params().has('compare')).toBe(false)
    expect(params().get('clientId')).toBe('client-a')
  })

  it('restaura la medida de la evolución de cargas y descarta valores inválidos', async () => {
    mount('clientId=client-a&section=entrenamiento&period=30d&measure=reps')
    expect(lastTraining()).toEqual(expect.objectContaining({ measure: 'reps' }))
    const onMeasureChange = lastTraining().onMeasureChange as (measure: string) => void
    act(() => onMeasureChange('seconds'))
    await waitFor(() => expect(params().get('measure')).toBe('seconds'))
    expect(lastTraining()).toEqual(expect.objectContaining({ measure: 'seconds' }))
  })

  it('una medida desconocida en la URL vuelve al peso externo', () => {
    mount('clientId=client-a&section=entrenamiento&period=30d&measure=volume')
    expect(lastTraining()).toEqual(expect.objectContaining({ measure: 'weight_kg' }))
  })
})
