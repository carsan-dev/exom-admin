import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { NameSourceTag, CURRENT_NAME_HINT } from './name-source-tag'
import { TrainingProgressPanel } from './training-progress-panel'

const envelope = (data: unknown) => ({ data: { data } }) as never
const indicators = { trainings_completed: 2, volume: 10, mean_rir: 1, mean_rpe: 7 }
const base = { sets: 1, max_reps: 5, max_seconds: null, volume: 10, mean_rir: 1, pr: null }

afterEach(() => vi.restoreAllMocks())

describe('NameSourceTag', () => {
  it('renders the tag with the explanatory title only for current_catalog', () => {
    const { container, rerender } = render(<NameSourceTag source="current_catalog" />)
    expect(screen.getByText('nombre actual')).toHaveAttribute('title', CURRENT_NAME_HINT)
    for (const source of ['snapshot', null, undefined] as const) {
      rerender(<NameSourceTag source={source} />)
      expect(container).toBeEmptyDOMElement()
    }
  })
})

describe('Entrenamiento tab name provenance', () => {
  function mockApi(exercises: unknown[], sessions: unknown[]) {
    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url.endsWith('/progress/training-overview')) return Promise.resolve(envelope({ indicators, exercises }))
      if (url.endsWith('/progress/training-sessions')) return Promise.resolve(envelope({ page: sessions, nextCursor: null }))
      if (url.endsWith('/progress/legacy-training-records') || url.includes('/load-history')) return Promise.resolve(envelope({ page: [], nextCursor: null }))
      throw new Error(`Unexpected GET: ${url}`)
    })
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TrainingProgressPanel clientId="c" from="2026-09-01" to="2026-09-28" valid />
    </QueryClientProvider>)
  }

  it('tags current catalog names and leaves snapshot names untagged', async () => {
    mockApi(
      [{ ...base, exercise_id: 'a', exercise_name: 'Remo', name_source: 'current_catalog' },
        { ...base, exercise_id: 'b', exercise_name: 'Press', name_source: 'snapshot' }],
      [{ date: '2026-09-10', training_id: 't', training_session_id: 's', training_name: 'Pierna', training_name_source: 'current_catalog', rpe: null, note: null }],
    )
    const table = await screen.findByRole('table', { name: 'Resumen de ejercicios del periodo' })
    expect(within(within(table).getByRole('row', { name: /Remo/ })).getByText('nombre actual')).toBeInTheDocument()
    expect(within(within(table).getByRole('row', { name: /Press/ })).queryByText('nombre actual')).not.toBeInTheDocument()
    expect(await screen.findByText('Pierna')).toBeInTheDocument()
    expect(screen.getAllByText('nombre actual')).toHaveLength(2)
  })

  it('renders as before when the API omits provenance fields', async () => {
    mockApi(
      [{ ...base, exercise_id: 'a', exercise_name: 'Remo' }],
      [{ date: '2026-09-10', training_id: 't', training_session_id: 's', training_name: null, rpe: null, note: null }],
    )
    const table = await screen.findByRole('table', { name: 'Resumen de ejercicios del periodo' })
    expect(within(table).getByRole('row', { name: /Remo/ })).toBeInTheDocument()
    expect(await screen.findByText('Nombre no disponible')).toBeInTheDocument()
    expect(screen.queryByText('nombre actual')).not.toBeInTheDocument()
  })
})
