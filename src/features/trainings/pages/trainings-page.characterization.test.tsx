import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TrainingsPage } from './trainings-page'

// Characterization of the Trainings list page DOM (list, groups, dialogs and the
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
]

const training = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  type: 'FUERZA',
  types: ['FUERZA'],
  accentColor: null,
  level: 'PRINCIPIANTE',
  estimated_duration_min: 45,
  estimated_calories: 300,
  total_volume: null,
  warmup_description: null,
  warmup_duration_min: null,
  cooldown_description: null,
  tags: ['Pierna'],
  is_active: true,
  created_by: null,
  created_at: '2026-01-15T12:00:00Z',
  updated_at: '2026-01-15T12:00:00Z',
  group_id: null,
  group: null,
  exercises_count: 2,
  exercises: [],
  items: [],
  ...extra,
})

const detailExercise = (id: string, order: number, ex: ReturnType<typeof exercise>) => ({
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
})
const fullTraining = training('t-1', 'Fuerza A', {
  accentColor: '#C5E384',
  types: ['FUERZA', 'HIIT'],
  items: [
    { kind: 'EXERCISE', ...detailExercise('te-1', 0, exercises[0]) },
    { kind: 'EXERCISE', ...detailExercise('te-2', 1, exercises[1]) },
  ],
  exercises: [detailExercise('te-1', 0, exercises[0]), detailExercise('te-2', 1, exercises[1])],
})

