import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ExercisesPage } from './exercises-page'
import type { Exercise } from '../types'

const get = vi.fn()
vi.mock('@/lib/api', () => ({ api: { get: (...args: unknown[]) => get(...args) } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))

const baseExercise: Exercise = {
  id: 'exercise-1',
  name: 'Press de banca',
  muscle_groups: ['Pecho', 'Tríceps', 'Hombros'],
  equipment: ['Barra'],
  level: 'INTERMEDIO',
  video_url: 'https://media.example.test/press.mp4',
  video_stream_id: null,
  thumbnail_url: 'https://media.example.test/press.jpg',
  technique_text: null,
  common_errors_text: null,
  explanation_text: null,
  is_active: true,
  created_at: '',
  updated_at: '',
  training_usage_count: 0,
  is_used_in_training: false,
}

interface ListPayload {
  data: Exercise[]
  total: number
  totalPages: number
}

function listResponse(payload: ListPayload) {
  return { data: { data: { ...payload, page: 1, limit: 10 } } }
}

function mockApi(list: (params?: { search?: string }) => ListPayload | Error) {
  get.mockImplementation(async (url: string, config?: { params?: { search?: string } }) => {
    if (url === '/exercises') {
      const result = list(config?.params)
      if (result instanceof Error) throw result
      return listResponse(result)
    }
    if (url === '/exercises/muscle-groups') return { data: { data: { muscle_groups: ['Pecho'] } } }
    if (url === '/exercises/equipment') return { data: { data: { equipment: ['Barra'] } } }
    if (url === '/approval-requests/resource/exercise/batch') {
      return {
        data: {
          data: [{ resource_id: 'exercise-1', pending_approval_actions: ['UPDATE'] }],
        },
      }
    }
    return { data: { data: {} } }
  })
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

function renderPage(initialEntry = '/exercises') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <ExercisesPage />
          <LocationProbe />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

function listCalls() {
  return get.mock.calls.filter(([url]) => url === '/exercises')
}

describe('ExercisesPage', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('renders header, filters, rows with thumbnail and pending approval', async () => {
    mockApi(() => ({ data: [baseExercise], total: 1, totalPages: 1 }))
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Ejercicios' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nuevo ejercicio/ })).toBeInTheDocument()
    expect(await screen.findByText('Press de banca')).toBeInTheDocument()
    expect(screen.getByText('1 ejercicios en el catálogo')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Buscar por nombre...')).toBeInTheDocument()
    expect(screen.getByText('Uso en entrenamientos')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Nombre/ })).toHaveAttribute('aria-sort', 'none')
    expect(screen.getByAltText('Miniatura de Press de banca')).toHaveAttribute('loading', 'lazy')
    expect(await screen.findByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 1')).toBeInTheDocument()
  })

  it('shows the error state and retries the same query', async () => {
    let fail = true
    mockApi(() => (fail ? Object.assign(new AxiosError('boom'), { response: { status: 404 } }) : { data: [baseExercise], total: 1, totalPages: 1 }))
    renderPage()

    expect(await screen.findByText('No se ha podido cargar el catálogo')).toBeInTheDocument()
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Press de banca')).toBeInTheDocument()
  })

  it('shows the empty catalog state with its create action', async () => {
    mockApi(() => ({ data: [], total: 0, totalPages: 1 }))
    renderPage()

    expect(await screen.findByText('Aún no hay ejercicios')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear primer ejercicio' })).toBeInTheDocument()
  })

  it('shows the filtered-empty message when a query has no results', async () => {
    mockApi((params) =>
      params?.search
        ? { data: [], total: 0, totalPages: 1 }
        : { data: [baseExercise], total: 1, totalPages: 1 },
    )
    renderPage()

    await screen.findByText('Press de banca')
    await userEvent.type(screen.getByPlaceholderText('Buscar por nombre...'), 'zzz')
    expect(
      await screen.findByText('No se encontraron ejercicios con la búsqueda y filtros actuales.'),
    ).toBeInTheDocument()
  })

  it('opens the detail dialog from the row menu', async () => {
    mockApi(() => ({ data: [baseExercise], total: 1, totalPages: 1 }))
    renderPage()
    const user = userEvent.setup()

    await screen.findByText('Press de banca')
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Ver detalle' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('reads page, sort and usage from the URL and writes them back with the same names', async () => {
    mockApi(() => ({ data: [baseExercise], total: 30, totalPages: 3 }))
    renderPage('/exercises?page=2&sort_by=name&sort_dir=desc&training_usage=used')
    const user = userEvent.setup()

    await screen.findByText('Press de banca')
    expect(listCalls()[0][1]).toMatchObject({
      params: { page: 2, limit: 10, training_usage: 'used', sort_by: 'name', sort_dir: 'desc' },
    })
    expect(screen.getByRole('columnheader', { name: /Nombre/ })).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Siguiente/ }))
    await waitFor(() => {
      const location = new URL(screen.getByTestId('location').textContent ?? '', 'http://x')
      expect(location.searchParams.get('page')).toBe('3')
      expect(location.searchParams.get('sort_by')).toBe('name')
      expect(location.searchParams.get('training_usage')).toBe('used')
    })

    await user.click(within(screen.getByRole('columnheader', { name: /Nivel/ })).getByRole('button'))
    await waitFor(() => {
      const location = new URL(screen.getByTestId('location').textContent ?? '', 'http://x')
      expect(location.searchParams.get('sort_by')).toBe('level')
      expect(location.searchParams.get('sort_dir')).toBe('desc')
      expect(location.searchParams.has('page')).toBe(false)
    })
  })
})
