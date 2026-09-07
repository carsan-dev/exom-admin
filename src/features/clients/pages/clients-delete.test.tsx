import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientsPage } from './clients-page'

const get = vi.fn()
const remove = vi.fn()
vi.mock('@/lib/api', () => ({ api: { get: (...args: unknown[]) => get(...args), delete: (...args: unknown[]) => remove(...args) } }))
vi.mock('@/hooks/use-auth', () => ({ useAuth: (selector: (state: unknown) => unknown) => selector({ user: { id: 'super-a', role: 'SUPER_ADMIN' } }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))

describe('Client page permanent deletion', () => {
  let deleted: boolean
  beforeEach(() => {
    deleted = false
    get.mockReset()
    remove.mockReset()
    get.mockImplementation(async (url: string) => {
      if (url === '/admin/client-deletions') return { data: { data: deleted ? [{ id: 'op-a', client_id: 'client-a', status: 'PENDING' }] : [] } }
      const data = url === '/admin/clients' && !deleted ? [{ id: 'client-a', email: 'client@example.test', role: 'CLIENT', is_active: false, is_locked: false, is_archived: true, created_at: '2026-01-01', profile: { first_name: 'Cliente', last_name: 'Prueba' } }] : []
      return { data: { data: { data, total: data.length, totalPages: 1, page: 1, limit: 10 } } }
    })
    remove.mockImplementation(async () => { deleted = true; return { data: { data: { id: 'op-a', status: 'PENDING' } } } })
  })
  it('connects the archived row button, confirmation, API, cache cleanup and persistent status', async () => {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    cache.setQueryData(['clients', 'client-a'], { private: 'old profile' })
    const view = render(<QueryClientProvider client={cache}><MemoryRouter initialEntries={['/clients?archive=archived']}><ClientsPage /></MemoryRouter></QueryClientProvider>)
    await screen.findByText('Cliente Prueba')
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    fireEvent.change(screen.getByLabelText('Escribe ELIMINAR para confirmar'), { target: { value: 'ELIMINAR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar permanentemente' }))
    await waitFor(() => expect(remove).toHaveBeenCalledWith('/admin/clients/client-a', { data: { confirmation: 'ELIMINAR' } }))
    await waitFor(() => expect(screen.queryByText('Cliente Prueba')).not.toBeInTheDocument())
    expect(cache.getQueryData(['clients', 'client-a'])).toBeUndefined()
    await screen.findByText(/Eliminación en curso/)
    view.unmount()
    cache.clear()
    const fresh = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const reload = render(<QueryClientProvider client={fresh}><MemoryRouter><ClientsPage /></MemoryRouter></QueryClientProvider>)
    await screen.findByText(/Eliminación en curso/)
    reload.unmount()
    fresh.clear()
  })
})
