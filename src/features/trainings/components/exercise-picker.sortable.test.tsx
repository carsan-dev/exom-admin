import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Training } from '../types'
import { TrainingFormDialog } from './training-form-dialog'

// P7 (RDS-F4-11): drag and drop reordering in the training builder, driven here with
// dnd-kit's keyboard sensor. The real pointer and touch drag is verified in a browser.

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

const exercise = (id: string, name: string) => ({
  id,
  name,
  muscle_groups: ['Piernas'],
  equipment: [],
  level: 'PRINCIPIANTE',
  video_url: null,
  video_stream_id: null,
  thumbnail_url: null,
  technique_text: null,
  common_errors_text: null,
  explanation_text: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  training_usage_count: 0,
  is_used_in_training: false,
})
const exercises = [
  exercise('ex-1', 'Sentadilla goblet'),
  exercise('ex-2', 'Press banca'),
  exercise('ex-3', 'Jumping jacks'),
  exercise('ex-4', 'Mountain climbers'),
]

const occurrence = (
  id: string,
  order: number,
  ex: ReturnType<typeof exercise>,
  extra: Record<string, unknown> = {}
) => ({
  id,
  order,
  sets: 3,
  reps_or_duration: '10',
  measure_type: 'REPS',
  target_value: 10,
  target_value_min: null,
  target_value_max: null,
  target_rir: null,
  request_set_tracking: false,
  rest_seconds: 60,
  exercise: ex,
  ...extra,
})

const baseTraining = {
  id: 't-1',
  name: 'Fuerza A',
  type: 'FUERZA',
  types: ['FUERZA'],
  accentColor: null,
  level: 'INTERMEDIO',
  estimated_duration_min: 45,
  estimated_calories: null,
  total_volume: null,
  warmup_description: '',
  warmup_duration_min: null,
  cooldown_description: '',
  tags: [],
  is_active: true,
  created_by: null,
  created_at: '2026-01-15T12:00:00Z',
  updated_at: '2026-01-15T12:00:00Z',
  group_id: null,
  group: null,
  exercises: [],
}

const withExercises = {
  ...baseTraining,
  items: [
    { kind: 'EXERCISE', ...occurrence('te-1', 0, exercises[0], { rest_seconds: 61 }) },
    { kind: 'EXERCISE', ...occurrence('te-2', 1, exercises[1], { rest_seconds: 62, sets: 4 }) },
    { kind: 'EXERCISE', ...occurrence('te-3', 2, exercises[2], { rest_seconds: 63 }) },
  ],
} as unknown as Training

const withCircuit = {
  ...baseTraining,
  items: [
    { kind: 'EXERCISE', ...occurrence('te-1', 0, exercises[0]) },
    {
      kind: 'CIRCUIT',
      id: 'blk-1',
      order: 1,
      type: 'CIRCUIT',
      name: 'Circuito final',
      rounds: 3,
      rest_between_rounds_seconds: 45,
      exercises: [
        occurrence('te-4', 0, exercises[2], { position_in_block: 0, rest_seconds: 11 }),
        occurrence('te-5', 1, exercises[3], { position_in_block: 1, rest_seconds: 12 }),
      ],
    },
  ],
} as unknown as Training

function mockApi() {
  api.get.mockImplementation((url: string) => {
    if (url === '/trainings/tags') return Promise.resolve(envelope({ tags: [] }))
    if (url === '/trainings/types') {
      return Promise.resolve(envelope({ types: [{ value: 'FUERZA', color: '#7FB5D8' }] }))
    }
    if (url === '/exercises') {
      return Promise.resolve(
        envelope({ data: exercises, total: exercises.length, totalPages: 1, page: 1, limit: 200 })
      )
    }
    return Promise.resolve(envelope([]))
  })
  api.put.mockResolvedValue(envelope(withExercises))
}

async function renderBuilder(training: Training) {
  mockApi()
  const onOpenChange = vi.fn()
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={cache}>
      <TrainingFormDialog open onOpenChange={onOpenChange} training={training} />
    </QueryClientProvider>
  )
  await screen.findByDisplayValue('Fuerza A')
  await waitFor(() => expect(screen.queryByText('Ejercicio no encontrado')).toBeNull())
  return { onOpenChange }
}

