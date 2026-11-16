import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { useMediaQuery } from '@/hooks/use-media-query'
import { AppLayout } from './app-layout'
import { VersionUpdateBanner } from './version-update-banner'
import { SIDEBAR_STORAGE_KEY } from './sidebar-state'

vi.mock('@/hooks/use-auth', () => ({
  useAuth: (selector: (s: { user: { role: string } }) => unknown) =>
    selector({ user: { role: 'ADMIN' } }),
}))

vi.mock('@/features/approval-requests/api', () => ({
  useApprovalStats: () => ({ data: undefined }),
}))

vi.mock('./use-pending-counts', () => ({
  usePendingCounts: () => ({ feedback: null, recaps: null }),
}))

vi.mock('@/hooks/use-version-checker', () => ({
  useVersionChecker: () => ({ isUpdateAvailable: true }),
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

  it('el relleno inferior de main deja libre la barra inferior hasta md, con y sin «Volver arriba»', () => {
    const { container } = renderLayout()
    const main = container.querySelector('main')
    if (!main) throw new Error('main no encontrado')
    const bar = 'calc(56px+env(safe-area-inset-bottom,0px)+16px)'
    expect(main).toHaveClass(`pb-[${bar}]`, `sm:pb-[${bar}]`, 'md:pb-5')

    main.scrollTop = 400
    fireEvent.scroll(main)
    const withTop = 'calc(56px+env(safe-area-inset-bottom,0px)+76px)'
    expect(main).toHaveClass(`pb-[${withTop}]`, `sm:pb-[${withTop}]`, 'md:pb-28')
    // lg:p-6 anularía md:pb-28 en lg: la reserva se repite con la variante lg (RDS-F5-A11Y-01).
    expect(main).toHaveClass('lg:p-6', 'lg:pb-28')
    expect(main).not.toHaveClass(`pb-[${bar}]`, `sm:pb-[${bar}]`, 'md:pb-5', 'pb-24')
  })

  it('con el aviso de versión montado, main reserva su alto además de la barra y «Volver arriba» (RDS-F5-A11Y-04)', () => {
    const { container } = render(
      <MemoryRouter>
        <AppLayout />
        <VersionUpdateBanner />
      </MemoryRouter>,
    )
    expect(container.querySelector('[data-version-banner]')).not.toBeNull()
    const main = container.querySelector('main')
    if (!main) throw new Error('main no encontrado')
    const withBanner = 'calc(56px+env(safe-area-inset-bottom,0px)+192px)'
    expect(main).toHaveClass(
      `[body:has([data-version-banner])_&]:pb-[${withBanner}]`,
      'md:[body:has([data-version-banner])_&]:pb-40',
      'lg:[body:has([data-version-banner])_&]:scroll-pb-40',
    )

    main.scrollTop = 400
    fireEvent.scroll(main)
    expect(main).toHaveClass(
      `[body:has([data-version-banner])_&]:pb-[${withBanner}]`,
      'md:[body:has([data-version-banner])_&]:pb-40',
    )
  })
})

describe('AppLayout accesibilidad (RDS-F5-01)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    media.matches = true
    media.listeners.clear()
    installMatchMedia()
    document.title = 'EXOM Admin'
  })
  afterEach(() => {
    window.localStorage.clear()
    Reflect.deleteProperty(window, 'matchMedia')
  })

  function renderAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <AppLayout />
      </MemoryRouter>,
    )
  }

  it('«Saltar al contenido» es el primer tabulable y lleva el foco a main', async () => {
    const user = userEvent.setup()
    renderAt('/dashboard')

    await user.tab()
    const skip = screen.getByRole('link', { name: 'Saltar al contenido' })
    expect(skip).toHaveFocus()
    expect(skip).toHaveAttribute('href', '#contenido')

    await user.keyboard('{Enter}')
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'contenido')
    expect(main).toHaveAttribute('tabindex', '-1')
    expect(main).toHaveFocus()
  })

  it('main muestra indicador de foco solo con teclado tras el salto', () => {
    renderAt('/dashboard')
    const main = screen.getByRole('main')
    // outline-none anula --tw-outline-style: hace falta outline-solid explícito en focus-visible.
    expect(main).toHaveClass(
      'outline-none',
      'focus-visible:outline-solid',
      'focus-visible:outline-2',
      'focus-visible:outline-focus',
    )
    expect(main.className).not.toMatch(/(^|\s)focus:outline/)
  })

  it.each([
    ['/dashboard', 'Dashboard · EXOM Admin'],
    ['/clients', 'Clientes · EXOM Admin'],
    ['/trainings', 'Entrenamientos · EXOM Admin'],
    ['/notification-templates', 'Plantillas · EXOM Admin'],
    ['/clients/abc', 'Detalle de cliente · EXOM Admin'],
    ['/recaps/7ec00000', 'Detalle de recap · EXOM Admin'],
    ['/no-existe', 'Página no encontrada · EXOM Admin'],
    ['/dashboard/sobra', 'Página no encontrada · EXOM Admin'],
  ])('el título del documento en %s es «%s»', (path, title) => {
    renderAt(path)
    expect(document.title).toBe(title)
  })
})
