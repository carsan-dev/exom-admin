import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DietsPage } from './diets-page'

// Characterization of the Diets list page DOM (list, groups, dialogs and the
// builder opened from it). The snapshots were recorded before extracting the view
// into components and must not change afterwards.

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

type Mode = 'data' | 'empty' | 'loading' | 'error' | 'paged'

const envelope = (data: unknown) => ({ data: { data } })

const ingredient = (id: string, name: string, kcal: number, p: number, c: number, f: number) => ({
  id,
  name,
  icon: null,
  calories_per_100g: kcal,
  protein_per_100g: p,
  carbs_per_100g: c,
  fat_per_100g: f,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
})
const ingredients = [
  ingredient('ing-1', 'Avena', 380, 13, 66, 7),
  ingredient('ing-2', 'Pechuga de pollo', 165, 31, 0, 3.6),
  ingredient('ing-3', 'Arroz', 130, 2.7, 28, 0.3),
]

const mealIngredient = (id: string, ing: (typeof ingredients)[number], quantity: number) => ({
  id,
  quantity,
  unit: 'g',
  grams_equivalent: quantity,
  ingredient: ing,
})

const meal = (
  id: string,
  type: string,
  name: string,
  order: number,
  extra: Record<string, unknown> = {}
) => ({
  id,
  type,
  name,
  image_url: null,
  calories: 450,
  protein_g: 30,
  carbs_g: 50,
  fat_g: 12,
  nutritional_badges: ['Fibra'],
  order,
  ingredients: [mealIngredient(`${id}-i1`, ingredients[0], 80)],
  variants: [],
  ...extra,
})

const diet = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  tags: ['Definición'],
  total_calories: 2000,
  total_protein_g: 150,
  total_carbs_g: 200,
  total_fat_g: 60,
  is_active: true,
  created_by: null,
  created_at: '2026-01-15T12:00:00Z',
  updated_at: '2026-01-15T12:00:00Z',
  group_id: null,
  group: null,
  meals_count: 2,
  meals: [
    meal('m-1', 'BREAKFAST', 'Avena con fruta', 0),
    meal('m-2', 'LUNCH', 'Pollo con arroz', 1),
  ],
  ...extra,
})

const fullDiet = diet('d-1', 'Definición A', {
  group_id: 'g-1',
  group: { id: 'g-1', name: 'Volumen' },
  meals: [
    meal('m-1', 'BREAKFAST', 'Avena con fruta', 0),
    meal('m-2', 'LUNCH', 'Pollo con arroz', 1, {
      ingredients: [
        mealIngredient('m-2-i1', ingredients[1], 200),
        mealIngredient('m-2-i2', ingredients[2], 150),
      ],
    }),
  ],
})

