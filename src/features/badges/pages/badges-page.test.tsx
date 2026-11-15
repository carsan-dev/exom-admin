import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BadgesPage } from './badges-page'

const get = vi.fn()
const post = vi.fn()
const patch = vi.fn()
const del = vi.fn()
vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))

const catalogPayloads: Record<string, unknown> = {
  '/exercises/muscle-groups': { muscle_groups: ['Pecho', 'Espalda', 'Piernas'] },
  '/exercises/equipment': { equipment: ['Mancuernas', 'Barra'] },
  '/trainings/types': {
    types: [
      { value: 'Fuerza', color: '#FF0000' },
      { value: 'Cardio', color: '#00FF00' },
    ],
  },
  '/trainings/tags': { tags: ['Principiante'] },
  '/diets/tags': { tags: ['Vegana'] },
  '/diets/nutritional-badges': { nutritional_badges: [{ value: 'Alto en proteína', color: '#0000FF' }] },
}

function mockCatalogs(override?: (url: string) => unknown) {
  get.mockImplementation(async (url: string) => {
    const overridden = override?.(url)
    if (overridden instanceof Error) throw overridden
    if (overridden !== undefined) return overridden
    return { data: { data: catalogPayloads[url] ?? {} } }
  })
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <BadgesPage />
    </QueryClientProvider>,
  )
}

const tabNames = [
  'Grupos musculares',
  'Equipamiento',
  'Tipos entrenos',
  'Tags entrenos',
  'Badges dieta',
  'Tags dieta',
]

describe('BadgesPage', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    patch.mockReset()
    del.mockReset()
  })

  it('renders the header and the six catalog tabs with the first one active', async () => {
    mockCatalogs()
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Etiquetas' })).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(tabNames)
    expect(screen.getByRole('tab', { name: 'Grupos musculares' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByPlaceholderText('Buscar en grupos musculares...')).toBeInTheDocument()
    expect(await screen.findByText('Pecho')).toBeInTheDocument()
  })

  it('shows the loading state while the catalog is pending', () => {
    get.mockImplementation(() => new Promise(() => undefined))
    renderPage()

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText('Badges usados en ejercicios.')).not.toBeInTheDocument()
    expect(screen.queryByText('No se ha podido cargar el catálogo')).not.toBeInTheDocument()
  })

  it('shows the error state and retries', async () => {
    let fail = true
    mockCatalogs((url) =>
      url === '/exercises/muscle-groups' && fail
        ? Object.assign(new AxiosError('boom'), { response: { status: 404 } })
        : undefined,
    )
    renderPage()

    expect(await screen.findByText('No se ha podido cargar el catálogo')).toBeInTheDocument()
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Pecho')).toBeInTheDocument()
  })

  it('lists the values of the active catalog with title, counter and pagination', async () => {
    mockCatalogs()
    renderPage()

    const table = await screen.findByRole('table')
    expect(screen.getByText('Badges usados en ejercicios.')).toBeInTheDocument()
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(4)
    expect(within(table).getByText('Espalda')).toBeInTheDocument()
    expect(within(table).getByText('Piernas')).toBeInTheDocument()
    expect(within(table).getAllByText('Ejercicios')).toHaveLength(3)
    expect(screen.getByText('Página 1 de 1')).toBeInTheDocument()
    expect(screen.getByText('0 seleccionados')).toBeInTheDocument()
  })

  it('switches tabs and shows the colored values of training types', async () => {
    mockCatalogs()
    renderPage()
    const user = userEvent.setup()
    await screen.findByText('Pecho')

    await user.click(screen.getByRole('tab', { name: 'Tipos entrenos' }))

    expect(screen.getByRole('tab', { name: 'Tipos entrenos' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('Fuerza')).toBeInTheDocument()
    expect(screen.getByText('#FF0000')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Color' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Buscar en tipos de entrenamientos...')).toBeInTheDocument()
    expect(screen.queryByText('Pecho')).not.toBeInTheDocument()
  })

  it('selects rows, updates the counter and opens the bulk delete dialog', async () => {
    mockCatalogs()
    post.mockResolvedValue({ data: { data: { values: ['Pecho', 'Piernas'], affected_count: 2 } } })
    renderPage()
    const user = userEvent.setup()
    await screen.findByText('Pecho')

    const bulkButton = screen.getByRole('button', { name: /Eliminar seleccionados \(0\)/ })
    expect(bulkButton).toBeDisabled()

    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar Pecho' }))
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar Piernas' }))
    expect(screen.getByText('2 seleccionados')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Eliminar seleccionados \(2\)/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Eliminar 2 valores')).toBeInTheDocument()
    expect(within(dialog).getByText(/Se quitarán de todos los ejercicios activos/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Eliminar selección' }))
    expect(post).toHaveBeenCalledWith('/exercises/muscle-groups/delete-batch', { values: ['Pecho', 'Piernas'] })
  })

  it('selects all filtered values with the header checkbox', async () => {
    mockCatalogs()
    renderPage()
    const user = userEvent.setup()
    await screen.findByText('Pecho')

    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar todos los resultados filtrados' }))
    expect(screen.getByText('3 seleccionados')).toBeInTheDocument()
  })

  it('opens the edit dialog with the current value and the color controls when supported', async () => {
    mockCatalogs()
    renderPage()
    const user = userEvent.setup()
    await screen.findByText('Pecho')

    await user.click(screen.getByRole('button', { name: 'Editar Pecho' }))
    let dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Editar valor')).toBeInTheDocument()
    expect(within(dialog).getByDisplayValue('Pecho')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Color')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Guardar' })).toBeDisabled()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Tipos entrenos' }))
    await user.click(await screen.findByRole('button', { name: 'Editar Fuerza' }))
    dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Color')).toBeInTheDocument()
    expect(within(dialog).getByDisplayValue('#FF0000')).toBeInTheDocument()
  })

  it('opens the single delete dialog for a row', async () => {
    mockCatalogs()
    renderPage()
    const user = userEvent.setup()
    await screen.findByText('Pecho')

    await user.click(screen.getByRole('button', { name: 'Borrar Pecho' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Borrar valor')).toBeInTheDocument()
    expect(within(dialog).getByText(/Borrar "Pecho" de/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Borrar' })).toBeEnabled()
  })
})
