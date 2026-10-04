import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MetricsOverview, MetricSeries } from '../metrics-overview'
import { MetricsOverviewPanel } from './metrics-overview'

vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })

const query = vi.hoisted(() => ({ data: undefined as MetricsOverview | undefined, isPending: false, isError: false, refetch: vi.fn() }))
vi.mock('../api', () => ({ useMetricsOverview: () => query }))

function series(overrides: Partial<MetricSeries> = {}): MetricSeries {
  return { key: 'weight', label: 'Peso', unit: 'kg', group: 'body', source: 'Mediciones corporales', count: 2, incomplete_count: 1,
    first: { date: '2020-01-01', value: 70, quality: 'complete', provenance: 'recorded' },
    last: { date: '2020-01-03', value: 72, quality: 'complete', provenance: 'recorded' }, change: 2,
    points: [
      { date: '2020-01-01', value: 70, quality: 'complete', provenance: 'recorded' },
      { date: '2020-01-02', value: null, quality: 'missing', provenance: 'recorded' },
      { date: '2020-01-03', value: 72, quality: 'complete', provenance: 'recorded' },
    ], ...overrides }
}
const onPageChange = vi.fn()
function panel(clientId = 'client-a') {
  return <MetricsOverviewPanel clientId={clientId} from="2020-01-01" to="2020-01-31" page={1} onPageChange={onPageChange} valid />
}
beforeEach(() => {
  query.isPending = false
  query.isError = false
  query.data = { client_id: 'client-a', from: '2020-01-01', to: '2020-01-31', chart_from: '2020-01-01', chart_to: '2020-01-10', page: 1, total_pages: 2, series: [series(), series({ key: 'sleep', label: 'Sueño', unit: 'h', count: 0, first: null, last: null, change: null, points: [] })] }
})
describe('Métricas: interpretación y selección', () => {
  it('prioriza una medición con cobertura, cambio neutral y ventana gráfica explícita', () => {
    render(panel())
    expect(screen.getByRole('heading', { name: 'Peso · kg' })).toBeInTheDocument()
    expect(screen.getByText('2 observaciones completas · 1 incompleta')).toBeInTheDocument()
    expect(screen.getByText('Cambio observado')).toBeInTheDocument()
    expect(screen.getByText(/No estimamos valores entre fechas/)).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: 'Medición' }), { target: { value: 'sleep' } })
    expect(screen.getByRole('heading', { name: 'Sueño · h' })).toBeInTheDocument()
    expect(screen.getByText('Sin observaciones completas para esta medición.')).toBeInTheDocument()
  })
  it('una observación no implica tendencia ni cambio', () => {
    query.data!.series = [series({ count: 1, last: series().first, change: 0, points: [series().first!] })]
    render(panel())
    expect(screen.getByText('Una observación no permite establecer una tendencia.')).toBeInTheDocument()
    expect(screen.getByLabelText('Cambio observado')).toHaveTextContent('No comparable')
  })
  it('separa carga, error con reintento y respuesta de otro cliente', () => {
    query.isPending = true
    const { rerender } = render(panel())
    expect(screen.getByRole('status')).toHaveTextContent('Cargando métricas')
    query.isPending = false
    query.isError = true
    rerender(panel())
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(query.refetch).toHaveBeenCalledOnce()
    query.isError = false
    rerender(panel('client-b'))
    expect(screen.queryByRole('heading', { name: 'Peso · kg' })).not.toBeInTheDocument()
    expect(screen.queryByText('72 kg')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('cliente seleccionado')
  })
  it('mantiene paginación y grupos sin cambiar el periodo comparado', () => {
    render(panel())
    expect(screen.getByRole('button', { name: 'Más reciente' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Más antiguo' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
    expect(screen.getByText(/La comparación conserva el periodo completo/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hábitos' }))
    expect(screen.getByRole('button', { name: 'Hábitos' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('No hay mediciones disponibles en este grupo.')).toBeInTheDocument()
  })
})
