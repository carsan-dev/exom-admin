import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppLayout } from './app-layout'
import { Sidebar } from './sidebar'
import { SIDEBAR_STORAGE_KEY, readSidebarExpanded } from './sidebar-state'

const state = vi.hoisted(() => ({
  role: 'ADMIN' as 'ADMIN' | 'SUPER_ADMIN',
  pending: undefined as number | undefined,
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: (selector: (s: { user: { role: string } }) => unknown) =>
    selector({ user: { role: state.role } }),
}))

vi.mock('@/features/approval-requests/api', () => ({
  useApprovalStats: (enabled?: boolean) => ({
    data: enabled && state.pending !== undefined ? { pending: state.pending } : undefined,
  }),
}))

vi.mock('./use-pending-counts', () => ({
  usePendingCounts: () => ({ feedback: null, recaps: null }),
}))

vi.mock('./header', () => ({
  Header: ({ onMenuToggle }: { onMenuToggle: () => void }) => (
    <button type="button" onClick={onMenuToggle}>
      alternar-menu
    </button>
  ),
}))

function renderSidebar(role: 'ADMIN' | 'SUPER_ADMIN', isOpen = true, route = '/dashboard', pending?: number) {
  state.role = role
  state.pending = pending
  return render(
    <MemoryRouter initialEntries={[route]}>
      <TooltipProvider>
        <Sidebar isOpen={isOpen} />
      </TooltipProvider>
    </MemoryRouter>,
  )
}

function groupLabels(): string[] {
  const nav = screen.getByRole('navigation', { name: 'Principal' })
  return within(nav)
    .getAllByRole('list')
    .map((list) => list.getAttribute('aria-labelledby'))
    .filter((id): id is string => id !== null)
    .map((id) => document.getElementById(id)?.textContent ?? '')
}

describe('sidebar agrupada', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })
  afterEach(() => {
    window.localStorage.clear()
  })

  it('SUPER_ADMIN ve los 6 grupos etiquetados en orden y Plantillas', () => {
    renderSidebar('SUPER_ADMIN')

    expect(groupLabels()).toEqual([
      'Seguimiento',
      'Planificación',
      'Catálogo',
      'Motivación',
      'Comunicación',
      'Control',
    ])
    const comunicacion = screen.getByRole('list', { name: 'Comunicación' })
    expect(within(comunicacion).getByRole('link', { name: 'Plantillas' })).toBeInTheDocument()
  })

  it('ADMIN no ve Plantillas y conserva el grupo Comunicación', () => {
    renderSidebar('ADMIN')

    expect(groupLabels()).toContain('Comunicación')
    const comunicacion = screen.getByRole('list', { name: 'Comunicación' })
    expect(within(comunicacion).getAllByRole('link')).toHaveLength(1)
    expect(screen.queryByRole('link', { name: 'Plantillas' })).not.toBeInTheDocument()
  })

  it('marca con aria-current solo la ruta activa', () => {
    renderSidebar('ADMIN', true, '/diets')

    expect(screen.getByRole('link', { name: 'Dietas' })).toHaveAttribute('aria-current', 'page')
    expect(
      within(screen.getByRole('navigation', { name: 'Principal' }))
        .getAllByRole('link')
        .filter((link) => link.hasAttribute('aria-current')),
    ).toHaveLength(1)
  })

  it('el contador tiene nombre accesible "N pendientes"', () => {
    renderSidebar('SUPER_ADMIN', true, '/dashboard', 5)

    const link = screen.getByRole('link', { name: /Solicitudes/ })
    expect(within(link).getByLabelText('5 pendientes')).toBeInTheDocument()
  })

  it('en carril los enlaces conservan su nombre accesible y sin etiquetas visibles', () => {
    renderSidebar('SUPER_ADMIN', false, '/dashboard', 3)

    expect(screen.getByRole('complementary')).toHaveAttribute('data-state', 'rail')
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Usuarios' })).toHaveAttribute('href', '/users')
    expect(screen.getByRole('link', { name: /Solicitudes/ })).toHaveAttribute(
      'href',
      '/approval-requests',
    )
    expect(screen.getByRole('list', { name: 'Seguimiento' })).toBeInTheDocument()
  })

  it('el enlace conserva el foco tras click y teclado (sin blur)', async () => {
    const user = userEvent.setup()
    renderSidebar('ADMIN')

    const dietas = screen.getByRole('link', { name: 'Dietas' })
    await user.click(dietas)
    expect(dietas).toHaveFocus()

    const recaps = screen.getByRole('link', { name: 'Recaps' })
    recaps.focus()
    await user.keyboard('{Enter}')
    expect(recaps).toHaveFocus()
  })
})

describe('persistencia del estado de la sidebar', () => {
  beforeEach(() => {
    window.localStorage.clear()
    state.role = 'ADMIN'
    state.pending = undefined
  })
  afterEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('sin valor guardado arranca expandida', () => {
    expect(readSidebarExpanded()).toBe(true)
  })

  it('si localStorage falla arranca expandida', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(readSidebarExpanded()).toBe(true)
  })

  it('lee el valor guardado al montar', () => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, 'rail')
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    )

    expect(screen.getByRole('complementary')).toHaveAttribute('data-state', 'rail')
  })

  it('guarda el estado al alternar en escritorio', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    )
    const aside = screen.getByRole('complementary')
    expect(aside).toHaveAttribute('data-state', 'expanded')

    await user.click(screen.getByRole('button', { name: 'alternar-menu' }))
    expect(aside).toHaveAttribute('data-state', 'rail')
    expect(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('rail')

    await user.click(screen.getByRole('button', { name: 'alternar-menu' }))
    expect(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('expanded')
  })
})
