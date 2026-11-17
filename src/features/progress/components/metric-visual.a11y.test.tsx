import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MetricSeries } from '../metrics-overview'
import { MetricVisual } from './metric-visual'

// Recharts real (sus símbolos de Scatter llevan role="img"); solo se fija el tamaño que jsdom no calcula.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  const { cloneElement } = await import('react')
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
    cloneElement(children as React.ReactElement<{ width: number; height: number }>, { width: 800, height: 256 }) }
})

const weight: MetricSeries = {
  key: 'weight', label: 'Peso', unit: 'kg', group: 'body', source: 'Mediciones', count: 2, incomplete_count: 0,
  first: { date: '2020-01-01', value: 70, quality: 'complete', provenance: 'recorded' },
  last: { date: '2020-01-04', value: 72, quality: 'complete', provenance: 'recorded' }, change: 2,
  points: [
    { date: '2020-01-01', value: 70, quality: 'complete', provenance: 'recorded' },
    { date: '2020-01-04', value: 72, quality: 'complete', provenance: 'recorded' },
  ],
}

/** RDS-F5-A11Y-20: un único nombre accesible por gráfico; las capas internas no exponen img sin nombre. */
describe('MetricVisual accesibilidad del gráfico', () => {
  it('el contenedor nombra el gráfico y los símbolos de recharts quedan ocultos', () => {
    const { container } = render(
      <MetricVisual series={[weight]} period="Periodo completo" chartPeriod="Página actual" />,
    )

    const chart = screen.getByRole('img', { name: /^Peso, kg, Página actual/ })
    const symbols = chart.querySelectorAll('.recharts-scatter-symbol')
    expect(symbols.length).toBeGreaterThan(0)
    for (const symbol of symbols) {
      expect(symbol.closest('[aria-hidden="true"]')).not.toBeNull()
    }
    // Solo queda expuesto el contenedor con nombre.
    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(container.querySelectorAll('svg[aria-hidden="true"].recharts-surface').length).toBe(1)
  })
})
