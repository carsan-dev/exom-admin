import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientsPage } from './clients-page'

const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Archivar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar archivado' }))
    await waitFor(() => expect(screen.queryByText('Cliente Prueba')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Archivados' }))
    await screen.findByText('Cliente Prueba')
    expect(screen.getByText('Inactiva')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Desarchivar' }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Archivar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar archivado' }))
    await screen.findByText('Página 1 de 1')
    expect(get).toHaveBeenLastCalledWith('/admin/clients', expect.objectContaining({ params: expect.objectContaining({ page: 1, archive: 'visible' }) }))
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
    expect(screen.queryByRole('button', { name: 'Archivar' })).not.toBeInTheDocument()
    release!()
    await screen.findByText('Clientes archivados')
    cache.clear()
  })
})
