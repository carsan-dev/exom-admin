import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientsPage } from './clients-page'

// P15 / RDS-F4-16: search and filters of every Clients/Users tab live in the URL.

const { get, role } = vi.hoisted(() => ({ get: vi.fn(), role: { current: 'ADMIN' } }))

vi.mock('@/lib/api', () => ({ api: { get: (...args: unknown[]) => get(...args), put: vi.fn() } }))
vi.mock('@/hooks/use-auth', () => ({
  useAuth: (selector: (state: unknown) => unknown) =>
    selector({ user: { id: 'me-1', role: role.current } }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))

const client = (id: string, first: string) => ({
  id,
  email: `${id}@example.test`,
  role: 'CLIENT',
  is_active: true,
  is_locked: false,
  is_archived: false,
  created_at: '2026-01-15T12:00:00Z',
  profile: { first_name: first, last_name: 'Prueba' },
})
const user = (id: string, userRole: string, first: string) => ({
  id,
  email: `${id}@example.test`,
  role: userRole,
  is_active: true,
  is_locked: false,
  created_at: '2026-02-20T12:00:00Z',
  profile: { first_name: first, last_name: 'Equipo' },
})

function mockApi(totalPages = 1) {
  get.mockImplementation((url: string, options?: { params?: Record<string, unknown> }) => {
    const page = Number(options?.params?.page ?? 1)
    const envelope = (data: unknown[]) =>
      Promise.resolve({ data: { data: { data, total: data.length * totalPages, totalPages, page, limit: 10 } } })

    if (url === '/admin/clients') return envelope([client('c-1', 'Ana'), client('c-2', 'Bea')])
    if (url === '/admin/users') {
      return options?.params?.role === 'SUPER_ADMIN'
        ? envelope([user('s-1', 'SUPER_ADMIN', 'Sara')])
        : envelope([user('a-1', 'ADMIN', 'Alba')])
    }
    return Promise.resolve({ data: { data: [] } })
  })
}

function Location() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

function ListHarness() {
  const navigate = useNavigate()
  return (
    <>
      <ClientsPage />
      <Location />
      <button type="button" onClick={() => navigate('/clients/c-1')}>Ir al detalle</button>
      <button type="button" onClick={() => navigate('/clients')}>Enlace lateral</button>
    </>
  )
}

function DetailStub() {
  const navigate = useNavigate()
  return (
    <>
      <p>Detalle del cliente</p>
      <Location />
      <button type="button" onClick={() => navigate(-1)}>Volver</button>
    </>
  )
}

function renderPage(entry: string, userRole = 'ADMIN', totalPages = 1) {
  role.current = userRole
  mockApi(totalPages)
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <StrictMode>
      <QueryClientProvider client={cache}>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/clients" element={<ListHarness />} />
            <Route path="/users" element={<ListHarness />} />
            <Route path="/clients/:id" element={<DetailStub />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  )
}

function locationText() {
  return screen.getByTestId('location').textContent ?? ''
}

function params() {
  const text = locationText()
  return new URLSearchParams(text.includes('?') ? text.slice(text.indexOf('?') + 1) : '')
}

function lastCall(url: string, extra: Record<string, unknown> = {}) {
  const calls = get.mock.calls.filter(
    ([calledUrl, options]) =>
      calledUrl === url &&
      Object.entries(extra).every(([key, value]) => (options as { params: Record<string, unknown> }).params[key] === value),
  )
  return (calls[calls.length - 1]?.[1] as { params: Record<string, unknown> } | undefined)?.params
}

const searchBox = () => screen.getByPlaceholderText('Buscar por nombre o email...')

describe('ClientsPage search and filters in the URL', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('deep link applies search and filters to the toolbar and the API', async () => {
    renderPage(`/clients?clientsFilters=${encodeURIComponent('q:ana;status:LOCKED;created:2026-01-01~')}`)
    await screen.findByText('Ana Prueba')

    expect(searchBox()).toHaveValue('ana')
    expect(screen.getByRole('button', { name: 'Quitar filtro Bloqueada' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quitar filtro Fecha registro: desde 2026-01-01' })).toBeInTheDocument()
    expect(lastCall('/admin/clients')).toEqual({
      page: 1,
      limit: 10,
      search: 'ana',
      archive: 'visible',
      status: ['LOCKED'],
      created_from: '2026-01-01',
    })
    expect(params().get('clientsFilters')).toBe('q:ana;status:LOCKED;created:2026-01-01~')
  })

  it('typing a search writes the URL, keeps other parameters and resets only this page', async () => {
    renderPage('/clients?archive=archived&clientsPage=2', 'ADMIN', 3)
    await screen.findByText('Página 2 de 3')

    fireEvent.change(searchBox(), { target: { value: 'b' } })
    fireEvent.change(searchBox(), { target: { value: 'be' } })
    fireEvent.change(searchBox(), { target: { value: 'bea & co' } })

    await waitFor(() => expect(params().get('clientsFilters')).toBe('q:bea & co'))
    await waitFor(() => expect(params().has('clientsPage')).toBe(false))
    expect(params().get('archive')).toBe('archived')
    expect(searchBox()).toHaveValue('bea & co')
    await waitFor(() =>
      expect(lastCall('/admin/clients')).toMatchObject({ page: 1, search: 'bea & co', archive: 'archived' }),
    )
  })

  it('SUPER_ADMIN: a clients filter keeps tab and the other tabs pages', async () => {
    renderPage('/users?tab=clients&clientsPage=2&adminsPage=3&superAdminsPage=2', 'SUPER_ADMIN', 3)
    await screen.findByText('Página 2 de 3')
    const userEvt = userEvent.setup()

    await userEvt.click(screen.getByRole('button', { name: /Filtros/ }))
    await userEvt.click(screen.getByRole('checkbox', { name: 'Activa' }))

    await waitFor(() => expect(params().get('clientsFilters')).toBe('status:ACTIVE'))
    await waitFor(() => expect(params().has('clientsPage')).toBe(false))
    expect(params().get('tab')).toBe('clients')
    expect(params().get('adminsPage')).toBe('3')
    expect(params().get('superAdminsPage')).toBe('2')
    await waitFor(() => expect(lastCall('/admin/clients')).toMatchObject({ page: 1, status: ['ACTIVE'] }))
  })

  it('deep link with filters and clientsPage=3 keeps page 3', async () => {
    renderPage('/clients?clientsFilters=level%3AAVANZADO&clientsPage=3', 'ADMIN', 3)
    await screen.findByText('Página 3 de 3')

    expect(params().get('clientsPage')).toBe('3')
    expect(lastCall('/admin/clients')).toMatchObject({ page: 3, level: ['AVANZADO'] })
    expect(get.mock.calls.some(([url, options]) => url === '/admin/clients' && (options as { params: { page: number } }).params.page === 1)).toBe(false)
  })

  it('a reload with the same URL restores search and filters', async () => {
    const first = renderPage('/clients')
    await screen.findByText('Ana Prueba')
    fireEvent.change(searchBox(), { target: { value: 'ana: 100%' } })
    const userEvt = userEvent.setup()
    await userEvt.click(screen.getByRole('button', { name: /Filtros/ }))
    await userEvt.click(screen.getByRole('checkbox', { name: 'Intermedio' }))
    await waitFor(() => expect(params().get('clientsFilters')).toBe('q:ana%3A 100%25;level:INTERMEDIO'))
    const url = locationText()
    first.unmount()

    renderPage(url)
    await screen.findByText('Ana Prueba')
    expect(searchBox()).toHaveValue('ana: 100%')
    expect(screen.getByRole('button', { name: 'Quitar filtro Intermedio' })).toBeInTheDocument()
    expect(lastCall('/admin/clients')).toMatchObject({ search: 'ana: 100%', level: ['INTERMEDIO'] })
    expect(locationText()).toBe(url)
  })

  it('going to the detail and back restores the filtered list', async () => {
    renderPage('/clients')
    await screen.findByText('Ana Prueba')
    fireEvent.change(searchBox(), { target: { value: 'bea' } })
    await waitFor(() => expect(params().get('clientsFilters')).toBe('q:bea'))

    fireEvent.click(screen.getByRole('button', { name: 'Ir al detalle' }))
    await screen.findByText('Detalle del cliente')
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))

    await screen.findByText('Ana Prueba')
    expect(searchBox()).toHaveValue('bea')
    expect(params().get('clientsFilters')).toBe('q:bea')
  })

  it('SUPER_ADMIN: the three parameters are independent and survive tab changes', async () => {
    renderPage('/users?clientsFilters=q%3Aana&adminsFilters=status%3ALOCKED', 'SUPER_ADMIN')
    await screen.findByText('Ana Prueba')
    expect(searchBox()).toHaveValue('ana')
    const userEvt = userEvent.setup()

    await userEvt.click(screen.getByRole('tab', { name: 'Admins' }))
    await screen.findByText('Alba Equipo')
    expect(screen.getByRole('button', { name: 'Quitar filtro Bloqueada' })).toBeInTheDocument()
    expect(lastCall('/admin/users', { role: 'ADMIN' })).toMatchObject({ status: ['LOCKED'] })

    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre o email...'), { target: { value: 'alba' } })
    await waitFor(() => expect(params().get('adminsFilters')).toBe('q:alba;status:LOCKED'))

    await userEvt.click(screen.getByRole('tab', { name: 'Super Admins' }))
    await screen.findByText('Sara Equipo')
    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre o email...'), { target: { value: 'sara' } })
    await waitFor(() => expect(params().get('superAdminsFilters')).toBe('q:sara'))
    await waitFor(() => expect(lastCall('/admin/users', { role: 'SUPER_ADMIN' })).toMatchObject({ search: 'sara' }))

    await userEvt.click(screen.getByRole('tab', { name: 'Clientes' }))
    await screen.findByText('Ana Prueba')
    expect(searchBox()).toHaveValue('ana')
    expect(params().get('tab')).toBe('clients')
    expect(params().get('clientsFilters')).toBe('q:ana')
    expect(params().get('adminsFilters')).toBe('q:alba;status:LOCKED')
    expect(params().get('superAdminsFilters')).toBe('q:sara')
  })

  it('clearing search and filters removes the parameter', async () => {
    renderPage('/clients?archive=archived&clientsFilters=q%3Aana%3Bstatus%3AACTIVE')
    await screen.findByText('Ana Prueba')

    fireEvent.change(searchBox(), { target: { value: '' } })
    await waitFor(() => expect(params().get('clientsFilters')).toBe('status:ACTIVE'))
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar todo' }))

    await waitFor(() => expect(params().has('clientsFilters')).toBe(false))
    expect(locationText()).toBe('/clients?archive=archived')
  })

  it('a corrupt parameter is ignored without breaking the page', async () => {
    renderPage(`/clients?clientsPage=2&clientsFilters=${encodeURIComponent('q:%E0%A4%A;status:NOPE;created:xx~;level:INTERMEDIO,??')}`, 'ADMIN', 3)
    await screen.findByText('Ana Prueba')

    expect(searchBox()).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Quitar filtro Intermedio' })).toBeInTheDocument()
    expect(lastCall('/admin/clients')).toMatchObject({ page: 2, level: ['INTERMEDIO'] })
    expect(lastCall('/admin/clients')).not.toHaveProperty('search')
    await waitFor(() => expect(params().get('clientsFilters')).toBe('level:INTERMEDIO'))
    expect(params().get('clientsPage')).toBe('2')
  })

  it('ADMIN only uses clientsFilters and leaves the other parameters alone', async () => {
    renderPage('/clients?adminsFilters=q%3Ax&superAdminsFilters=garbage')
    await screen.findByText('Ana Prueba')
    fireEvent.change(searchBox(), { target: { value: 'ana' } })

    await waitFor(() => expect(params().get('clientsFilters')).toBe('q:ana'))
    expect(params().get('adminsFilters')).toBe('q:x')
    expect(params().get('superAdminsFilters')).toBe('garbage')
    expect(get.mock.calls.some(([url]) => url === '/admin/users')).toBe(false)
  })

  it('a navigation from outside the page while mounted applies the new URL', async () => {
    renderPage('/clients?clientsFilters=q%3Aana')
    await screen.findByText('Ana Prueba')
    expect(searchBox()).toHaveValue('ana')

    fireEvent.click(screen.getByRole('button', { name: 'Enlace lateral' }))

    await waitFor(() => expect(searchBox()).toHaveValue(''))
    expect(locationText()).toBe('/clients')
    await waitFor(() => expect(lastCall('/admin/clients')).not.toHaveProperty('search'))
  })
})
