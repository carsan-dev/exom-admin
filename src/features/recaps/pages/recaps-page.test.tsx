import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUnsavedChangesStore } from '@/hooks/use-unsaved-changes'
import { RecapsPage } from './recaps-page'
import { RecapsList } from '../components/recaps-list'
import type { RecapItem, RecapListItem } from '../types'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create(() => ({ user: { id: 'staff' } })) }
})
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))

const { toast } = await import('sonner')

const ARCHIVED_AT = '2026-11-16T10:00:00.000Z'

function makeRecap(id: string, firstName: string, extra: Partial<RecapItem> = {}): RecapItem {
  return {
    id,
    client_id: `c-${id}`,
    week_start_date: '2026-11-09T00:00:00.000Z',
    week_end_date: '2026-11-15T00:00:00.000Z',
    submitted_at: '2026-11-15T10:00:00.000Z',
    created_at: '2026-11-15T10:00:00.000Z',
    updated_at: '2026-11-15T10:00:00.000Z',
    status: 'SUBMITTED',
    reviewed_at: null,
    archived_at: null,
    average_daily_steps: 8500,
    training_effort: 7,
    training_sessions: 4,
    training_progress: 'MEJORANDO',
    training_notes: `Entreno de ${firstName}`,
    nutrition_quality: 'BUENA',
    hydration_enabled: true,
    hydration_level: 'ALTA',
    food_quality: 8,
    nutrition_notes: null,
    sleep_hours_range: 'SIETE_OCHO',
    fatigue_level: 'BAJA',
    muscle_pain_zones: ['ESPALDA_BAJA'],
    pain_intensity: 'LEVE',
    recovery_notes: '',
    mood: 'MOTIVADO',
    stress_enabled: false,
    stress_level: null,
    energy_level: 6,
    hunger_level: null,
    digestion_level: null,
    general_notes: `Semana general de ${firstName}`,
    improvement_app_rating: null,
    improvement_service_rating: null,
    improvement_areas: [],
    improvement_feedback_text: null,
    admin_comments: null,
    client_feedback_text: null,
    client_feedback_sent_at: null,
    client_feedback_read_at: null,
    client: { id: `c-${id}`, email: `${id}@example.test`, profile: { first_name: firstName, last_name: 'Test' } },
    ...extra,
  }
}

function toListItem(recap: RecapItem): RecapListItem {
  return {
    id: recap.id,
    client_id: recap.client_id,
    week_start_date: recap.week_start_date,
    week_end_date: recap.week_end_date,
    submitted_at: recap.submitted_at,
    average_daily_steps: recap.average_daily_steps,
    admin_comments: recap.admin_comments,
    status: recap.status,
    archived_at: recap.archived_at,
    created_at: recap.created_at,
    client: recap.client,
  }
}

const stats = { total: 31, submitted: 7, reviewed: 20, archived: 4, avg_review_seconds: 5 * 3600 + 12 * 60, reviewed_in_period: 20 }

let store: RecapItem[] = []

type ReviewBody = { admin_comments?: string; client_feedback_text?: string }

function applyReview(url: string, body: ReviewBody) {
  const id = url.split('/')[2]
  store = store.map((recap) =>
    recap.id === id
      ? {
          ...recap,
          status: 'REVIEWED' as const,
          admin_comments: body.admin_comments ?? recap.admin_comments,
          client_feedback_text: body.client_feedback_text ?? recap.client_feedback_text,
        }
      : recap,
  )
  const updated = store.find((recap) => recap.id === id)
  if (!updated) throw new Error(`Unknown recap ${id}`)
  // Las mutaciones legacy devuelven la fila escalar, sin la relación `client`.
  const { client: _client, ...row } = updated
  void _client
  return { data: { data: row } }
}

