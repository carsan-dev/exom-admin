import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DeltaBadge } from './delta-badge'

const badge = () => screen.getByTestId('delta-badge')

describe('DeltaBadge', () => {
  it.each([
    [null, 5],
    [5, null],
    [null, null],
  ])('shows "Sin datos previos" for missing data (%s, %s)', (current, previous) => {
    render(<DeltaBadge current={current} previous={previous} polarity="higher-is-better" />)
    expect(badge()).toHaveTextContent('Sin datos previos')
    expect(badge()).not.toHaveTextContent('0')
    expect(badge()).toHaveAttribute('aria-label', 'Sin datos del periodo anterior')
    expect(badge()).toHaveClass('text-muted-foreground')
  })

  it('formats absolute differences in es-ES with unit and sign', () => {
    render(<DeltaBadge current={81.5} previous={80} polarity="neutral" unit="kg" />)
    expect(badge()).toHaveTextContent('+1,5 kg')
    expect(badge()).toHaveAttribute('aria-label', 'Sube 1,5 kg respecto al periodo anterior')
    expect(badge()).toHaveClass('text-foreground')
    expect(badge().querySelector('svg')).toHaveClass('text-muted-foreground')
  })

  it('uses the true minus sign for decreases', () => {
    render(<DeltaBadge current={96.8} previous={100} polarity="higher-is-better" mode="percent" />)
    expect(badge()).toHaveTextContent('−3,2 %')
    expect(badge()).toHaveAttribute('aria-label', 'Baja 3,2 % respecto al periodo anterior')
    expect(badge()).toHaveClass('text-foreground')
    expect(badge().querySelector('svg')).toHaveClass('text-status-error')
  })

  it('renders both modes', () => {
    render(<DeltaBadge current={18} previous={16} polarity="higher-is-better" mode="both" />)
    expect(badge()).toHaveTextContent('+2 (12,5 %)')
    expect(badge().querySelector('svg')).toHaveClass('text-status-success')
  })

  it('falls back to absolute when previous is 0', () => {
    render(<DeltaBadge current={3} previous={0} polarity="higher-is-better" mode="percent" />)
    expect(badge()).toHaveTextContent('+3')
    expect(badge()).not.toHaveTextContent('%')
  })

  it('applies polarity colours', () => {
    const { rerender } = render(<DeltaBadge current={5} previous={10} polarity="lower-is-better" />)
    expect(badge().querySelector('svg')).toHaveClass('text-status-success')
    expect(badge()).not.toHaveClass('text-status-success')
    rerender(<DeltaBadge current={15} previous={10} polarity="lower-is-better" />)
    expect(badge().querySelector('svg')).toHaveClass('text-status-error')
    expect(badge()).toHaveClass('text-foreground')
  })

  it('shows no change in muted colour', () => {
    render(<DeltaBadge current={10} previous={10} polarity="higher-is-better" unit="kg" />)
    expect(badge()).toHaveClass('text-muted-foreground')
    expect(badge()).toHaveAttribute('aria-label', 'Sin cambios respecto al periodo anterior')
    expect(badge()).toHaveTextContent('Sin cambios')
  })

  it('shows no change when the displayed magnitude rounds to zero', () => {
    render(<DeltaBadge current={10.001} previous={10} polarity="higher-is-better" unit="kg" />)
    expect(badge()).toHaveTextContent('Sin cambios')
    expect(badge()).not.toHaveTextContent('+')
    expect(badge()).toHaveClass('text-muted-foreground')
    expect(badge().querySelector('svg')).toHaveClass('text-muted-foreground')
    expect(badge().querySelector('svg')).not.toHaveClass('text-status-success')
    expect(badge()).toHaveAttribute('aria-label', 'Sin cambios respecto al periodo anterior')
  })

  it('uses a custom formatter', () => {
    render(<DeltaBadge current={120} previous={60} polarity="neutral" format={(n) => `${n / 60} min`} />)
    expect(badge()).toHaveTextContent('+1 min')
  })
})
