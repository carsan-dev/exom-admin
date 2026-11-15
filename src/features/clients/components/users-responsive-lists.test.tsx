import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminUserListItem, Client } from '../types'
import { AdminsTable } from './admins-table'
import { ClientsTable } from './clients-table'

const LONG_NAME = 'Maximiliano'.repeat(13).slice(0, 150)
const LONG_EMAIL = `${'a'.repeat(110)}@example.test`

const client: Client = {
  id: 'client-a',
  email: LONG_EMAIL,
  role: 'CLIENT',
  is_active: true,
  is_locked: true,
  is_archived: false,
  created_at: '2026-01-01',
  active_admins_count: 2,
  profile: { first_name: LONG_NAME, last_name: '', avatar_url: null, level: 'AVANZADO', main_goal: 'Fuerza' },
}

const admin: AdminUserListItem = {
  id: 'admin-a',
  email: 'admin-a@example.test',
  role: 'ADMIN',
  is_active: true,
  is_locked: true,
  created_at: '2026-02-01',
  profile: { first_name: LONG_NAME, last_name: '', avatar_url: null },
}

function stubViewport(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches, addEventListener: () => {}, removeEventListener: () => {} }),
  })
}

function renderClients() {
  const callbacks = {
    onUnlock: vi.fn(),
    onChangeRole: vi.fn(),
    onManageAssignments: vi.fn(),
    onToggleStatus: vi.fn(),
    onArchive: vi.fn(),
    onDelete: vi.fn(),
  }
  render(
    <MemoryRouter>
      <ClientsTable clients={[client]} currentUserRole="SUPER_ADMIN" {...callbacks} />
    </MemoryRouter>,
  )
  return { user: userEvent.setup(), ...callbacks }
}

function renderAdmins(currentUserId?: string) {
  const callbacks = { onEdit: vi.fn(), onUnlock: vi.fn(), onChangeRole: vi.fn(), onToggleStatus: vi.fn() }
  render(<AdminsTable admins={[admin]} currentUserId={currentUserId} {...callbacks} />)
  return { user: userEvent.setup(), ...callbacks }
}

describe('Users lists by viewport', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia')
  })

  describe.each([
    ['desktop', true],
    ['mobile', false],
  ])('clients on %s', (_name, desktop) => {
    it('mounts a single variant with the same accessible actions', async () => {
      stubViewport(desktop)
      const { user, onManageAssignments } = renderClients()

      expect(screen.queryByRole('table') !== null).toBe(desktop)
      expect(screen.queryByRole('list') !== null).toBe(!desktop)
      expect(screen.getAllByText(LONG_NAME)).toHaveLength(1)
      expect(screen.getByText('Bloqueada')).toBeInTheDocument()
      expect(screen.getByText('Avanzado')).toBeInTheDocument()
      expect(screen.getByText('2 admins')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Ver perfil' })).toHaveAttribute('href', '/users/client-a')

      await user.click(screen.getByRole('button', { name: `Acciones de ${LONG_NAME}` }))
      const menu = screen.getByRole('menu')
      expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
        'Gestionar admins',
        'Cambiar rol',
        'Desbloquear',
        'Archivar',
        'Dar de baja',
        'Eliminar definitivamente',
      ])
      await user.click(within(menu).getByRole('menuitem', { name: 'Gestionar admins' }))
      expect(onManageAssignments).toHaveBeenCalledExactlyOnceWith(client)
    })
  })

  describe.each([
    ['desktop', true],
    ['mobile', false],
  ])('admins on %s', (_name, desktop) => {
    it('mounts a single variant with the same actions', async () => {
      stubViewport(desktop)
      const { user, onEdit, onUnlock, onChangeRole, onToggleStatus } = renderAdmins()

      expect(screen.queryByRole('table') !== null).toBe(desktop)
      expect(screen.queryByRole('list') !== null).toBe(!desktop)
      expect(screen.getAllByText(LONG_NAME)).toHaveLength(1)
      expect(screen.getByText('Bloqueada')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Editar' }))
      await user.click(screen.getByRole('button', { name: 'Desbloquear' }))
      await user.click(screen.getByRole('button', { name: 'Cambiar rol' }))
      await user.click(screen.getByRole('button', { name: 'Dar de baja' }))
      for (const callback of [onEdit, onUnlock, onChangeRole, onToggleStatus]) {
        expect(callback).toHaveBeenCalledExactlyOnceWith(admin)
      }
    })

    it('protects the own account in the same way', () => {
      stubViewport(desktop)
      renderAdmins('admin-a')

      expect(screen.getByText('Tú')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cambiar rol' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Dar de baja' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Editar' })).toBeEnabled()
    })
  })
})
