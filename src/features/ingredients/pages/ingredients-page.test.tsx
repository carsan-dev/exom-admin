import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { IngredientsPage } from './ingredients-page'
import type { Ingredient } from '../types'

const get = vi.fn()
vi.mock('@/lib/api', () => ({ api: { get: (...args: unknown[]) => get(...args) } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))

const arroz: Ingredient = {
  id: 'ingredient-1',
  name: 'Arroz integral',
  icon: '🍚',
  calories_per_100g: 360,
  protein_per_100g: 7.5,
  carbs_per_100g: 76,
  fat_per_100g: 2.7,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-03T00:00:00Z',
}

interface ListPayload {
  data: Ingredient[]
  total: number
  totalPages: number
}

function mockApi(list: (params?: { search?: string }) => ListPayload | Error) {
  get.mockImplementation(async (url: string, config?: { params?: { search?: string } }) => {
    if (url === '/ingredients') {
      const result = list(config?.params)
      if (result instanceof Error) throw result
      return { data: { data: { ...result, page: 1, limit: 10 } } }
    }
    if (url === '/approval-requests/resource/ingredient/batch') {
      return { data: { data: [{ resource_id: 'ingredient-1', pending_approval_actions: ['UPDATE'] }] } }
    }
    return { data: { data: {} } }
  })
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

function renderPage(initialEntry = '/ingredients') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <IngredientsPage />
          <LocationProbe />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

describe('IngredientsPage', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('renders header, filters, row, macros, pending approval and page label', async () => {
    mockApi(() => ({ data: [arroz], total: 1, totalPages: 1 }))
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Ingredientes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nuevo ingrediente/ })).toBeInTheDocument()
    expect(await screen.findByText('Arroz integral')).toBeInTheDocument()
    expect(screen.getByText('1 ingredientes en el catálogo')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Buscar por nombre...')).toBeInTheDocument()
    expect(screen.getByText('360')).toBeInTheDocument()
    expect(screen.getByText(/P 7\.5 g · C 76 g · G 2\.7 g/)).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Nombre/ })).toHaveAttribute('aria-sort', 'none')
    expect(await screen.findByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 1')).toBeInTheDocument()
  })

  it('shows the error state and retries', async () => {
    let fail = true
    mockApi(() =>
      fail
        ? Object.assign(new AxiosError('boom'), { response: { status: 404 } })
        : { data: [arroz], total: 1, totalPages: 1 },
    )
    renderPage()

    expect(await screen.findByText('No se ha podido cargar el catálogo')).toBeInTheDocument()
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Arroz integral')).toBeInTheDocument()
  })

  it('shows the empty catalog state with its create action', async () => {
    mockApi(() => ({ data: [], total: 0, totalPages: 1 }))
    renderPage()
    expect(await screen.findByText('Aún no hay ingredientes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear primer ingrediente' })).toBeInTheDocument()
  })

  it('shows the filtered-empty message when a search has no results', async () => {
    mockApi((params) =>
      params?.search
        ? { data: [], total: 0, totalPages: 1 }
        : { data: [arroz], total: 1, totalPages: 1 },
    )
    renderPage()
    await screen.findByText('Arroz integral')
    await userEvent.type(screen.getByPlaceholderText('Buscar por nombre...'), 'zzz')
    expect(
      await screen.findByText('No se encontraron ingredientes con la búsqueda y filtros actuales.'),
    ).toBeInTheDocument()
  })

  it('reads page and sort from the URL and writes them back with the same names', async () => {
    mockApi(() => ({ data: [arroz], total: 30, totalPages: 3 }))
    renderPage('/ingredients?page=2&sort_by=name&sort_dir=desc')
    const user = userEvent.setup()

    await screen.findByText('Arroz integral')
    const firstCall = get.mock.calls.find(([url]) => url === '/ingredients')
    expect(firstCall?.[1]).toMatchObject({
      params: { page: 2, limit: 10, sort_by: 'name', sort_dir: 'desc' },
    })
    expect(screen.getByRole('columnheader', { name: /Nombre/ })).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Siguiente/ }))
    await waitFor(() => {
      const location = new URL(screen.getByTestId('location').textContent ?? '', 'http://x')
      expect(location.searchParams.get('page')).toBe('3')
      expect(location.searchParams.get('sort_by')).toBe('name')
    })

    await user.click(within(screen.getByRole('columnheader', { name: /kcal\/100g/ })).getByRole('button'))
    await waitFor(() => {
      const location = new URL(screen.getByTestId('location').textContent ?? '', 'http://x')
      expect(location.searchParams.get('sort_by')).toBe('calories_per_100g')
      expect(location.searchParams.get('sort_dir')).toBe('desc')
      expect(location.searchParams.has('page')).toBe(false)
    })
  })
})
