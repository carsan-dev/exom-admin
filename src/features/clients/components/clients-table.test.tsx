import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ClientsTable } from './clients-table'
import type { Client, Role } from '../types'

const client: Client = {
  id: 'client-a', email: 'client-a@example.test', role: 'CLIENT',
  is_active: true, is_locked: false, is_archived: false, created_at: '2026-01-01',
  profile: { first_name: 'Cliente', last_name: 'Uno', avatar_url: null, level: 'PRINCIPIANTE', main_goal: 'Fuerza' },
}

function setup(role: Role = 'SUPER_ADMIN', clients: Client[] = [client]) {
  const callbacks = {
    onUnlock: vi.fn(), onChangeRole: vi.fn(), onManageAssignments: vi.fn(),
    onToggleStatus: vi.fn(), onArchive: vi.fn(), onDelete: vi.fn(),
  }
  render(<MemoryRouter><ClientsTable clients={clients} currentUserRole={role} {...callbacks} /></MemoryRouter>)
  return { user: userEvent.setup(), ...callbacks }
}

describe('Client row actions', () => {
  it('keeps profile navigation and one accessible menu trigger in each row', () => {
    setup()
    const row = screen.getByRole('row', { name: /Cliente Uno/ })
    expect(within(row).getByRole('link', { name: 'Ver perfil' })).toHaveAttribute('href', '/users/client-a')
    expect(within(row).getAllByRole('button')).toHaveLength(1)
    expect(within(row).getByRole('button', { name: 'Acciones de Cliente Uno' })).toBeVisible()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('shows grouped super-admin actions and closes on Escape with focus restored', async () => {
    const { user } = setup()
    const trigger = screen.getByRole('button', { name: 'Acciones de Cliente Uno' })
    trigger.focus()
    await user.keyboard('{Enter}')
    const menu = screen.getByRole('menu')
    expect(within(menu).getAllByRole('menuitem').map(item => item.textContent)).toEqual([
      'Gestionar admins', 'Cambiar rol', 'Archivar', 'Dar de baja', 'Eliminar definitivamente',
    ])
    expect(within(menu).getAllByRole('separator')).toHaveLength(2)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('preserves admin permissions and omits empty group separators', async () => {
    const { user, onArchive } = setup('ADMIN')
    expect(screen.getByRole('link', { name: 'Ver perfil' })).toHaveAttribute('href', '/clients/client-a')
    await user.click(screen.getByRole('button', { name: 'Acciones de Cliente Uno' }))
    expect(screen.getAllByRole('menuitem').map(item => item.textContent)).toEqual(['Archivar'])
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Archivar' }))
    expect(onArchive).toHaveBeenCalledExactlyOnceWith(client)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it.each([
    ['Gestionar admins', 'onManageAssignments'], ['Cambiar rol', 'onChangeRole'],
    ['Desbloquear', 'onUnlock'], ['Desarchivar', 'onArchive'],
    ['Reactivar', 'onToggleStatus'], ['Eliminar definitivamente', 'onDelete'],
  ] as const)('dispatches %s only for the selected client', async (label, callback) => {
    const second: Client = { ...client, id: 'client-b', is_active: false, is_archived: true, is_locked: true, profile: { ...client.profile!, last_name: 'Dos' } }
    const result = setup('SUPER_ADMIN', [client, second])
    await result.user.click(screen.getByRole('button', { name: 'Acciones de Cliente Dos' }))
    await result.user.click(screen.getByRole('menuitem', { name: label }))
    expect(result[callback]).toHaveBeenCalledExactlyOnceWith(second)
    for (const key of ['onManageAssignments', 'onChangeRole', 'onUnlock', 'onArchive', 'onToggleStatus', 'onDelete'] as const) {
      if (key !== callback) expect(result[key]).not.toHaveBeenCalled()
    }
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
