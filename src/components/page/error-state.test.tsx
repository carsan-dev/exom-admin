import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ErrorState } from './error-state'

describe('ErrorState', () => {
  it('is a role=alert with the default title and the description', () => {
    render(<ErrorState description="Inténtalo de nuevo en unos segundos." />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('No se ha podido cargar')
    expect(alert).toHaveTextContent('Inténtalo de nuevo en unos segundos.')
  })

  it('accepts a custom title', () => {
    render(<ErrorState title="No se ha podido cargar el catálogo" />)
    expect(screen.getByRole('alert')).toHaveTextContent('No se ha podido cargar el catálogo')
  })

  it('renders no button without onRetry', () => {
    render(<ErrorState />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('calls onRetry from «Reintentar» by click', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('calls onRetry by keyboard: Enter and Space', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toHaveFocus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onRetry).toHaveBeenCalledTimes(2)
  })

  it('allows overriding the retry label', () => {
    render(<ErrorState onRetry={() => {}} retryLabel="Reintentar entrenos" />)
    expect(screen.getByRole('button', { name: 'Reintentar entrenos' })).toBeInTheDocument()
  })
})
