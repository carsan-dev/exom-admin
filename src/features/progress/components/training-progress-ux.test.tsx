import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { TrainingProgressPanel } from './training-progress-panel'
import { TrainingExerciseTable } from './training-exercise-table'

const named = { exercise_id: 'named', exercise_name: 'Remo', sets: 2, max_reps: 8, max_seconds: null, volume: 80, mean_rir: 2, pr: null }
const unnamed = { ...named, exercise_id: 'unknown', exercise_name: null }
const indicators = { trainings_completed: 3, volume: 160, mean_rir: 2, mean_rpe: 7 }
const envelope = (data: unknown) => ({ data: { data } })

it('keeps the empty exercise card free of pagination and offers all records', async () => {
  vi.spyOn(api, 'get').mockImplementation(async (_url, config) => envelope({
    indicators, exercises: config?.params?.identification === 'all' ? [unnamed] : [], next_cursor: null,
  }))
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <TrainingExerciseTable clientId="client-a" from="2026-09-01" to="2026-09-27" />
  </QueryClientProvider>)
  expect(await screen.findByText('No hay ejercicios identificados para esta consulta.')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Ejercicios anteriores' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Más ejercicios' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar todos' }))
  expect(await screen.findByRole('rowheader', { name: /Nombre no disponible/ })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Más ejercicios' })).not.toBeInTheDocument()
})

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

function setup() {
  const get = vi.spyOn(api, 'get').mockImplementation(async (url, config) => {
    if (url.endsWith('/training-overview')) {
      const params = config?.params as { identification?: string; search?: string; cursor?: string }
      const exercises = params.search ? [{ ...named, exercise_id: 'far-away', exercise_name: 'Remo lejano' }] :
        params.cursor ? [{ ...named, exercise_id: 'second', exercise_name: 'Sentadilla' }] :
          params.identification === 'identified' ? [named] : [named, unnamed]
      return envelope({ indicators, exercises, next_cursor: params.search || params.cursor ? null : 'next' })
    }
    return envelope({ page: [], nextCursor: null })
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const panel = (clientId: string, from = '2026-09-01') => <QueryClientProvider client={client}>
    <TrainingProgressPanel clientId={clientId} from={from} to="2026-09-27" valid />
  </QueryClientProvider>
  const view = render(panel('client-a'))
  return { get, switchClient: () => view.rerender(panel('client-b')), switchWindow: () => view.rerender(panel('client-a', '2026-09-10')) }
}

it('moves notes into accessible bubbles and keeps historical records last', async () => {
  setup()
  const user = userEvent.setup()
  const trigger = await screen.findByRole('button', { name: 'Información sobre Volumen' })
  expect(screen.queryByText(/Suma de peso/)).not.toBeInTheDocument()
  await user.hover(trigger)
  expect(await screen.findByText(/Suma de peso/)).toBeVisible()
  await user.keyboard('{Escape}')
  expect(screen.queryByText(/Suma de peso/)).not.toBeInTheDocument()
  await user.click(trigger)
  expect(await screen.findByText(/Suma de peso/)).toBeVisible()
  await user.click(screen.getByRole('heading', { name: 'Ejercicios' }))
  expect(screen.queryByText(/Suma de peso/)).not.toBeInTheDocument()
  const headings = screen.getAllByRole('heading').map((item) => item.textContent)
  expect(headings.slice(-1)[0]).toBe('Registros históricos')
})

it('defaults to identified, queries all and searches on the server while retaining global indicators', async () => {
  const { get } = setup()
  const filter = await screen.findByRole('combobox', { name: 'Mostrar ejercicios' })
  expect(filter).toHaveValue('identified')
  expect(await screen.findByRole('rowheader', { name: 'Remo' })).toBeVisible()
  expect(screen.queryByText(/Nombre no disponible/)).not.toBeInTheDocument()
  fireEvent.change(filter, { target: { value: 'all' } })
  expect(await screen.findByRole('rowheader', { name: /Nombre no disponible/ })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Más ejercicios' }))
  expect(await screen.findByRole('rowheader', { name: 'Sentadilla' })).toBeVisible()
  fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar ejercicios' }), { target: { value: 'lejano' } })
  expect(await screen.findByRole('rowheader', { name: 'Remo lejano' })).toBeVisible()
  expect(get).toHaveBeenCalledWith(expect.stringContaining('/training-overview'), expect.objectContaining({
    params: expect.objectContaining({ search: 'lejano', identification: 'all' }),
  }))
  const lastSearch = get.mock.calls.filter(([, config]) => config?.params?.search === 'lejano').slice(-1)[0]
  expect(lastSearch?.[1]?.params.cursor).toBeUndefined()
  expect(screen.getByRole('heading', { name: 'Volumen' }).parentElement?.parentElement).toHaveTextContent('160')
})

it('keeps load selection independent of table pages and clears it on a client switch', async () => {
  const { get, switchClient } = setup()
  fireEvent.click(await screen.findByRole('combobox', { name: 'Ejercicio para evolución de cargas' }))
  fireEvent.click(await screen.findByRole('option', { name: 'Remo' }))
  await waitFor(() => expect(get).toHaveBeenCalledWith(expect.stringContaining('/exercises/named/load-history'), expect.anything()))
  fireEvent.click(screen.getByRole('button', { name: 'Más ejercicios' }))
  expect(await screen.findByRole('rowheader', { name: 'Sentadilla' })).toBeVisible()
  expect(screen.getByRole('combobox', { name: 'Ejercicio para evolución de cargas' })).toHaveTextContent('Remo')
  switchClient()
  expect(await screen.findByRole('combobox', { name: 'Ejercicio para evolución de cargas' })).not.toHaveTextContent('Remo')
  expect(get.mock.calls.some(([url]) => url.includes('client-b/progress/exercises/named'))).toBe(false)
})

it('searches the entire identified catalogue and loads more picker results without selecting them', async () => {
  const { get, switchWindow } = setup()
  fireEvent.click(await screen.findByRole('combobox', { name: 'Ejercicio para evolución de cargas' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Cargar más ejercicios' }))
  expect(await screen.findByRole('option', { name: 'Sentadilla' })).toBeVisible()
  fireEvent.change(screen.getByPlaceholderText('Buscar ejercicio…'), { target: { value: 'lejano' } })
  fireEvent.click(await screen.findByRole('option', { name: 'Remo lejano' }))
  await waitFor(() => expect(get).toHaveBeenCalledWith(expect.stringContaining('/exercises/far-away/load-history'), expect.anything()))
  const pickerCalls = get.mock.calls.filter(([, config]) => config?.params?.limit === 20 && config?.params?.identification)
  expect(pickerCalls.every(([, config]) => config?.params.identification === 'identified')).toBe(true)
  switchWindow()
  const picker = await screen.findByRole('combobox', { name: 'Ejercicio para evolución de cargas' })
  expect(within(picker).queryByText('Remo lejano')).not.toBeInTheDocument()
})
