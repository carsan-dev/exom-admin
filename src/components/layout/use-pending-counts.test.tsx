import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardQueryKey } from '@/features/dashboard/api'
import { PENDING_COUNTS_REFETCH_INTERVAL, usePendingCounts } from './use-pending-counts'

const apiMock = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/lib/api', () => ({ api: { get: apiMock.get } }))

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, ...renderHook(() => usePendingCounts(), { wrapper }) }
}

function respond(stats: Record<string, unknown>) {
  apiMock.get.mockResolvedValue({ data: { success: true, data: { stats } } })
}

describe('usePendingCounts', () => {
  beforeEach(() => {
    apiMock.get.mockReset()
  })

  it('consulta /dashboard con la clave del Dashboard y refresca cada 2 minutos', async () => {
    respond({ pendingFeedback: 3, pendingRecaps: 2 })
    const { client, result } = setup()

    await waitFor(() => expect(result.current).toEqual({ feedback: 3, recaps: 2 }))
    expect(apiMock.get).toHaveBeenCalledWith('/dashboard')
    const query = client.getQueryCache().find({ queryKey: [...dashboardQueryKey], exact: true })
    expect(query).toBeDefined()
    expect(query?.observers[0]?.options.refetchInterval).toBe(120_000)
    expect(PENDING_COUNTS_REFETCH_INTERVAL).toBe(120_000)
  })

  it('devuelve null con 0 o valor no numérico', async () => {
    respond({ pendingFeedback: 0, pendingRecaps: 'x' })
    const { result } = setup()

    await waitFor(() => expect(apiMock.get).toHaveBeenCalled())
    await waitFor(() => expect(result.current).toEqual({ feedback: null, recaps: null }))
  })

  it('devuelve null sin datos y en error', async () => {
    apiMock.get.mockRejectedValue(new Error('fallo'))
    const { result } = setup()

    expect(result.current).toEqual({ feedback: null, recaps: null })
    await waitFor(() => expect(apiMock.get).toHaveBeenCalled())
    await waitFor(() => expect(result.current).toEqual({ feedback: null, recaps: null }))
  })
})
