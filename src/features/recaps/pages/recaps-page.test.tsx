import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecapsPage } from './recaps-page'
import { RecapsList } from '../components/recaps-list'
import type { RecapListItem } from '../types'

const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create(() => ({ user: { id: 'staff' } })) }
})

function makeRecap(id: string, firstName: string, extra: Partial<RecapListItem> = {}): RecapListItem {
  return {
    id,
    client_id: `c-${id}`,
    week_start_date: '2026-11-09T00:00:00.000Z',
    week_end_date: '2026-11-15T00:00:00.000Z',
    submitted_at: '2026-11-15T10:00:00.000Z',
    created_at: '2026-11-15T10:00:00.000Z',
    status: 'SUBMITTED',
    archived_at: null,
    admin_comments: null,
    average_daily_steps: 8500,
    client: { id: `c-${id}`, email: `${id}@example.test`, profile: { first_name: firstName, last_name: 'Test' } },
    ...extra,
  } as RecapListItem
}

const stats = { total: 31, submitted: 7, reviewed: 20, archived: 4, avg_review_seconds: 5 * 3600 + 12 * 60, reviewed_in_period: 20 }

let store: RecapListItem[] = []

function mockApi({ listFails = false, totalPages = 1 }: { listFails?: boolean; totalPages?: number } = {}) {
  api.get.mockImplementation(async (url: string) => {
    if (url === '/recaps') {
      if (listFails) throw Object.assign(new AxiosError('boom'), { response: { status: 500 } })
      return { data: { data: { data: store, total: store.length, page: 1, limit: 20, totalPages } } }
    }
    if (url === '/recaps/stats') return { data: { data: stats } }
    return { data: { data: { data: [], total: 0, page: 1, limit: 200, totalPages: 1 } } }
  })
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

function renderPage(initialEntry = '/recaps') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <RecapsPage />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function stubViewport(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches, addEventListener: () => {}, removeEventListener: () => {} }),
  })
}

const listCalls = () => api.get.mock.calls.filter(([path]) => path === '/recaps')
const lastListParams = () => listCalls().slice(-1)[0]?.[1].params

describe('RecapsPage', () => {
  beforeEach(() => {
    api.get.mockReset()
    store = [
      makeRecap('r1', 'Ana'),
      makeRecap('r2', 'Beto', { status: 'REVIEWED', admin_comments: 'Buen trabajo' }),
      makeRecap('r3', 'Carla', { archived_at: '2026-11-16T10:00:00.000Z', status: 'REVIEWED' }),
    ]
  })

  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia')
  })

  it('renders header, figures, table rows and pagination on desktop', async () => {
    mockApi({ totalPages: 3 })
    renderPage()

    expect(screen.getByText('Seguimiento')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Recaps semanales' })).toBeInTheDocument()
    expect(await screen.findByText('Ana Test')).toBeInTheDocument()
    expect(screen.getAllByRole('table')).toHaveLength(1)
    expect(screen.getByText('Buen trabajo')).toBeInTheDocument()
    expect(screen.getByText('Archivado')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument()

    const figures = within(await screen.findByLabelText('Resumen de recaps'))
    expect(figures.getByText('Total recaps').nextElementSibling).toHaveTextContent('31')
    expect(figures.getByText('Por revisar').nextElementSibling).toHaveTextContent('7')
    expect(figures.getByText('5 h 12 min')).toBeInTheDocument()
  })

  it('mounts only the stacked list on mobile, with the same open links', async () => {
    stubViewport(false)
    mockApi()
    renderPage()

    expect(await screen.findByText('Ana Test')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Abrir' }).map((link) => link.getAttribute('href'))).toEqual([
      '/recaps/r1',
      '/recaps/r2',
      '/recaps/r3',
    ])
  })

  it('links to the detail with the same hrefs on desktop and propagates returnTo', async () => {
    mockApi()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <RecapsList archived={false} page={1} onPageChange={vi.fn()} returnTo="/progress?clientId=x&section=follow-up" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const links = await screen.findAllByRole('link', { name: 'Abrir' })
    expect(links[0].getAttribute('href')).toBe(
      `/recaps/r1?returnTo=${encodeURIComponent('/progress?clientId=x&section=follow-up')}`,
    )
  })

  it('reads clientId, status, archived and page from the URL into the query', async () => {
    mockApi({ totalPages: 5 })
    renderPage('/recaps?clientId=abc&status=SUBMITTED&archived=true&page=3')

    await screen.findByText('Ana Test')
    expect(lastListParams()).toEqual({ page: 3, limit: 20, client_id: 'abc', status: 'SUBMITTED', archived: true })
    expect(screen.getByRole('button', { name: 'Por revisar' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Ver activos' })).toBeInTheDocument()
  })

  it('writes status, archived and page to the URL and resets the page on filter changes', async () => {
    mockApi({ totalPages: 5 })
    const user = userEvent.setup()
    renderPage('/recaps?page=2')

    await screen.findByText('Ana Test')
    await user.click(screen.getByRole('button', { name: 'Revisados' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/recaps?status=REVIEWED'))
    expect(screen.getByTestId('location')).not.toHaveTextContent('page=')

    await user.click(screen.getByRole('button', { name: 'Ver archivados' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('archived=true'))
    await waitFor(() => expect(lastListParams()).toEqual({ page: 1, limit: 20, status: 'REVIEWED', archived: true }))

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('page=2'))
    await waitFor(() => expect(lastListParams()).toEqual({ page: 2, limit: 20, status: 'REVIEWED', archived: true }))
  })

  it('shows the empty state with and without filters', async () => {
    store = []
    mockApi()
    const { unmount } = renderPage()
    expect(await screen.findByText('Todavía no hay recaps disponibles para revisión')).toBeInTheDocument()
    unmount()

    renderPage('/recaps?status=REVIEWED')
    expect(await screen.findByText('No hay recaps para los filtros seleccionados')).toBeInTheDocument()
  })

  it('shows the error state and retries the list', async () => {
    mockApi({ listFails: true })
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('Error al cargar los recaps. Intenta de nuevo.')).toBeInTheDocument()
    const before = listCalls().length
    await user.click(screen.getAllByRole('button', { name: 'Reintentar' }).slice(-1)[0])
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(before))
  })
})
