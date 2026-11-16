import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { MobileTabbar } from './mobile-tabbar'

const state = vi.hoisted(() => ({
  role: 'ADMIN' as 'ADMIN' | 'SUPER_ADMIN',
  pending: undefined as number | undefined,
  enabled: [] as boolean[],
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: (selector: (s: { user: { role: string } }) => unknown) =>
    selector({ user: { role: state.role } }),
}))

vi.mock('@/features/approval-requests/api', () => ({
  useApprovalStats: (enabled?: boolean) => {
    state.enabled.push(Boolean(enabled))
    return { data: enabled && state.pending !== undefined ? { pending: state.pending } : undefined }
  },
}))

function renderTabbar(role: 'ADMIN' | 'SUPER_ADMIN', route = '/dashboard', pending?: number) {
  state.role = role
  state.pending = pending
  return render(
    <MemoryRouter initialEntries={[route]}>
      <MobileTabbar />
    </MemoryRouter>,
  )
}

async function openMore() {
  const user = userEvent.setup()
  const more = screen.getByRole('button', { name: 'Más' })
  await user.click(more)
  const dialog = await screen.findByRole('dialog', { name: 'Menú' })
  return { user, more, dialog }
}

describe('barra inferior móvil', () => {
  beforeEach(() => {
    state.enabled = []
  })

  it('tiene 5 elementos con sus nombres', () => {
    renderTabbar('ADMIN')

    const nav = screen.getByRole('navigation', { name: 'Navegación inferior' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Dashboard',
      'Feedback',
      'Recaps',
      'Progreso',
    ])
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/dashboard',
      '/feedback',
      '/recaps',
      '/progress',
    ])
    const more = within(nav).getByRole('button', { name: 'Más' })
    expect(more).toHaveAttribute('aria-haspopup', 'dialog')
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(nav.children).toHaveLength(5)
  })

  it('marca con aria-current solo la ruta activa y no marca Más', () => {
    renderTabbar('ADMIN', '/recaps')

    const nav = screen.getByRole('navigation', { name: 'Navegación inferior' })
    const current = within(nav)
      .getAllByRole('link')
      .filter((link) => link.hasAttribute('aria-current'))
    expect(current.map((link) => link.textContent)).toEqual(['Recaps'])
    expect(screen.getByRole('button', { name: 'Más' })).not.toHaveAttribute('data-current')
    expect(screen.getByRole('button', { name: 'Más' })).not.toHaveAttribute('aria-current')
  })

  it('marca Más cuando la ruta no está en la barra', () => {
    renderTabbar('ADMIN', '/diets')

    const nav = screen.getByRole('navigation', { name: 'Navegación inferior' })
    expect(
      within(nav)
        .getAllByRole('link')
        .some((link) => link.hasAttribute('aria-current')),
    ).toBe(false)
    expect(screen.getByRole('button', { name: 'Más' })).toHaveAttribute('data-current', 'true')
  })

  it('abrir Más muestra el diálogo Menú con Solicitudes como primer enlace', async () => {
    renderTabbar('ADMIN')
    const { more, dialog } = await openMore()

    expect(more).toHaveAttribute('aria-expanded', 'true')
    const nav = within(dialog).getByRole('navigation', { name: 'Todas las secciones' })
    const links = within(nav).getAllByRole('link')
    expect(links[0]).toHaveAccessibleName('Solicitudes')
    expect(links[0]).toHaveAttribute('href', '/approval-requests')
    expect(within(nav).getAllByRole('link', { name: 'Solicitudes' })).toHaveLength(1)
    expect(within(nav).getByRole('list', { name: 'Seguimiento' })).toBeInTheDocument()
    expect(within(nav).queryByRole('list', { name: 'Control' })).not.toBeInTheDocument()
  })

  it('el contador solo lo ve SUPER_ADMIN y con más de 0 pendientes', async () => {
    renderTabbar('SUPER_ADMIN', '/dashboard', 4)
    const { dialog } = await openMore()

    const link = within(dialog).getByRole('link', { name: /Solicitudes/ })
    expect(within(link).getByLabelText('4 pendientes')).toBeInTheDocument()
  })

  it('SUPER_ADMIN con 0 pendientes no ve contador', async () => {
    renderTabbar('SUPER_ADMIN', '/dashboard', 0)
    const { dialog } = await openMore()

    const link = within(dialog).getByRole('link', { name: 'Solicitudes' })
    expect(within(link).queryByText(/\d/)).not.toBeInTheDocument()
  })

  it('ADMIN no ve contador aunque haya pendientes y no consulta las estadísticas', async () => {
    renderTabbar('ADMIN', '/dashboard', 7)
    const { dialog } = await openMore()

    const link = within(dialog).getByRole('link', { name: 'Solicitudes' })
    expect(within(link).queryByText(/\d/)).not.toBeInTheDocument()
    expect(state.enabled.every((enabled) => enabled === false)).toBe(true)
  })

  it('Plantillas solo aparece para SUPER_ADMIN', async () => {
    const { unmount } = renderTabbar('ADMIN')
    const first = await openMore()
    expect(within(first.dialog).queryByRole('link', { name: 'Plantillas' })).not.toBeInTheDocument()
    unmount()

    renderTabbar('SUPER_ADMIN', '/dashboard', 0)
    const second = await openMore()
    expect(within(second.dialog).getByRole('link', { name: 'Plantillas' })).toHaveAttribute(
      'href',
      '/notification-templates',
    )
  })

  it('muestra Clientes para ADMIN y Usuarios para SUPER_ADMIN', async () => {
    const { unmount } = renderTabbar('ADMIN')
    const first = await openMore()
    expect(within(first.dialog).getByRole('link', { name: 'Clientes' })).toHaveAttribute(
      'href',
      '/clients',
    )
    expect(within(first.dialog).queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument()
    unmount()

    renderTabbar('SUPER_ADMIN', '/dashboard', 0)
    const second = await openMore()
    expect(within(second.dialog).getByRole('link', { name: 'Usuarios' })).toHaveAttribute(
      'href',
      '/users',
    )
    expect(within(second.dialog).queryByRole('link', { name: 'Clientes' })).not.toBeInTheDocument()
  })

  it('pulsar un enlace cierra el panel', async () => {
    renderTabbar('ADMIN')
    const { user, dialog } = await openMore()

    await user.click(within(dialog).getByRole('link', { name: 'Dietas' }))

    expect(screen.queryByRole('dialog', { name: 'Menú' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Más' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('el foco vuelve a Más al cerrar con Escape', async () => {
    renderTabbar('ADMIN')
    const { user, more } = await openMore()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Menú' })).not.toBeInTheDocument()
    expect(more).toHaveFocus()
  })

  it('el foco vuelve a Más al cerrar con el botón de cierre', async () => {
    renderTabbar('ADMIN')
    const { user, more, dialog } = await openMore()

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(more).toHaveFocus()
  })
})
