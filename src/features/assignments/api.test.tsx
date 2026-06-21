import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { useAssignmentCatalogOptions, useAssignmentClients } from './api'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const mockedGet = vi.mocked(api.get)

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function envelope<T>(data: T) {
  return { data: { success: true, data, timestamp: new Date(0).toISOString() } }
}

describe('assignment option queries', () => {
  beforeEach(() => {
    mockedGet.mockReset()
  })

  it('uses one client-options request and reuses fresh cache after remount', async () => {
    mockedGet.mockResolvedValue(envelope([]) as never)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = createWrapper(queryClient)

    const first = renderHook(() => useAssignmentClients('SUPER_ADMIN'), { wrapper })
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
    first.unmount()

    const second = renderHook(() => useAssignmentClients('SUPER_ADMIN'), { wrapper })
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true))

    expect(mockedGet).toHaveBeenCalledTimes(1)
    expect(mockedGet).toHaveBeenCalledWith('/assignments/client-options')
  })

  it('does not request catalogs until enabled', async () => {
    mockedGet.mockResolvedValue(envelope({ trainings: [], diets: [] }) as never)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = createWrapper(queryClient)
    const hook = renderHook(({ enabled }) => useAssignmentCatalogOptions(enabled), {
      initialProps: { enabled: false },
      wrapper,
    })

    expect(mockedGet).not.toHaveBeenCalled()
    hook.rerender({ enabled: true })
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))

    expect(mockedGet).toHaveBeenCalledTimes(1)
    expect(mockedGet).toHaveBeenCalledWith('/assignments/catalog-options')
  })
})