const groups = [
  {
    id: 'g-1',
    name: 'Volumen',
    item_count: 2,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

function page(data: unknown[], totalPages = 1, total = data.length, pageNumber = 1) {
  return envelope({ data, total, totalPages, page: pageNumber, limit: 10 })
}

interface Setup {
  mode?: Mode
  groupsList?: unknown[]
}

function mockApi({ mode = 'data', groupsList = groups }: Setup = {}) {
  api.get.mockImplementation((url: string, options?: { params?: Record<string, unknown> }) => {
    const pageNumber = Number(options?.params?.page ?? 1)
    if (url === '/diets') {
      if (mode === 'loading') return new Promise(() => undefined)
      if (mode === 'error') {
        return Promise.reject(Object.assign(new AxiosError('boom'), { response: { status: 404 } }))
      }
      if (mode === 'empty') return Promise.resolve(page([]))
      const rows = [
        diet('d-1', 'Definición A', {
          group_id: 'g-1',
          group: { id: 'g-1', name: 'Volumen' },
          tags: ['Definición', 'Cliente', 'Etapa 1'],
        }),
        diet('d-2', 'Volumen B', { total_calories: null, total_protein_g: null, tags: [] }),
        diet('d-3', 'Mantenimiento C', { meals_count: 5 }),
      ]
      if (mode === 'paged') return Promise.resolve(page(rows, 3, 25, pageNumber))
      return Promise.resolve(page(rows))
    }
    if (url === '/diets/tags') return Promise.resolve(envelope({ tags: ['Definición', 'Cliente'] }))
    if (url === '/diets/nutritional-badges') {
      return Promise.resolve(
        envelope({
          nutritional_badges: [
            { value: 'Fibra', color: '#7FB5D8' },
            { value: 'Vegano', color: '#E5BE58' },
          ],
        })
      )
    }
    if (url === '/diet-groups') return Promise.resolve(envelope(groupsList))
    if (url === '/ingredients') {
      return Promise.resolve(
        envelope({
          data: ingredients,
          total: ingredients.length,
          totalPages: 1,
          page: 1,
          limit: 200,
        })
      )
    }
    if (url === '/diets/d-1') return Promise.resolve(envelope(fullDiet))
    if (url.startsWith('/approval-requests/resource/diet/batch')) {
      return Promise.resolve(
        envelope([
          { resource_id: 'd-2', has_pending_approval: true, pending_approval_actions: ['DELETE'] },
        ])
      )
    }
    return Promise.resolve(envelope([]))
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
    .replace(/[«:]r[0-9a-z]+[»:]|_r_[0-9a-z]+_/g, 'ID')
    .replace(/Dnd(DescribedBy|LiveRegion)-\d+/g, 'Dnd$1-N')
    .replace(/></g, '>\n<')
}

function renderPage(entry = '/diets', setup: Setup = {}) {
  mockApi(setup)
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={cache}>
      <MemoryRouter initialEntries={[entry]}>
        <TooltipProvider>
          <DietsPage />
        </TooltipProvider>
        <Location />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const snap = (container: HTMLElement) => normalize(container.innerHTML)
const snapBody = () => normalize(document.body.innerHTML)

// Wait until the shared catalog queries behind the builder (tags, badges, ingredients)
// have settled so it renders its final content before the snapshot is taken.
async function settled() {
  await screen.findByText(/Solo se usan en admin para identificar dietas/)
  await waitFor(() => expect(screen.queryByText('Cargando etiquetas existentes...')).toBeNull())
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/ingredients', expect.anything()))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('DietsPage characterization', () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset()
    Element.prototype.scrollTo = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('lists diets with groups and the pending approval chip', async () => {
    const { container } = renderPage()
    await screen.findByText('Definición A')
    await screen.findByText('Pendiente')
    expect(snap(container)).toMatchSnapshot()
  })

  it('shows the loading skeleton', async () => {
    const { container } = renderPage('/diets', { mode: 'loading' })
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/diets', expect.anything()))
    expect(snap(container)).toMatchSnapshot()
  })

  it('shows the error card', async () => {
    const { container } = renderPage('/diets', { mode: 'error' })
    await screen.findByText('No se ha podido cargar el catálogo')
    expect(snap(container)).toMatchSnapshot()
  })

  it('shows the empty state without query', async () => {
    const { container } = renderPage('/diets', { mode: 'empty', groupsList: [] })
    await screen.findByText('Aún no hay dietas')
    expect(snap(container)).toMatchSnapshot()
  })

  it('shows the empty search result', async () => {
    const { container } = renderPage()
    await screen.findByText('Definición A')
    mockApi({ mode: 'empty' })
    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre...'), {
      target: { value: 'zzz' },
    })
    await screen.findByText('No se encontraron dietas con la búsqueda y filtros actuales.')
    expect(snap(container)).toMatchSnapshot()
  })

  it('paginates through the URL', async () => {
    const { container } = renderPage('/diets?page=2', { mode: 'paged' })
    await screen.findByText('Página 2 de 3')
    expect(snap(container)).toMatchSnapshot()
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }))
    await screen.findByText('Página 3 de 3')
    expect(screen.getByTestId('location')).toHaveTextContent('/diets?page=3')
    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }))
    await screen.findByText('Página 2 de 3')
    expect(screen.getByTestId('location')).toHaveTextContent('/diets?page=2')
  })

  it('filters by catalog group', async () => {
    const { container } = renderPage()
    await screen.findByText('Definición A')
    fireEvent.click(screen.getByRole('button', { name: 'Volumen' }))
    await screen.findByText('Dietas · Volumen')
    expect(snap(container)).toMatchSnapshot()
    fireEvent.click(screen.getByRole('button', { name: /Sin grupo\s*Filtrar o soltar aquí/ }))
    await screen.findByText('Dietas · Sin grupo')
    expect(snap(container)).toMatchSnapshot('ungrouped')
  })

  it('shows the move bar and the move dialog after selecting rows', async () => {
    const { container } = renderPage()
    await screen.findByText('Definición A')
    fireEvent.click(screen.getByLabelText('Seleccionar Definición A'))
    await screen.findByRole('button', { name: 'Mover a grupo (1)' })
    expect(snap(container)).toMatchSnapshot()
    await userEvent.click(screen.getByRole('button', { name: 'Mover a grupo (1)' }))
    await screen.findByRole('dialog')
    expect(snapBody()).toMatchSnapshot('move dialog')
  })

  it('opens the group create dialog', async () => {
    renderPage()
    await screen.findByText('Definición A')
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo grupo' }))
    await screen.findByRole('dialog')
    expect(snapBody()).toMatchSnapshot()
  })

  it('opens the AI prompt dialog', async () => {
    renderPage()
    await screen.findByText('Definición A')
    await userEvent.click(screen.getByRole('button', { name: 'Ver instrucciones de importación' }))
    await screen.findByText('Prompt para generar JSON compatible')
    await screen.findByText(/incluirá 3 ingredientes cargados/)
    expect(snapBody()).toMatchSnapshot()
  })

  it('opens the builder from the header (create)', async () => {
    renderPage()
    await screen.findByText('Definición A')
    await userEvent.click(screen.getByRole('button', { name: 'Nueva dieta' }))
    await screen.findByRole('dialog')
    await screen.findByText('Rellena los datos de la nueva dieta.')
    await settled()
    expect(snapBody()).toMatchSnapshot()
  })

  it('opens the builder from the empty state', async () => {
    renderPage('/diets', { mode: 'empty', groupsList: [] })
    await userEvent.click(await screen.findByRole('button', { name: 'Crear primera dieta' }))
    await screen.findByRole('dialog')
    await screen.findByText('Rellena los datos de la nueva dieta.')
    await settled()
    expect(snapBody()).toMatchSnapshot()
  })

  it('imports a JSON file into the builder with unlinked ingredient warnings', async () => {
    const { container } = renderPage()
    await screen.findByText('Definición A')
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }))
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/ingredients', expect.anything()))
    await new Promise((resolve) => setTimeout(resolve, 20))
    const source = JSON.stringify({
      name: 'Importada',
      tags: ['Interna'],
      total_calories: 2000,
      meals: [
        {
          type: 'BREAKFAST',
          name: 'Desayuno importado',
          calories: 400,
          protein_g: 20,
          carbs_g: 50,
          fat_g: 10,
          nutritional_badges: ['Fibra'],
          ingredients: [
            { ingredient_name: 'Avena', quantity: 80, unit: 'g', grams_equivalent: 80 },
            {
              ingredient_name: 'Ingrediente desconocido',
              quantity: 50,
              unit: 'g',
              grams_equivalent: 50,
            },
          ],
          variants: [],
        },
      ],
    })
    const file = new File([source], 'diet.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(source) })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await screen.findByText('Importar dieta', { selector: 'h2' })
    await screen.findByText('Revisa ingredientes no enlazados')
    await settled()
    expect(snapBody()).toMatchSnapshot()
  })

  it('opens the detail dialog from the row menu', async () => {
    renderPage()
    await screen.findByText('Definición A')
    const user = userEvent.setup()
    const row = screen.getByText('Definición A').closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Abrir menú' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Ver detalle' }))
    await screen.findByRole('dialog')
    await screen.findAllByText('Pollo con arroz')
    expect(snapBody()).toMatchSnapshot('detail')
  })

  it('opens the delete dialog from the row menu', async () => {
    renderPage()
    await screen.findByText('Definición A')
    const user = userEvent.setup()
    const row = screen.getByText('Volumen B').closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Abrir menú' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Eliminar' }))
    await screen.findByRole('dialog')
    expect(snapBody()).toMatchSnapshot('delete')
  })

  it('opens the edit builder from the row menu', async () => {
    renderPage()
    await screen.findByText('Definición A')
    const user = userEvent.setup()
    const row = screen.getByText('Definición A').closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Abrir menú' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }))
    await screen.findByText('Modifica los campos y guarda los cambios.')
    await screen.findAllByDisplayValue('Definición A')
    await settled()
    expect(snapBody()).toMatchSnapshot('edit')
  })

  it('opens the duplicate builder from the row menu', async () => {
    renderPage()
    await screen.findByText('Definición A')
    const user = userEvent.setup()
    const row = screen.getByText('Definición A').closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Abrir menú' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Duplicar' }))
    await screen.findByText(/Se copiará el contenido/)
    await screen.findAllByDisplayValue('Definición A (copia)')
    await settled()
    expect(snapBody()).toMatchSnapshot('duplicate')
  })
})
