import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientMetricDialog } from './client-metric-dialog'

const createMetric = vi.fn()
const updateMetric = vi.fn()

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../api', () => ({
  getApiErrorMessage: vi.fn(),
  useCreateClientMetric: () => ({ mutateAsync: createMetric, isPending: false }),
  useUpdateClientMetric: () => ({ mutateAsync: updateMetric, isPending: false }),
}))

describe('ClientMetricDialog', () => {
  beforeEach(() => {
    createMetric.mockReset()
    updateMetric.mockReset()
    createMetric.mockResolvedValue({ id: 'metric-1' })
  })

  it('submits a new metric for the selected client', async () => {
    const onOpenChange = vi.fn()
    render(
      <ClientMetricDialog
        clientId="client-1"
        metric={null}
        open
        onOpenChange={onOpenChange}
      />,
    )

    fireEvent.change(screen.getByLabelText('Peso (kg)'), { target: { value: '72.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Añadir métricas' }))

    await waitFor(() => expect(createMetric).toHaveBeenCalledOnce())
    expect(createMetric).toHaveBeenCalledWith({
      clientId: 'client-1',
      values: expect.objectContaining({ weight_kg: '72.5' }),
    })
    expect(updateMetric).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
