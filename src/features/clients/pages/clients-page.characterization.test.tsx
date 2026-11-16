import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientsPage } from './clients-page'

// Characterization of the Clients/Users page DOM. The snapshots were recorded
// before extracting the view into components and must not change afterwards.

const { get, role } = vi.hoisted(() => ({ get: vi.fn(), role: { current: 'ADMIN' } }))

vi.mock('@/lib/api', () => ({ api: { get: (...args: unknown[]) => get(...args), put: vi.fn() } }))
vi.mock('@/hooks/use-auth', () => ({
  useAuth: (selector: (state: unknown) => unknown) =>
    selector({ user: { id: 'me-1', role: role.current } }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))

type Mode = 'data' | 'empty' | 'loading' | 'error' | 'paged'

const client = (id: string, first: string, extra: Record<string, unknown> = {}) => ({
  id,
  email: `${id}@example.test`,
  role: 'CLIENT',
  is_active: true,
  is_locked: false,
  is_archived: false,
  created_at: '2026-01-15T12:00:00Z',
  profile: { first_name: first, last_name: 'Prueba' },
  ...extra,
})
const user = (id: string, role: string, first: string, extra: Record<string, unknown> = {}) => ({
  id,
  email: `${id}@example.test`,
  role,
  is_active: true,
  is_locked: false,
  created_at: '2026-02-20T12:00:00Z',
  profile: { first_name: first, last_name: 'Equipo' },
  ...extra,
})

function page(data: unknown[], totalPages = 1, total = data.length, pageNumber = 1) {
  return { data: { data: { data, total, totalPages, page: pageNumber, limit: 10 } } }
}

function reply(mode: Mode, rows: unknown[], pageNumber: number) {
  if (mode === 'loading') return new Promise(() => undefined)
  if (mode === 'error') {
    return Promise.reject(Object.assign(new AxiosError('boom'), { response: { status: 404 } }))
  }
  if (mode === 'empty') return Promise.resolve(page([]))
  if (mode === 'paged') return Promise.resolve(page(rows, 3, 25, pageNumber))
  return Promise.resolve(page(rows))
}

interface Setup {
  mode?: Mode
  deletions?: unknown[]
  deletionsError?: boolean
}

function mockApi({ mode = 'data', deletions = [], deletionsError = false }: Setup = {}) {
  get.mockImplementation((url: string, options?: { params?: Record<string, unknown> }) => {
    const pageNumber = Number(options?.params?.page ?? 1)
    if (url === '/admin/client-deletions') {
      return deletionsError ? Promise.reject(Object.assign(new AxiosError('x'), { response: { status: 404 } })) : Promise.resolve({ data: { data: deletions } })
    }
    if (url === '/admin/clients') {
      const archived = options?.params?.archive === 'archived'
      return reply(mode, [
        client('c-1', 'Ana', { is_archived: archived }),
        client('c-2', 'Bea', { is_locked: true, is_archived: archived }),
        client('c-3', 'Carla', { is_active: false, is_archived: archived }),
      ], pageNumber)
    }
    if (url === '/admin/users') {
      const isSuper = options?.params?.role === 'SUPER_ADMIN'
      return reply(
        mode,
        isSuper
          ? [user('s-1', 'SUPER_ADMIN', 'Sara'), user('me-1', 'SUPER_ADMIN', 'Yo', { is_locked: true })]
          : [user('a-1', 'ADMIN', 'Alba'), user('a-2', 'ADMIN', 'Berta', { is_active: false })],
        pageNumber,
      )
    }
    return Promise.resolve({ data: { data: [] } })
  })
}

function Location() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

function normalize(html: string) {
  return html
    .replace(/radix-[^"\s]*/g, 'radix-ID')
    .replace(/ style="(animation-duration: 0s;)?"/g, '')
    .replace(/[«:]r[0-9a-z]+[»:]/g, 'ID')
    .replace(/></g, '>\n<')
}

function renderPage(entry: string, setup: Setup = {}, userRole = 'ADMIN') {
  role.current = userRole
  mockApi(setup)
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(
    <QueryClientProvider client={cache}>
      <MemoryRouter initialEntries={[entry]}>
        <ClientsPage />
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return view
}

const snap = (container: HTMLElement) => normalize(container.innerHTML)

describe('ClientsPage characterization', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('ADMIN /clients with rows', async () => {
    const { container } = renderPage('/clients')
    await screen.findByText('Ana Prueba')
    expect(snap(container)).toMatchSnapshot()
  })

  it('ADMIN /clients loading', async () => {
    const { container } = renderPage('/clients', { mode: 'loading' })
    await waitFor(() => expect(get).toHaveBeenCalled())
    expect(snap(container)).toMatchSnapshot()
  })

  it('ADMIN /clients error', async () => {
    const { container } = renderPage('/clients', { mode: 'error' })
    await screen.findByText('No se ha podido cargar el listado')
    expect(snap(container)).toMatchSnapshot()
  })

  it('ADMIN /clients empty without query', async () => {
    const { container } = renderPage('/clients', { mode: 'empty' })
    await screen.findByText('Aún no tienes clientes asignados')
    expect(snap(container)).toMatchSnapshot()
  })

  it('ADMIN /clients empty with search', async () => {
    const { container } = renderPage('/clients')
    await screen.findByText('Ana Prueba')
    mockApi({ mode: 'empty' })
    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre o email...'), { target: { value: 'zzz' } })
    await screen.findByText('No se encontraron clientes con la búsqueda y filtros actuales.')
    expect(snap(container)).toMatchSnapshot()
  })

  it('ADMIN /clients archived', async () => {
    const { container } = renderPage('/clients?archive=archived')
    await screen.findByText('Clientes archivados')
    await screen.findByText('Ana Prueba')
    expect(snap(container)).toMatchSnapshot()
  })

  it('ADMIN /clients paginated: next, previous and archive toggle drive the URL', async () => {
    const { container } = renderPage('/clients?clientsPage=2', { mode: 'paged' })
    await screen.findByText('Página 2 de 3')
    expect(snap(container)).toMatchSnapshot()
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }))
    await screen.findByText('Página 3 de 3')
    expect(screen.getByTestId('location')).toHaveTextContent('/clients?clientsPage=3')
    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }))
    await screen.findByText('Página 2 de 3')
    expect(screen.getByTestId('location')).toHaveTextContent('/clients?clientsPage=2')
    fireEvent.click(screen.getByRole('button', { name: 'Archivados' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/clients\?archive=archived$/))
  })

  it('ADMIN opens the create client dialog from the header', async () => {
    renderPage('/clients')
    await screen.findByText('Ana Prueba')
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo cliente' }))
    const dialog = await screen.findByRole('dialog')
    expect(normalize(dialog.outerHTML)).toMatchSnapshot()
  })

  it('SUPER_ADMIN /users clients tab with deletions panel', async () => {
    const { container } = renderPage(
      '/users',
      { deletions: [
        { id: 'op-1', client_id: 'c-9', status: 'PENDING', last_error: null },
        { id: 'op-2', client_id: 'c-8', status: 'BLOCKED', last_error: null },
        { id: 'op-3', client_id: 'c-7', status: 'COMPLETED', last_error: null },
      ] },
      'SUPER_ADMIN',
    )
    await screen.findByText('Ana Prueba')
    await screen.findByText('Eliminaciones recientes')
    expect(snap(container)).toMatchSnapshot()
  })

  it('SUPER_ADMIN /users clients error and deletions error', async () => {
    const { container } = renderPage('/users', { mode: 'error', deletionsError: true }, 'SUPER_ADMIN')
    await screen.findByText('No se ha podido cargar el listado')
    await screen.findByText(/No se pudo consultar el estado de las eliminaciones/)
    expect(snap(container)).toMatchSnapshot()
  })

  it('SUPER_ADMIN /users empty clients', async () => {
    const { container } = renderPage('/users', { mode: 'empty' }, 'SUPER_ADMIN')
    await screen.findByText('Todavía no hay clientes registrados', { selector: 'h2' })
    expect(snap(container)).toMatchSnapshot()
  })

  it('SUPER_ADMIN /users?tab=admins rows', async () => {
    const { container } = renderPage('/users?tab=admins', {}, 'SUPER_ADMIN')
    await screen.findByText('Alba Equipo')
    expect(snap(container)).toMatchSnapshot()
  })

  it('SUPER_ADMIN /users?tab=admins loading, error and empty', async () => {
    const loading = renderPage('/users?tab=admins', { mode: 'loading' }, 'SUPER_ADMIN')
    await waitFor(() => expect(get).toHaveBeenCalledWith('/admin/users', expect.anything()))
    expect(snap(loading.container)).toMatchSnapshot('loading')
    loading.unmount()

    const failing = renderPage('/users?tab=admins', { mode: 'error' }, 'SUPER_ADMIN')
    await screen.findByText('No se ha podido cargar el listado de admins')
    expect(snap(failing.container)).toMatchSnapshot('error')
    failing.unmount()

    const empty = renderPage('/users?tab=admins', { mode: 'empty' }, 'SUPER_ADMIN')
    await screen.findByText('Crear primer admin')
    expect(snap(empty.container)).toMatchSnapshot('empty')
  })

  it('SUPER_ADMIN /users?tab=admins paginated', async () => {
    const { container } = renderPage('/users?tab=admins&adminsPage=2', { mode: 'paged' }, 'SUPER_ADMIN')
    await screen.findByText('Página 2 de 3')
    expect(snap(container)).toMatchSnapshot()
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }))
    await screen.findByText('Página 3 de 3')
    expect(screen.getByTestId('location')).toHaveTextContent('adminsPage=3')
  })

  it('SUPER_ADMIN /users?tab=super-admins rows', async () => {
    const { container } = renderPage('/users?tab=super-admins', {}, 'SUPER_ADMIN')
    await screen.findByText('Sara Equipo')
    expect(snap(container)).toMatchSnapshot()
  })

  it('SUPER_ADMIN /users?tab=super-admins loading, error and empty', async () => {
    const loading = renderPage('/users?tab=super-admins', { mode: 'loading' }, 'SUPER_ADMIN')
    await waitFor(() => expect(get).toHaveBeenCalledWith('/admin/users', expect.anything()))
    expect(snap(loading.container)).toMatchSnapshot('loading')
    loading.unmount()

    const failing = renderPage('/users?tab=super-admins', { mode: 'error' }, 'SUPER_ADMIN')
    await screen.findByText('No se ha podido cargar el listado de super admins')
    expect(snap(failing.container)).toMatchSnapshot('error')
    failing.unmount()

    const empty = renderPage('/users?tab=super-admins', { mode: 'empty' }, 'SUPER_ADMIN')
    await screen.findByText('Crear admin base')
    expect(snap(empty.container)).toMatchSnapshot('empty')
  })

  it('SUPER_ADMIN switches tabs through the tab bar and the header button follows', async () => {
    renderPage('/users', {}, 'SUPER_ADMIN')
    await screen.findByText('Ana Prueba')
    const userEvt = userEvent.setup()
    await userEvt.click(screen.getByRole('tab', { name: 'Admins' }))
    await screen.findByText('Alba Equipo')
    expect(screen.getByTestId('location')).toHaveTextContent('/users?tab=admins')
    expect(screen.getByRole('button', { name: 'Nuevo admin' })).toBeInTheDocument()
    await userEvt.click(screen.getByRole('tab', { name: 'Super Admins' }))
    await screen.findByText('Sara Equipo')
    expect(screen.getByTestId('location')).toHaveTextContent('/users?tab=super-admins')
    await userEvt.click(screen.getByRole('tab', { name: 'Clientes' }))
    await screen.findByText('Ana Prueba')
    expect(screen.getByRole('button', { name: 'Nuevo cliente' })).toBeInTheDocument()
  })

  it('ADMIN ignores the tab parameter', async () => {
    renderPage('/clients?tab=admins')
    await screen.findByText('Ana Prueba')
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(get).not.toHaveBeenCalledWith('/admin/users', expect.anything())
  })
})
