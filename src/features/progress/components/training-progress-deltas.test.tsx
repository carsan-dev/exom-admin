import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { TrainingProgressPanel } from './training-progress-panel'
import type { TrainingIndicators } from '../types'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ScatterChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Scatter: () => null, CartesianGrid: () => null, XAxis: () => null, YAxis: () => null, Tooltip: () => null,
}))

const current: TrainingIndicators = { trainings_completed: 5, volume: 1200, mean_rir: 2, mean_rpe: null }
const envelope = (data: unknown) => ({ data: { data } })
function setup(previous: TrainingIndicators | 'error', extra: Partial<Parameters<typeof TrainingProgressPanel>[0]> = {}) {
  const get = vi.spyOn(api, 'get').mockImplementation(async (url, config) => {
    if (url.endsWith('/training-overview')) {
      if (config?.params?.from === '2026-09-01') return envelope({ indicators: current, exercises: [], next_cursor: null })
      if (previous === 'error') throw { isAxiosError: true, response: { status: 403 } }
      return envelope({ indicators: previous, exercises: [], next_cursor: null })
    }
    return envelope({ page: [], nextCursor: null })
  })
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <TrainingProgressPanel clientId="client-a" from="2026-09-01" to="2026-09-28" valid {...extra} />
  </QueryClientProvider>)
  return get
}
// Indicator card: title (h3) → CardHeader → card container holding value and badge.
const card = (label: string) => screen.getByText(label, { selector: 'span' }).closest('h3')!.parentElement!.parentElement!
afterEach(() => { vi.restoreAllMocks() })

describe('Entrenamiento: variación neutral frente al periodo anterior', () => {
  it('consulta el periodo anterior con limit 1 y muestra deltas neutrales en los indicadores', async () => {
    const get = setup({ trainings_completed: 3, volume: 1500, mean_rir: null, mean_rpe: 7 }, { previousFrom: '2026-08-04', previousTo: '2026-08-31' })
    await within(await screen.findByRole('region', { name: 'Lectura del periodo de entrenamiento' })).findAllByTestId('delta-badge')
    expect(get).toHaveBeenCalledWith('/admin/clients/client-a/progress/training-overview', expect.objectContaining({
      params: expect.objectContaining({ from: '2026-08-04', to: '2026-08-31', limit: 1 }),
    }))
    expect(within(card('Registros de entrenamiento')).getByTestId('delta-badge')).toHaveTextContent('+2')
    expect(within(card('Registros de entrenamiento')).getByTestId('delta-badge')).toHaveClass('text-foreground')
    expect(within(card('Volumen')).getByTestId('delta-badge')).toHaveTextContent('−300 kg·reps')
    expect(within(card('Volumen')).getByTestId('delta-badge')).toHaveClass('text-foreground')
    // null previous stays null; a null current value shows no comparison at all.
    expect(within(card('RIR medio')).getByTestId('delta-badge')).toHaveTextContent('Sin datos previos')
    expect(within(card('RPE medio')).queryByTestId('delta-badge')).not.toBeInTheDocument()
    expect(screen.getByText(/Comparado con/)).toBeInTheDocument()
  })

  it('un error del periodo anterior no se presenta como cero', async () => {
    setup('error', { previousFrom: '2026-08-04', previousTo: '2026-08-31' })
    await screen.findByText('Entrenamiento del periodo')
    expect(await within(card('Registros de entrenamiento')).findByText('Sin datos previos')).toBeInTheDocument()
  })

  it('sin periodo anterior no pide comparación ni muestra variaciones', async () => {
    const get = setup({ ...current })
    await screen.findByText('Entrenamiento del periodo')
    // Only the indicators request uses limit 1 (the exercise table pages separately).
    expect(get.mock.calls.filter(([url, config]) => url.endsWith('/training-overview') && config?.params?.limit === 1)).toHaveLength(1)
    expect(screen.queryByTestId('delta-badge')).not.toBeInTheDocument()
  })

  it('la medida de la evolución de cargas es controlable desde la página', async () => {
    const onMeasureChange = vi.fn()
    setup({ ...current }, { measure: 'reps', onMeasureChange })
    const select = await screen.findByRole('combobox', { name: 'Medida de las series' })
    expect(select).toHaveValue('reps')
    fireEvent.change(select, { target: { value: 'seconds' } })
    expect(onMeasureChange).toHaveBeenCalledWith('seconds')
  })
})
