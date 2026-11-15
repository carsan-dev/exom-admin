import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  it('renders title and description, and is not an alert or live region', () => {
    const { container } = render(
      <EmptyState title="Aún no hay ejercicios" description="Crea el primero." />
    )
    expect(screen.getByText('Aún no hay ejercicios')).toBeInTheDocument()
    expect(screen.getByText('Crea el primero.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
    expect(container.querySelector('[aria-live]')).toBeNull()
  })

  it('wraps the icon in an aria-hidden container', () => {
    render(<EmptyState title="Vacío" icon={<svg data-testid="ico" />} />)
    expect(screen.getByTestId('ico').closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('renders a clickable action, also by keyboard', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <EmptyState
        title="Vacío"
        action={
          <button type="button" onClick={onClick}>
            Crear primer ejercicio
          </button>
        }
      />
    )
    await user.tab()
    expect(screen.getByRole('button', { name: 'Crear primer ejercicio' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Crear primer ejercicio' }))
    expect(onClick).toHaveBeenCalledTimes(2)
  })
})
