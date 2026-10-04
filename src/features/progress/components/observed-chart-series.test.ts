import { describe, expect, it } from 'vitest'
import { observedChartSeries, observationTimestamp, orderObservedRecords } from './observed-chart-series'
const point = (date: string | undefined, value: number | null) => ({ timestamp: observationTimestamp(date), value })
const valid = (item: ReturnType<typeof point>) => item.value !== null && Number.isFinite(item.value)
describe('Guías entre observaciones, sin reconstrucción', () => {
  it('ordena registros reales, conserva cero y distancia temporal sin generar días', () => {
    const records = [point('2026-09-10', 20), point('2026-09-01', 0), point('2026-09-03', 10)]
    const result = observedChartSeries(records, valid)
    expect(result.points.map((item) => item.value)).toEqual([0, 10, 20])
    expect(result.segments).toEqual([result.points])
    expect(result.points[1].timestamp - result.points[0].timestamp).toBe(2 * 86400000)
    expect(records[0].value).toBe(20)
  })
  it('null y no finitos interrumpen las guías sin convertirse en ceros', () => {
    const result = observedChartSeries([point('2026-09-01', 0), point('2026-09-03', null),
      point('2026-09-05', 10), point('2026-09-07', NaN), point('2026-09-09', 20)], valid)
    expect(result.points.map((item) => item.value)).toEqual([0, 10, 20])
    expect(result.segments).toEqual([])
  })
  it('fecha desconocida o inválida rompe el recorrido, pero conserva las observaciones válidas', () => {
    for (const date of [undefined, 'invalid', '2026-02-30']) {
      const result = observedChartSeries([point('2026-09-01', 0), point(date, 1), point('2026-09-05', 2)], valid)
      expect(result.points).toHaveLength(2)
      expect(result.segments).toEqual([])
    }
  })
  it('mantiene barreras de fecha inválida en su bloque al ordenar para gráficos de líneas', () => {
    const records = [point('2026-09-03', 3), point('2026-09-01', 0), point(undefined, null),
      point('2026-09-10', 10), point('2026-09-08', 8)]
    expect(orderObservedRecords(records).map((item) => item.value)).toEqual([0, 3, null, 8, 10])
  })
  it('cero, una observación y observaciones de una misma fecha no generan tendencia temporal', () => {
    for (const records of [[], [point('2026-09-01', 0)], [point('2026-09-01', 1), point('2026-09-01', 2)]]) {
      expect(observedChartSeries(records, valid).segments).toEqual([])
    }
  })
})
