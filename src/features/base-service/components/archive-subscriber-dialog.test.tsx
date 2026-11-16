import { act, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ArchiveSubscriberDialog } from './archive-subscriber-dialog'
import { BASE_URL, envelope, makeSubscriber } from '../test-support'

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset())
})

afterEach(() => {
  vi.useRealTimers()
})

function renderDialog() {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  // An active detail query so the failed archive has something to refetch.
  cache.setQueryData(['base-service', 'subscribers', 'detail', 's1'], makeSubscriber())
  api.get.mockResolvedValue(envelope(makeSubscriber()))
  const Observer = () => null
  return render(
    <QueryClientProvider client={cache}>
      <Observer />
      <ArchiveSubscriberDialog subscriber={makeSubscriber()} open onOpenChange={vi.fn()} />
    </QueryClientProvider>,
  )
}

describe('ArchiveSubscriberDialog', () => {
  it('uses a 70 s timeout only for the archive request and shows a waiting state after 5 s', async () => {
    vi.useFakeTimers()
    api.put.mockImplementation(() => new Promise(() => undefined))
    renderDialog()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Archivar' }))
    })
    expect(api.put).toHaveBeenCalledWith(`${BASE_URL}/subscribers/s1/archive`, { is_archived: true }, { timeout: 70000 })
    expect(screen.queryByText('Esperando a que termine un envío en curso…')).not.toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(screen.getByText('Esperando a que termine un envío en curso…')).toBeInTheDocument()
  })

  it('shows the no-response warning when the request times out', async () => {
    api.put.mockRejectedValue(new AxiosError('timeout of 70000ms exceeded', 'ECONNABORTED'))
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Archivar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se obtuvo respuesta del servidor')
  })
})
