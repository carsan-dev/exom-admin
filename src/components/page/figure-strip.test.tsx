import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FigureStrip } from './figure-strip'

const items = [
  { label: 'Clientes activos', value: 46, hint: 'Con plan vigente' },
  { label: 'Cuentas bloqueadas', value: 1, tone: 'danger' as const },
  { label: 'Pendientes', value: 3, tone: 'warning' as const },
]

describe('FigureStrip', () => {
  it('renders a dl with the aria-label and one dt/dd pair per item', () => {
    const { container } = render(<FigureStrip items={items} aria-label="Resumen de clientes" />)
    const list = container.querySelector('dl')
    expect(list).not.toBeNull()
    expect(list).toHaveAttribute('aria-label', 'Resumen de clientes')
    expect(screen.getAllByRole('term')).toHaveLength(3)
    // 3 values + 1 hint
    expect(screen.getAllByRole('definition')).toHaveLength(4)
  })

  it('pairs each term with its value', () => {
    render(<FigureStrip items={items} />)
    const term = screen.getByText('Cuentas bloqueadas', { selector: 'dt' })
    const group = term.closest('div')
    expect(group).not.toBeNull()
    if (group) expect(within(group).getByRole('definition')).toHaveTextContent('1')
  })

  it('renders the hint as an extra definition', () => {
    render(<FigureStrip items={items} />)
    expect(screen.getByText('Con plan vigente')).toBeInTheDocument()
  })

  it('shows a decorative dot only for toned items and keeps the label text clean', () => {
    const { container } = render(<FigureStrip items={items} />)
    const dots = container.querySelectorAll('[data-slot="figure-strip-dot"]')
    expect(dots).toHaveLength(2)
    dots.forEach((dot) => expect(dot).toHaveAttribute('aria-hidden', 'true'))
    expect(screen.getByText('Clientes activos', { selector: 'dt' })).toBeInTheDocument()
  })

  it('accepts a className on the list', () => {
    const { container } = render(<FigureStrip items={items} className="extra" />)
    expect(container.querySelector('dl')).toHaveClass('extra')
  })
})