const groups = [
  {
    id: 'g-1',
    name: 'Fuerza',
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
    if (url === '/trainings') {
      if (mode === 'loading') return new Promise(() => undefined)
      if (mode === 'error') {
        return Promise.reject(Object.assign(new AxiosError('boom'), { response: { status: 404 } }))
      }
      if (mode === 'empty') return Promise.resolve(page([]))
      const rows = [
        training('t-1', 'Fuerza A', {
          accentColor: '#C5E384',
          group_id: 'g-1',
          group: { id: 'g-1', name: 'Fuerza' },
          types: ['FUERZA', 'HIIT', 'CARDIO'],
          tags: ['Pierna', 'Core', 'Casa'],
        }),
        training('t-2', 'Cardio B', { type: 'CARDIO', types: ['CARDIO'], level: 'AVANZADO' }),
        training('t-3', 'Movilidad C', { estimated_duration_min: null, estimated_calories: null, tags: [] }),
      ]
      if (mode === 'paged') return Promise.resolve(page(rows, 3, 25, pageNumber))
      return Promise.resolve(page(rows))
    }
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
    if (url === '/training-groups') return Promise.resolve(envelope(groupsList))
    if (url === '/exercises') return Promise.resolve(page(exercises))
    if (url === '/trainings/t-1') return Promise.resolve(envelope(fullTraining))
    if (url.startsWith('/approval-requests/resource/training/batch')) {
      return Promise.resolve(
        envelope([
          { resource_id: 't-2', has_pending_approval: true, pending_approval_actions: ['DELETE'] },
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
    .replace(/[«:]r[0-9a-z]+[»:]/g, 'ID')
    .replace(/Dnd(DescribedBy|LiveRegion)-\d+/g, 'Dnd$1-N')
    .replace(/></g, '>\n<')
}

function renderPage(entry = '/trainings', setup: Setup = {}) {
  mockApi(setup)
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={cache}>
      <MemoryRouter initialEntries={[entry]}>
        <TooltipProvider>
          <TrainingsPage />
        </TooltipProvider>
        <Location />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const snap = (container: HTMLElement) => normalize(container.innerHTML)
const snapBody = () => normalize(document.body.innerHTML)

// Wait until the shared catalog queries (tags, types, colors, exercises) have settled so
// the builder renders its final content before the snapshot is taken.
async function settled() {
  await screen.findByText(/Selecciona etiquetas existentes o crea una nueva\.|Aun no hay etiquetas/)
  await screen.findByText(/Tipos guardados\. Pulsa para activar o quitar varios\./)
  await waitFor(() => expect(screen.queryByText('Cargando etiquetas existentes...')).toBeNull())
}

describe('TrainingsPage characterization', () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset()
    Element.prototype.scrollTo = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('lists trainings with groups and the pending approval chip', async () => {
    const { container } = renderPage()
    await screen.findByText('Fuerza A')
    await screen.findByText('Pendiente')
    expect(snap(container)).toMatchSnapshot()
  })

  it('shows the loading skeleton', async () => {
    const { container } = renderPage('/trainings', { mode: 'loading' })
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/trainings', expect.anything()))
    expect(snap(container)).toMatchSnapshot()
  })

  it('shows the error card', async () => {
    const { container } = renderPage('/trainings', { mode: 'error' })
    await screen.findByText('No se ha podido cargar el catálogo')
    expect(snap(container)).toMatchSnapshot()
  })

  it('shows the empty state without query', async () => {
    const { container } = renderPage('/trainings', { mode: 'empty', groupsList: [] })
    await screen.findByText('Aún no hay entrenamientos')
    expect(snap(container)).toMatchSnapshot()
  })

  it('shows the empty search result', async () => {
    const { container } = renderPage()
    await screen.findByText('Fuerza A')
    mockApi({ mode: 'empty' })
    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre...'), {
      target: { value: 'zzz' },
    })
    await screen.findByText('No se encontraron entrenamientos con la búsqueda y filtros actuales.')
    expect(snap(container)).toMatchSnapshot()
  })

  it('paginates through the URL', async () => {
    const { container } = renderPage('/trainings?page=2', { mode: 'paged' })
    await screen.findByText('Página 2 de 3')
    expect(snap(container)).toMatchSnapshot()
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }))
    await screen.findByText('Página 3 de 3')
    expect(screen.getByTestId('location')).toHaveTextContent('/trainings?page=3')
    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }))
    await screen.findByText('Página 2 de 3')
    expect(screen.getByTestId('location')).toHaveTextContent('/trainings?page=2')
  })

  it('filters by catalog group', async () => {
    const { container } = renderPage()
    await screen.findByText('Fuerza A')
    fireEvent.click(screen.getByRole('button', { name: 'Fuerza' }))
    await screen.findByText('Entrenamientos · Fuerza')
    expect(snap(container)).toMatchSnapshot()
    fireEvent.click(screen.getByRole('button', { name: /Sin grupo\s*Filtrar o soltar aquí/ }))
    await screen.findByText('Entrenamientos · Sin grupo')
    expect(snap(container)).toMatchSnapshot('ungrouped')
  })

  it('shows the move bar and the move dialog after selecting rows', async () => {
    const { container } = renderPage()
    await screen.findByText('Fuerza A')
    fireEvent.click(screen.getByLabelText('Seleccionar Fuerza A'))
    await screen.findByRole('button', { name: 'Mover a grupo (1)' })
    expect(snap(container)).toMatchSnapshot()
    await userEvent.click(screen.getByRole('button', { name: 'Mover a grupo (1)' }))
    await screen.findByRole('dialog')
    expect(snapBody()).toMatchSnapshot('move dialog')
  })

  it('opens the group create dialog', async () => {
    renderPage()
    await screen.findByText('Fuerza A')
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo grupo' }))
    await screen.findByRole('dialog')
    expect(snapBody()).toMatchSnapshot()
  })

  it('opens the AI prompt dialog', async () => {
    renderPage()
    await screen.findByText('Fuerza A')
    await userEvent.click(
      screen.getByRole('button', { name: 'Ver prompt para generar entrenamientos importables' })
    )
    await screen.findByText('Prompt para generar JSON compatible')
    await screen.findByText(/incluirá 3 ejercicios cargados/)
    expect(snapBody()).toMatchSnapshot()
  })

  it('opens the builder from the header (create)', async () => {
    renderPage()
    await screen.findByText('Fuerza A')
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo entrenamiento' }))
    await screen.findByRole('dialog')
    await screen.findByText('Rellena los datos del nuevo entrenamiento.')
    await settled()
    expect(snapBody()).toMatchSnapshot()
  })

  it('opens the builder from the empty state', async () => {
    renderPage('/trainings', { mode: 'empty', groupsList: [] })
    await userEvent.click(await screen.findByRole('button', { name: 'Crear primer entrenamiento' }))
    await screen.findByRole('dialog')
    await screen.findByText('Rellena los datos del nuevo entrenamiento.')
    await settled()
    expect(snapBody()).toMatchSnapshot()
  })

  it('imports a JSON file into the builder with unlinked exercise warnings', async () => {
    const { container } = renderPage()
    await screen.findByText('Fuerza A')
    await userEvent.click(screen.getByRole('button', { name: 'Importar' }))
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/exercises', expect.anything()))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Importar' })).toBeEnabled())
    const source = JSON.stringify({
      name: 'Importado',
      types: ['Fuerza'],
      level: 'PRINCIPIANTE',
      items: [
        {
          kind: 'EXERCISE',
          exercise_name: 'Sentadilla goblet',
          sets: 3,
          reps_or_duration: '10',
          measure_type: 'REPS',
          target_value: 10,
          rest_seconds: 60,
        },
        {
          kind: 'EXERCISE',
          exercise_name: 'Ejercicio desconocido',
          sets: 3,
          reps_or_duration: '10',
          measure_type: 'REPS',
          target_value: 10,
          rest_seconds: 60,
        },
      ],
    })
    const file = new File([source], 'training.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(source) })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await screen.findByText('Importar entrenamiento', { selector: 'h2' })
    await settled()
    expect(snapBody()).toMatchSnapshot()
  })

  it('opens the detail dialog and the delete dialog from the row menu', async () => {
    renderPage()
    await screen.findByText('Fuerza A')
    const user = userEvent.setup()
    const row = screen.getByText('Fuerza A').closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Abrir menú' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Ver detalle' }))
    await screen.findByRole('dialog')
    await screen.findAllByText('Sentadilla goblet')
    expect(snapBody()).toMatchSnapshot('detail')
  })

  it('opens the delete dialog from the row menu', async () => {
    renderPage()
    await screen.findByText('Fuerza A')
    const user = userEvent.setup()
    const row = screen.getByText('Cardio B').closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Abrir menú' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Eliminar' }))
    await screen.findByRole('dialog')
    expect(snapBody()).toMatchSnapshot('delete')
  })

  it('opens the edit and duplicate builder from the row menu', async () => {
    renderPage()
    await screen.findByText('Fuerza A')
    const user = userEvent.setup()
    const row = screen.getByText('Fuerza A').closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Abrir menú' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }))
    await screen.findByText('Modifica los campos y guarda los cambios.')
    await screen.findAllByDisplayValue('Fuerza A')
    await settled()
    expect(snapBody()).toMatchSnapshot('edit')
  })
})
