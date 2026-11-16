import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Diet } from '../types'
import { DietFormDialog } from './diet-form-dialog'

// P7 (RDS-F4-11): drag and drop reordering of the meals in the diet builder, driven here
// with dnd-kit's keyboard sensor. The real pointer and touch drag is verified in a browser.

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

const ingredient = (id: string, name: string, kcal: number) => ({
  id,
  name,
  icon: null,
  calories_per_100g: kcal,
  protein_per_100g: 10,
  carbs_per_100g: 20,
  fat_per_100g: 5,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
})
const ingredients = [ingredient('ing-1', 'Avena', 380), ingredient('ing-2', 'Pollo', 165)]

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
  calories: 100 + order,
  protein_g: 10 + order,
  carbs_g: 20,
  fat_g: 5,
  nutritional_badges: [],
  order,
  ingredients: [
    {
      id: `${id}-i1`,
      quantity: 80 + order,
      unit: 'g',
      grams_equivalent: 80 + order,
      ingredient: ingredients[order % 2],
    },
  ],
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
    meal('m-1', 'BREAKFAST', 'Avena con fruta', 0),
    meal('m-2', 'LUNCH', 'Pollo con arroz', 1, {
      image_url: 'https://cdn.example.com/diets/meals/pollo.webp',
    }),
    meal('m-3', 'DINNER', 'Cena ligera', 2),
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
        envelope({ data: ingredients, total: 2, totalPages: 1, page: 1, limit: 200 })
      )
    }
    return Promise.resolve(envelope([]))
  })
  api.put.mockResolvedValue(envelope(diet))
}

async function renderBuilder() {
  mockApi()
  const onOpenChange = vi.fn()
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={cache}>
      <DietFormDialog open onOpenChange={onOpenChange} diet={diet} />
    </QueryClientProvider>
  )
  await screen.findByDisplayValue('Definición A')
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/ingredients', expect.anything()))
  await waitFor(() => expect(screen.queryByText('Ingrediente no encontrado')).toBeNull())
  await new Promise((resolve) => setTimeout(resolve, 20))
  return { onOpenChange }
}

// jsdom has no layout: give every sortable row a 100px-tall rect from its position.
function mockRowRects() {
  const original = Element.prototype.getBoundingClientRect
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: Element
  ) {
    if (!this.hasAttribute('data-sortable-item')) return original.call(this)
    const siblings = Array.from(this.parentElement?.children ?? []).filter((node) =>
      node.hasAttribute('data-sortable-item')
    )
    const top = siblings.indexOf(this) * 100
    return {
      x: 0,
      y: top,
      top,
      left: 0,
      width: 600,
      height: 100,
      right: 600,
      bottom: top + 100,
      toJSON: () => ({}),
    } as DOMRect
  })
}

const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

async function press(target: Element, code: string, key = code) {
  await act(async () => {
    fireEvent.keyDown(target, { code, key })
  })
  // The keyboard sensor attaches its document listener in a timeout after pick-up.
  await tick()
}

/** Keyboard drag from the handle: Space picks up, arrows move, Space drops. */
async function keyboardDrag(handleName: string, moves: ('ArrowDown' | 'ArrowUp')[]) {
  const handle = screen.getByRole('button', { name: handleName })
  handle.focus()
  await press(handle, 'Space', ' ')
  for (const move of moves) await press(handle, move)
  await press(handle, 'Space', ' ')
}

const handleOrder = () =>
  screen
    .getAllByRole('button', { name: /^Reordenar comida / })
    .map((button) => button.getAttribute('aria-label'))

const mealNames = () =>
  screen
    .getAllByPlaceholderText('Nombre de la comida')
    .map((input) => (input as HTMLInputElement).value)

// Declared kcal of each meal, in DOM order (meal cards only, not the diet totals).
const mealKcal = () =>
  Array.from(document.querySelectorAll('[data-sortable-item]')).map(
    (row) =>
      (
        Array.from(row.querySelectorAll('label'))
          .find((label) => label.textContent === 'Kcal')
          ?.parentElement?.querySelector('input') as HTMLInputElement
      ).value
  )

async function savedPayload() {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await waitFor(() => expect(api.put).toHaveBeenCalled())
  return api.put.mock.calls[0][1]
}

