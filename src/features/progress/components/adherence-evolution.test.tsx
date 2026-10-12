import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { AdherenceDay, ComponentAdherence } from '@/features/clients/adherence.types'
import { AdherenceEvolution } from './adherence-evolution'

const chart = vi.hoisted(() => ({ axis: vi.fn(), line: vi.fn(), tooltip: vi.fn(), data: vi.fn() }))
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  LineChart: ({ children, data }: { children: ReactNode; data: unknown }) => { chart.data(data); return <div>{children}</div> },
  XAxis: (props: unknown) => { chart.axis(props); return null },
  Line: (props: unknown) => { chart.line(props); return null },
  Tooltip: (props: unknown) => { chart.tooltip(props); return null },
  YAxis: () => null, CartesianGrid: () => null,
}))
function day(date: string, ratio: number | null): AdherenceDay {
  const component: ComponentAdherence = { status: 'evaluable', numerator: 0, denominator: 1, ratio, caveats: [] }
  return { date, revision: 1, basis: 'original', calendar: 'incomplete',
    evaluation: { date, period: 'closed', includeInClosedAggregate: true, training: component, nutrition: component, global: { ...component, source: 'both' } },
    indicators: { calories: { status: 'insufficient' }, protein: { status: 'insufficient' }, weeklySteps: { status: 'insufficient' } },
    intake: { estimated_calories: null, estimated_protein_g: null }, targets: { calories: null, protein_g: null },
    configuration: { known: false, version: null, low_global_percent: null }, schedule: { training: 'unknown', nutrition: 'unknown' } }
}
it('usa tiempo real, líneas rectas sin conectar huecos y tooltip con tokens de tema para las tres series', () => {
  render(<AdherenceEvolution days={[day('2026-09-01', 0), day('2026-09-03', null), day('2026-09-08', 0.5), day('2026-09-10', NaN)]} />)
  expect(chart.axis).toHaveBeenLastCalledWith(expect.objectContaining({ dataKey: 'timestamp', type: 'number', scale: 'time' }))
  expect(chart.data).toHaveBeenLastCalledWith([
    expect.objectContaining({ global: 0 }), expect.objectContaining({ global: null }),
    expect.objectContaining({ global: 50 }), expect.objectContaining({ global: null }),
  ])
  for (const [props] of chart.line.mock.calls) expect(props).toMatchObject({ type: 'linear', connectNulls: false, isAnimationActive: false })
  expect(chart.tooltip).toHaveBeenLastCalledWith(expect.objectContaining({ contentStyle: expect.objectContaining({ backgroundColor: 'var(--card)', color: 'var(--foreground)' }), itemStyle: { color: 'var(--foreground)' }, labelStyle: { color: 'var(--foreground)' } }))
  expect(chart.tooltip.mock.lastCall?.[0].labelFormatter(Date.parse('2026-09-08'))).toBe('2026-09-08 · UTC')
})
it('conserva cero aislado, no traza provisional y mantiene la tabla sin fechas válidas', () => {
  const provisional = day('2026-09-02', 1)
  provisional.evaluation.period = 'provisional'
  const view = render(<AdherenceEvolution days={[day('2026-09-01', 0), provisional]} />)
  expect(screen.getByText('Una observación global: no permite establecer una tendencia.')).toBeInTheDocument()
  expect(chart.data.mock.lastCall?.[0].map((point: { global: number | null }) => point.global)).toEqual([0, null])
  chart.data.mockClear()
  view.rerender(<AdherenceEvolution days={[day('invalid', 1)]} />)
  expect(chart.data).not.toHaveBeenCalled()
  expect(screen.getByRole('table')).toHaveTextContent('Sin dato evaluable')
})