function mockApi({
  listFails = false,
  totalPages = 1,
  failingDetailIds = [],
}: { listFails?: boolean; totalPages?: number; failingDetailIds?: string[] } = {}) {
  const failing = new Set(failingDetailIds)
  api.get.mockImplementation(async (url: string) => {
    if (url === '/recaps') {
      if (listFails) throw Object.assign(new AxiosError('boom'), { response: { status: 500 } })
      const data = store.map(toListItem)
      return { data: { data: { data, total: data.length, page: 1, limit: 20, totalPages } } }
    }
    if (url === '/recaps/stats') return { data: { data: stats } }
    const detail = /^\/recaps\/([^/]+)$/.exec(url)
    if (detail) {
      const id = detail[1]
      if (failing.has(id)) {
        failing.delete(id)
        throw Object.assign(new AxiosError('boom'), { response: { status: 500, data: {} } })
      }
      const recap = store.find((item) => item.id === id)
      if (!recap) throw Object.assign(new AxiosError('missing'), { response: { status: 404, data: {} } })
      return { data: { data: recap } }
    }
    return { data: { data: { data: [], total: 0, page: 1, limit: 200, totalPages: 1 } } }
  })
  api.put.mockImplementation(async (url: string, body: ReviewBody) => applyReview(url, body))
}

// La siguiente llamada a PUT queda en vuelo hasta que el test la resuelva o la rechace.
function deferNextPut() {
  let settle: { resolve: () => void; reject: (error: unknown) => void } | null = null
  api.put.mockImplementationOnce(
    (url: string, body: ReviewBody) =>
      new Promise((resolve, reject) => {
        settle = { resolve: () => resolve(applyReview(url, body)), reject }
      }),
  )
  return {
    resolve: () => settle?.resolve(),
    reject: () => settle?.reject(Object.assign(new AxiosError('boom'), { response: { status: 500, data: {} } })),
  }
}

// Retiene la carga del detalle de un recap hasta llamar a la función devuelta.
function holdDetail(id: string) {
  let release = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const base = api.get.getMockImplementation()
  api.get.mockImplementation(async (url: string, config?: unknown) => {
    if (url === `/recaps/${id}`) await gate
    return base?.(url, config)
  })
  return () => release()
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

function renderWithProviders(ui: React.ReactNode, initialEntry = '/recaps') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        {ui}
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderPage(initialEntry = '/recaps') {
  return renderWithProviders(<RecapsPage />, initialEntry)
}

function stubViewport(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches, addEventListener: () => {}, removeEventListener: () => {} }),
  })
}

const listCalls = () => api.get.mock.calls.filter(([path]) => path === '/recaps')
const lastListParams = () => listCalls().slice(-1)[0]?.[1].params
const row = (name: RegExp) => screen.getByRole('button', { name })
const findRow = (name: RegExp) => screen.findByRole('button', { name })
const comment = () => screen.getByLabelText('Comentario para el cliente')
const findComment = () => screen.findByLabelText('Comentario para el cliente')
const internalNote = () => screen.getByLabelText('Nota interna (solo visible para el equipo)')
const sendButton = () => screen.getByRole('button', { name: 'Enviar y marcar revisado' })

