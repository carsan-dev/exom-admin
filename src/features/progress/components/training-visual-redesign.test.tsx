import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { api } from '@/lib/api'
import { TrainingProgressPanel } from './training-progress-panel'
import type { TrainingSet } from '../types'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ScatterChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Scatter: ({ data, isAnimationActive, line }: { data: unknown; isAnimationActive: boolean; line?: boolean }) =>
    <output data-testid={line ? 'load-guide' : 'load-points'} data-animation={String(isAnimationActive)}>{JSON.stringify(data)}</output>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => <span data-testid="interpolation" />,
  CartesianGrid: () => null, XAxis: () => null, YAxis: () => null, Tooltip: () => null,
}))

const exercise = { exercise_id: 'remo', exercise_name: 'Remo', sets: 3, max_reps: 8,
  max_seconds: null, volume: 320, mean_rir: 1, pr: null }
const session = { date: '2026-09-08', training_id: 'training', training_session_id: 'session',
  training_name: 'Fuerza A', rpe: null, note: null }
const set: TrainingSet = { date: '2026-09-08', training_exercise_id: 'entry', set_number: 1,
  weight_kg: 40, reps: 8, seconds: null, rir: 1 }
const envelope = (data: unknown) => ({ data: { data } })
function setup(sets: TrainingSet[]) {
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url.endsWith('/training-overview')) return envelope({ indicators: {
      trainings_completed: 3, volume: 320, mean_rir: 1, mean_rpe: null,
    }, exercises: [exercise], next_cursor: null })
    if (url.endsWith('/training-sessions')) return envelope({ page: [session], nextCursor: null })
    if (url.includes('/training-sessions/')) return envelope({ ...session, page: [set], nextCursor: null })
    if (url.endsWith('/load-history')) return envelope({ page: sets, nextCursor: null })
    return envelope({ page: [], nextCursor: null })
  })
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <TrainingProgressPanel clientId="client-a" from="2026-09-01" to="2026-09-28" valid />
  </QueryClientProvider>)
}
async function selectExercise() {
  fireEvent.click(await screen.findByRole('combobox', { name: 'Ejercicio para evolución de cargas' }))
  fireEvent.click(await screen.findByRole('option', { name: 'Remo' }))
}
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('puts period interpretation and load exploration before session history without claiming completion', async () => {
  setup([set])
  const summary = await screen.findByRole('region', { name: 'Lectura del periodo de entrenamiento' })
  expect(summary).toHaveTextContent('01 sep 2026')
  expect(summary).toHaveTextContent('28 sep 2026')
  expect(summary).toHaveTextContent(/no confirma.*finalización/i)
  const headings = screen.getAllByRole('heading').map((item) => item.textContent)
  expect(headings.indexOf('Evolución de cargas')).toBeLessThan(headings.indexOf('Historial de entrenamiento'))
})

it('shows a single load observation without trend or interpolation and offers explicit units', async () => {
  setup([set])
  await selectExercise()
  expect(await screen.findByText('Una observación no permite establecer una tendencia.')).toBeVisible()
  expect(screen.getByRole('combobox', { name: 'Medida de las series' })).toHaveValue('weight_kg')
  expect(screen.getByTestId('load-points')).toHaveAttribute('data-animation', 'false')
  expect(screen.queryByTestId('interpolation')).not.toBeInTheDocument()
  expect(screen.queryByTestId('load-guide')).not.toBeInTheDocument()
  expect(screen.getByText(/Peso externo.*kg.*volumen.*kg·reps/)).toBeVisible()
})

it('keeps weighted timed sets and missing values in the table, switching units without fabricated zeros', async () => {
  setup([set, { ...set, date: '2026-09-09', weight_kg: null, reps: null, seconds: 45 },
    { ...set, date: '2026-09-10', weight_kg: 12, reps: null, seconds: 60 }])
  await selectExercise()
  const table = await screen.findByRole('table', { name: 'Cargas del ejercicio seleccionado' })
  expect(within(table).getAllByRole('row')).toHaveLength(4)
  const points = JSON.parse(screen.getByTestId('load-points').textContent || '[]')
  expect(points.map((point: { amount: number }) => point.amount)).toEqual([40, 12])
  expect(screen.queryByTestId('load-guide')).not.toBeInTheDocument()
  fireEvent.change(screen.getByRole('combobox', { name: 'Medida de las series' }), { target: { value: 'seconds' } })
  const seconds = JSON.parse(screen.getByTestId('load-points').textContent || '[]')
  expect(seconds.map((point: { amount: number }) => point.amount)).toEqual([45, 60])
  const guide = JSON.parse(screen.getByTestId('load-guide').textContent || '[]')
  expect(guide.map((point: { amount: number }) => point.amount)).toEqual([45, 60])
  expect(screen.getByRole('img')).toHaveAccessibleName(/Duración.*s/)
})

