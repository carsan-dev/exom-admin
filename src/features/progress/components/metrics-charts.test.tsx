import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { MetricsCharts } from './metrics-charts'
const chart = vi.hoisted(() => ({ axis: vi.fn(), line: vi.fn(), tooltip: vi.fn(), data: vi.fn() }))
vi.mock('../api', () => ({
  useClientWeightHistory: () => ({ data: [{ date: '2026-09-01', value: 0 }, { date: '2026-09-03', value: null }, { date: '2026-09-10', value: 2 }] }),
  useClientBodyHistory: () => ({ data: [{ date: '2026-09-01', value: 3 }, { date: '2026-09-10', value: NaN }] }),
}))
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  LineChart: ({ children, data }: { children: ReactNode; data: unknown }) => { chart.data(data); return <div>{children}</div> },
  XAxis: (props: unknown) => { chart.axis(props); return null },
  Line: (props: unknown) => { chart.line(props); return null },
  Tooltip: (props: unknown) => { chart.tooltip(props); return null },
  YAxis: () => null, CartesianGrid: () => null,
}))
it('preserva fechas, cero y huecos con guías rectas y texto del tema en ambos tooltips legacy', () => {
  render(<MetricsCharts clientId="client-a" selectedField="sleep_hours" onFieldChange={() => {}} />)
  for (const [props] of chart.axis.mock.calls) expect(props).toMatchObject({ dataKey: 'timestamp', type: 'number', scale: 'time' })
  for (const [props] of chart.line.mock.calls) expect(props).toMatchObject({ type: 'linear', connectNulls: false })
  for (const [props] of chart.tooltip.mock.calls) expect(props).toMatchObject({ contentStyle: { backgroundColor: 'var(--card)', color: 'var(--foreground)' }, itemStyle: { color: 'var(--foreground)' }, labelStyle: { color: 'var(--foreground)' } })
  expect(chart.data.mock.calls[0][0].map((point: { value: number | null }) => point.value)).toEqual([0, null, 2])
  expect(chart.data.mock.calls[1][0].map((point: { value: number | null }) => point.value)).toEqual([3, null])
})
