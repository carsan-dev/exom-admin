import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { ArchiveClientDialog } from './archive-client-dialog'
import { ClientsTable } from './clients-table'
import type { Client } from '../types'

const mutate = vi.fn()
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))
vi.mock('../api', () => ({
  useArchiveClient: () => ({ mutateAsync: mutate, isPending: false }),
  getApiErrorMessage: (_: unknown, fallback: string) => fallback,
}))
const client: Client = { id: 'client-a', email: 'client@example.test', role: 'CLIENT', is_active: false, is_locked: false, is_archived: false, created_at: '2026-01-01', profile: null }

describe('Client archive independent of access', () => {
  beforeEach(() => {
    mutate.mockReset()
    mutate.mockResolvedValue({ message: 'Guardado' })
  })
  it.each([true, false])('confirms archive=%s without sending an account activation', async (is_archived) => {
    const close = vi.fn()
    render(<ArchiveClientDialog client={{ ...client, is_archived: !is_archived }} open onOpenChange={close} />)
    expect(screen.getByText(/alta o baja, acceso a la App y recordatorios no cambian/)).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: is_archived ? 'Confirmar archivado' : 'Confirmar desarchivado' }))
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({ clientId: client.id, is_archived }))
    expect(close).toHaveBeenCalledWith(false)
  })
  it('keeps the dialog open on failure and lets the same requested state be retried', async () => {
    mutate.mockRejectedValueOnce(new Error('network'))
    const close = vi.fn()
    render(<ArchiveClientDialog client={client} open onOpenChange={close} />)
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar archivado' }))
    await screen.findByRole('alert')
    expect(close).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar archivado' }))
    await waitFor(() => expect(close).toHaveBeenCalledWith(false))
    expect(mutate.mock.calls).toEqual([[{ clientId: client.id, is_archived: true }], [{ clientId: client.id, is_archived: true }]])
  })
  it.each(['light', 'dark'])('offers restore while preserving inactive status in %s theme', (theme) => {
    const archive = vi.fn()
    render(<div className={theme}><MemoryRouter><ClientsTable clients={[{ ...client, is_archived: true }]} currentUserRole="SUPER_ADMIN" onArchive={archive} onUnlock={vi.fn()} onChangeRole={vi.fn()} onManageAssignments={vi.fn()} onToggleStatus={vi.fn()} /></MemoryRouter></div>)
    expect(screen.getByText('Inactiva')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reactivar' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Desarchivar' }))
    expect(archive).toHaveBeenCalledWith(expect.objectContaining({ is_active: false, is_archived: true }))
  })
})