describe('Diet meals drag and drop reordering (P7)', () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset()
    Element.prototype.scrollTo = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
    mockRowRects()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders a labelled handle per meal, keeping the arrows', async () => {
    await renderBuilder()
    expect(handleOrder()).toEqual([
      'Reordenar comida Avena con fruta',
      'Reordenar comida Pollo con arroz',
      'Reordenar comida Cena ligera',
    ])
    const handle = screen.getByRole('button', { name: 'Reordenar comida Avena con fruta' })
    // Only the handle blocks native touch gestures; the meal keeps touch scrolling.
    expect(handle.style.touchAction).toBe('none')
    expect((handle.closest('[data-sortable-item]') as HTMLElement).style.touchAction).toBe('')
    expect(screen.getByRole('button', { name: 'Bajar comida Avena con fruta' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Subir comida Cena ligera' })).toBeTruthy()
  })

  it('moves a meal down with the keyboard sensor exactly like the down arrow', async () => {
    await renderBuilder()
    await keyboardDrag('Reordenar comida Avena con fruta', ['ArrowDown'])
    expect(mealNames()).toEqual(['Pollo con arroz', 'Avena con fruta', 'Cena ligera'])
    const dragged = await savedPayload()
    cleanup()
    api.put.mockReset()

    await renderBuilder()
    fireEvent.click(screen.getByRole('button', { name: 'Bajar comida Avena con fruta' }))
    const arrowed = await savedPayload()

    expect(dragged).toEqual(arrowed)
    expect(dragged.meals.map((m: { order: number }) => m.order)).toEqual([0, 1, 2])
    expect(dragged.meals.map((m: { name: string }) => m.name)).toEqual([
      'Pollo con arroz',
      'Avena con fruta',
      'Cena ligera',
    ])
  })

  it('moves a meal across several positions like repeated arrows', async () => {
    await renderBuilder()
    await keyboardDrag('Reordenar comida Avena con fruta', ['ArrowDown', 'ArrowDown'])
    expect(mealNames()).toEqual(['Pollo con arroz', 'Cena ligera', 'Avena con fruta'])
    const dragged = await savedPayload()
    cleanup()
    api.put.mockReset()

    await renderBuilder()
    fireEvent.click(screen.getByRole('button', { name: 'Bajar comida Avena con fruta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bajar comida Avena con fruta' }))
    expect(dragged).toEqual(await savedPayload())
  }, 15000)

  it('cancels with Escape without moving anything or closing the builder', async () => {
    const { onOpenChange } = await renderBuilder()
    const handle = screen.getByRole('button', { name: 'Reordenar comida Avena con fruta' })
    handle.focus()
    await press(handle, 'Space', ' ')
    await press(handle, 'ArrowDown')
    await press(handle, 'Escape')
    expect(mealNames()).toEqual(['Avena con fruta', 'Pollo con arroz', 'Cena ligera'])
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('keeps the arrows working after a drag', async () => {
    await renderBuilder()
    await keyboardDrag('Reordenar comida Avena con fruta', ['ArrowDown'])
    fireEvent.click(screen.getByRole('button', { name: 'Subir comida Cena ligera' }))
    expect(mealNames()).toEqual(['Pollo con arroz', 'Cena ligera', 'Avena con fruta'])
    fireEvent.click(screen.getByRole('button', { name: 'Bajar comida Pollo con arroz' }))
    expect(mealNames()).toEqual(['Cena ligera', 'Pollo con arroz', 'Avena con fruta'])
    const up = screen.getByRole('button', { name: 'Subir comida Cena ligera' })
    expect((up as HTMLButtonElement).disabled).toBe(true)
  })

  it('moves fields, ingredients and image with the meal', async () => {
    await renderBuilder()
    expect(mealKcal()).toEqual(['100', '101', '102'])
    await keyboardDrag('Reordenar comida Pollo con arroz', ['ArrowUp'])
    expect(mealNames()).toEqual(['Pollo con arroz', 'Avena con fruta', 'Cena ligera'])
    expect(mealKcal()).toEqual(['101', '100', '102'])
    const payload = await savedPayload()
    const [first, second] = payload.meals
    expect(first).toMatchObject({
      name: 'Pollo con arroz',
      type: 'LUNCH',
      calories: 101,
      image_url: 'https://cdn.example.com/diets/meals/pollo.webp',
      order: 0,
    })
    expect(first.ingredients).toEqual([
      expect.objectContaining({ ingredient_id: 'ing-2', quantity: 81 }),
    ])
    expect(second).toMatchObject({
      name: 'Avena con fruta',
      calories: 100,
      order: 1,
    })
    expect(second.image_url ?? null).toBeNull()
    expect(second.ingredients).toEqual([
      expect.objectContaining({ ingredient_id: 'ing-1', quantity: 80 }),
    ])
  })

  it('disables the handles while a meal image is uploading', async () => {
    await renderBuilder()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['x'], 'comida.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })
    await screen.findByRole('button', { name: 'Subiendo imagen...' })
    for (const handle of screen.getAllByRole('button', { name: /^Reordenar comida / })) {
      expect(handle).toBeDisabled()
    }
    // Even if a key event reaches a handle, nothing is picked up while busy.
    await keyboardDrag('Reordenar comida Avena con fruta', ['ArrowDown'])
    expect(mealNames()).toEqual(['Avena con fruta', 'Pollo con arroz', 'Cena ligera'])
  })
})