// jsdom has no layout: getBoundingClientRect() returns zeros, so dnd-kit's
// sortableKeyboardCoordinates cannot find the neighbouring row. Give every sortable row
// (`[data-sortable-item]`) a 100px-tall rect from its current position among its
// sibling rows; nested circuit rows are stacked the same way inside their own list.
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

const handleOrder = (container: HTMLElement | Document = document) =>
  within(container as HTMLElement)
    .getAllByRole('button', { name: /^Reordenar / })
    .map((button) => button.getAttribute('aria-label'))

const restInputs = () =>
  screen
    .getAllByText('Descanso entre series (s)')
    .map((label) => label.parentElement?.querySelector('input') as HTMLInputElement)

async function savedPayload() {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await waitFor(() => expect(api.put).toHaveBeenCalled())
  return api.put.mock.calls[0][1]
}

describe('ExercisePicker drag and drop reordering (P7)', () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset()
    Element.prototype.scrollTo = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
    mockRowRects()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a labelled handle per row and per circuit, keeping the arrows', async () => {
    await renderBuilder(withCircuit)
    expect(handleOrder()).toEqual([
      'Reordenar Sentadilla goblet',
      'Reordenar circuito Circuito final',
      'Reordenar Jumping jacks',
      'Reordenar Mountain climbers',
    ])
    // Only the handle blocks native touch gestures; the row keeps touch scrolling.
    const handle = screen.getByRole('button', { name: 'Reordenar Sentadilla goblet' })
    expect(handle.style.touchAction).toBe('none')
    expect((handle.closest('[data-sortable-item]') as HTMLElement).style.touchAction).toBe('')
    expect(screen.getByRole('button', { name: 'Bajar Sentadilla goblet' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Subir Circuito final' })).toBeTruthy()
  })

  it('moves a row down with the keyboard sensor exactly like the down arrow', async () => {
    await renderBuilder(withExercises)
    await keyboardDrag('Reordenar Sentadilla goblet', ['ArrowDown'])
    expect(handleOrder()).toEqual([
      'Reordenar Press banca',
      'Reordenar Sentadilla goblet',
      'Reordenar Jumping jacks',
    ])
    const dragged = await savedPayload()
    cleanup()
    api.put.mockReset()

    await renderBuilder(withExercises)
    fireEvent.click(screen.getByRole('button', { name: 'Bajar Sentadilla goblet' }))
    const arrowed = await savedPayload()

    expect(dragged).toEqual(arrowed)
    expect(dragged.items.map((item: { order: number }) => item.order)).toEqual([0, 1, 2])
  })

  it('moves a row across several positions like repeated arrows', async () => {
    await renderBuilder(withExercises)
    await keyboardDrag('Reordenar Sentadilla goblet', ['ArrowDown', 'ArrowDown'])
    expect(handleOrder()).toEqual([
      'Reordenar Press banca',
      'Reordenar Jumping jacks',
      'Reordenar Sentadilla goblet',
    ])
    const dragged = await savedPayload()
    cleanup()
    api.put.mockReset()

    await renderBuilder(withExercises)
    fireEvent.click(screen.getByRole('button', { name: 'Bajar Sentadilla goblet' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bajar Sentadilla goblet' }))
    expect(dragged).toEqual(await savedPayload())
  })

  it('cancels with Escape without moving anything or closing the builder', async () => {
    const { onOpenChange } = await renderBuilder(withExercises)
    const handle = screen.getByRole('button', { name: 'Reordenar Sentadilla goblet' })
    handle.focus()
    await press(handle, 'Space', ' ')
    await press(handle, 'ArrowDown')
    await press(handle, 'Escape')
    expect(handleOrder()).toEqual([
      'Reordenar Sentadilla goblet',
      'Reordenar Press banca',
      'Reordenar Jumping jacks',
    ])
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()

    // Outside a drag, Escape still reaches the Workbench.
    await press(handle, 'Escape')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('reorders inside a circuit without touching the top level', async () => {
    await renderBuilder(withCircuit)
    await keyboardDrag('Reordenar Jumping jacks', ['ArrowDown'])
    expect(handleOrder()).toEqual([
      'Reordenar Sentadilla goblet',
      'Reordenar circuito Circuito final',
      'Reordenar Mountain climbers',
      'Reordenar Jumping jacks',
    ])
    const dragged = await savedPayload()
    cleanup()
    api.put.mockReset()

    await renderBuilder(withCircuit)
    fireEvent.click(screen.getByRole('button', { name: 'Bajar Jumping jacks' }))
    expect(dragged).toEqual(await savedPayload())
  })

  it('moves a whole circuit as one block', async () => {
    await renderBuilder(withCircuit)
    await keyboardDrag('Reordenar circuito Circuito final', ['ArrowUp'])
    expect(handleOrder()).toEqual([
      'Reordenar circuito Circuito final',
      'Reordenar Jumping jacks',
      'Reordenar Mountain climbers',
      'Reordenar Sentadilla goblet',
    ])
    const dragged = await savedPayload()
    cleanup()
    api.put.mockReset()

    await renderBuilder(withCircuit)
    fireEvent.click(screen.getByRole('button', { name: 'Subir Circuito final' }))
    expect(dragged).toEqual(await savedPayload())
  })

  it('keeps the arrows working after a drag', async () => {
    await renderBuilder(withExercises)
    await keyboardDrag('Reordenar Jumping jacks', ['ArrowUp'])
    expect(handleOrder()).toEqual([
      'Reordenar Sentadilla goblet',
      'Reordenar Jumping jacks',
      'Reordenar Press banca',
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Subir Jumping jacks' }))
    expect(handleOrder()).toEqual([
      'Reordenar Jumping jacks',
      'Reordenar Sentadilla goblet',
      'Reordenar Press banca',
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Bajar Sentadilla goblet' }))
    expect(handleOrder()).toEqual([
      'Reordenar Jumping jacks',
      'Reordenar Press banca',
      'Reordenar Sentadilla goblet',
    ])
  })

  it('carries typed values and the same input elements with the row', async () => {
    await renderBuilder(withExercises)
    const [firstRest] = restInputs()
    fireEvent.change(firstRest, { target: { value: '33' } })
    expect(firstRest.value).toBe('33')

    await keyboardDrag('Reordenar Sentadilla goblet', ['ArrowDown'])
    const after = restInputs()
    expect(after.map((input) => input.value)).toEqual(['62', '33', '63'])
    // Stable row keys: React moved the row instead of re-creating its inputs.
    expect(after[1]).toBe(firstRest)

    fireEvent.click(screen.getByRole('button', { name: 'Subir Sentadilla goblet' }))
    expect(restInputs()[0]).toBe(firstRest)
    expect(restInputs().map((input) => input.value)).toEqual(['33', '62', '63'])
  })

  it('does not mix rows when removing and adding after a reorder', async () => {
    await renderBuilder(withExercises)
    await keyboardDrag('Reordenar Sentadilla goblet', ['ArrowDown', 'ArrowDown'])
    const pressRest = restInputs()[0]
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Jumping jacks' }))
    expect(handleOrder()).toEqual(['Reordenar Press banca', 'Reordenar Sentadilla goblet'])
    expect(restInputs().map((input) => input.value)).toEqual(['62', '61'])
    expect(restInputs()[0]).toBe(pressRest)

    fireEvent.click(screen.getByRole('button', { name: 'Agregar ejercicio' }))
    fireEvent.click(await screen.findByText('Mountain climbers'))
    expect(handleOrder()).toEqual([
      'Reordenar Press banca',
      'Reordenar Sentadilla goblet',
      'Reordenar Mountain climbers',
    ])
    expect(restInputs().map((input) => input.value)).toEqual(['62', '61', '60'])

    await keyboardDrag('Reordenar Mountain climbers', ['ArrowUp', 'ArrowUp'])
    expect(handleOrder()).toEqual([
      'Reordenar Mountain climbers',
      'Reordenar Press banca',
      'Reordenar Sentadilla goblet',
    ])
    const payload = await savedPayload()
    expect(
      payload.items.map((item: { exercise_id: string; order: number; rest_seconds: number }) => [
        item.exercise_id,
        item.order,
        item.rest_seconds,
      ])
    ).toEqual([
      ['ex-4', 0, 60],
      ['ex-2', 1, 62],
      ['ex-1', 2, 61],
    ])
  })
})
