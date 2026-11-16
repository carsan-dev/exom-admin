import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TrainingFormValues } from '../schemas'
import type { Training } from '../types'
import { TrainingFormDialog } from './training-form-dialog'

// Characterization of the training builder DOM. The snapshots were recorded before
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

const envelope = (data: unknown) => ({ data: { data } })

const exercise = (id: string, name: string, level: string, muscles: string[]) => ({
  id,
  name,
  muscle_groups: muscles,
  equipment: [],
  level,
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
  exercise('ex-1', 'Sentadilla goblet', 'PRINCIPIANTE', ['Piernas', 'Glúteos']),
  exercise('ex-2', 'Press banca', 'INTERMEDIO', ['Pecho']),
  exercise('ex-3', 'Jumping jacks', 'PRINCIPIANTE', ['Cardio']),
  exercise('ex-4', 'Mountain climbers', 'AVANZADO', ['Core']),
]

const trainingExercise = (
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
  target_rir: 2,
  request_set_tracking: false,
  rest_seconds: 60,
  exercise: ex,
  ...extra,
})

const baseTraining = {
  id: 't-1',
  name: 'Fuerza A',
  type: 'FUERZA',
  types: ['FUERZA', 'HIIT'],
  accentColor: '#C5E384',
  level: 'INTERMEDIO',
  estimated_duration_min: 45,
  estimated_calories: 300,
  total_volume: null,
  warmup_description: 'Movilidad de cadera',
  warmup_duration_min: 10,
  cooldown_description: 'Estiramientos suaves',
  tags: ['Pierna', 'Core'],
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
    { kind: 'EXERCISE', ...trainingExercise('te-1', 0, exercises[0]) },
    {
      kind: 'EXERCISE',
      ...trainingExercise('te-2', 1, exercises[1], {
        sets: 4,
        target_value: null,
        target_value_min: 6,
        target_value_max: 8,
        reps_or_duration: '6-8',
        request_set_tracking: true,
        rest_seconds: 90,
      }),
    },
    { kind: 'EXERCISE', ...trainingExercise('te-3', 2, exercises[2]) },
  ],
} as unknown as Training

const withCircuit = {
  ...baseTraining,
  items: [
    { kind: 'EXERCISE', ...trainingExercise('te-1', 0, exercises[0]) },
    {
      kind: 'CIRCUIT',
      id: 'blk-1',
      order: 1,
      type: 'CIRCUIT',
      name: 'Circuito final',
      rounds: 3,
      rest_between_rounds_seconds: 45,
      exercises: [
        trainingExercise('te-4', 0, exercises[2], {
          position_in_block: 0,
          measure_type: 'SECONDS',
          target_value: 30,
          reps_or_duration: '30s',
          rest_seconds: 15,
          target_rir: null,
        }),
        trainingExercise('te-5', 1, exercises[3], { position_in_block: 1, rest_seconds: 15 }),
      ],
    },
  ],
} as unknown as Training

const withTimed = {
  ...baseTraining,
  items: [
    {
      kind: 'EXERCISE',
      ...trainingExercise('te-1', 0, exercises[2], {
        measure_type: 'SECONDS',
        target_value: 90,
        reps_or_duration: '90s',
        target_rir: null,
        timed_config: {
          version: 1,
          unit: 'SECONDS',
          segments: [
            { action: 'Trabajo', seconds: 30, unit: 'SECONDS' },
            { action: 'Descanso', seconds: 60, unit: 'SECONDS' },
          ],
        },
      }),
    },
  ],
} as unknown as Training

const withRir = {
  ...baseTraining,
  rir_proposal: [3, 2, 1, 0],
  items: [
    {
      kind: 'EXERCISE',
      ...trainingExercise('te-1', 0, exercises[0], { rir_override: { mode: 'FIXED', value: 1 } }),
    },
    {
      kind: 'CIRCUIT',
      id: 'blk-1',
      order: 1,
      type: 'CIRCUIT',
      name: 'Circuito final',
      rounds: 2,
      rest_between_rounds_seconds: 30,
      exercises: [
        trainingExercise('te-4', 0, exercises[2], {
          position_in_block: 0,
          rir_override: { mode: 'SEQUENCE', sequence: [2, 2, 1, 1] },
        }),
      ],
    },
  ],
} as unknown as Training

const imported: TrainingFormValues = {
  name: 'Importado',
  types: ['Fuerza'],
  accentColor: null,
  level: 'PRINCIPIANTE',
  estimated_duration_min: null,
  estimated_calories: null,
  warmup_description: '',
  warmup_duration_min: null,
  cooldown_description: '',
  tags: [],
  items: [
    {
      kind: 'EXERCISE',
      exercise_id: 'ex-1',
      order: 0,
      sets: 3,
      reps_or_duration: '10',
      measure_type: 'REPS',
      target_value: 10,
      target_value_min: null,
      target_value_max: null,
      target_rir: null,
      request_set_tracking: false,
      rest_seconds: 60,
    },
  ],
}

