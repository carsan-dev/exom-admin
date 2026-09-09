import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { RirCyclePanel, type RirState } from './rir-cycle-panel'
vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn() } }))
const get = vi.mocked(api.get),
  put = vi.mocked(api.put)
const state: RirState = {
  revision: 1,
  versions: [
    {
      revision: 1,
      effective_from: '2099-01-05',
      starts_on: '2099-01-05',
      config: { sequence: [3, 2], overrides: {} },
    },
  ],
  dates: [
    {
      date: '2099-01-12',
      protected: false,
      week: 2,
      weeks: 2,
      target_rir: 2,
      trainings: [
        {
          id: 'training',
          name: 'Fuerza',
          rir_proposal: [3, 2],
          exercises: [
            {
              id: 'a',
              name: 'Sentadilla',
              base_rir: 8,
              target_rir: 2,
              rir_override: null,
              block_id: null,
            },
            {
              id: 'b',
              name: 'Sentadilla',
              base_rir: 5,
              target_rir: 2,
              rir_override: null,
              block_id: 'circuit',
            },
          ],
        },
      ],
    },
    { date: '2099-01-13', protected: true, week: 2, weeks: 2, target_rir: 2, trainings: [] },
  ],
}
function show() {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={cache}>
      <RirCyclePanel
        clientId="client"
        from="2099-01-12"
        to="2099-01-13"
        trainings={[{ id: 'training', name: 'Fuerza' }]}
      />
    </QueryClientProvider>
  )
  return cache
}
beforeEach(() => {
  get.mockReset()
  put.mockReset()
  get.mockResolvedValue({ data: { success: true, data: state } })
  put.mockResolvedValue({ data: { success: true, data: { revision: 2 } } })
})
afterEach(cleanup)
describe('Mesociclo de RIR panel', () => {
  it('shows effective goals and keeps repeated circuit occurrences independent', async () => {
    show()
    expect(await screen.findByText(/Semana 2 de 2 · RIR 2/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Editar o cancelar mesociclo' }))
    fireEvent.change(screen.getByLabelText('Objetivo de 2. Sentadilla · Circuito'), {
      target: { value: 'NONE' },
    })
    fireEvent.change(screen.getByLabelText('Aplicar desde'), { target: { value: '2099-01-12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Revisar fechas y objetivos' }))
    expect(screen.getByText(/Protegida, sin cambios/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cambio de RIR' }))
    await waitFor(() => expect(put).toHaveBeenCalled())
    expect(put.mock.calls[0][1]).toMatchObject({
      expected_revision: 1,
      starts_on: '2099-01-05',
      config: { sequence: [3, 2], overrides: { b: { mode: 'NONE' } } },
    })
  })
  it('cancels only the RIR cycle after preview', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar o cancelar mesociclo' }))
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Revisar fechas y objetivos' }))
    expect(put).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cambio de RIR' }))
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith(
        '/assignments/clients/client/rir-cycle',
        expect.objectContaining({ config: null, operation_id: expect.any(String) })
      )
    )
  })
  it('preserves the operation ID after an uncertain response and invalidates cached reads', async () => {
    put.mockRejectedValueOnce(new Error('lost response'))
    const cache = show()
    const invalidated = vi.spyOn(cache, 'invalidateQueries')
    fireEvent.click(await screen.findByRole('button', { name: 'Editar o cancelar mesociclo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Revisar fechas y objetivos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cambio de RIR' }))
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cambio de RIR' }))
    await waitFor(() => expect(put).toHaveBeenCalledTimes(2))
    expect(put.mock.calls[0][1]).toEqual(put.mock.calls[1][1])
    expect(invalidated).toHaveBeenCalled()
  })
  it('rejects fractional RIR and unequal alternative sequence lengths', async () => {
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Editar o cancelar mesociclo' }))
    fireEvent.change(screen.getByLabelText('Secuencia común · Semana 1'), {
      target: { value: '2.5' },
    })
    expect(screen.getByRole('button', { name: 'Revisar fechas y objetivos' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Secuencia común · Semana 1'), {
      target: { value: '0' },
    })
    fireEvent.change(screen.getByLabelText('Objetivo de 1. Sentadilla'), {
      target: { value: 'SEQUENCE' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Añadir semana' })[1])
    expect(screen.getByRole('button', { name: 'Revisar fechas y objetivos' })).toBeDisabled()
  })
})
