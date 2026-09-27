import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { TrainingProgressPanel } from './training-progress-panel'

const envelope = (data: unknown) => ({ data: { data } }) as never
const overview = {
  indicators: { trainings_completed: 1, volume: 0, mean_rir: 0, mean_rpe: null },
  exercises: [],
}
const session = {
  date: '2026-09-10', training_id: 'training-a', training_session_id: 'execution-a',
  training_name: 'Sesión A', rpe: null, note: 'Nota única de la sesión',
}
const detail = {
  training_id: session.training_id, training_session_id: session.training_session_id,
  training_name: session.training_name, rpe: null, note: session.note,
  page: [{ training_exercise_id: 'entry-a', exercise_name: 'Plancha', set_number: 1,
    reps: null, seconds: 45, weight_kg: null, rir: 0 }], nextCursor: null,
}

function renderPanel(clientId = 'client-a') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const panel = (id: string, from = '2026-09-01', to = '2026-09-28') => <QueryClientProvider client={client}>
    <TrainingProgressPanel clientId={id} from={from} to={to} valid />
  </QueryClientProvider>
  const view = render(panel(clientId))
  return {
    ...view,
    switchClient: (id: string) => view.rerender(panel(id)),
    switchWindow: (from: string, to: string) => view.rerender(panel(clientId, from, to)),
  }
}

function hasCursor(config: unknown, cursor: string): boolean {
  return typeof config === 'object' && config !== null && 'params' in config &&
    typeof config.params === 'object' && config.params !== null &&
    'cursor' in config.params && config.params.cursor === cursor
}

const exerciseA = {
  exercise_id: 'exercise-a', exercise_name: 'Remo', sets: 2, max_reps: 8,
  max_seconds: null, volume: 160, mean_rir: 1, pr: null,
}
const exerciseB = {
  exercise_id: 'exercise-b', exercise_name: 'Sentadilla', sets: 3, max_reps: 5,
  max_seconds: null, volume: 300, mean_rir: 2, pr: null,
}
const pagedIndicators = { trainings_completed: 7, volume: 460, mean_rir: 1.5, mean_rpe: 8 }
const firstExercisePage = { indicators: pagedIndicators, exercises: [exerciseA], next_cursor: 'opaque-next' }
const secondExercisePage = { indicators: pagedIndicators, exercises: [exerciseB], next_cursor: null }

function expectGlobalIndicators() {
  expect(screen.getByRole('heading', { name: 'Entrenos completados' }).parentElement?.parentElement).toHaveTextContent('7')
  expect(screen.getByRole('heading', { name: 'Volumen' }).parentElement?.parentElement).toHaveTextContent('460')
  expect(screen.getByRole('heading', { name: 'RIR medio' }).parentElement?.parentElement).toHaveTextContent('1,5')
  expect(screen.getByRole('heading', { name: 'RPE medio' }).parentElement?.parentElement).toHaveTextContent('8')
}

const forbidden = () => axios.AxiosError.from(new Error('Forbidden'), 'ERR_BAD_RESPONSE', undefined, undefined, {
  status: 403, statusText: 'Forbidden', headers: {}, config: { headers: {} } as never, data: {},
})

afterEach(() => vi.restoreAllMocks())