describe('RecapsPage', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.put.mockReset()
    vi.mocked(toast.info).mockClear()
    vi.mocked(toast.success).mockClear()
    vi.mocked(toast.error).mockClear()
    useUnsavedChangesStore.setState({ dirtyEditors: {}, hasUnsavedChanges: false })
    store = [
      makeRecap('r1', 'Ana'),
      makeRecap('r2', 'Beto', {
        status: 'REVIEWED',
        admin_comments: 'Buen trabajo',
        client_feedback_text: 'Sigue así',
      }),
      makeRecap('r3', 'Carla', { admin_comments: 'Revisar rodilla' }),
      makeRecap('r4', 'Dani', { archived_at: ARCHIVED_AT, status: 'REVIEWED', client_feedback_text: 'Archivado ya' }),
      makeRecap('r5', 'Eva'),
    ]
  })

  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia')
  })

  describe('listado', () => {
    it('renders header, figures, selectable rows and pagination on desktop', async () => {
      mockApi({ totalPages: 3 })
      renderPage()

      expect(screen.getByText('Seguimiento')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: 'Recaps semanales' })).toBeInTheDocument()
      const list = await screen.findByRole('list', { name: 'Recaps recibidos' })
      expect(within(list).getAllByRole('button')).toHaveLength(5)
      expect(within(list).getByText('Ana Test')).toBeInTheDocument()
      expect(within(list).getByText('Archivado')).toBeInTheDocument()
      expect(within(list).getAllByText('Por revisar')).toHaveLength(3)
      expect(within(list).getAllByText(/^8\.?500 pasos\/día$/)).toHaveLength(5)
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
      expect(screen.getByText('Página 1 de 3')).toBeInTheDocument()
      expect(screen.getByText('Selecciona un recap del listado')).toBeInTheDocument()

      const figures = within(await screen.findByLabelText('Resumen de recaps'))
      expect(figures.getByText('Total recaps').nextElementSibling).toHaveTextContent('31')
      expect(figures.getByText('Por revisar').nextElementSibling).toHaveTextContent('7')
      expect(figures.getByText('5 h 12 min')).toBeInTheDocument()
    })

    it('names each row with client, week, status and sent date, and wires it to the pane', async () => {
      mockApi()
      renderPage()

      const ana = await findRow(/Ana Test/)
      expect(ana).toHaveAccessibleName(/^Cliente: Ana Test\. Semana: .+2026\. Estado: Por revisar\. Enviado: \d{2}\/\d{2}\/\d{4}$/)
      expect(row(/Dani Test/)).toHaveAccessibleName(/Estado: Archivado/)
      expect(row(/Beto Test/)).toHaveAccessibleName(/Estado: Revisado/)
      expect(ana).toHaveAttribute('aria-controls', 'recap-detail')
      expect(ana).not.toHaveAttribute('aria-haspopup')
      expect(ana).not.toHaveAttribute('aria-current')
    })

    it('reads clientId, status, archived and page from the URL into the query and keeps them when selecting', async () => {
      mockApi({ totalPages: 5 })
      const user = userEvent.setup()
      renderPage('/recaps?clientId=abc&status=SUBMITTED&archived=true&page=3')

      await findRow(/Ana Test/)
      expect(lastListParams()).toEqual({ page: 3, limit: 20, client_id: 'abc', status: 'SUBMITTED', archived: true })
      expect(screen.getByRole('button', { name: 'Por revisar' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'Ver activos' })).toBeInTheDocument()

      await user.click(row(/Ana Test/))
      expect(screen.getByTestId('location')).toHaveTextContent('/recaps?clientId=abc&status=SUBMITTED&archived=true&page=3')
    })

    it('writes status, archived and page to the URL, resets the page and clears the selection on filter changes', async () => {
      mockApi({ totalPages: 5 })
      const user = userEvent.setup()
      renderPage('/recaps?page=2')

      await user.click(await findRow(/Ana Test/))
      expect(screen.getByRole('heading', { level: 2, name: 'Ana Test' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Revisados' }))
      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/recaps?status=REVIEWED'))
      expect(screen.getByTestId('location')).not.toHaveTextContent('page=')
      expect(screen.getByText('Selecciona un recap del listado')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Ver archivados' }))
      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('archived=true'))
      await waitFor(() => expect(lastListParams()).toEqual({ page: 1, limit: 20, status: 'REVIEWED', archived: true }))

      await user.click(await findRow(/Ana Test/))
      await user.click(screen.getByRole('button', { name: 'Siguiente' }))
      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('page=2'))
      await waitFor(() => expect(lastListParams()).toEqual({ page: 2, limit: 20, status: 'REVIEWED', archived: true }))
      expect(screen.getByText('Selecciona un recap del listado')).toBeInTheDocument()
    })

    it('shows the empty state with and without filters', async () => {
      store = []
      mockApi()
      const { unmount } = renderPage()
      expect(await screen.findByText('Todavía no hay recaps disponibles para revisión')).toBeInTheDocument()
      unmount()

      renderPage('/recaps?status=REVIEWED')
      expect(await screen.findByText('No hay recaps para los filtros seleccionados')).toBeInTheDocument()
    })

    it('shows the error state and retries the list', async () => {
      mockApi({ listFails: true })
      const user = userEvent.setup()
      renderPage()

      expect(await screen.findByText('Error al cargar los recaps. Intenta de nuevo.')).toBeInTheDocument()
      const before = listCalls().length
      await user.click(screen.getAllByRole('button', { name: 'Reintentar' }).slice(-1)[0])
      await waitFor(() => expect(listCalls().length).toBeGreaterThan(before))
    })
  })

  describe('vista rápida', () => {
    it('shows the header at once, a loading status, then the condensed summary, client notes and the reply form', async () => {
      mockApi()
      const release = holdDetail('r1')
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Ana Test/))
      expect(row(/Ana Test/)).toHaveAttribute('aria-current', 'true')
      const pane = screen.getByRole('region', { name: 'Detalle de recap' })
      expect(within(pane).getByRole('heading', { level: 2, name: 'Ana Test' })).toBeInTheDocument()
      expect(within(pane).getByText('Cargando recap')).toBeInTheDocument()
      expect(within(pane).getByRole('link', { name: 'Ver completo' })).toHaveAttribute('href', '/recaps/r1')
      expect(within(pane).queryByRole('button', { name: 'Enviar y marcar revisado' })).not.toBeInTheDocument()

      release()
      expect(await within(pane).findByRole('heading', { level: 3, name: 'Entreno' })).toBeInTheDocument()
      expect(within(pane).queryByText('Cargando recap')).not.toBeInTheDocument()
      expect(within(pane).getByText('Sesiones completadas').nextElementSibling).toHaveTextContent('4')
      expect(within(pane).getByText('Progreso').nextElementSibling).toHaveTextContent('Mejorando')
      expect(within(pane).getByText('Nivel de hidratación').nextElementSibling).toHaveTextContent('Alta')
      expect(within(pane).getByText('Zonas con dolor muscular').nextElementSibling).toHaveTextContent('Espalda Baja')
      expect(within(pane).queryByText('Nivel de estrés')).not.toBeInTheDocument()
      expect(within(pane).getByText('Energía semanal (1 sin energía – 10 mucha)').nextElementSibling).toHaveTextContent('6')
      expect(within(pane).queryByText(/^Hambre semanal/)).not.toBeInTheDocument()

      const notes = within(within(pane).getByRole('heading', { level: 3, name: 'Notas del cliente' }).parentElement as HTMLElement)
      expect(notes.getByText('Entreno de Ana')).toBeInTheDocument()
      expect(notes.getByText('Semana general de Ana')).toBeInTheDocument()
      expect(notes.queryByText('Recuperación')).not.toBeInTheDocument()

      expect(comment()).toHaveValue('')
      expect(internalNote()).toHaveValue('')
      expect(sendButton()).toBeEnabled()
      expect(screen.getByText('Este texto es visible para el cliente. Si lo cambias se enviará una notificación push.')).toBeInTheDocument()
    })

    it('omits the client notes section when all notes are empty', async () => {
      store = [makeRecap('r1', 'Ana', { training_notes: null, general_notes: '  ' })]
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Ana Test/))
      await findComment()
      expect(screen.queryByRole('heading', { name: 'Notas del cliente' })).not.toBeInTheDocument()
    })

    it('opens the internal note by default when the recap already has one', async () => {
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Carla Test/))
      await findComment()
      expect(internalNote()).toHaveValue('Revisar rodilla')
      expect(internalNote().closest('details')).toHaveAttribute('open')

      await user.click(row(/Ana Test/))
      await findComment()
      expect(internalNote().closest('details')).not.toHaveAttribute('open')
    })

    it('renders a reviewed recap read-only with the sent comment and internal note', async () => {
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Beto Test/))
      expect(await screen.findByText('Sigue así')).toBeInTheDocument()
      expect(screen.getByText('Buen trabajo')).toBeInTheDocument()
      expect(screen.queryByLabelText('Comentario para el cliente')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Enviar y marcar revisado' })).not.toBeInTheDocument()
      expect(screen.getByText(/abre «Ver completo»/)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Ver completo' })).toHaveAttribute('href', '/recaps/r2')
    })

    it('renders an archived recap read-only', async () => {
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Dani Test/))
      expect(await screen.findByText('Archivado ya')).toBeInTheDocument()
      expect(screen.queryByLabelText('Comentario para el cliente')).not.toBeInTheDocument()
    })

    it('shows an inline error with retry when the detail fails to load, keeping the header', async () => {
      mockApi({ failingDetailIds: ['r1'] })
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Ana Test/))
      expect(await screen.findByText('Error al cargar el recap. Intenta de nuevo.')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'Ana Test' })).toBeInTheDocument()
      expect(screen.queryByLabelText('Comentario para el cliente')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Reintentar' }))
      expect(await findComment()).toBeInTheDocument()
    })
  })

  describe('respuesta rápida', () => {
    it('sends the legacy review with both trimmed keys and keeps the existing internal note', async () => {
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Carla Test/))
      await user.type(await findComment(), '  Ok  ')
      await user.click(sendButton())

      await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1))
      expect(api.put).toHaveBeenCalledWith('/recaps/r3/review', {
        admin_comments: 'Revisar rodilla',
        client_feedback_text: 'Ok',
      })
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Recap revisado correctamente'))
    })

    it('allows an empty comment, like the detail page', async () => {
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Ana Test/))
      await findComment()
      await user.click(sendButton())
      await waitFor(() => expect(api.put).toHaveBeenCalledWith('/recaps/r1/review', { admin_comments: '', client_feedback_text: '' }))
    })

    it('keeps a draft per recap across selection changes and marks the row', async () => {
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Ana Test/))
      await user.type(await findComment(), 'A1')
      await user.click(screen.getByText('Nota interna'))
      await user.type(internalNote(), 'N1')
      expect(row(/Ana Test/)).toHaveAccessibleName(/Borrador de respuesta sin enviar/)
      expect(within(row(/Ana Test/)).getByText('Borrador')).toBeInTheDocument()
      expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(true)

      await user.click(row(/Carla Test/))
      expect(await findComment()).toHaveValue('')
      expect(internalNote()).toHaveValue('Revisar rodilla')
      expect(row(/Carla Test/)).not.toHaveAccessibleName(/Borrador/)
      expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(true)

      await user.click(row(/Ana Test/))
      expect(await findComment()).toHaveValue('A1')
      expect(internalNote()).toHaveValue('N1')
      expect(internalNote().closest('details')).toHaveAttribute('open')
    })

    it('drops the draft marker when the text returns to the saved values', async () => {
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Ana Test/))
      await user.type(await findComment(), 'x')
      expect(row(/Ana Test/)).toHaveAccessibleName(/Borrador/)
      await user.clear(comment())
      expect(row(/Ana Test/)).not.toHaveAccessibleName(/Borrador/)
      expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(false)
    })

    it('advances to the next submitted recap, skipping reviewed ones, and focuses its comment', async () => {
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Ana Test/))
      await user.type(await findComment(), 'Bien')
      await user.click(sendButton())

      // r2 está revisado: el siguiente por revisar tras r1 es r3.
      expect(await screen.findByRole('heading', { level: 2, name: 'Carla Test' })).toBeInTheDocument()
      expect(row(/Carla Test/)).toHaveAttribute('aria-current', 'true')
      await waitFor(() => expect(comment()).toHaveFocus())
      expect(comment()).toHaveValue('')
      expect(toast.info).not.toHaveBeenCalled()
      expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(false)
      await waitFor(() => expect(row(/Ana Test/)).toHaveAccessibleName(/Estado: Revisado/))
      expect(row(/Ana Test/)).not.toHaveAccessibleName(/Borrador/)
    })

    it('wraps around to the first submitted recap', async () => {
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Eva Test/))
      await findComment()
      await user.click(sendButton())

      expect(await screen.findByRole('heading', { level: 2, name: 'Ana Test' })).toBeInTheDocument()
      expect(toast.info).not.toHaveBeenCalled()
    })

    it('warns when none are left and keeps the answered recap shown read-only with focus on its heading', async () => {
      store = [makeRecap('r1', 'Ana'), makeRecap('r2', 'Beto', { status: 'REVIEWED' })]
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Ana Test/))
      await user.type(await findComment(), 'Último')
      await user.click(sendButton())

      await waitFor(() => expect(toast.info).toHaveBeenCalledWith('No quedan recaps por revisar en esta lista.'))
      const heading = screen.getByRole('heading', { level: 2, name: 'Ana Test' })
      await waitFor(() => expect(screen.queryByLabelText('Comentario para el cliente')).not.toBeInTheDocument())
      expect(await screen.findByText('Último')).toBeInTheDocument()
      expect(heading).toHaveFocus()
    })

    it('keeps the draft and the selection when the send fails', async () => {
      mockApi()
      const put = deferNextPut()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Ana Test/))
      await user.type(await findComment(), 'R1')
      await user.click(sendButton())
      expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled()
      expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(true)

      put.reject()
      await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1))
      expect(toast.success).not.toHaveBeenCalled()
      expect(screen.getByRole('heading', { level: 2, name: 'Ana Test' })).toBeInTheDocument()
      expect(comment()).toHaveValue('R1')
      expect(sendButton()).toBeEnabled()
      expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(true)
    })

    it('does not replace a selection made while the send was in flight', async () => {
      mockApi()
      const put = deferNextPut()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Ana Test/))
      await user.type(await findComment(), 'R')
      await user.click(sendButton())
      // El siguiente por revisar tras Ana sería Carla; el usuario elige Eva.
      await user.click(row(/Eva Test/))
      const evaComment = await findComment()
      await user.click(evaComment)

      put.resolve()
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Recap revisado correctamente'))
      await waitFor(() => expect(row(/Ana Test/)).toHaveAccessibleName(/Estado: Revisado/))
      expect(screen.getByRole('heading', { level: 2, name: 'Eva Test' })).toBeInTheDocument()
      expect(row(/Eva Test/)).toHaveAttribute('aria-current', 'true')
      expect(evaComment).toHaveFocus()
    })

    it('disables the form while the send is pending and issues a single PUT', async () => {
      mockApi()
      const put = deferNextPut()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Ana Test/))
      await findComment()
      await user.click(sendButton())

      const sending = screen.getByRole('button', { name: 'Enviando...' })
      expect(sending).toBeDisabled()
      expect(comment()).toBeDisabled()
      expect(api.put).toHaveBeenCalledTimes(1)

      put.resolve()
      await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1))
      expect(api.put).toHaveBeenCalledTimes(1)
      expect(api.put).toHaveBeenCalledWith('/recaps/r1/review', { admin_comments: '', client_feedback_text: '' })
    })

    it('drops the draft when the loaded detail is no longer replyable', async () => {
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Ana Test/))
      await user.type(await findComment(), 'Pendiente')
      expect(row(/Ana Test/)).toHaveAccessibleName(/Borrador de respuesta sin enviar/)
      expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(true)

      await user.click(row(/Carla Test/))
      await findComment()
      // Otra persona revisa el recap de Ana mientras tanto.
      store = store.map((recap) => (recap.id === 'r1' ? { ...recap, status: 'REVIEWED' as const } : recap))
      await user.click(row(/Ana Test/))

      await waitFor(() => expect(row(/Ana Test/)).not.toHaveAccessibleName(/Borrador/))
      expect(within(row(/Ana Test/)).queryByText('Borrador')).not.toBeInTheDocument()
      expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(false)
    })
  })

  describe('foco', () => {
    it('focuses the pane heading while the detail loads, without stealing focus later, and the comment when already loaded', async () => {
      mockApi()
      const release = holdDetail('r1')
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Ana Test/))
      const heading = screen.getByRole('heading', { level: 2, name: 'Ana Test' })
      expect(screen.getByText('Cargando recap')).toBeInTheDocument()
      expect(heading).toHaveFocus()
      release()
      await findComment()
      expect(heading).toHaveFocus()

      await user.click(row(/Carla Test/))
      await findComment()
      await user.click(row(/Ana Test/))
      // Detalle ya en caché: el foco va directo al comentario.
      await waitFor(() => expect(comment()).toHaveFocus())
    })

    it('focuses the heading of a read-only recap', async () => {
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Beto Test/))
      await screen.findByText('Sigue así')
      await user.click(row(/Ana Test/))
      await findComment()
      await user.click(row(/Beto Test/))
      expect(screen.getByRole('heading', { level: 2, name: 'Beto Test' })).toHaveFocus()
    })
  })

  describe('diálogo móvil', () => {
    it('mounts only the dialog, navigates the loaded list and disables the ends', async () => {
      stubViewport(false)
      mockApi()
      const user = userEvent.setup()
      renderPage('/recaps?status=SUBMITTED&page=1')

      const ana = await findRow(/Ana Test/)
      expect(ana).toHaveAttribute('aria-haspopup', 'dialog')
      expect(ana).not.toHaveAttribute('aria-controls')
      expect(screen.queryByRole('region', { name: 'Detalle de recap' })).not.toBeInTheDocument()

      await user.click(ana)
      const dialog = await screen.findByRole('dialog', { name: 'Detalle de recap' })
      const inDialog = within(dialog)
      const previous = () => inDialog.getByRole('button', { name: 'Recap anterior' })
      const next = () => inDialog.getByRole('button', { name: 'Recap siguiente' })

      expect(inDialog.getByRole('heading', { level: 3, name: 'Ana Test' })).toBeInTheDocument()
      expect(inDialog.getByText('1 de 5')).toBeInTheDocument()
      expect(previous()).toBeDisabled()
      expect(next()).toBeEnabled()

      await user.click(next())
      expect(inDialog.getByRole('heading', { level: 3, name: 'Beto Test' })).toBeInTheDocument()
      await user.click(next())
      await user.click(next())
      await user.click(next())
      expect(inDialog.getByRole('heading', { level: 3, name: 'Eva Test' })).toBeInTheDocument()
      expect(inDialog.getByText('5 de 5')).toBeInTheDocument()
      expect(next()).toBeDisabled()

      await user.click(previous())
      expect(inDialog.getByRole('heading', { level: 3, name: 'Dani Test' })).toBeInTheDocument()
      expect(screen.getByTestId('location')).toHaveTextContent('/recaps?status=SUBMITTED&page=1')
      expect(listCalls()).toHaveLength(1)
    })

    it('keeps the draft after closing and returns focus to the row that opened the dialog', async () => {
      stubViewport(false)
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Ana Test/))
      const dialog = await screen.findByRole('dialog', { name: 'Detalle de recap' })
      await user.type(await within(dialog).findByLabelText('Comentario para el cliente'), 'P')
      await user.click(within(dialog).getByRole('button', { name: 'Recap siguiente' }))
      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      await waitFor(() => expect(row(/Ana Test/)).toHaveFocus())
      expect(row(/Ana Test/)).toHaveAccessibleName(/Borrador de respuesta sin enviar/)
      expect(useUnsavedChangesStore.getState().hasUnsavedChanges).toBe(true)

      await user.click(row(/Ana Test/))
      const reopened = await screen.findByRole('dialog', { name: 'Detalle de recap' })
      expect(await within(reopened).findByLabelText('Comentario para el cliente')).toHaveValue('P')
    })

    it('opens the next submitted recap in the dialog after sending and focuses its comment', async () => {
      stubViewport(false)
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Ana Test/))
      const dialog = await screen.findByRole('dialog', { name: 'Detalle de recap' })
      await within(dialog).findByLabelText('Comentario para el cliente')
      await user.click(within(dialog).getByRole('button', { name: 'Enviar y marcar revisado' }))

      expect(await within(dialog).findByRole('heading', { level: 3, name: 'Carla Test' })).toBeInTheDocument()
      await waitFor(() => expect(within(dialog).getByLabelText('Comentario para el cliente')).toHaveFocus())
    })

    it('closes the dialog and warns when none are left', async () => {
      stubViewport(false)
      store = [makeRecap('r1', 'Ana'), makeRecap('r2', 'Beto', { status: 'REVIEWED' })]
      mockApi()
      const user = userEvent.setup()
      renderPage()

      await user.click(await findRow(/Ana Test/))
      const dialog = await screen.findByRole('dialog', { name: 'Detalle de recap' })
      await within(dialog).findByLabelText('Comentario para el cliente')
      await user.click(within(dialog).getByRole('button', { name: 'Enviar y marcar revisado' }))

      await waitFor(() => expect(toast.info).toHaveBeenCalledWith('No quedan recaps por revisar en esta lista.'))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })
  })
})