it('joins only comparable dated sets with straight observed guides and breaks null records', async () => {
  setup([{ ...set, weight_kg: 0 }, { ...set, date: '2026-09-10', weight_kg: 20 },
    { ...set, date: '2026-09-11', weight_kg: null }, { ...set, date: '2026-09-13', weight_kg: 30 }])
  await selectExercise()
  const guides = await screen.findAllByTestId('load-guide')
  expect(guides).toHaveLength(1)
  const guide = JSON.parse(guides[0].textContent || '[]')
  expect(guide.map((point: { amount: number }) => point.amount)).toEqual([0, 20])
  expect(guide[1].timestamp - guide[0].timestamp).toBe(2 * 86400000)
  expect(JSON.parse(screen.getByTestId('load-points').textContent || '[]')).toHaveLength(3)
})

it('does not draw or join a record explicitly belonging to a different exercise', async () => {
  setup([{ ...set, exercise_id: 'remo', weight_kg: 0 },
    { ...set, date: '2026-09-09', exercise_id: 'otro', weight_kg: 25 },
    { ...set, date: '2026-09-10', exercise_id: 'remo', weight_kg: 40 }])
  await selectExercise()
  await screen.findByRole('table', { name: 'Cargas del ejercicio seleccionado' })
  expect(JSON.parse(screen.getByTestId('load-points').textContent || '[]').map((point: { amount: number }) => point.amount)).toEqual([0, 40])
  expect(screen.queryByTestId('load-guide')).not.toBeInTheDocument()
  expect(screen.getByRole('table', { name: 'Cargas del ejercicio seleccionado' })).toHaveTextContent('25')
})

it('focuses opened session detail and returns focus to its session action on close', async () => {
  setup([set])
  const trigger = await screen.findByRole('button', { name: /Ver detalle de Fuerza A/ })
  const user = userEvent.setup()
  trigger.focus()
  await user.keyboard('{Enter}')
  expect(trigger.closest('li')).toHaveClass('motion-reduce:transition-none')
  const title = await screen.findByRole('heading', { name: /Detalle: Fuerza A/ })
  expect(title).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: 'Cerrar detalle' })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(trigger).toHaveFocus()
})

it('preserves measured zero while excluding undated and null loads only from the chart', async () => {
  setup([{ ...set, weight_kg: 0 }, { ...set, date: undefined, weight_kg: 20 },
    { ...set, date: '2026-09-10', weight_kg: null }])
  await selectExercise()
  const table = await screen.findByRole('table', { name: 'Cargas del ejercicio seleccionado' })
  expect(within(table).getAllByRole('row')).toHaveLength(4)
  expect(within(table).getByRole('cell', { name: '0' })).toBeVisible()
  expect(within(table).getByRole('cell', { name: '20' })).toBeVisible()
  const points = JSON.parse(screen.getByTestId('load-points').textContent || '[]')
  expect(points.map((point: { amount: number }) => point.amount)).toEqual([0])
  expect(screen.getByText(/1 series con valor pero sin fecha/)).toBeVisible()
})

it('keeps all-null series available without drawing a zero load or claiming a trend', async () => {
  setup([{ ...set, weight_kg: null, reps: null, seconds: null }])
  await selectExercise()
  const table = await screen.findByRole('table', { name: 'Cargas del ejercicio seleccionado' })
  expect(within(table).getAllByText('Sin dato')).toHaveLength(3)
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByText(/Sin observaciones fechadas de peso externo/)).toBeVisible()
  expect(screen.queryByText('Una observación no permite establecer una tendencia.')).not.toBeInTheDocument()
})
