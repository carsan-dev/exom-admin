import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import { DashboardPage } from './dashboard-page'
import type { DashboardData } from '../types'

const get = vi.fn()
vi.mock('@/lib/api', () => ({ api: { get: (...args: unknown[]) => get(...args) } }))

const longName = 'Nombre de cliente extremadamente largo '.repeat(4).trim()

const dashboard: DashboardData = {
  stats: { activeClients: 42, totalClients: 46, pendingRecaps: 7, pendingFeedback: 4, lockedAccounts: 1 },
  recentActivity: [
    {
      id: 'a1',
      type: 'recap_submitted',
      clientId: 'c01',
      clientName: 'Lucía Martínez',
      clientAvatar: null,
      description: 'Ha enviado su recap semanal.',
      createdAt: '2026-11-15T09:12:00.000Z',
    },
    {
      id: 'a2',
      type: 'feedback_sent',
      clientId: 'c02',
      clientName: 'Javier Ortega',
      clientAvatar: null,
      description: 'Ha enviado feedback.',
      createdAt: '2026-11-15T08:05:00.000Z',
    },
    {
      id: 'a3',
      type: 'progress_completed',
      clientId: 'c03',
      clientName: 'Marta Ruiz',
      clientAvatar: null,
      description: 'Ha completado Torso A.',
      createdAt: '2026-11-15T07:40:00.000Z',
    },
    {
      id: 'a4',
      type: 'client_created',
      clientId: 'c04',
      clientName: longName,
      clientAvatar: null,
      description: 'Nueva cliente dada de alta.',
      createdAt: '2026-11-15T05:02:00.000Z',
    },
  ],
  topClients: [
    { clientId: 'c03', clientName: 'Marta Ruiz', clientAvatar: null, completedDays: 7, currentStreak: 21 },
    { clientId: 'c01', clientName: 'Lucía Martínez', clientAvatar: null, completedDays: 6, currentStreak: 12 },
  ],
}

const emptyDashboard: DashboardData = {
  stats: { activeClients: 0, totalClients: 0, pendingRecaps: 0, pendingFeedback: 0, lockedAccounts: 0 },
  recentActivity: [],
  topClients: [],
}

function setRole(role: 'ADMIN' | 'SUPER_ADMIN') {
  useAuth.setState({
    user: { id: 'u1', email: 'admin@example.test', role, profile: { first_name: 'Moisés' } },
  } as never)
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function hrefOf(name: string | RegExp) {
  return screen.getByRole('link', { name }).getAttribute('href')
}

describe('DashboardPage', () => {
  beforeEach(() => {
    get.mockReset()
    setRole('ADMIN')
  })

  it('renders the header, the four figures and both sections', async () => {
    get.mockResolvedValue({ data: { data: dashboard } })
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(
      screen.getByText('Hola, Moisés. Aquí tienes el resumen ejecutivo de tu operación en EXOM.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Actividad reciente' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Top clientes' })).toBeInTheDocument()

    const indicators = within(screen.getByRole('region', { name: 'Indicadores' }))
    expect(indicators.getByRole('link', { name: /Recaps pendientes.*7.*Pendientes de revisión/ })).toBeInTheDocument()
    expect(indicators.getByRole('link', { name: /Feedback pendiente.*4.*Feedback por responder/ })).toBeInTheDocument()
    expect(
      indicators.getByRole('link', { name: /Cuentas bloqueadas.*1.*Requieren atención inmediata/ }),
    ).toBeInTheDocument()
    expect(indicators.getByRole('link', { name: /Clientes activos.*42.*46 clientes visibles/ })).toBeInTheDocument()

    expect(screen.getByText('7/7 días completados')).toBeInTheDocument()
    expect(screen.getByText('21 días')).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/dashboard')
  })

  it('keeps the destinations of the figures and of the activity for an admin', async () => {
    get.mockResolvedValue({ data: { data: dashboard } })
    renderPage()
    await screen.findByRole('heading', { level: 2, name: 'Actividad reciente' })

    expect(hrefOf(/^Recaps pendientes/)).toBe('/recaps?status=SUBMITTED')
    expect(hrefOf(/^Feedback pendiente/)).toBe('/feedback?status=PENDING')
    expect(hrefOf(/^Cuentas bloqueadas/)).toBe('/clients')
    expect(hrefOf(/^Clientes activos/)).toBe('/clients')

    const hrefs = screen.getAllByRole('link', { name: 'Ver todos' }).map((link) => link.getAttribute('href'))
    expect(hrefs).toEqual([
      '/recaps?clientId=c01&status=SUBMITTED',
      '/feedback?clientId=c02&status=PENDING',
      '/progress?clientId=c03',
      '/clients',
    ])

    expect(hrefOf(/Marta Ruiz.*7\/7/)).toBe('/clients/c03')
    expect(hrefOf(/Lucía Martínez.*6\/7/)).toBe('/clients/c01')
  })

  it('points users and client details to /users for a super admin', async () => {
    setRole('SUPER_ADMIN')
    get.mockResolvedValue({ data: { data: dashboard } })
    renderPage()
    await screen.findByRole('heading', { level: 2, name: 'Actividad reciente' })

    expect(hrefOf(/^Cuentas bloqueadas/)).toBe('/users')
    expect(hrefOf(/^Clientes activos/)).toBe('/users')
    expect(hrefOf(/^Recaps pendientes/)).toBe('/recaps?status=SUBMITTED')
    expect(hrefOf(/^Feedback pendiente/)).toBe('/feedback?status=PENDING')
    expect(screen.getAllByRole('link', { name: 'Ver todos' })[3]).toHaveAttribute('href', '/users')
    expect(hrefOf(/Lucía Martínez.*6\/7/)).toBe('/users/c01')
  })

  it('renders very long client names without dropping the row', async () => {
    get.mockResolvedValue({ data: { data: dashboard } })
    renderPage()

    expect(await screen.findByText(longName)).toBeInTheDocument()
  })

  it('shows the empty states and the quiet locked-accounts message', async () => {
    get.mockResolvedValue({ data: { data: emptyDashboard } })
    renderPage()

    expect(await screen.findByText('Todavía no hay actividad reciente para mostrar.')).toBeInTheDocument()
    expect(screen.getByText('Aún no hay entrenamientos completados esta semana.')).toBeInTheDocument()
    expect(screen.getByText('Sin alertas activas')).toBeInTheDocument()
    expect(screen.getByText('0 clientes visibles')).toBeInTheDocument()
  })

  it('shows the error state and retries the same query', async () => {
    get.mockRejectedValueOnce(Object.assign(new AxiosError('boom'), { response: { status: 404 } }))
    get.mockResolvedValue({ data: { data: dashboard } })
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el dashboard')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Top clientes' })).toBeInTheDocument()
    expect(get).toHaveBeenCalledTimes(2)
  })
})
