import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DietFormValues } from '../schemas'
import type { Diet } from '../types'
import { DietFormDialog } from './diet-form-dialog'

// Characterization of the diet builder DOM. The snapshots were recorded before
// extracting the view into components and must not change afterwards.

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
// A compression that never settles keeps the image field in its "uploading" state.
vi.mock('browser-image-compression', () => ({
  default: vi.fn(() => new Promise(() => undefined)),
}))

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

const mealIngredient = (
  id: string,
  ing: (typeof ingredients)[number],
  quantity: number,
  unit = 'g',
  grams: number | null = quantity
) => ({ id, quantity, unit, grams_equivalent: grams, ingredient: ing })

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

const baseDiet = {
  id: 'd-1',
  name: 'Definición A',
  tags: ['Definición', 'Cliente'],
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
}

const withMeals = {
  ...baseDiet,
  meals: [
    meal('m-1', 'BREAKFAST', 'Avena con fruta', 0),
    meal('m-2', 'LUNCH', 'Pollo con arroz', 1, {
      image_url: 'https://cdn.example.com/diets/meals/pollo.webp',
      ingredients: [
        mealIngredient('m-2-i1', ingredients[1], 200),
        mealIngredient('m-2-i2', ingredients[2], 1, 'bowl', 250),
      ],
    }),
    meal('m-3', 'DINNER', 'Cena ligera', 2, {
      calories: null,
      protein_g: null,
      nutritional_badges: [],
    }),
  ],
} as unknown as Diet

const withVariants = {
  ...baseDiet,
  meals: [
    meal('m-1', 'BREAKFAST', 'Avena con fruta', 0, {
      variants: [
        meal('v-1', 'BREAKFAST', 'Tostada proteica', 0, {
          calories: 280,
          ingredients: [mealIngredient('v-1-i1', ingredients[2], 100)],
        }),
        meal('v-2', 'BREAKFAST', 'Yogur con avena', 1, {
          nutritional_badges: [],
          ingredients: [mealIngredient('v-2-i1', ingredients[0], 50)],
        }),
      ],
    }),
    meal('m-2', 'LUNCH', 'Pollo con arroz', 1),
  ],
} as unknown as Diet

const imported: DietFormValues = {
  name: 'Importada',
  tags: ['Interna'],
  total_calories: 2000,
  total_protein_g: null,
  total_carbs_g: null,
  total_fat_g: null,
  meals: [
    {
      type: 'BREAKFAST',
      name: 'Desayuno importado',
      image_url: null,
      image_upload_id: '',
      calories: 400,
      protein_g: 20,
      carbs_g: 50,
      fat_g: 10,
      nutritional_badges: ['Fibra'],
      order: 0,
      ingredients: [
        { ingredient_id: 'ing-1', quantity: 80, unit: 'g', grams_equivalent: 80 },
        { ingredient_id: '', quantity: 50, unit: 'g', grams_equivalent: 50 },
      ],
      variants: [],
    },
  ],
}

function mockApi() {
  api.get.mockImplementation((url: string) => {
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
    return Promise.resolve(envelope([]))
  })
}

