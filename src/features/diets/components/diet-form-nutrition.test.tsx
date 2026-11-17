import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DietFormValues } from '../schemas'
import type { Diet } from '../types'
import { DietFormDialog } from './diet-form-dialog'
import { DietMealNutritionCheck, DietTotalsNutritionCheck } from './diet-nutrition-check'

vi.setConfig({ testTimeout: 15000 })

// Live nutrition comparison of the builder (RDS-F4-10): read-only sums next to the
// declared values, and the calculate buttons still writing exactly what they wrote before.

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
  nutritional_badges: [],
  order,
  ingredients: [mealIngredient(`${id}-i1`, ingredients[0], 80)],
  variants: [],
  ...extra,
})

const diet = {
  id: 'd-1',
  name: 'Definición A',
  tags: [],
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
  meals: [
    meal('m-1', 'BREAKFAST', 'Avena con fruta', 0, {
      variants: [
        meal('v-1', 'BREAKFAST', 'Yogur con avena', 0, {
          calories: 190,
          ingredients: [mealIngredient('v-1-i1', ingredients[0], 50)],
        }),
      ],
    }),
    meal('m-2', 'LUNCH', 'Pollo con arroz', 1, {
      ingredients: [
        mealIngredient('m-2-i1', ingredients[1], 200),
        mealIngredient('m-2-i2', ingredients[2], 1, 'bowl', 250),
      ],
    }),
    meal('m-3', 'DINNER', 'Cena ligera', 2, { calories: null, protein_g: null }),
  ],
} as unknown as Diet

function mockApi() {
  api.get.mockImplementation((url: string) => {
    if (url === '/diets/tags') return Promise.resolve(envelope({ tags: [] }))
    if (url === '/diets/nutritional-badges') {
      return Promise.resolve(envelope({ nutritional_badges: [] }))
    }
    if (url === '/ingredients') {
      return Promise.resolve(
        envelope({ data: ingredients, total: ingredients.length, totalPages: 1, page: 1, limit: 200 })
      )
    }
    return Promise.resolve(envelope([]))
  })
  api.put.mockResolvedValue(envelope({ ...diet }))
}

function renderDialog() {
  mockApi()
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={cache}>
      <DietFormDialog open onOpenChange={vi.fn()} diet={diet} />
    </QueryClientProvider>
  )
}

async function settled() {
  await screen.findByDisplayValue('Definición A')
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/ingredients', expect.anything()))
  await waitFor(() => expect(screen.queryByText('Ingrediente no encontrado')).toBeNull())
  await new Promise((resolve) => setTimeout(resolve, 20))
}

interface SavedMeal {
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  ingredients: { quantity: number }[]
  variants: SavedMeal[]
}
interface SavedDiet {
  total_calories?: number
  total_protein_g?: number
  total_carbs_g?: number
  total_fat_g?: number
  meals: SavedMeal[]
}

async function save(): Promise<SavedDiet> {
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1))
  return api.put.mock.calls[0][1] as SavedDiet
}

const macros = (m: SavedMeal | SavedDiet) =>
  'meals' in m && 'total_calories' in m
    ? [m.total_calories, m.total_protein_g, m.total_carbs_g, m.total_fat_g]
    : [(m as SavedMeal).calories, (m as SavedMeal).protein_g, (m as SavedMeal).carbs_g, (m as SavedMeal).fat_g]

const quantityInputs = () =>
  screen.getAllByText('Cantidad').map((label) => label.parentElement?.querySelector('input') as HTMLInputElement)

describe('Diet builder nutrition', () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset()
    Element.prototype.scrollTo = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('«Calcular desde ingredientes» writes the same values as before (meal and variant)', async () => {
    renderDialog()
    await settled()
    const buttons = screen.getAllByRole('button', { name: 'Calcular desde ingredientes' })
    // Order in the DOM: meal 1, its variant, meal 2, meal 3.
    fireEvent.click(buttons[1])
    fireEvent.click(buttons[2])
    const payload = await save()
    expect(macros(payload.meals[1])).toEqual([655, 68.8, 70, 8])
    expect(macros(payload.meals[0].variants[0])).toEqual([190, 6.5, 33, 3.5])
    // Untouched meals keep their declared values.
    expect(macros(payload.meals[0])).toEqual([450, 30, 50, 12])
  })

  it('«Calcular desde comidas» writes the same totals as before', async () => {
    renderDialog()
    await settled()
    fireEvent.click(screen.getByRole('button', { name: 'Calcular desde comidas' }))
    const payload = await save()
    expect(macros(payload)).toEqual([900, 60, 150, 36])
  })

  it('shows the kcal of each ingredient line', async () => {
    renderDialog()
    await settled()
    const rows = screen.getAllByText('Cantidad').map((label) => label.closest('[data-slot="ingredient-row"]') as HTMLElement)
    expect(rows.map((row) => row.querySelector('[data-slot="ingredient-kcal"]')?.textContent)).toEqual([
      '304 kcal',
      '190 kcal',
      '330 kcal',
      '325 kcal',
      '304 kcal',
    ])
  })

  it('updates the live sum and the difference without writing into the form', async () => {
    renderDialog()
    await settled()
    const checks = screen.getAllByRole('group', { name: /^Suma de ingredientes/ })
    // meal 1, variant, meal 2, meal 3
    expect(checks).toHaveLength(4)
    const lunch = checks[2]
    expect(within(lunch).getByText('655 kcal')).toBeInTheDocument()
    expect(within(lunch).getByText('+205 kcal')).toBeInTheDocument()
    expect(within(lunch).getByText('No cuadra')).toBeInTheDocument()

    fireEvent.change(quantityInputs()[2], { target: { value: '150' } })

    expect(within(lunch).getByText('573 kcal')).toBeInTheDocument()
    expect(within(lunch).getByText('+123 kcal')).toBeInTheDocument()
    expect(within(lunch).getByText('+23.3 g')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="ingredient-kcal"]')[2]).toHaveTextContent('248 kcal')

    // Meals without a declared value show «—» and are not flagged.
    const dinner = checks[3]
    expect(within(dinner).getAllByText('—').length).toBeGreaterThan(0)

    // The diet summary compares the sum of the declared meal values with the totals.
    const totals = screen.getByRole('group', { name: /^Suma de comidas/ })
    expect(within(totals).getByText('900 kcal')).toBeInTheDocument()
    expect(within(totals).getByText('−1100 kcal')).toBeInTheDocument()

    const payload = await save()
    expect(payload.meals[1].ingredients[0].quantity).toBe(150)
    expect(payload.meals.map(macros)).toEqual([
      [450, 30, 50, 12],
      [450, 30, 50, 12],
      [undefined, undefined, 50, 12],
    ])
    expect(macros(payload.meals[0].variants[0])).toEqual([190, 30, 50, 12])
    expect(macros(payload)).toEqual([2000, 150, 200, 60])
  })
})

