import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientSelector } from './client-selector'

vi.mock('../../clients/api', () => ({ useClients: () => ({ isLoading: false, data: { data: [
  { id: 'client-a', email: 'a@example.invalid', profile: { first_name: 'Cliente', last_name: 'Sintético A', avatar_url: null } },
  { id: 'client-b', email: 'b@example.invalid', profile: { first_name: 'Cliente', last_name: 'Sintético B', avatar_url: null } },
] } }) }))

const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  HTMLElement.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  vi.unstubAllGlobals()
  HTMLElement.prototype.scrollIntoView = originalScrollIntoView
})

describe('Selector de cliente: nombre accesible y selección', () => {
  it('identifica el cliente seleccionado en el nombre accesible del combobox', () => {
    const onSelect = vi.fn()
    const view = render(<ClientSelector selectedClientId="client-a" onSelect={onSelect} />)
    expect(screen.getByRole('combobox', { name: 'Cliente: Cliente Sintético A' })).toBeInTheDocument()
    expect(onSelect).not.toHaveBeenCalled()
    view.rerender(<ClientSelector selectedClientId="client-b" onSelect={onSelect} />)
    expect(screen.getByRole('combobox', { name: 'Cliente: Cliente Sintético B' })).toBeInTheDocument()
  })
  it('nombra el estado sin selección y conserva el callback de la opción elegida', () => {
    const onSelect = vi.fn()
    render(<ClientSelector selectedClientId="" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('combobox', { name: 'Seleccionar cliente' }))
    fireEvent.click(screen.getByRole('option', { name: /Cliente Sintético B/ }))
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('client-b')
  })
})
