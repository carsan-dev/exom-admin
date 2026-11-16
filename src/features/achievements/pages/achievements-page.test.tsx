import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/use-auth'
import { AchievementsPage } from './achievements-page'
import type { AchievementListItem, AchievementSummary } from '../types'

const get = vi.fn()
vi.mock('@/lib/api', () => ({ api: { get: (...args: unknown[]) => get(...args) } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))

const baseAchievement: AchievementListItem = {
  id: 'ach-1',
  name: 'Racha de hierro',
  description: 'Mantén una racha de 21 días seguidos.',
  icon_url: 'https://media.example.test/i.png',
  criteria_type: 'STREAK_DAYS',
  criteria_value: 21,
  rule_config: null,
  created_at: '',
  unlocked_count: 3,
}

const summary: AchievementSummary = { total: 14, criteria_types: { TRAINING_DAYS: 6, STREAK_DAYS: 3, CUSTOM: 1, WEIGHT_LOGS: 1 } }

interface ListPayload {
  data: AchievementListItem[]
  total: number
  totalPages: number
}

function mockApi(list: (params?: Record<string, unknown>) => ListPayload | Error) {
  get.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
    if (url === '/achievements') {
      const result = list(config?.params)
      if (result instanceof Error) throw result
      return { data: { data: { page: 1, limit: 10, summary, ...result } } }
    }
    if (url === '/approval-requests/resource/achievement/batch') {
      return { data: { data: [{ resource_id: 'ach-1', pending_approval_actions: ['UPDATE'] }] } }
    }
    return { data: { data: [] } }
  })
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

function renderPage(initialEntry = '/achievements') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <AchievementsPage />
          <LocationProbe />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

function setRole(role: 'ADMIN' | 'SUPER_ADMIN') {
  useAuth.setState({ user: { id: 'u1', email: 'a@example.test', role } } as never)
}

describe('AchievementsPage', () => {
  beforeEach(() => {
    get.mockReset()
    setRole('ADMIN')
  })

  it('renders header, row with icon and pending approval, figures and pagination', async () => {
    mockApi(() => ({ data: [baseAchievement], total: 12, totalPages: 2 }))
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Gestión de logros' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nuevo logro/ })).toBeInTheDocument()
    expect(await screen.findByText('Racha de hierro')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Icono de Racha de hierro' })).toHaveAttribute('loading', 'lazy')
    expect(await screen.findByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('12 logros encontrados')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Logro' })).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()

    const figures = within(await screen.findByLabelText('Resumen de logros'))
    expect(figures.getByText('Total logros').nextElementSibling).toHaveTextContent('14')
    expect(figures.getByText('Días de entrenamiento').nextElementSibling).toHaveTextContent('6')
  })

  it('shows the error state and retries the same query', async () => {
    let fail = true
    mockApi(() =>
      fail
        ? Object.assign(new AxiosError('boom'), { response: { status: 404 } })
        : { data: [baseAchievement], total: 1, totalPages: 1 },
    )
    renderPage()

    expect(await screen.findByText('No se pudieron cargar los logros')).toBeInTheDocument()
    fail = false
    await userEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[0])
    expect(await screen.findByText('Racha de hierro')).toBeInTheDocument()
  })

  it('shows the empty state with its create action', async () => {
    mockApi(() => ({ data: [], total: 0, totalPages: 1 }))
    renderPage()

    expect(await screen.findByText('Todavía no hay logros creados')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear primer logro' })).toBeInTheDocument()
  })

  it('reads URL filters, queries with them and clears them', async () => {
    mockApi(() => ({ data: [], total: 0, totalPages: 1 }))
    renderPage('/achievements?page=2&search=abc&criteria_type=STREAK_DAYS')
    const user = userEvent.setup()

    expect(await screen.findByText('Ningún logro coincide con los filtros')).toBeInTheDocument()
    const call = get.mock.calls.find(([url]) => url === '/achievements')
    expect(call?.[1]).toMatchObject({
      params: { page: 2, limit: 10, search: 'abc', criteria_type: 'STREAK_DAYS' },
    })

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/achievements$/))
  })

  it('writes the search to the URL and resets the page', async () => {
    mockApi(() => ({ data: [baseAchievement], total: 1, totalPages: 1 }))
    renderPage('/achievements?page=3')
    const user = userEvent.setup()

    await screen.findByText('Racha de hierro')
    await user.type(screen.getByLabelText('Buscar'), 'fuerza')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/achievements?search=fuerza'))
  })

  it('hides Eliminar for ADMIN and shows it for SUPER_ADMIN', async () => {
    mockApi(() => ({ data: [baseAchievement], total: 1, totalPages: 1 }))
    const { unmount } = renderPage()
    await screen.findByText('Racha de hierro')
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    unmount()

    setRole('SUPER_ADMIN')
    renderPage()
    await screen.findByText('Racha de hierro')
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })
})