// Leaf components on their own: they never modify the form.
function Harness({
  onForm,
  children,
}: {
  onForm: (form: UseFormReturn<DietFormValues>) => void
  children: (form: UseFormReturn<DietFormValues>) => React.ReactNode
}) {
  const form = useForm<DietFormValues>({
    defaultValues: {
      name: 'Dieta',
      tags: [],
      total_calories: 700,
      total_protein_g: null,
      total_carbs_g: 50,
      total_fat_g: 10,
      meals: [
        {
          type: 'LUNCH',
          name: 'Comida',
          image_url: null,
          image_upload_id: '',
          calories: 330,
          protein_g: 62,
          carbs_g: null,
          fat_g: 7,
          nutritional_badges: [],
          order: 0,
          ingredients: [{ ingredient_id: 'ing-2', quantity: 200, unit: 'g', grams_equivalent: 200 }],
          variants: [],
        },
      ],
    },
  })
  useEffect(() => {
    onForm(form)
  }, [form, onForm])
  return <>{children(form)}</>
}

describe('Nutrition checks are read-only', () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset()
  })

  it('leave the form values and dirty state untouched while recalculating', async () => {
    mockApi()
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    let form: UseFormReturn<DietFormValues> | null = null
    render(
      <QueryClientProvider client={cache}>
        <Harness onForm={(f) => (form = f)}>
          {(f) => (
            <>
              <DietTotalsNutritionCheck control={f.control} />
              <DietMealNutritionCheck control={f.control} path="meals.0" />
            </>
          )}
        </Harness>
      </QueryClientProvider>
    )
    const meal = await screen.findByRole('group', { name: /^Suma de ingredientes/ })
    // Computed and declared are both 330 kcal.
    await waitFor(() => expect(within(meal).getAllByText('330 kcal')).toHaveLength(2))
    expect(within(meal).getByText('Cuadra')).toBeInTheDocument()

    const current = form as unknown as UseFormReturn<DietFormValues>
    const before = structuredClone(current.getValues())
    act(() => {
      current.setValue('meals.0.ingredients.0.quantity', 100)
      current.setValue('meals.0.ingredients.0.grams_equivalent', 100)
    })
    await within(meal).findByText('165 kcal')
    expect(within(meal).getByText('−165 kcal')).toBeInTheDocument()
    expect(within(meal).getByText('No cuadra')).toBeInTheDocument()

    const after = current.getValues()
    const expected = structuredClone(before)
    expected.meals[0].ingredients[0].quantity = 100
    expected.meals[0].ingredients[0].grams_equivalent = 100
    expect(after).toEqual(expected)
    expect(current.formState.isDirty).toBe(false)

    const totals = screen.getByRole('group', { name: /^Suma de comidas/ })
    // total_protein_g is not declared: «—», no warning for that row.
    expect(within(totals).getByText('330 kcal')).toBeInTheDocument()
    expect(within(totals).getByText('−370 kcal')).toBeInTheDocument()
  })

  it('does not compare against zero when the meal has no calculable ingredients', async () => {
    mockApi()
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    let form: UseFormReturn<DietFormValues> | null = null
    render(
      <QueryClientProvider client={cache}>
        <Harness onForm={(f) => (form = f)}>
          {(f) => <DietMealNutritionCheck control={f.control} path="meals.0" />}
        </Harness>
      </QueryClientProvider>
    )
    const meal = await screen.findByRole('group', { name: /^Suma de ingredientes/ })
    await waitFor(() => expect(within(meal).getAllByText('330 kcal')).toHaveLength(2))

    const current = form as unknown as UseFormReturn<DietFormValues>
    act(() => {
      current.setValue('meals.0.ingredients', [])
    })

    await waitFor(() => expect(within(meal).queryByText('330 kcal')).toBeInTheDocument())
    expect(within(meal).getAllByText('330 kcal')).toHaveLength(1)
    expect(within(meal).queryByText('No cuadra')).toBeNull()
    expect(within(meal).queryByText('Cuadra')).toBeNull()
    expect(within(meal).queryByText('−330 kcal')).toBeNull()
  })
})
