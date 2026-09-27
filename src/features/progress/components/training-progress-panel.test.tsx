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
    expect(await screen.findByText('Sin sesiones con detalle en esta página.')).toBeInTheDocument()
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

  it('explains ambiguous historical counts, session-only detail, volume and missing names without changing values', async () => {
    const historicalOverview = {
      indicators: { trainings_completed: 28, volume: 117619.9, mean_rir: null, mean_rpe: null },
      exercises: [{ ...exerciseA, exercise_name: null, volume: 117619.9 }],
      next_cursor: null,
    }
    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url.endsWith('/progress/training-overview')) return Promise.resolve(envelope(historicalOverview))
      if (url.endsWith('/progress/training-sessions')) return Promise.resolve(envelope({ page: [], nextCursor: null }))
      if (url.includes('/load-history')) return Promise.resolve(envelope({ page: [], nextCursor: null }))
      throw new Error(`Unexpected GET: ${url}`)
    })
    renderPanel()
    const completed = await screen.findByRole('heading', { name: 'Entrenos completados' })
    const completedCard = completed.parentElement?.parentElement
    expect(completedCard).toHaveTextContent('28')
    expect(completedCard).toHaveTextContent(/históric[oa]s?.*sin.*confirmación.*sesión/i)
    const volumeCard = screen.getByRole('heading', { name: 'Volumen' }).parentElement?.parentElement
    expect(volumeCard).toHaveTextContent('117.619,9 kg·reps')
    expect(volumeCard).toHaveTextContent(/peso.*repeticiones.*series.*segundos.*no/i)
    const exercisesTable = screen.getByRole('table', { name: 'Resumen de ejercicios del periodo' })
    const unnamedRow = within(exercisesTable).getByRole('row', { name: /Ejercicio sin nombre/ })
    expect(within(unnamedRow).getByText('117.619,9 kg·reps')).toBeInTheDocument()
    expect(screen.getByText(/nombre.*históric[oa].*no.*atribuir.*inequívoca.*no.*falte.*copia histórica/i)).toBeInTheDocument()
    const sessionsCard = screen.getByRole('heading', { name: 'Sesiones con detalle' }).parentElement?.parentElement
    expect(sessionsCard).toHaveTextContent('Sin sesiones con detalle en esta página.')
    expect(sessionsCard).toHaveTextContent(/sesiones con identificador y acceso a detalle/i)
    expect(sessionsCard).toHaveTextContent(/identificador de sesión antiguo.*no certifica.*finalización explícita/i)
    expect(screen.queryByRole('button', { name: /Ver detalle/ })).not.toBeInTheDocument()
  })

  it('keeps legacy records hidden and does not fetch until explicitly expanded with a valid range', async () => {
    const get = vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url.endsWith('/progress/training-overview')) return Promise.resolve(envelope(overview))
      if (url.endsWith('/progress/training-sessions')) return Promise.resolve(envelope({ page: [], nextCursor: null }))
      if (url.endsWith('/progress/legacy-training-records')) return Promise.resolve(envelope({ page: [], nextCursor: null }))
      throw new Error('Unexpected GET')
    })
    const view = renderPanel()
    await screen.findByRole('heading', { name: 'Entrenos completados' })
    expect(screen.getByRole('button', { name: 'Mostrar registros históricos' })).toBeInTheDocument()
    expect(screen.queryByText(/registro histórico sin sesión verificable; no confirma finalización/i)).not.toBeInTheDocument()
    expect(get.mock.calls.filter(([url]) => url.endsWith('/progress/legacy-training-records'))).toHaveLength(0)
    view.rerender(<QueryClientProvider client={new QueryClient()}><TrainingProgressPanel clientId="client-a" from="bad" to="2026-09-28" valid={false} /></QueryClientProvider>)
    expect(screen.queryByRole('button', { name: 'Mostrar registros históricos' })).not.toBeInTheDocument()
    expect(get.mock.calls.filter(([url]) => url.endsWith('/progress/legacy-training-records'))).toHaveLength(0)
  })

  it('shows separate same-day ordinals only, pages independently and resets on collapse, client and range changes', async () => {
    const get = vi.spyOn(api, 'get').mockImplementation((url, config) => {
      if (url.endsWith('/progress/training-overview')) return Promise.resolve(envelope(overview))
      if (url.endsWith('/progress/training-sessions')) return Promise.resolve(envelope({ page: [session], nextCursor: null }))
      if (url.endsWith('/progress/legacy-training-records')) {
        const page = hasCursor(config, 'legacy-next') ? [{ date: '2026-09-09', record_index: 1, kind: 'uncertain_legacy', training_id: 'private-key' }] :
          [{ date: '2026-09-10', record_index: 1, kind: 'uncertain_legacy', training_id: 'private-key', training_name: 'private-name', payload: 'private-payload' },
            { date: '2026-09-10', record_index: 2, kind: 'uncertain_legacy' }]
        return Promise.resolve(envelope({ page, nextCursor: hasCursor(config, 'legacy-next') ? null : 'legacy-next' }))
      }
      if (url.includes('/progress/training-sessions/')) return Promise.resolve(envelope(detail))
      throw new Error('Unexpected GET')
    })
    const view = renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Mostrar registros históricos' }))
    const list = await screen.findByRole('list', { name: 'Registros históricos' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(list).toHaveTextContent('2026-09-10 · Registro 1')
    expect(list).toHaveTextContent('2026-09-10 · Registro 2')
    expect(list).toHaveTextContent('registro histórico sin sesión verificable; no confirma finalización')
    expect(list).not.toHaveTextContent(/private-key|private-name|private-payload/)
    expect(within(list).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ver detalle de Sesión A/ })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/admin/clients/client-a/progress/legacy-training-records', expect.objectContaining({ params: { from: '2026-09-01', to: '2026-09-28', limit: 20 } }))
    fireEvent.click(screen.getByRole('button', { name: 'Más registros históricos' }))
    expect(await screen.findByText(/2026-09-09 · Registro 1/)).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/admin/clients/client-a/progress/legacy-training-records', expect.objectContaining({ params: { from: '2026-09-01', to: '2026-09-28', limit: 20, cursor: 'legacy-next' } }))
    fireEvent.click(screen.getByRole('button', { name: 'Registros históricos anteriores' }))
    expect(await screen.findByText(/2026-09-10 · Registro 2/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar registros históricos' }))
    expect(screen.queryByRole('list', { name: 'Registros históricos' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar registros históricos' }))
    expect(await screen.findByText(/2026-09-10 · Registro 2/)).toBeInTheDocument()
    view.switchClient('client-b')
    expect(await screen.findByRole('button', { name: 'Mostrar registros históricos' })).toBeInTheDocument()
    expect(get.mock.calls.some(([url]) => url.includes('/client-b/progress/legacy-training-records'))).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar registros históricos' }))
    await waitFor(() => expect(get.mock.calls.some(([url]) => url.includes('/client-b/progress/legacy-training-records'))).toBe(true))
    expect(get.mock.calls.some(([url, config]) => url.includes('/client-b/progress/legacy-training-records') && hasCursor(config, 'legacy-next'))).toBe(false)
    view.switchWindow('2026-08-01', '2026-08-31')
    expect(await screen.findByRole('button', { name: 'Mostrar registros históricos' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar registros históricos' }))
    await waitFor(() => expect(get).toHaveBeenCalledWith('/admin/clients/client-a/progress/legacy-training-records', expect.objectContaining({ params: { from: '2026-08-01', to: '2026-08-31', limit: 20 } })))
  })

  it.each([[403, 'No tienes acceso a los registros históricos.'], [404, 'Los registros históricos aún no están disponibles.']])('reports historical %i independently of the session panel', async (status, message) => {
    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url.endsWith('/progress/training-overview')) return Promise.resolve(envelope(overview))
      if (url.endsWith('/progress/training-sessions')) return Promise.resolve(envelope({ page: [session], nextCursor: null }))
      if (url.endsWith('/progress/legacy-training-records')) return Promise.reject(axios.AxiosError.from(new Error('Unavailable'), 'ERR_BAD_RESPONSE', undefined, undefined,
        { status, statusText: 'Unavailable', headers: {}, config: { headers: {} } as never, data: {} }))
      throw new Error('Unexpected GET')
    })
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Mostrar registros históricos' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByText('Sin registros históricos en este periodo.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ver detalle de Sesión A/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Entrenos completados' })).toBeInTheDocument()
  })

  it('shows an explicit empty historical page separately', async () => {
    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url.endsWith('/progress/training-overview')) return Promise.resolve(envelope(overview))
      if (url.endsWith('/progress/training-sessions')) return Promise.resolve(envelope({ page: [], nextCursor: null }))
      if (url.endsWith('/progress/legacy-training-records')) return Promise.resolve(envelope({ page: [], nextCursor: null }))
      throw new Error('Unexpected GET')
    })
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Mostrar registros históricos' }))
    expect(await screen.findByText('Sin registros históricos en este periodo.')).toBeInTheDocument()
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
    expect(screen.getByRole('heading', { name: 'Sesiones con detalle' })).toBeInTheDocument()
    expect(screen.getByText(/identificador de sesión antiguo.*no certifica.*finalización explícita/i)).toBeInTheDocument()
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
    expect(await screen.findByText('Sin sesiones con detalle en esta página.')).toBeInTheDocument()
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
    expect(screen.queryByText('Sin sesiones con detalle en esta página.')).not.toBeInTheDocument()
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