function normalize(html: string) {
  return html
    .replace(/radix-[^"\s]*/g, 'radix-ID')
    .replace(/ style="(animation-duration: 0s;)?"/g, '')
    .replace(/[«:]r[0-9a-z]+[»:]|_r_[0-9a-z]+_/g, 'ID')
    .replace(/Dnd(DescribedBy|LiveRegion)-\d+/g, 'Dnd$1-N')
    .replace(/></g, '>\n<')
}
const snapBody = () => normalize(document.body.innerHTML)

interface Props {
  diet?: Diet | null
  isDuplicate?: boolean
  importedValues?: DietFormValues | null
  importIssues?: string[]
}

function renderDialog(props: Props = {}) {
  mockApi()
  const onOpenChange = vi.fn()
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(
    <QueryClientProvider client={cache}>
      <DietFormDialog open onOpenChange={onOpenChange} {...props} />
    </QueryClientProvider>
  )
  return { ...view, onOpenChange }
}

// Wait until the catalog queries behind the builder (tags, badges, ingredients) have settled.
async function settled(expectUnlinked = false) {
  await screen.findByText(/Solo se usan en admin para identificar dietas/)
  await waitFor(() => expect(screen.queryByText('Cargando etiquetas existentes...')).toBeNull())
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/ingredients', expect.anything()))
  if (!expectUnlinked) {
    await waitFor(() => expect(screen.queryByText('Ingrediente no encontrado')).toBeNull())
  }
  await new Promise((resolve) => setTimeout(resolve, 20))
}

function arrowButtons(direction: 'up' | 'down') {
  return Array.from(
    document.querySelectorAll(`div.flex-col.gap-0\\.5 > button > svg.lucide-chevron-${direction}`)
  ).map((icon) => icon.closest('button') as HTMLButtonElement)
}

describe('DietFormDialog characterization', () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset()
    Element.prototype.scrollTo = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('create (empty)', async () => {
    renderDialog()
    await settled()
    expect(snapBody()).toMatchSnapshot()
  })

  it('create with the ingredient picker open and filtered', async () => {
    renderDialog()
    await settled()
    await userEvent.click(screen.getByRole('button', { name: 'Agregar ingrediente' }))
    await screen.findByText('Pechuga de pollo')
    expect(snapBody()).toMatchSnapshot('picker open')
    fireEvent.change(screen.getByPlaceholderText('Buscar ingrediente...'), {
      target: { value: 'zzz' },
    })
    await screen.findByText('Sin resultados para "zzz"')
    expect(snapBody()).toMatchSnapshot('picker no results')
    fireEvent.change(screen.getByPlaceholderText('Buscar ingrediente...'), {
      target: { value: 'pollo' },
    })
    await userEvent.click(await screen.findByText('Pechuga de pollo'))
    await screen.findByText('1 ingrediente')
    expect(snapBody()).toMatchSnapshot('ingredient added')
    await userEvent.click(screen.getByRole('button', { name: /Agregar comida/ }))
    await screen.findByText('Comidas (2)')
    expect(snapBody()).toMatchSnapshot('meal added')
    await userEvent.click(screen.getAllByRole('button', { name: /Añadir variante/ })[0])
    await screen.findByPlaceholderText('Nombre de la variante')
    expect(snapBody()).toMatchSnapshot('variant added')
  })

  it('edit with several meals and ingredients, and reordering with the arrows', async () => {
    renderDialog({ diet: withMeals })
    await settled()
    await screen.findByDisplayValue('Definición A')
    expect(snapBody()).toMatchSnapshot()
    fireEvent.click(arrowButtons('down')[0])
    expect(snapBody()).toMatchSnapshot('moved first down')
    fireEvent.click(arrowButtons('up')[2])
    expect(snapBody()).toMatchSnapshot('moved last up')
  })

  it('edit with variants', async () => {
    renderDialog({ diet: withVariants })
    await settled()
    await screen.findByDisplayValue('Tostada proteica')
    expect(snapBody()).toMatchSnapshot()
  })

  it('recalculates macros from ingredients (meal, variant and diet totals)', async () => {
    renderDialog({ diet: withVariants })
    await settled()
    await screen.findByDisplayValue('Tostada proteica')
    const buttons = screen.getAllByRole('button', { name: 'Calcular desde ingredientes' })
    fireEvent.click(buttons[0])
    expect(snapBody()).toMatchSnapshot('meal calculated')
    fireEvent.click(buttons[1])
    fireEvent.click(buttons[2])
    fireEvent.click(buttons[3])
    expect(snapBody()).toMatchSnapshot('all calculated')
    fireEvent.click(screen.getByRole('button', { name: 'Calcular desde comidas' }))
    expect(snapBody()).toMatchSnapshot('totals calculated')
  })

  it('disables the form while a meal image is uploading', async () => {
    renderDialog({ diet: withMeals })
    await settled()
    await screen.findByDisplayValue('Definición A')
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['x'], 'comida.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })
    await screen.findByText(/Espera a que termine la subida de la imagen para seguir editando/)
    await screen.findByRole('button', { name: 'Subiendo imagen...' })
    expect(document.querySelector('fieldset')).toBeDisabled()
    expect(snapBody()).toMatchSnapshot()
  })

  it('duplicate', async () => {
    renderDialog({ diet: withVariants, isDuplicate: true })
    await settled()
    await screen.findByDisplayValue('Definición A (copia)')
    expect(snapBody()).toMatchSnapshot()
  })

  it('import with warnings', async () => {
    renderDialog({
      importedValues: imported,
      importIssues: ['No se encontró el ingrediente "Ingrediente desconocido"'],
    })
    await settled(true)
    await screen.findByText('Revisa ingredientes no enlazados')
    expect(snapBody()).toMatchSnapshot()
  })

  it('shows validation errors on submit and cancels', async () => {
    const { onOpenChange } = renderDialog()
    await settled()
    await userEvent.click(screen.getByRole('button', { name: 'Crear dieta' }))
    await screen.findAllByText('El nombre es obligatorio')
    await screen.findByText('Agrega al menos un ingrediente')
    expect(snapBody()).toMatchSnapshot()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows validation errors inside a built meal', async () => {
    renderDialog({ diet: withMeals })
    await settled()
    const names = screen.getAllByPlaceholderText('Nombre de la comida')
    fireEvent.change(names[0], { target: { value: '' } })
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findAllByText('El nombre es obligatorio')
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getAllByText('El nombre es obligatorio').length).toBeGreaterThan(0)
    expect(snapBody()).toMatchSnapshot()
  })
})
