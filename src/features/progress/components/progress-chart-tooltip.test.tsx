import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Scatter, ScatterChart, XAxis, YAxis } from 'recharts'
import { ProgressChartTooltip } from './progress-chart-tooltip'

// Real Recharts default content; DOM style contract, not browser hover/contrast proof.
describe('Tooltip local de Progreso', () => {
  it('Recharts descubre el tooltip compartido y dibuja una guía SVG recta con el color EXOM', () => {
    const points = [{ timestamp: 0, value: 0 }, { timestamp: 2 * 86400000, value: 2 }]
    const { container } = render(<ScatterChart width={400} height={200}>
      <XAxis dataKey="timestamp" type="number" /><YAxis dataKey="value" name="Peso" />
      <ProgressChartTooltip formatter={(value, name) => name === 'Peso' ? [`${value} kg`, 'Peso'] : [value, name]} />
      <Scatter data={points} line lineType="joint" lineJointType="linear" shape={() => <g />}
        tooltipType="none" fill="var(--foreground-accent)" isAnimationActive={false} />
      <Scatter data={points} fill="var(--foreground-accent)" isAnimationActive={false} />
    </ScatterChart>)
    const guide = container.querySelector('.recharts-scatter-line path')
    expect(guide).toHaveAttribute('stroke', 'var(--foreground-accent)')
    expect(guide?.getAttribute('d')).toMatch(/^M[\d.,-]+L[\d.,-]+$/)
    const dot = container.querySelectorAll('.recharts-scatter-symbol')[2]
    expect(dot).toBeDefined()
    fireEvent.mouseEnter(dot)
    expect(screen.getByText('0 kg')).toBeInTheDocument()
    expect(screen.getByText('Peso').closest('li')).toHaveStyle({ color: 'var(--foreground)' })
  })
  it('usa foreground/card del tema, nunca negro sobre blanco fijo, en todo el texto del tooltip', () => {
    render(<ProgressChartTooltip active label="01/10/2026" coordinate={{ x: 10, y: 10 }}
      payload={[{ name: 'Peso', value: 0, color: '#000', dataKey: 'value' }]}
      contentStyle={{ backgroundColor: '#fff', color: '#000' }}
      itemStyle={{ color: '#000' }} labelStyle={{ color: '#000' }}
      formatter={(value) => [`${value} kg`, 'Peso']} />)
    expect(screen.getByText('01/10/2026')).toHaveStyle({ color: 'var(--foreground)' })
    const item = screen.getByText('Peso').closest('li')
    expect(item).toHaveStyle({ color: 'var(--foreground)' })
    expect(screen.getByText('0 kg')).toBeInTheDocument()
    expect(item?.parentElement?.parentElement).toHaveStyle({ backgroundColor: 'var(--card)', color: 'var(--foreground)' })
    // Recharts name, separator, value and unit spans inherit the enforced item color.
    for (const span of item?.querySelectorAll('span') ?? []) expect(span.style.color).toBe('')
    expect(item?.querySelector('.recharts-tooltip-item-separator')).toHaveTextContent(':')
  })
})
