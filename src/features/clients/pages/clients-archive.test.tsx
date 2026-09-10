import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientsPage } from './clients-page'

const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))

async function selectAction(name: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Acciones de Cliente Prueba' }))
  await user.click(screen.getByRole('menuitem', { name }))
}
vi.mock('@/lib/api', () => ({ api: { get, put } }))
vi.mock('@/hooks/use-auth', () => ({ useAuth: (selector: (state: unknown) => unknown) => selector({ user: { id: 'admin-a', role: 'ADMIN' } }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('Client list archive lifecycle', () => {
  let archived: boolean
  beforeEach(() => {
    archived = false
    get.mockReset()
    put.mockReset()
    get.mockImplementation(async (url: string, options?: { params?: { archive?: string } }) => {
      const wantsArchived = options?.params?.archive === 'archived'
      const data = url === '/admin/clients' && archived === wantsArchived
        ? [{ id: 'client-a', email: 'client@example.test', role: 'CLIENT', is_active: false, is_locked: false, is_archived: archived, created_at: '2026-01-01', profile: { first_name: 'Cliente', last_name: 'Prueba' } }]
        : []
      return { data: { data: { data, total: data.length, totalPages: 1, page: 1, limit: 10 } } }
    })
    put.mockImplementation(async (_url: string, body: { is_archived: boolean }) => {
      archived = body.is_archived
      return { data: { data: { message: 'Guardado' } } }
    })
  })
  it('archives, finds in archived list, and restores the same inactive client', async () => {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(<QueryClientProvider client={cache}><MemoryRouter><ClientsPage /></MemoryRouter></QueryClientProvider>)
    await screen.findByText('Cliente Prueba')
    expect(get).toHaveBeenCalledWith('/admin/clients', expect.objectContaining({ params: expect.objectContaining({ archive: 'visible' }) }))
    await selectAction('Archivar')
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar archivado' }))
    await waitFor(() => expect(screen.queryByText('Cliente Prueba')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Archivados' }))
    await screen.findByText('Cliente Prueba')
    expect(screen.getByText('Inactiva')).toBeInTheDocument()
    await selectAction('Desarchivar')
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar desarchivado' }))
    await waitFor(() => expect(screen.queryByText('Cliente Prueba')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Listado principal' }))
    await screen.findByText('Cliente Prueba')
    expect(screen.getByText('Inactiva')).toBeInTheDocument()
    expect(put.mock.calls).toEqual([
      ['/admin/clients/client-a/archive', { is_archived: true }],
      ['/admin/clients/client-a/archive', { is_archived: false }],
    ])
    cache.clear()
  })

  it('returns to page one after archiving the last row of page two', async () => {
    get.mockImplementation(async (url: string, options?: { params?: { page?: number } }) => {
      const page = options?.params?.page ?? 1
      const data = url === '/admin/clients' && (!archived || page === 1)
        ? [{ id: 'client-a', email: 'client@example.test', role: 'CLIENT', is_active: false, is_locked: false, is_archived: false, created_at: '2026-01-01', profile: { first_name: 'Cliente', last_name: 'Prueba' } }]
        : []
      return { data: { data: { data, total: archived ? 10 : 11, totalPages: archived ? 1 : 2, page, limit: 10 } } }
    })
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={cache}><MemoryRouter initialEntries={['/clients?clientsPage=2']}><ClientsPage /></MemoryRouter></QueryClientProvider>)
    await screen.findByText('Página 2 de 2')
    await selectAction('Archivar')
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar archivado' }))
    await screen.findByText('Página 1 de 1')
    expect(get).toHaveBeenLastCalledWith('/admin/clients', expect.objectContaining({ params: expect.objectContaining({ page: 1, archive: 'visible' }) }))
    cache.clear()
  })

  it('refreshes the list after the archive commits but its response is lost', async () => {
    put.mockImplementationOnce(async (_url: string, body: { is_archived: boolean }) => {
      archived = body.is_archived
      throw new Error('response lost after commit')
    })
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(<QueryClientProvider client={cache}><MemoryRouter><ClientsPage /></MemoryRouter></QueryClientProvider>)
    await screen.findByText('Cliente Prueba')
    await selectAction('Archivar')
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar archivado' }))
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByText('Cliente Prueba')).not.toBeInTheDocument())
    expect(put).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Archivados' }))
    await screen.findByText('Cliente Prueba')
    cache.clear()
  })

  it('opens from the keyboard and returns focus to the row menu after cancelling', async () => {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={cache}><MemoryRouter><ClientsPage /></MemoryRouter></QueryClientProvider>)
    const user = userEvent.setup()
    const trigger = await screen.findByRole('button', { name: 'Acciones de Cliente Prueba' })
    trigger.focus()
    await user.keyboard('{Enter}')
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog', { name: 'Archivar cliente' })
    expect(dialog.contains(document.activeElement)).toBe(true)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(put).not.toHaveBeenCalled()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('menuitem', { name: 'Archivar' })).toBeVisible()
    await user.keyboard('{Escape}')
    cache.clear()
  })

  it('does not show rows from the main list while archived clients are loading', async () => {
    const main = get.getMockImplementation()!
    let release: (() => void) | undefined
    const pending = new Promise<void>((resolve) => { release = resolve })
    get.mockImplementation(async (url: string, options?: { params?: { archive?: string } }) => {
      if (options?.params?.archive === 'archived') await pending
      return main(url, options)
    })
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={cache}><MemoryRouter><ClientsPage /></MemoryRouter></QueryClientProvider>)
    await screen.findByText('Cliente Prueba')
    fireEvent.click(screen.getByRole('button', { name: 'Archivados' }))
    await waitFor(() => expect(screen.queryByText('Cliente Prueba')).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Acciones de Cliente Prueba' })).not.toBeInTheDocument()
    release!()
    await screen.findByText('Clientes archivados')
    cache.clear()
  })
})