// RecapsList sigue en uso en Seguimiento (Progreso): su tabla, su lista móvil y returnTo.
describe('RecapsList', () => {
  beforeEach(() => {
    api.get.mockReset()
    store = [
      makeRecap('r1', 'Ana'),
      makeRecap('r2', 'Beto', { status: 'REVIEWED', admin_comments: 'Buen trabajo' }),
      makeRecap('r3', 'Carla', { archived_at: ARCHIVED_AT, status: 'REVIEWED' }),
    ]
  })

  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia')
  })

  it('renders the table rows and pagination on desktop', async () => {
    mockApi({ totalPages: 3 })
    renderWithProviders(<RecapsList archived={false} page={1} onPageChange={vi.fn()} />)

    expect(await screen.findByText('Ana Test')).toBeInTheDocument()
    expect(screen.getAllByRole('table')).toHaveLength(1)
    expect(screen.getByText('Buen trabajo')).toBeInTheDocument()
    expect(screen.getByText('Archivado')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument()
  })

  it('mounts only the stacked list on mobile, with the same open links', async () => {
    stubViewport(false)
    mockApi()
    renderWithProviders(<RecapsList archived={false} page={1} onPageChange={vi.fn()} />)

    expect(await screen.findByText('Ana Test')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Abrir' }).map((link) => link.getAttribute('href'))).toEqual([
      '/recaps/r1',
      '/recaps/r2',
      '/recaps/r3',
    ])
  })

  it('links to the detail with the same hrefs on desktop and propagates returnTo', async () => {
    mockApi()
    renderWithProviders(
      <RecapsList archived={false} page={1} onPageChange={vi.fn()} returnTo="/progress?clientId=x&section=follow-up" />,
    )

    const links = await screen.findAllByRole('link', { name: 'Abrir' })
    expect(links[0].getAttribute('href')).toBe(
      `/recaps/r1?returnTo=${encodeURIComponent('/progress?clientId=x&section=follow-up')}`,
    )
  })

  it('shows the empty state with and without filters', async () => {
    store = []
    mockApi()
    const { unmount } = renderWithProviders(<RecapsList archived={false} page={1} onPageChange={vi.fn()} />)
    expect(await screen.findByText('Todavía no hay recaps disponibles para revisión')).toBeInTheDocument()
    unmount()

    renderWithProviders(<RecapsList status="REVIEWED" archived={false} page={1} onPageChange={vi.fn()} />)
    expect(await screen.findByText('No hay recaps para los filtros seleccionados')).toBeInTheDocument()
  })

  it('shows the error state and retries the list', async () => {
    mockApi({ listFails: true })
    const user = userEvent.setup()
    renderWithProviders(<RecapsList archived={false} page={1} onPageChange={vi.fn()} />)

    expect(await screen.findByText('Error al cargar los recaps. Intenta de nuevo.')).toBeInTheDocument()
    const before = listCalls().length
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(before))
  })
})
