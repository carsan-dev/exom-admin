import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MetricSeries } from '../metrics-overview'
import { MetricVisual } from './metric-visual'

const chart = vi.hoisted(() => ({ scatter: vi.fn(), axis: vi.fn() }))
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ScatterChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null, XAxis: () => null, Tooltip: () => null,
  YAxis: (props: unknown) => { chart.axis(props); return null },
  Scatter: (props: unknown) => { chart.scatter(props); return null },
}))
const weight: MetricSeries = {
  key: 'weight', label: 'Peso', unit: 'kg', group: 'body', source: 'Mediciones', count: 2, incomplete_count: 2,
  first: { date: '2020-01-01', value: 0, quality: 'complete', provenance: 'recorded' },
  last: { date: '2020-01-04', value: 2, quality: 'complete', provenance: 'recorded' }, change: 2,
  points: [
    { date: '2020-01-01', value: 0, quality: 'complete', provenance: 'recorded' },
    { date: '2020-01-02', value: null, quality: 'missing', provenance: 'recorded' },
    { date: '2020-01-03', value: 1, quality: 'partial', provenance: 'legacy_available' },
    { date: '2020-01-04', value: 2, quality: 'complete', provenance: 'recorded' },
  ],
}
describe('Gráfico compartido: solo observaciones', () => {
  it('preserva cero observado, excluye null y parcial, sin líneas ni animación', () => {
    render(<MetricVisual series={[weight]} period="Periodo completo" chartPeriod="Página actual" />)
    expect(chart.scatter).toHaveBeenLastCalledWith(expect.objectContaining({ isAnimationActive: false, data: [
      expect.objectContaining({ value: 0, date: '2020-01-01' }), expect.objectContaining({ value: 2, date: '2020-01-04' }),
    ] }))
    expect(chart.scatter.mock.lastCall?.[0]).not.toHaveProperty('line')
    fireEvent.click(screen.getByText('Ver datos, semanas y procedencia'))
    expect(screen.getByRole('table')).toHaveTextContent('Sin datos')
    expect(screen.getByRole('table')).toHaveTextContent('Parcial: solo parte conocida · legacy disponible')
  })
  it('selecciona otra unidad sin mezclar ejes y conserva semanas como observaciones', () => {
    const rating: MetricSeries = { ...weight, key: 'stress', label: 'Estrés', unit: '0–5', points: [{ date: '2020-01-06', end_date: '2020-01-12', value: 3, quality: 'complete', provenance: 'recap' }] }
    render(<MetricVisual series={[weight, rating]} period="Periodo completo" chartPeriod="Página actual" />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Medición' }), { target: { value: 'stress' } })
    expect(chart.axis).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Estrés', domain: [0, 5], tickFormatter: expect.any(Function) }))
    expect(chart.axis.mock.lastCall?.[0].tickFormatter(3)).toBe('3 0–5')
    expect(chart.scatter).toHaveBeenLastCalledWith(expect.objectContaining({ data: [expect.objectContaining({ date: '2020-01-06', end_date: '2020-01-12', value: 3 })] }))
    expect(screen.queryByRole('combobox', { name: 'Escala del eje Y' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Ver datos, semanas y procedencia'))
    expect(screen.getByRole('table')).toHaveTextContent('06/01/2020 – 12/01/2020')
  })
  it('no presenta cambio entre observaciones de la misma fecha ni rellena una página vacía', () => {
    render(<MetricVisual series={[{ ...weight, last: weight.first, points: [] }]} period="Periodo completo" chartPeriod="Página vacía" />)
    expect(screen.getByLabelText('Cambio observado')).toHaveTextContent('No comparable')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText(/Sin observaciones completas en esta página/)).toBeInTheDocument()
  })
})
