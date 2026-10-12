import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { MetricSeries } from '../metrics-overview'
import { MetricVisual } from './metric-visual'

const chart = vi.hoisted(() => ({ scatter: vi.fn(), axis: vi.fn(), tooltip: vi.fn() }))
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ScatterChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null, XAxis: () => null,
  Tooltip: (props: unknown) => { chart.tooltip(props); return null },
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
  it('preserva cero observado, excluye null y parcial, sin unir los huecos ni animar', () => {
    chart.scatter.mockClear()
    render(<MetricVisual series={[weight]} period="Periodo completo" chartPeriod="Página actual" />)
    expect(chart.scatter).toHaveBeenCalledTimes(1)
    expect(chart.scatter).toHaveBeenLastCalledWith(expect.objectContaining({ isAnimationActive: false, data: [
      expect.objectContaining({ value: 0, date: '2020-01-01' }), expect.objectContaining({ value: 2, date: '2020-01-04' }),
    ] }))
    expect(chart.scatter.mock.lastCall?.[0]).not.toHaveProperty('line')
    fireEvent.click(screen.getByText('Ver datos, semanas y procedencia'))
    expect(screen.getByRole('table')).toHaveTextContent('Sin datos')
    expect(screen.getByRole('table')).toHaveTextContent('Parcial: solo parte conocida · legacy disponible')
  })
  it('une observaciones comparables con guía recta', () => {
    chart.scatter.mockClear()
    render(<MetricVisual series={[{ ...weight, points: [weight.points[0], weight.points[3]] }]} period="Periodo completo" chartPeriod="Página actual" />)
    expect(chart.scatter).toHaveBeenCalledWith(expect.objectContaining({ line: true, lineType: 'joint', lineJointType: 'linear', fill: 'var(--foreground-accent)', data: [
      expect.objectContaining({ value: 0, timestamp: Date.parse('2020-01-01') }),
      expect.objectContaining({ value: 2, timestamp: Date.parse('2020-01-04') }),
    ] }))
    expect(screen.getByLabelText('Cambio observado')).toHaveTextContent('+2 kg')
    expect(screen.queryByText(/mejora de peso/i)).not.toBeInTheDocument()
  })
  it('aplica los tokens de tema al contenedor, etiqueta y elementos del tooltip', () => {
    render(<MetricVisual series={[weight]} period="Periodo completo" chartPeriod="Página actual" />)
    expect(chart.tooltip).toHaveBeenLastCalledWith(expect.objectContaining({
      contentStyle: expect.objectContaining({ color: 'var(--foreground)', backgroundColor: 'var(--card)' }),
      itemStyle: expect.objectContaining({ color: 'var(--foreground)' }),
      labelStyle: expect.objectContaining({ color: 'var(--foreground)' }),
    }))
  })
  it('selecciona otra unidad sin mezclar ejes y conserva semanas como observaciones', () => {
    const rating: MetricSeries = { ...weight, key: 'stress', label: 'Estrés', unit: '0–5', points: [{ date: '2020-01-06', end_date: '2020-01-12', value: 3, quality: 'complete', provenance: 'recap' }] }
    render(<MetricVisual series={[weight, rating]} period="Periodo completo" chartPeriod="Página actual" />)
    chart.scatter.mockClear()
    fireEvent.change(screen.getByRole('combobox', { name: 'Medición' }), { target: { value: 'stress' } })
    expect(chart.scatter).toHaveBeenCalledTimes(1)
    expect(chart.scatter.mock.lastCall?.[0]).not.toHaveProperty('line')
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

describe('Métricas: estadísticas y comparación de mediciones', () => {
  beforeAll(() => {
    // Radix Select relies on pointer capture and scrolling, which JSDOM does not implement.
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => undefined
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = () => undefined
  })
  const complete = (date: string, value: number) => ({ date, value, quality: 'complete' as const, provenance: 'recorded' })
  const waist: MetricSeries = { ...weight, key: 'waist', label: 'Cintura', unit: 'cm', min: 80, max: 82.5, mean: 81.25, count: 2, incomplete_count: 0, change: 2.5,
    first: complete('2020-01-01', 80), last: complete('2020-01-04', 82.5), points: [complete('2020-01-01', 80), complete('2020-01-04', 82.5)] }
  const hips: MetricSeries = { ...waist, key: 'hips', label: 'Cadera', min: 95, max: 96, mean: 95.5, points: [complete('2020-01-02', 95), complete('2020-01-03', 96)] }
  const muscle: MetricSeries = { ...weight, key: 'muscle', label: 'Masa muscular', unit: 'kg' }
  const sleep: MetricSeries = { ...waist, key: 'sleep_h', label: 'Sueño', unit: 'h' }
  const otherGroupCm: MetricSeries = { ...waist, key: 'habit_cm', label: 'Otra', group: 'habits' }

  it('muestra Primera, Última, Cambio, Mín, Máx, Media y Mediciones con formato es-ES', () => {
    render(<MetricVisual series={[waist]} period="P" chartPeriod="C" />)
    const stats = screen.getByLabelText('Estadísticas del periodo · Cintura')
    const value = (label: string) => within(stats).getByText(label).nextElementSibling?.textContent
    expect(value('Primera')).toBe('80 cm')
    expect(value('Última')).toBe('82,5 cm')
    expect(value('Cambio')).toBe('+2,5 cm')
    expect(value('Mín')).toBe('80 cm')
    expect(value('Máx')).toBe('82,5 cm')
    expect(value('Media')).toBe('81,25 cm')
    expect(value('Mediciones')).toBe('2')
  })

  it('null y campos ausentes (API anterior) se muestran como «—», nunca como cero', () => {
    const legacy: MetricSeries = { ...weight, first: null, last: null, change: null, count: 0, points: [] }
    render(<MetricVisual series={[legacy, { ...waist, min: null, max: null, mean: null }]} period="P" chartPeriod="C" />)
    const stats = screen.getByLabelText('Estadísticas del periodo · Peso')
    for (const label of ['Primera', 'Última', 'Cambio', 'Mín', 'Máx', 'Media']) {
      expect(within(stats).getByText(label).nextElementSibling).toHaveTextContent('—')
    }
    expect(within(stats).getByText('Mediciones').nextElementSibling).toHaveTextContent('0')
    expect(within(stats).queryByText('0 kg')).not.toBeInTheDocument()
  })

  it('«Comparar con» solo ofrece mediciones del mismo grupo y unidad idéntica, y Ninguna por defecto', async () => {
    render(<MetricVisual series={[waist, hips, muscle, sleep, otherGroupCm]} period="P" chartPeriod="C" />)
    const trigger = screen.getByRole('combobox', { name: 'Comparar con' })
    expect(trigger).toHaveTextContent('Ninguna')
    await userEvent.click(trigger)
    const options = screen.getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['Ninguna', 'Cadera (cm)'])
  })

  it('sin mediciones compatibles el selector queda deshabilitado', () => {
    render(<MetricVisual series={[weight, sleep]} period="P" chartPeriod="C" />)
    expect(screen.getByRole('combobox', { name: 'Comparar con' })).toBeDisabled()
  })

  it('traza la segunda medición en el mismo eje con guía discontinua, rombos, leyenda textual y tabla conjunta', () => {
    chart.scatter.mockClear()
    const onSelectionChange = vi.fn()
    render(<MetricVisual series={[waist, hips]} selection={{ metric: 'waist', compare: 'hips' }} onSelectionChange={onSelectionChange} period="P" chartPeriod="C" />)
    const calls = chart.scatter.mock.calls.map(([props]) => props as Record<string, unknown>)
    expect(calls.find((props) => props.name === 'Cintura')).toEqual(expect.objectContaining({ fill: 'var(--foreground-accent)' }))
    expect(calls.find((props) => props.name === 'Cadera')).toEqual(expect.objectContaining({ fill: 'var(--foreground)', shape: 'diamond' }))
    expect(calls.filter((props) => props.line && typeof props.line === 'object')).toEqual([
      expect.objectContaining({ fill: 'var(--foreground)', line: { strokeDasharray: '6 4' }, data: [expect.objectContaining({ value: 95 }), expect.objectContaining({ value: 96 })] }),
    ])
    expect(calls.filter((props) => props.line === true)).toHaveLength(1)
    expect(chart.axis.mock.lastCall?.[0]).toEqual(expect.objectContaining({ name: 'Cintura' }))
    expect(screen.getByText(/Cintura: círculos y guía continua · Cadera: rombos y guía discontinua/)).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Medición' })).toBeInTheDocument()
    expect(within(table).getAllByText('Cintura')).toHaveLength(2)
    expect(within(table).getAllByText('Cadera')).toHaveLength(2)
    expect(table).toHaveTextContent('95 cm')
  })

  it('cambiar de medición reinicia la comparación en una sola actualización; una comparación inválida se ignora', () => {
    const onSelectionChange = vi.fn()
    render(<MetricVisual series={[waist, hips, muscle]} selection={{ metric: 'waist', compare: 'muscle' }} onSelectionChange={onSelectionChange} period="P" chartPeriod="C" />)
    expect(screen.getByRole('combobox', { name: 'Comparar con' })).toHaveTextContent('Ninguna')
    expect(screen.queryByText(/rombos y guía discontinua/)).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: 'Medición' }), { target: { value: 'hips' } })
    expect(onSelectionChange).toHaveBeenCalledTimes(1)
    expect(onSelectionChange).toHaveBeenCalledWith({ metric: 'hips', compare: null })
  })

  it('la presentación compacta no ofrece comparación ni fila de estadísticas', () => {
    render(<MetricVisual compact series={[waist, hips]} period="P" chartPeriod="C" />)
    expect(screen.queryByRole('combobox', { name: 'Comparar con' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Estadísticas del periodo/)).not.toBeInTheDocument()
  })
})
