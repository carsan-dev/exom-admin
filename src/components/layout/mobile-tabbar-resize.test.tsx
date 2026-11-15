import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { MobileTabbar } from './mobile-tabbar'

vi.mock('@/hooks/use-auth', () => ({
  useAuth: (selector: (s: { user: { role: string } }) => unknown) =>
    selector({ user: { role: 'ADMIN' } }),
}))

vi.mock('@/features/approval-requests/api', () => ({
  useApprovalStats: () => ({ data: undefined }),
}))

const media = { matches: false, listeners: new Set<() => void>() }

function setMdUp(matches: boolean) {
  act(() => {
    media.matches = matches
    media.listeners.forEach((listener) => listener())
  })
}

describe('panel Más y cambio de ancho', () => {
  beforeEach(() => {
    media.matches = false
    media.listeners.clear()
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => ({
        get matches() {
          return media.matches
        },
        addEventListener: (_type: string, listener: () => void) => media.listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) => media.listeners.delete(listener),
      }),
    })
  })
  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia')
  })

  it('se cierra al pasar a >= 768 px y no se reabre al volver a móvil', async () => {
    render(
      <MemoryRouter>
        <MobileTabbar />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Más' }))
    expect(await screen.findByRole('dialog', { name: 'Menú' })).toBeInTheDocument()

    setMdUp(true)
    expect(screen.queryByRole('dialog', { name: 'Menú' })).not.toBeInTheDocument()

    setMdUp(false)
    expect(screen.queryByRole('dialog', { name: 'Menú' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Más' })).toHaveAttribute('aria-expanded', 'false')
  })
})
