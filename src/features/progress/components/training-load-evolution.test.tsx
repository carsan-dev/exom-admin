import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { TrainingProgressPanel } from './training-progress-panel'
import { TrainingLoadEvolution } from './training-load-evolution'

// Keep real ScatterChart/Tooltip behavior; only bypass jsdom's absent layout.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  const { cloneElement } = await import('react')
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
    cloneElement(children as React.ReactElement<{ width: number; height: number }>, { width: 800, height: 256 }) }
})

const envelope = (data: unknown) => ({ data: { data } }) as never

const weighted = {
  date: '2026-09-08', training_exercise_id: 'entry-1', set_number: 1,
  reps: 8, seconds: null, weight_kg: 40, rir: 0,
}
const timed = {
  date: '2026-09-15', training_exercise_id: 'entry-2', set_number: 2,
  reps: null, seconds: 45, weight_kg: null, rir: null,
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>
    <TrainingProgressPanel clientId="client-a" from="2026-09-01" to="2026-09-28" valid />
  </QueryClientProvider>)
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('TrainingLoadEvolution', () => {
  it('uses current observed values and exactly one unit after measure changes with real Recharts', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url.endsWith('/training-overview')) return envelope({
        indicators: { trainings_completed: 1, volume: 320, mean_rir: 0, mean_rpe: null },
        exercises: [{ exercise_id: 'exercise-a', exercise_name: 'Plancha', sets: 1,
          max_reps: 8, max_seconds: 45, volume: 320, mean_rir: 0, pr: null }],
      })
      if (url.endsWith('/load-history')) return envelope({ page: [{ ...weighted, seconds: 45 }], nextCursor: null })
      return envelope({ page: [], nextCursor: null })
    })
    const view = renderPanel()
    fireEvent.click(await screen.findByRole('combobox', { name: 'Ejercicio para evolución de cargas' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Plancha' }))
    await screen.findByRole('table', { name: 'Cargas del ejercicio seleccionado' })
    const tooltip = () => view.container.querySelector('.recharts-default-tooltip')
    const hover = async (expected: string) => {
      const point = view.container.querySelector('.recharts-scatter-symbol')
      expect(point).not.toBeNull()
      fireEvent.mouseEnter(point!)
      await waitFor(() => expect(tooltip()).toBeVisible())
      expect(tooltip()?.querySelectorAll('.recharts-tooltip-item')[1]?.textContent?.replace(/\s+/g, ' ').trim()).toBe(expected)
    }
    await hover('Peso externo : 40 kg')
    for (const [measure, expected] of [['reps', 'Repeticiones : 8 reps'], ['seconds', 'Duración : 45 s']]) {
      fireEvent.change(screen.getByRole('combobox', { name: 'Medida de las series' }), { target: { value: measure } })
      await waitFor(() => expect(tooltip()).not.toBeVisible())
      await hover(expected)
    }
  })
  it('clears active hover payload when measure, exercise or cached dataset changes', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url.endsWith('/training-overview')) return envelope({
        indicators: {}, exercises: ['a', 'b'].map((suffix) => ({ exercise_id: `exercise-${suffix}`,
          exercise_name: `Plancha ${suffix}`, sets: 1, max_reps: 8, max_seconds: 45, volume: 320, mean_rir: 0, pr: null })),
      })
      if (url.endsWith('/load-history')) return envelope({ page: [{ ...weighted, seconds: 45 }], nextCursor: null })
      return envelope({ page: [], nextCursor: null })
    })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const view = render(<QueryClientProvider client={client}>
      <TrainingLoadEvolution clientId="client-a" from="2026-09-01" to="2026-09-28" />
    </QueryClientProvider>)
    const select = async (name: string) => {
      fireEvent.click(screen.getByRole('combobox', { name: 'Ejercicio para evolución de cargas' }))
      fireEvent.click(await screen.findByRole('option', { name }))
      await screen.findByRole('table', { name: 'Cargas del ejercicio seleccionado' })
    }
    const hover = async () => {
      fireEvent.mouseEnter(view.container.querySelector('.recharts-scatter-symbol')!)
      await waitFor(() => expect(view.container.querySelector('.recharts-default-tooltip')).toBeVisible())
    }
    const cleared = async () => {
      await waitFor(() => {
        expect(view.container.querySelector('.recharts-default-tooltip')).not.toBeVisible()
        expect(view.container.querySelectorAll('.recharts-tooltip-item')).toHaveLength(0)
      })
    }
    await select('Plancha a')
    await hover()
    fireEvent.change(screen.getByRole('combobox', { name: 'Medida de las series' }), { target: { value: 'reps' } })
    await cleared()
    await hover()
    await select('Plancha b')
    await cleared()
    await hover()
    act(() => client.setQueriesData({ predicate: (query) => query.queryKey.includes('training-load') },
      { page: [{ ...weighted, reps: 12, seconds: 60 }], nextCursor: null }))
    await waitFor(() => expect(screen.getByRole('table', { name: 'Cargas del ejercicio seleccionado' })).toHaveTextContent('12'))
    await cleared()
    await hover()
    expect(view.container.querySelectorAll('.recharts-tooltip-item')[1]).toHaveTextContent('Repeticiones : 12 reps')
  })
  it('includes timed-only sets in the accessible evolution table without inventing a load', async () => {
    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url.endsWith('/progress/training-overview')) return Promise.resolve(envelope({
        indicators: { trainings_completed: 1, volume: 320, mean_rir: 0, mean_rpe: null },
        exercises: [{ exercise_id: 'exercise-a', exercise_name: 'Plancha', sets: 2,
          max_reps: 8, max_seconds: 45, volume: 320, mean_rir: 0, pr: null }],
      }))
      if (url.endsWith('/progress/training-sessions')) return Promise.resolve(envelope({ page: [], nextCursor: null }))
      if (url.endsWith('/load-history')) return Promise.resolve(envelope({ page: [weighted, timed], nextCursor: null }))
      if (url.endsWith('/progress/legacy-training-records')) return Promise.resolve(envelope({ page: [], nextCursor: null }))
      throw new Error(`Unexpected GET: ${url}`)
    })
    renderPanel()
    fireEvent.click(await screen.findByRole('combobox', { name: 'Ejercicio para evolución de cargas' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Plancha' }))
    const table = await screen.findByRole('table', { name: 'Cargas del ejercicio seleccionado' })
    expect(within(table).getByRole('columnheader', { name: 'Segundos' })).toBeInTheDocument()
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(within(rows[1]).getByText('40')).toBeInTheDocument()
    expect(within(rows[2]).getByText('45')).toBeInTheDocument()
    expect(within(rows[2]).queryByText('40')).not.toBeInTheDocument()
    expect(screen.queryByText('Sin cargas con peso y repeticiones registrados en esta página.')).not.toBeInTheDocument()
  })

  it('keeps cursor pagination and the selected exercise in load-history requests', async () => {
    const get = vi.spyOn(api, 'get').mockImplementation((url, config) => {
      if (url.endsWith('/progress/training-overview')) return Promise.resolve(envelope({
        indicators: { trainings_completed: 1, volume: null, mean_rir: null, mean_rpe: null },
        exercises: [{ exercise_id: 'exercise-a', exercise_name: 'Plancha', sets: 2,
          max_reps: null, max_seconds: 45, volume: null, mean_rir: null, pr: null }],
      }))
      if (url.endsWith('/progress/training-sessions')) return Promise.resolve(envelope({ page: [], nextCursor: null }))
      if (url.endsWith('/load-history')) return Promise.resolve(envelope(
        config?.params?.cursor === 'older' ? { page: [timed], nextCursor: null } : { page: [weighted], nextCursor: 'older' },
      ))
      if (url.endsWith('/progress/legacy-training-records')) return Promise.resolve(envelope({ page: [], nextCursor: null }))
      throw new Error(`Unexpected GET: ${url}`)
    })
    renderPanel()
    fireEvent.click(await screen.findByRole('combobox', { name: 'Ejercicio para evolución de cargas' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Plancha' }))
    const table = await screen.findByRole('table', { name: 'Cargas del ejercicio seleccionado' })
    expect(within(table).getByText('08 sep 2026')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Más antiguo' }))
    const olderTable = await screen.findByRole('table', { name: 'Cargas del ejercicio seleccionado' })
    expect(await within(olderTable).findByText('15 sep 2026')).toBeInTheDocument()
    expect(within(olderTable).queryByText('08 sep 2026')).not.toBeInTheDocument()
    expect(get).toHaveBeenCalledWith(
      '/admin/clients/client-a/progress/exercises/exercise-a/load-history',
      expect.objectContaining({ params: expect.objectContaining({ from: '2026-09-01', to: '2026-09-28', limit: 20, cursor: 'older' }) }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Más reciente' }))
    const recentTable = await screen.findByRole('table', { name: 'Cargas del ejercicio seleccionado' })
    expect(await within(recentTable).findByText('08 sep 2026')).toBeInTheDocument()
  })
})
