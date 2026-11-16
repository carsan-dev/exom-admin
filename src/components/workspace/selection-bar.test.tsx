import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SelectionBar } from './selection-bar'

describe('SelectionBar (RDS-F2-05)', () => {
  it('renders nothing when there is no selection', () => {
    const { container } = render(
      <SelectionBar count={0} onClear={vi.fn()}>
        <button type="button">Eliminar seleccionados</button>
      </SelectionBar>,
    )

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('is a named region with the actions and a polite count', () => {
    render(
      <SelectionBar count={3} onClear={vi.fn()}>
        <button type="button">Eliminar seleccionados (3)</button>
      </SelectionBar>,
    )

    const region = screen.getByRole('region', { name: 'Acciones de selección' })
    expect(region).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar seleccionados (3)' })).toBeInTheDocument()

    const count = screen.getByText('3 seleccionados')
    expect(count).toHaveAttribute('aria-live', 'polite')
    expect(region).not.toHaveAttribute('aria-live')
  })

  it('uses the singular for one item and updates the count text', () => {
    const { rerender } = render(<SelectionBar count={1} onClear={vi.fn()} />)
    expect(screen.getByText('1 seleccionado')).toBeInTheDocument()

    rerender(<SelectionBar count={2} onClear={vi.fn()} />)
    expect(screen.getByText('2 seleccionados')).toBeInTheDocument()
  })

  it('accepts a custom count format and accessible name', () => {
    render(
      <SelectionBar
        count={2}
        onClear={vi.fn()}
        formatCount={(n) => `${n} días seleccionados`}
        aria-label="Acciones de la selección"
      />,
    )

    expect(screen.getByRole('region', { name: 'Acciones de la selección' })).toBeInTheDocument()
    expect(screen.getByText('2 días seleccionados')).toBeInTheDocument()
  })

  it('clears the selection by click and by keyboard', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    render(<SelectionBar count={2} onClear={onClear} />)

    const clear = screen.getByRole('button', { name: 'Limpiar selección' })
    await user.click(clear)
    expect(onClear).toHaveBeenCalledTimes(1)

    clear.focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClear).toHaveBeenCalledTimes(3)
  })

  it('merges a consumer className for positioning', () => {
    render(<SelectionBar count={1} onClear={vi.fn()} className="fixed bottom-6" />)

    const region = screen.getByRole('region', { name: 'Acciones de selección' })
    expect(region).toHaveClass('fixed', 'bottom-6')
    expect(region).not.toHaveClass('sticky')
  })
})
