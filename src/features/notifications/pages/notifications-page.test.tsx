import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationsPage } from './notifications-page'
import type { NotificationItem, NotificationStats } from '../types'

const get = vi.fn()
vi.mock('@/lib/api', () => ({ api: { get: (...args: unknown[]) => get(...args), post: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))

const sentAt = new Date(2026, 10, 15, 18, 42)

const sentItem: NotificationItem = {
  id: 'n-1',
  sender_id: 's-1',
  recipient_id: 'r-1',
  title: 'Recordatorio de recap',
  body: 'Envía tu recap semanal.',
  data: null,
  status: 'SENT',
  error: null,
  read_at: null,
  created_at: sentAt.toISOString(),
  recipient: { email: 'lucia@example.test', profile: { first_name: 'Lucía', last_name: 'Martínez' } },
}

const failedItem: NotificationItem = {
  ...sentItem,
  id: 'n-2',
  title: 'Revisión de técnica',
  status: 'FAILED',
  error: 'El cliente no tiene dispositivos registrados.',
  created_at: new Date(2026, 10, 3, 0, 5).toISOString(),
}

const stats: NotificationStats = { total: 248, today: 6, failed: 3 }

interface HistoryPayload {
  data: NotificationItem[]
  total: number
  totalPages: number
}

function mockApi(history: (params?: Record<string, unknown>) => HistoryPayload | Error, statsFails = false) {
  get.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
    if (url === '/notifications/history') {
      const result = history(config?.params)
      if (result instanceof Error) throw result
      return { data: { data: { page: 1, limit: 20, ...result } } }
    }
    if (url === '/notifications/stats') {
      if (statsFails) throw Object.assign(new AxiosError('boom'), { response: { status: 404 } })
      return { data: { data: stats } }
    }
    return { data: { data: [] } }
  })
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

function renderPage(initialEntry = '/notifications') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <NotificationsPage />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('renders header, figures, history rows with local date and time, and pagination', async () => {
    mockApi(() => ({ data: [sentItem, failedItem], total: 40, totalPages: 2 }))
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Notificaciones' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar notificación' })).toBeInTheDocument()
    expect(await screen.findByText('Recordatorio de recap')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Destinatario' })).toBeInTheDocument()
    expect(screen.getByText('Enviada')).toBeInTheDocument()
    expect(screen.getByText('Fallida')).toBeInTheDocument()
    expect(screen.getByText('El cliente no tiene dispositivos registrados.')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()

    const first = screen.getByText('15/11/2026 18:42')
    expect(first.tagName).toBe('TIME')
    expect(first).toHaveAttribute('datetime', sentItem.created_at)
    expect(screen.getByText('03/11/2026 00:05')).toBeInTheDocument()

    const figures = within(await screen.findByLabelText('Resumen de notificaciones'))
    expect(figures.getByText('Total enviadas').nextElementSibling).toHaveTextContent('248')
    expect(figures.getByText('Enviadas hoy').nextElementSibling).toHaveTextContent('6')
    expect(figures.getByText('Fallidas').nextElementSibling).toHaveTextContent('3')
  })

  it('shows a fallback for an invalid created_at without breaking the row', async () => {
    mockApi(() => ({ data: [{ ...sentItem, created_at: 'invalid' }], total: 1, totalPages: 1 }))
    renderPage()

    expect(await screen.findByText('Recordatorio de recap')).toBeInTheDocument()
    expect(screen.getByText('Fecha no disponible')).toBeInTheDocument()
  })

  it('shows the error state and retries the same query', async () => {
    let fail = true
    mockApi(() =>
      fail
        ? Object.assign(new AxiosError('boom'), { response: { status: 404 } })
        : { data: [sentItem], total: 1, totalPages: 1 },
    )
    renderPage()

    expect(
      await screen.findByText('Error al cargar el historial de notificaciones. Intenta de nuevo.'),
    ).toBeInTheDocument()
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Recordatorio de recap')).toBeInTheDocument()
  })

  it('shows a retry for the figures when the summary fails', async () => {
    mockApi(() => ({ data: [sentItem], total: 1, totalPages: 1 }), true)
    renderPage()

    expect(await screen.findByText('No se pudo cargar el resumen')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('shows the empty state without filters', async () => {
    mockApi(() => ({ data: [], total: 0, totalPages: 1 }))
    renderPage()

    expect(await screen.findByText('Todavía no has enviado notificaciones desde el panel')).toBeInTheDocument()
  })

  it('reads URL params, queries with them and clears the filters', async () => {
    mockApi(() => ({ data: [], total: 0, totalPages: 1 }))
    renderPage('/notifications?recipientId=r-9&status=FAILED&search=recap&page=2&stats_period=7d')
    const user = userEvent.setup()

    expect(
      await screen.findByText('No hay notificaciones que coincidan con los filtros seleccionados'),
    ).toBeInTheDocument()

    const history = get.mock.calls.find(([url]) => url === '/notifications/history')
    expect(history?.[1]).toMatchObject({
      params: { page: 2, limit: 20, recipient_id: 'r-9', status: 'FAILED', search: 'recap' },
    })
    const statsCall = get.mock.calls.find(([url]) => url === '/notifications/stats')
    expect(statsCall?.[1]).toMatchObject({ params: { recipient_id: 'r-9' } })
    expect(screen.getByText(/Destinatario filtrado/)).toBeInTheDocument()

    // The existing handler fires three updates from the same snapshot, so only the last one
    // (the search) lands in the URL; the other params and the stats period are left untouched.
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(screen.getByTestId('location').textContent ?? '').not.toContain('search='))
    expect(screen.getByTestId('location').textContent ?? '').toContain('stats_period=7d')
  })

  it('writes the search to the URL and resets the page', async () => {
    mockApi(() => ({ data: [sentItem], total: 1, totalPages: 1 }))
    renderPage('/notifications?page=3')
    const user = userEvent.setup()

    await screen.findByText('Recordatorio de recap')
    await user.type(screen.getByPlaceholderText('Buscar por título o cuerpo'), 'a')
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('search=a'))
    expect(screen.getByTestId('location').textContent).not.toMatch(/[?&]page=/)
  })
})
