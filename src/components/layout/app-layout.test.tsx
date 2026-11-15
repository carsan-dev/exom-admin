import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { useMediaQuery } from '@/hooks/use-media-query'
import { AppLayout } from './app-layout'
import { SIDEBAR_STORAGE_KEY } from './sidebar-state'

vi.mock('@/hooks/use-auth', () => ({
  useAuth: (selector: (s: { user: { role: string } }) => unknown) =>
    selector({ user: { role: 'ADMIN' } }),
}))

vi.mock('@/features/approval-requests/api', () => ({
  useApprovalStats: () => ({ data: undefined }),
}))

vi.mock('./header', () => ({
  Header: ({ onMenuToggle }: { onMenuToggle: () => void }) => (
    <button type="button" onClick={onMenuToggle}>
      alternar-menu
    </button>
  ),
}))

interface FakeMedia {
  matches: boolean
  listeners: Set<() => void>
}

const media: FakeMedia = { matches: true, listeners: new Set() }

function installMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      media: query,
      get matches() {
        return media.matches
      },
      addEventListener: (_type: string, listener: () => void) => media.listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => media.listeners.delete(listener),
    }),
  })
}

function setViewport(matches: boolean) {
  act(() => {
    media.matches = matches
    media.listeners.forEach((listener) => listener())
  })
}

function renderLayout() {
  return render(
    <MemoryRouter>
      <AppLayout />
    </MemoryRouter>,
  )
}

describe('useMediaQuery', () => {
  beforeEach(() => {
    media.matches = false
    media.listeners.clear()
    installMatchMedia()
  })
  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia')
  })

  it('reacciona a los eventos change y limpia la suscripción al desmontar', () => {
    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 1024px)'))
    expect(result.current).toBe(false)
    expect(media.listeners.size).toBe(1)

    setViewport(true)
    expect(result.current).toBe(true)

    setViewport(false)
    expect(result.current).toBe(false)

    unmount()
    expect(media.listeners.size).toBe(0)
  })

  it('sin matchMedia devuelve el valor por defecto', () => {
    Reflect.deleteProperty(window, 'matchMedia')
    expect(renderHook(() => useMediaQuery('(min-width: 1024px)', true)).result.current).toBe(true)
    expect(renderHook(() => useMediaQuery('(min-width: 1024px)')).result.current).toBe(false)
  })
})

describe('AppLayout responsive', () => {
  beforeEach(() => {
    window.localStorage.clear()
    media.matches = true
    media.listeners.clear()
    installMatchMedia()
  })
  afterEach(() => {
    window.localStorage.clear()
    Reflect.deleteProperty(window, 'matchMedia')
  })

  it('en tablet la sidebar va en carril aunque la preferencia sea expanded y no se sobrescribe', () => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, 'expanded')
    media.matches = false
    renderLayout()

    expect(screen.getByRole('complementary')).toHaveAttribute('data-state', 'rail')
    expect(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('expanded')
  })

  it('al cambiar el ancho se recupera la preferencia de escritorio sin recargar', () => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, 'expanded')
    renderLayout()
    const aside = screen.getByRole('complementary')
    expect(aside).toHaveAttribute('data-state', 'expanded')

    setViewport(false)
    expect(aside).toHaveAttribute('data-state', 'rail')

    setViewport(true)
    expect(aside).toHaveAttribute('data-state', 'expanded')
    expect(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('expanded')
  })

  it('en escritorio la hamburguesa alterna y guarda', async () => {
    const user = userEvent.setup()
    renderLayout()
    const aside = screen.getByRole('complementary')

    await user.click(screen.getByRole('button', { name: 'alternar-menu' }))
    expect(aside).toHaveAttribute('data-state', 'rail')
    expect(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('rail')

    await user.click(screen.getByRole('button', { name: 'alternar-menu' }))
    expect(aside).toHaveAttribute('data-state', 'expanded')
    expect(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('expanded')
  })
})
