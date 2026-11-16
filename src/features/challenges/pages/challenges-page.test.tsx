import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ChallengesPage } from './challenges-page'
import type { ChallengeListItem, ChallengeSummary } from '../types'

const get = vi.fn()
vi.mock('@/lib/api', () => ({ api: { get: (...args: unknown[]) => get(...args) } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))

const baseChallenge: ChallengeListItem = {
  id: 'challenge-1',
  title: 'Completa 4 entrenos esta semana',
  description: 'Marca 4 entrenamientos como completados.',
  type: 'WEEKLY',
  target_value: 4,
  unit: 'días',
  is_manual: false,
  is_global: false,
  deadline: null,
  rule_key: 'TRAINING_DAYS',
  rule_config: null,
  created_by: null,
  created_at: '',
  updated_at: '',
  assigned_clients: 12,
  completed_clients: 8,
  completion_rate: 67,
}

const summary: ChallengeSummary = { total: 12, weekly: 9, main_goal: 3, automatic: 7, global: 4 }

interface ListPayload {
  data: ChallengeListItem[]
  total: number
  totalPages: number
  summary?: ChallengeSummary
}

function mockApi(list: (params?: Record<string, unknown>) => ListPayload | Error) {
  get.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
    if (url === '/challenges') {
      const result = list(config?.params)
      if (result instanceof Error) throw result
      return { data: { data: { page: 1, limit: 10, summary, ...result } } }
    }
    if (url === `/challenges/${baseChallenge.id}`) {
      return {
        data: {
          data: {
            ...baseChallenge,
            assignments: { data: [], total: 0, page: 1, limit: 10, totalPages: 1 },
          },
        },
      }
    }
    if (url === '/approval-requests/resource/challenge/batch') {
      return {
        data: { data: [{ resource_id: 'challenge-1', pending_approval_actions: ['UPDATE'] }] },
      }
    }
    return { data: { data: [] } }
  })
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

function renderPage(initialEntry = '/challenges') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <ChallengesPage />
          <LocationProbe />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

describe('ChallengesPage', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('renders header, rows with pending approval and pagination', async () => {
    mockApi(() => ({ data: [baseChallenge], total: 12, totalPages: 2 }))
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Gestión de retos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nuevo reto/ })).toBeInTheDocument()
    expect(await screen.findByText('Completa 4 entrenos esta semana')).toBeInTheDocument()
    expect(await screen.findByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('12 retos encontrados')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Reto' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /Completa 4 entrenos esta semana/ })).toHaveAttribute(
      'aria-valuenow',
      '67',
    )
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
  })

  it('names every filter select after its visible label (RDS-F5-01)', async () => {
    mockApi(() => ({ data: [baseChallenge], total: 1, totalPages: 1 }))
    renderPage()

    expect(await screen.findByText('Completa 4 entrenos esta semana')).toBeInTheDocument()
    for (const name of ['Tipo', 'Modo', 'Alcance', 'Estado']) {
      expect(screen.getByRole('combobox', { name })).toBeInTheDocument()
    }
  })

  it('shows the figures of the summary strip with their labels', async () => {
    mockApi(() => ({ data: [baseChallenge], total: 1, totalPages: 1 }))
    renderPage()

    const strip = await screen.findByLabelText('Resumen de retos')
    const figures = within(strip)
    const expected: Array<[string, string]> = [
      ['Retos semanales', '9'],
      ['Objetivos principales', '3'],
      ['Retos automáticos', '7'],
      ['Alcance global', '4'],
      ['Total retos', '12'],
    ]
    for (const [label, value] of expected) {
      const term = figures.getByText(label)
      expect(term.nextElementSibling).toHaveTextContent(value)
    }
  })

  it('shows the error state and retries the same query', async () => {
    let fail = true
    mockApi(() =>
      fail
        ? Object.assign(new AxiosError('boom'), { response: { status: 404 } })
        : { data: [baseChallenge], total: 1, totalPages: 1 },
    )
    renderPage()

    expect(await screen.findByText('No se pudieron cargar los retos')).toBeInTheDocument()
    fail = false
    await userEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[0])
    expect(await screen.findByText('Completa 4 entrenos esta semana')).toBeInTheDocument()
  })

  it('shows the empty state with its create action', async () => {
    mockApi(() => ({ data: [], total: 0, totalPages: 1 }))
    renderPage()

    expect(await screen.findByText('Todavía no hay retos creados')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear primer reto' })).toBeInTheDocument()
  })

  it('reads URL filters, queries with them and clears them', async () => {
    mockApi(() => ({ data: [], total: 0, totalPages: 1 }))
    renderPage('/challenges?page=2&search=abc&type=WEEKLY&source=MANUAL&scope=GLOBAL&status=COMPLETED')
    const user = userEvent.setup()

    expect(await screen.findByText('Ningún reto coincide con los filtros')).toBeInTheDocument()
    const call = get.mock.calls.find(([url]) => url === '/challenges')
    expect(call?.[1]).toMatchObject({
      params: {
        page: 2,
        limit: 10,
        search: 'abc',
        type: 'WEEKLY',
        is_manual: true,
        is_global: true,
        completion_status: 'COMPLETED',
      },
    })

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/challenges$/))
  })

  it('opens the progress panel from the row', async () => {
    mockApi(() => ({ data: [baseChallenge], total: 1, totalPages: 1 }))
    renderPage()
    const user = userEvent.setup()

    await screen.findByText('Completa 4 entrenos esta semana')
    await user.click(screen.getByRole('button', { name: 'Progreso' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Completa 4 entrenos esta semana')).toBeInTheDocument()
    await waitFor(() => expect(get).toHaveBeenCalledWith('/challenges/challenge-1', expect.anything()))
  })

  it('opens the assignment dialog from the row', async () => {
    mockApi(() => ({ data: [baseChallenge], total: 1, totalPages: 1 }))
    renderPage()
    const user = userEvent.setup()

    await screen.findByText('Completa 4 entrenos esta semana')
    await user.click(screen.getByRole('button', { name: 'Asignar' }))

    expect(await screen.findByRole('heading', { name: 'Asignar reto' })).toBeInTheDocument()
  })
})
