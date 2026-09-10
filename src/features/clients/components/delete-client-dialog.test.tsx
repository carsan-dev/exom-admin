import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { DeleteClientDialog } from './delete-client-dialog'
import { ClientsTable } from './clients-table'
import { ClientDeletionsPanel } from './client-deletions-panel'
import type { Client } from '../types'
import type { ClientDeletion } from '../deletion-api'

const mutate = vi.fn()
const state = { data: [] as ClientDeletion[] }
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn() } }))
vi.mock('../deletion-api', () => ({
  useDeleteClient: () => ({ mutateAsync: mutate, isPending: false }),
  useClientDeletions: () => ({ ...state, isError: false }),
}))
const client: Client = { id: 'client-a', email: 'client@example.test', role: 'CLIENT', is_active: false, is_locked: false, is_archived: false, created_at: '2026-01-01', profile: null }

describe('Permanent client deletion controls', () => {
  beforeEach(() => { vi.clearAllMocks(); state.data = []; mutate.mockResolvedValue({ status: 'PENDING' }) })
  it.each(['light', 'dark'])('requires explicit confirmation and uses the destructive theme variant in %s', async (theme) => {
    const close = vi.fn()
    render(<div className={theme}><DeleteClientDialog client={client} open onOpenChange={close} /></div>)
    const button = screen.getByRole('button', { name: 'Eliminar permanentemente' })
    expect(button).toBeDisabled()
    expect(button.className).toContain('destructive')
    fireEvent.change(screen.getByLabelText('Escribe ELIMINAR para confirmar'), { target: { value: 'eliminar' } })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Escribe ELIMINAR para confirmar'), { target: { value: 'ELIMINAR' } })
    fireEvent.click(button)
    await waitFor(() => expect(mutate).toHaveBeenCalledWith(client.id))
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.info).toHaveBeenCalled()
    expect(close).toHaveBeenCalledWith(false)
  })
  it('keeps the selected client and permits the same request after a lost response', async () => {
    mutate.mockRejectedValueOnce(new Error('lost response'))
    const close = vi.fn()
    render(<DeleteClientDialog client={client} open onOpenChange={close} />)
    fireEvent.change(screen.getByLabelText('Escribe ELIMINAR para confirmar'), { target: { value: 'ELIMINAR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar permanentemente' }))
    await screen.findByRole('alert')
    expect(close).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar permanentemente' }))
    await waitFor(() => expect(close).toHaveBeenCalledWith(false))
    expect(mutate.mock.calls).toEqual([[client.id], [client.id]])
  })
  it.each([false, true])('offers deletion to Super Admin for archived=%s clients', async (is_archived) => {
    const remove = vi.fn()
    const props = { clients: [{ ...client, is_archived }], onDelete: remove, onArchive: vi.fn(), onUnlock: vi.fn(), onChangeRole: vi.fn(), onManageAssignments: vi.fn(), onToggleStatus: vi.fn() }
    const view = render(<MemoryRouter><ClientsTable {...props} currentUserRole="SUPER_ADMIN" /></MemoryRouter>)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Acciones de client@example.test' }))
    await user.click(screen.getByRole('menuitem', { name: 'Eliminar definitivamente' }))
    expect(remove).toHaveBeenCalledWith(expect.objectContaining({ id: client.id, is_archived }))
    view.rerender(<MemoryRouter><ClientsTable {...props} currentUserRole="ADMIN" /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Acciones de client@example.test' }))
    expect(screen.queryByRole('menuitem', { name: 'Eliminar definitivamente' })).not.toBeInTheDocument()
  })
  it.each(['PENDING', 'PROCESSING', 'BLOCKED', 'COMPLETED'] as const)('shows the durable %s state on remount', (status) => {
    state.data = [{ id: 'op-a', client_id: client.id, status, last_error: null, created_at: '2026-09-07', completed_at: null }]
    render(<ClientDeletionsPanel />)
    const label = screen.getByRole('status')
    if (status === 'COMPLETED') expect(label).toHaveTextContent('Eliminación completada')
    else expect(label).not.toHaveTextContent('Eliminación completada')
    if (status === 'BLOCKED') expect(label).toHaveTextContent('requiere verificación técnica')
  })
  it('explains automatic expiry waiting without requiring a manual action', () => {
    state.data = [{ id: 'op-a', client_id: client.id, status: 'PENDING', last_error: 'CREDENTIALS_EXPIRING', created_at: '2026-09-10', completed_at: null }]
    render(<ClientDeletionsPanel />)
    expect(screen.getByRole('status')).toHaveTextContent('finalizará automáticamente')
    expect(screen.getByRole('status')).toHaveTextContent('No tienes que hacer nada más')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