function mockApi() {
  api.get.mockImplementation((url: string) => {
    if (url === '/trainings/tags') return Promise.resolve(envelope({ tags: ['Pierna', 'Core'] }))
    if (url === '/trainings/types') {
      return Promise.resolve(
        envelope({
          types: [
            { value: 'FUERZA', color: '#7FB5D8' },
            { value: 'HIIT', color: '#E5BE58' },
          ],
        })
      )
    }
    if (url === '/exercises') {
      return Promise.resolve(
        envelope({ data: exercises, total: exercises.length, totalPages: 1, page: 1, limit: 200 })
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
  training?: Training | null
  isDuplicate?: boolean
  importedValues?: TrainingFormValues | null
  importIssues?: string[]
}

function renderDialog(props: Props = {}) {
  mockApi()
  const onOpenChange = vi.fn()
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(
    <QueryClientProvider client={cache}>
      <TrainingFormDialog open onOpenChange={onOpenChange} {...props} />
    </QueryClientProvider>
  )
  return { ...view, onOpenChange }
}

// Wait until the catalog queries behind the builder (tags, types, exercises) have settled.
async function settled(withExerciseNames = false) {
  await screen.findByText(/Selecciona etiquetas existentes o crea una nueva\./)
  await screen.findByText(/Tipos guardados\. Pulsa para activar o quitar varios\./)
  if (withExerciseNames) {
    await waitFor(() => expect(screen.queryByText('Ejercicio no encontrado')).toBeNull())
  }
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/exercises', expect.anything()))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

function arrowButtons(direction: 'up' | 'down') {
  return Array.from(document.querySelectorAll(`svg.lucide-chevron-${direction}`)).map(
    (icon) => icon.closest('button') as HTMLButtonElement
  )
}

describe('TrainingFormDialog characterization', () => {
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

  it('create with the exercise picker open and filtered', async () => {
    renderDialog()
    await settled()
    await userEvent.click(screen.getByRole('button', { name: 'Agregar ejercicio' }))
    await screen.findByText('Press banca')
    expect(snapBody()).toMatchSnapshot('picker open')
    fireEvent.change(screen.getByPlaceholderText('Buscar ejercicio...'), { target: { value: 'zzz' } })
    await screen.findByText('No hay resultados para "zzz"')
    expect(snapBody()).toMatchSnapshot('picker no results')
    fireEvent.change(screen.getByPlaceholderText('Buscar ejercicio...'), { target: { value: 'press' } })
    await userEvent.click(await screen.findByText('Press banca'))
    await screen.findByText('Solicitar rendimiento real en cada serie')
    expect(snapBody()).toMatchSnapshot('exercise added')
    await userEvent.click(screen.getByRole('button', { name: 'Agregar circuito' }))
    await screen.findByText('Circuito · 3 rondas')
    expect(snapBody()).toMatchSnapshot('circuit added')
  })

  it('edit with several exercises, and reordering with the arrows', async () => {
    renderDialog({ training: withExercises })
    await settled(true)
    await screen.findByDisplayValue('Fuerza A')
    expect(snapBody()).toMatchSnapshot()
    fireEvent.click(arrowButtons('down')[0])
    expect(snapBody()).toMatchSnapshot('moved first down')
    fireEvent.click(arrowButtons('up')[2])
    expect(snapBody()).toMatchSnapshot('moved last up')
  })

  it('edit with a circuit, and reordering inside and around it', async () => {
    renderDialog({ training: withCircuit })
    await settled(true)
    await screen.findByDisplayValue('Fuerza A')
    expect(snapBody()).toMatchSnapshot()
    fireEvent.click(arrowButtons('down')[1])
    expect(snapBody()).toMatchSnapshot('circuit moved down')
    fireEvent.click(arrowButtons('up')[1])
    expect(snapBody()).toMatchSnapshot('circuit moved back up')
    fireEvent.click(screen.getByRole('button', { name: 'Agregar ejercicio al circuito' }))
    await screen.findByPlaceholderText('Buscar ejercicio...')
    expect(snapBody()).toMatchSnapshot('circuit picker open')
  })

  it('edit with a timed prescription', async () => {
    renderDialog({ training: withTimed })
    await settled(true)
    await screen.findByDisplayValue('Fuerza A')
    expect(snapBody()).toMatchSnapshot()
  })

  it('edit with an active RIR mesocycle', async () => {
    renderDialog({ training: withRir })
    await settled(true)
    await screen.findByText('Quitar propuesta')
    expect(snapBody()).toMatchSnapshot()
  })

  it('duplicate', async () => {
    renderDialog({ training: withCircuit, isDuplicate: true })
    await settled(true)
    await screen.findByDisplayValue('Fuerza A (copia)')
    expect(snapBody()).toMatchSnapshot()
  })

  it('import with warnings', async () => {
    renderDialog({
      importedValues: imported,
      importIssues: ['No se encontró el ejercicio "Ejercicio desconocido"'],
    })
    await settled(true)
    await screen.findByText('Revisa ejercicios no enlazados')
    expect(snapBody()).toMatchSnapshot()
  })

  it('shows validation errors on submit and the pending footer', async () => {
    const { onOpenChange } = renderDialog()
    await settled()
    await userEvent.click(screen.getByRole('button', { name: 'Crear entrenamiento' }))
    await screen.findByText('El nombre es obligatorio')
    await screen.findByText('Agrega al menos un ejercicio o circuito')
    expect(snapBody()).toMatchSnapshot()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows validation errors inside a built exercise', async () => {
    renderDialog({ training: withExercises })
    await settled(true)
    const reps = screen.getAllByPlaceholderText('Ej. 8 o 8-10')[0]
    fireEvent.change(reps, { target: { value: '' } })
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findAllByText('Especifica reps o duración')
    expect(snapBody()).toMatchSnapshot()
  })
})
