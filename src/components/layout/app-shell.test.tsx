import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { Sidebar } from './sidebar'
import { Breadcrumbs } from './breadcrumbs'

type TestRole = 'ADMIN' | 'SUPER_ADMIN'

const shell = vi.hoisted(() => ({
  role: 'ADMIN' as 'ADMIN' | 'SUPER_ADMIN',
  pending: undefined as number | undefined,
  clientProfile: { data: undefined } as { data: unknown },
  approvalStatsEnabled: [] as boolean[],
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: (selector: (state: { user: { role: string } }) => unknown) =>
    selector({ user: { role: shell.role } }),
}))

vi.mock('@/features/approval-requests/api', () => ({
  useApprovalStats: (enabled?: boolean) => {
    shell.approvalStatsEnabled.push(Boolean(enabled))
    return {
      data: enabled && shell.pending !== undefined ? { pending: shell.pending } : undefined,
    }
  },
}))

vi.mock('@/features/clients/api', () => ({
  useClientProfile: () => shell.clientProfile,
}))

function renderSidebar(role: TestRole, pending?: number, route = '/dashboard') {
  shell.role = role
  shell.pending = pending
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Sidebar isOpen />
    </MemoryRouter>,
  )
}

function renderBreadcrumbs(role: TestRole, route: string) {
  shell.role = role
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Breadcrumbs />
    </MemoryRouter>,
  )
}

// Destinos de los 16 elementos de navegacion actuales para SUPER_ADMIN.
// Solo se comprueba la presencia y el destino, no el orden (cambiara en F3).
// En F3 solo habra que actualizar la etiqueta 'Badges' (pasara a 'Etiquetas').
const SUPER_ADMIN_NAV: Array<[string, string]> = [
  ['Dashboard', '/dashboard'],
  ['Usuarios', '/users'],
  ['Servicio base', '/base-service'],
  ['Ejercicios', '/exercises'],
  ['Entrenamientos', '/trainings'],
  ['Etiquetas', '/badges'],
  ['Ingredientes', '/ingredients'],
  ['Dietas', '/diets'],
  ['Asignaciones', '/assignments'],
  ['Progreso', '/progress'],
  ['Feedback', '/feedback'],
  ['Recaps', '/recaps'],
  ['Retos', '/challenges'],
  ['Logros', '/achievements'],
  ['Notificaciones', '/notifications'],
  ['Plantillas', '/notification-templates'],
  ['Solicitudes', '/approval-requests'],
]

describe('shell: sidebar por rol', () => {
  beforeEach(() => {
    shell.approvalStatsEnabled = []
    shell.clientProfile = { data: undefined }
  })

  it('ADMIN ve Clientes hacia /clients y no ve Usuarios ni Plantillas', () => {
    renderSidebar('ADMIN', 7)

    expect(screen.getByRole('link', { name: 'Clientes' })).toHaveAttribute('href', '/clients')
    expect(screen.queryByRole('link', { name: /Usuarios/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Plantillas/ })).not.toBeInTheDocument()
  })

  it('ADMIN ve Solicitudes sin contador numerico aunque haya pendientes', () => {
    renderSidebar('ADMIN', 7)

    const link = screen.getByRole('link', { name: 'Solicitudes' })
    expect(link).toHaveAttribute('href', '/approval-requests')
    expect(within(link).queryByText(/\d/)).not.toBeInTheDocument()
    expect(shell.approvalStatsEnabled.every((enabled) => enabled === false)).toBe(true)
  })

  it('SUPER_ADMIN ve Usuarios hacia /users, no ve Clientes y ve Plantillas', () => {
    renderSidebar('SUPER_ADMIN', 0)

    expect(screen.getByRole('link', { name: 'Usuarios' })).toHaveAttribute('href', '/users')
    expect(screen.queryByRole('link', { name: 'Clientes' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Plantillas' })).toHaveAttribute(
      'href',
      '/notification-templates',
    )
  })

  it('SUPER_ADMIN ve el contador de Solicitudes cuando hay pendientes', () => {
    renderSidebar('SUPER_ADMIN', 4)

    const link = screen.getByRole('link', { name: /Solicitudes/ })
    expect(within(link).getByText('4')).toBeInTheDocument()
  })

  it('SUPER_ADMIN no ve contador de Solicitudes con 0 pendientes', () => {
    renderSidebar('SUPER_ADMIN', 0)

    const link = screen.getByRole('link', { name: 'Solicitudes' })
    expect(within(link).queryByText(/\d/)).not.toBeInTheDocument()
  })

  it('SUPER_ADMIN tiene los 16 elementos de navegacion con su destino', () => {
    renderSidebar('SUPER_ADMIN', 0)

    const nav = screen.getByRole('navigation')
    expect(within(nav).getAllByRole('link')).toHaveLength(SUPER_ADMIN_NAV.length)
    for (const [label, href] of SUPER_ADMIN_NAV) {
      expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('href', href)
    }
  })

  it('expone la ruta activa con aria-current="page"', () => {
    renderSidebar('SUPER_ADMIN', 0, '/progress')

    expect(screen.getByRole('link', { name: 'Progreso' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })
})

describe('shell: migas de pan', () => {
  beforeEach(() => {
    shell.clientProfile = { data: undefined }
  })

  it('muestra el nombre del cliente en /clients/:id', () => {
    shell.clientProfile = {
      data: { email: 'ana@example.com', profile: { first_name: 'Ana', last_name: 'Pérez' } },
    }
    renderBreadcrumbs('ADMIN', '/clients/abc')

    expect(screen.getByRole('link', { name: 'Clientes' })).toHaveAttribute('href', '/clients')
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument()
  })

  it('usa el email si el perfil no tiene nombre', () => {
    shell.clientProfile = { data: { email: 'ana@example.com', profile: null } }
    renderBreadcrumbs('ADMIN', '/clients/abc')

    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
  })

  it('muestra "Detalle" mientras el perfil carga', () => {
    renderBreadcrumbs('ADMIN', '/clients/abc')

    expect(screen.getByText('Detalle')).toBeInTheDocument()
  })

  it('SUPER_ADMIN ve Usuarios en la miga raiz de /users/:id', () => {
    shell.clientProfile = {
      data: { email: 'ana@example.com', profile: { first_name: 'Ana', last_name: 'Pérez' } },
    }
    renderBreadcrumbs('SUPER_ADMIN', '/users/abc')

    expect(screen.getByRole('link', { name: 'Usuarios' })).toHaveAttribute('href', '/users')
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument()
  })
})