describe('TrainingProgressPanel', () => {
  it('pages overview exercises without changing global indicators or reusing the prior load selection', async () => {
    const get = vi.spyOn(api, 'get').mockImplementation((url, config) => {
      if (url.endsWith('/progress/training-overview')) {
        return Promise.resolve(envelope(hasCursor(config, 'opaque-next') ? secondExercisePage : firstExercisePage))
      }
      if (url.endsWith('/progress/training-sessions')) return Promise.resolve(envelope({ page: [], nextCursor: null }))
      if (url.includes('/load-history')) return Promise.resolve(envelope({ page: [], nextCursor: null }))
      throw new Error(`Unexpected GET: ${url}`)
    })
    renderPanel()
    const table = await screen.findByRole('table', { name: 'Resumen de ejercicios del periodo' })
    expect(within(table).getByRole('row', { name: /Remo/ })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/admin/clients/client-a/progress/training-overview',
      expect.objectContaining({ params: { from: '2026-09-01', to: '2026-09-28', limit: 100 } }))
    expectGlobalIndicators()
    expect(screen.getByRole('combobox', { name: 'Ejercicio para evolución de cargas' })).toHaveValue('exercise-a')

    fireEvent.click(screen.getByRole('button', { name: 'Más ejercicios' }))
    await waitFor(() => expect(get).toHaveBeenCalledWith('/admin/clients/client-a/progress/training-overview',
      expect.objectContaining({ params: { from: '2026-09-01', to: '2026-09-28', limit: 100, cursor: 'opaque-next' } })))
    expect(await screen.findByRole('row', { name: /Sentadilla/ })).toBeInTheDocument()
    expect(within(screen.getByRole('table', { name: 'Resumen de ejercicios del periodo' })).queryByRole('row', { name: /Remo/ })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Ejercicio para evolución de cargas' })).toHaveValue('exercise-b')
    expectGlobalIndicators()

    fireEvent.click(screen.getByRole('button', { name: 'Ejercicios anteriores' }))
    expect(await screen.findByRole('row', { name: /Remo/ })).toBeInTheDocument()
    expect(within(screen.getByRole('table', { name: 'Resumen de ejercicios del periodo' })).queryByRole('row', { name: /Sentadilla/ })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Ejercicio para evolución de cargas' })).toHaveValue('exercise-a')
  })

  it('resets the overview cursor on client switch and ignores a late page from the previous client', async () => {
    let resolveOldPage: ((value: never) => void) | undefined
    const oldPage = new Promise<never>((resolve) => { resolveOldPage = resolve })
    const get = vi.spyOn(api, 'get').mockImplementation((url, config) => {
      if (url.endsWith('/progress/training-overview')) {
        if (url.includes('/client-b/')) return Promise.resolve(envelope({
          indicators: pagedIndicators, exercises: [exerciseB], next_cursor: null,
        }))
        return hasCursor(config, 'opaque-next') ? oldPage : Promise.resolve(envelope(firstExercisePage))
      }
      if (url.endsWith('/progress/training-sessions')) return Promise.resolve(envelope({ page: [], nextCursor: null }))
      if (url.includes('/load-history')) return Promise.resolve(envelope({ page: [], nextCursor: null }))
      throw new Error(`Unexpected GET: ${url}`)
    })
    const view = renderPanel()
    expect(await screen.findByRole('row', { name: /Remo/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Más ejercicios' }))
    await waitFor(() => expect(get).toHaveBeenCalledWith('/admin/clients/client-a/progress/training-overview',
      expect.objectContaining({ params: { from: '2026-09-01', to: '2026-09-28', limit: 100, cursor: 'opaque-next' } })))
    view.switchClient('client-b')
    expect(await screen.findByRole('row', { name: /Sentadilla/ })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/admin/clients/client-b/progress/training-overview',
      expect.objectContaining({ params: { from: '2026-09-01', to: '2026-09-28', limit: 100 } }))
    expect(get.mock.calls.some(([url, config]) => url.includes('/client-b/progress/training-overview') &&
      hasCursor(config, 'opaque-next'))).toBe(false)
    await act(async () => { resolveOldPage?.(envelope(firstExercisePage)) })
    expect(screen.queryByRole('row', { name: /Remo/ })).not.toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Sentadilla/ })).toBeInTheDocument()
  })

  it('starts a new same-client window without the previous session cursor', async () => {
    const newSession = { ...session, date: '2026-08-10', training_session_id: 'execution-b', training_name: 'Sesión B' }
    const get = vi.spyOn(api, 'get').mockImplementation((url, config) => {
      if (url.endsWith('/progress/training-overview')) return Promise.resolve(envelope(overview))
      if (url.endsWith('/progress/training-sessions')) {
        const params = (config as { params: { from: string; cursor?: string } }).params
        if (params.from === '2026-08-01') {
          return Promise.resolve(envelope({ page: params.cursor ? [] : [newSession], nextCursor: null }))
        }
        return Promise.resolve(envelope({ page: [], nextCursor: params.cursor ? null : 'old-window-cursor' }))
      }
      throw new Error(`Unexpected GET: ${url}`)
    })
    const view = renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Más antiguos' }))
    await waitFor(() => expect(get).toHaveBeenCalledWith('/admin/clients/client-a/progress/training-sessions',
      expect.objectContaining({ params: { from: '2026-09-01', to: '2026-09-28', limit: 20, cursor: 'old-window-cursor' } })))
    view.switchWindow('2026-08-01', '2026-08-31')
    expect(await screen.findByRole('button', { name: /Ver detalle de Sesión B/ })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/admin/clients/client-a/progress/training-sessions',
      expect.objectContaining({ params: { from: '2026-08-01', to: '2026-08-31', limit: 20 } }))
    expect(get.mock.calls.some(([url, config]) => url.endsWith('/progress/training-sessions') &&
      (config as { params: { from: string } }).params.from === '2026-08-01' &&
      hasCursor(config, 'old-window-cursor'))).toBe(false)
  })

  it('hides selected session detail from the previous same-client window', async () => {
    const get = vi.spyOn(api, 'get').mockImplementation((url, config) => {
      if (url.endsWith('/progress/training-overview')) return Promise.resolve(envelope(overview))
      if (url.endsWith('/progress/training-sessions')) {
        const from = (config as { params: { from: string } }).params.from
        return Promise.resolve(envelope({ page: from === '2026-09-01' ? [session] : [], nextCursor: null }))
      }
      if (url.includes('/progress/training-sessions/')) return Promise.resolve(envelope(detail))
      throw new Error(`Unexpected GET: ${url}`)
    })
    const view = renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: /Ver detalle de Sesión A/ }))
    expect(await screen.findByText(/Detalle: Sesión A/)).toBeInTheDocument()
    view.switchWindow('2026-08-01', '2026-08-31')
    expect(await screen.findByText('Sin sesiones finalizadas en esta página.')).toBeInTheDocument()
    expect(screen.queryByText(/Detalle: Sesión A/)).not.toBeInTheDocument()
    expect(get.mock.calls.filter(([url]) => url.includes('/progress/training-sessions/'))).toHaveLength(1)
  })

  it('shows exactly four indicators and keeps historical missing RPE distinct from zero', async () => {
    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url.endsWith('/progress/training-overview')) return Promise.resolve(envelope(overview))
      if (url.endsWith('/progress/training-sessions')) return Promise.resolve(envelope({ page: [], nextCursor: null }))
      throw new Error(`Unexpected GET: ${url}`)
    })
    renderPanel()
    expect(await screen.findByText('Entrenos completados')).toBeInTheDocument()
    expect(screen.getByText('RPE medio')).toBeInTheDocument()
    expect(screen.getByText('Sin dato')).toBeInTheDocument()
  })

  it('renders a null RPE and one session note above a timed set with RIR zero', async () => {
    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url.endsWith('/progress/training-overview')) return Promise.resolve(envelope(overview))
      if (url.endsWith('/progress/training-sessions')) return Promise.resolve(envelope({ page: [session], nextCursor: null }))
      if (url.includes('/progress/training-sessions/')) return Promise.resolve(envelope(detail))
      throw new Error(`Unexpected GET: ${url}`)
    })
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: /Ver detalle de Sesión A/ }))
    const table = await screen.findByRole('table', { name: 'Series del entrenamiento' })
    expect(screen.getByText('RPE: Sin dato')).toBeInTheDocument()
    expect(screen.getAllByText(`Nota: ${session.note}`)).toHaveLength(1)
    expect(within(table).queryByText(session.note)).not.toBeInTheDocument()
    const row = within(table).getByRole('row', { name: /Plancha/ })
    expect(within(row).getByText('45 s')).toBeInTheDocument()
    expect(within(row).getByText('0')).toBeInTheDocument()
  })

  it('does not show a prior client session when its detail request is unresolved during a client switch', async () => {
    let resolveOldDetail: ((value: never) => void) | undefined
    const oldDetail = new Promise<never>((resolve) => { resolveOldDetail = resolve })
    const get = vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url.endsWith('/progress/training-overview')) return Promise.resolve(envelope(overview))
      if (url.endsWith('/progress/training-sessions')) return Promise.resolve(envelope({
        page: url.includes('/client-a/') ? [session] : [], nextCursor: null,
      }))
      if (url.includes('/client-a/progress/training-sessions/')) return oldDetail
      throw new Error(`Unexpected GET: ${url}`)
    })
    const view = renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: /Ver detalle de Sesión A/ }))
    expect(await screen.findByText('Cargando detalle…')).toBeInTheDocument()
    view.switchClient('client-b')
    expect(await screen.findByText('Sin sesiones finalizadas en esta página.')).toBeInTheDocument()
    expect(screen.queryByText(/Detalle: Sesión A/)).not.toBeInTheDocument()
    expect(get.mock.calls.some(([url]) => url.includes('/client-b/progress/training-sessions/execution-a'))).toBe(false)
    resolveOldDetail?.(envelope(detail))
    expect(screen.queryByText(/Detalle: Sesión A/)).not.toBeInTheDocument()
  })

  it('explains that a 413 exercise overview needs a narrower date window, not a retry or empty state', async () => {
    const get = vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url.endsWith('/progress/training-overview')) return Promise.reject(axios.AxiosError.from(
        new Error('Training overview limit exceeded'), 'ERR_BAD_RESPONSE', undefined, undefined,
        { status: 413, statusText: 'Payload Too Large', headers: {}, config: { headers: {} } as never,
          data: { code: 'TRAINING_OVERVIEW_LIMIT_EXCEEDED' } },
      ))
      if (url.endsWith('/progress/training-sessions')) return Promise.resolve(envelope({ page: [], nextCursor: null }))
      throw new Error(`Unexpected GET: ${url}`)
    })
    renderPanel()
    const alert = await screen.findByRole('alert', undefined, { timeout: 5_000 })
    expect(alert).toHaveTextContent('El periodo supera el límite del resumen de ejercicios. Reduce el intervalo de fechas.')
    expect(alert).not.toHaveTextContent('No tienes acceso al entrenamiento de este cliente.')
    expect(alert).not.toHaveTextContent('No se pudo cargar el entrenamiento. Comprueba el periodo y vuelve a intentarlo.')
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    expect(screen.queryByText('Sin ejercicios registrados en este periodo.')).not.toBeInTheDocument()
    expect(get.mock.calls.filter(([url]) => url.endsWith('/progress/training-overview'))).toHaveLength(1)
  })

  it('distinguishes a forbidden session list from an empty list', async () => {
    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url.endsWith('/progress/training-overview')) return Promise.resolve(envelope(overview))
      if (url.endsWith('/progress/training-sessions')) return Promise.reject(forbidden())
      throw new Error(`Unexpected GET: ${url}`)
    })
    renderPanel()
    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes acceso al entrenamiento de este cliente.')
    expect(screen.queryByText('Sin sesiones finalizadas en esta página.')).not.toBeInTheDocument()
  })

  it('distinguishes a forbidden session detail from a missing or empty detail', async () => {
    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url.endsWith('/progress/training-overview')) return Promise.resolve(envelope(overview))
      if (url.endsWith('/progress/training-sessions')) return Promise.resolve(envelope({ page: [session], nextCursor: null }))
      if (url.includes('/progress/training-sessions/')) return Promise.reject(forbidden())
      throw new Error(`Unexpected GET: ${url}`)
    })
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: /Ver detalle de Sesión A/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes acceso a esta sesión.')
    expect(screen.queryByText('Sesión no disponible.')).not.toBeInTheDocument()
    expect(screen.queryByText('Sin series registradas en esta página.')).not.toBeInTheDocument()
  })
})
