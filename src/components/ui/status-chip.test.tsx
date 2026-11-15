import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatusChip } from './status-chip'

describe('StatusChip', () => {
  it('renders its text label', () => {
    render(<StatusChip>Activo</StatusChip>)
    expect(screen.getByText('Activo')).toBeInTheDocument()
  })

  it.each(['success', 'warning', 'danger', 'info', 'neutral', 'brand'] as const)(
    'renders the %s variant with its label',
    (variant) => {
      render(<StatusChip variant={variant}>Estado</StatusChip>)
      expect(screen.getByText('Estado')).toBeInTheDocument()
    }
  )

  it('defaults to neutral and uses distinct classes per variant', () => {
    render(
      <>
        <StatusChip data-testid="def">A</StatusChip>
        <StatusChip data-testid="ok" variant="success">B</StatusChip>
      </>
    )
    expect(screen.getByTestId('def').className).toContain('text-foreground-secondary')
    expect(screen.getByTestId('ok').className).toContain('text-status-success')
  })

  it('merges className', () => {
    render(<StatusChip className="custom-x">A</StatusChip>)
    const el = screen.getByText('A')
    expect(el).toHaveClass('custom-x')
    expect(el).toHaveClass('rounded-full')
  })

  it('forwards ref', () => {
    const ref = createRef<HTMLSpanElement>()
    render(<StatusChip ref={ref}>A</StatusChip>)
    expect(ref.current).toBeInstanceOf(HTMLSpanElement)
  })

  it('renders an aria-hidden dot by default and can hide it', () => {
    const { container, rerender } = render(<StatusChip>A</StatusChip>)
    const dot = container.querySelector('[data-slot="status-chip-dot"]')
    expect(dot).not.toBeNull()
    expect(dot).toHaveAttribute('aria-hidden', 'true')
    rerender(<StatusChip dot={false}>A</StatusChip>)
    expect(container.querySelector('[data-slot="status-chip-dot"]')).toBeNull()
  })

  it('passes extra props through', () => {
    render(<StatusChip aria-label="estado" data-testid="chip">A</StatusChip>)
    expect(screen.getByTestId('chip')).toHaveAttribute('aria-label', 'estado')
  })
})
