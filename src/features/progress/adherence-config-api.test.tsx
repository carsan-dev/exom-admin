import { act, renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '@/hooks/use-auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { progressQueryKeys, useAdherenceConfig, useUpdateAdherenceConfig } from './api'
import type { AdherenceConfig, UpdateAdherenceConfig } from './types'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn() } }))
const response = (data: unknown) => ({ data: { success: true, data, timestamp: '' } })
const unknown: AdherenceConfig = { version: 0, known: false, source: 'uncaptured', effective_date: null }
const policy: AdherenceConfig = {
  version: 3, known: true, source: 'default', effective_date: null,
  steps_goal: null, calorie_lower_percent: 10, calorie_upper_percent: 10,
  protein_min_percent: 90, steps_min_percent: 100, low_global_percent: 80,
}
const payload: UpdateAdherenceConfig = {
  effective_date: '2027-01-02', expected_version: 3, steps_goal: null,
  calorie_lower_percent: 12, calorie_upper_percent: 11, protein_min_percent: 95,
  steps_min_percent: 85, low_global_percent: 75,
}

const admin = (id: string) => ({ id, email: `${id}@example.test`, role: 'ADMIN' as const, profile: null })
beforeEach(() => {
  vi.mocked(api.get).mockReset(); vi.mocked(api.put).mockReset()
  useAuth.setState({ user: admin('admin-a'), isAuthenticated: true, isLoading: false })
})
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

describe('adherence policy API', () => {
  it('revalidates same-admin access after logout without rendering cached authorization', async () => {
    const forbidden = Object.assign(new Error('Forbidden'), { isAxiosError: true, response: { status: 403 } })
    vi.mocked(api.get).mockResolvedValueOnce(response(policy)).mockRejectedValueOnce(forbidden)
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const rendered: (AdherenceConfig | undefined)[] = []
    const hook = renderHook(() => {
      const query = useAdherenceConfig('shared', '2026-09-01')
      rendered.push(query.data)
      return query
    }, { wrapper })
    await waitFor(() => expect(hook.result.current.data).toEqual(policy))
    rendered.length = 0
    act(() => useAuth.setState({ user: null, isAuthenticated: false, isLoading: false }))
    expect(hook.result.current.data).toBeUndefined()
    act(() => useAuth.setState({ user: admin('admin-a'), isAuthenticated: true, isLoading: false }))
    expect(hook.result.current.data).toBeUndefined()
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(client.getQueryCache().findAll({ queryKey: progressQueryKeys.adherenceConfig('admin-a', 'shared', '2026-09-01') })[0]?.state.error).toBe(forbidden))
    expect(hook.result.current.data).toBeUndefined()
    expect(rendered.every((data) => data === undefined)).toBe(true)
  })

  it('does not publish a previous session response after logout and same-admin relogin', async () => {
    let finishOld: ((value: ReturnType<typeof response>) => void) | undefined
    vi.mocked(api.get).mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve }))
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } })
    const { wrapper } = setup()
    const hook = renderHook(() => useAdherenceConfig('shared', '2026-09-01'), { wrapper })
    await waitFor(() => expect(finishOld).toBeDefined())
    act(() => useAuth.setState({ user: null, isAuthenticated: false, isLoading: false }))
    act(() => useAuth.setState({ user: admin('admin-a'), isAuthenticated: true, isLoading: false }))
    expect(hook.result.current.data).toBeUndefined()
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2))
    await act(async () => { finishOld?.(response(policy)); await Promise.resolve() })
    expect(hook.result.current.data).toBeUndefined()
  })
  it('does not reuse a previous admin policy when the same client/date resolves after account switch', async () => {
    let resolveA: ((value: ReturnType<typeof response>) => void) | undefined
    vi.mocked(api.get).mockImplementationOnce(() => new Promise((resolve) => { resolveA = resolve }))
      .mockResolvedValueOnce(response(unknown))
    const { client, wrapper } = setup()
    const hook = renderHook(() => useAdherenceConfig('shared', '2026-09-01'), { wrapper })
    await waitFor(() => expect(resolveA).toBeDefined())
    act(() => useAuth.setState({ user: admin('admin-b'), isAuthenticated: true }))
    await waitFor(() => expect(hook.result.current.data).toEqual(unknown))
    await act(async () => { resolveA?.(response(policy)); await Promise.resolve() })
    expect(hook.result.current.data).toEqual(unknown)
    expect(client.getQueryCache().findAll({ queryKey: progressQueryKeys.adherenceConfig('admin-b', 'shared', '2026-09-01') })[0]?.state.data).toEqual(unknown)
    expect(api.get).toHaveBeenCalledTimes(2)
    act(() => useAuth.setState({ user: null, isAuthenticated: false, isLoading: true }))
    expect(hook.result.current.data).toBeUndefined()
    hook.rerender()
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('never exposes already cached policy to another admin or an unvalidated session', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(response(policy)).mockResolvedValueOnce(response(unknown))
    const { wrapper } = setup()
    const hook = renderHook(() => useAdherenceConfig('shared', '2026-09-01'), { wrapper })
    await waitFor(() => expect(hook.result.current.data).toEqual(policy))
    act(() => useAuth.setState({ user: null, isAuthenticated: false, isLoading: true }))
    expect(hook.result.current.data).toBeUndefined()
    expect(api.get).toHaveBeenCalledTimes(1)
    act(() => useAuth.setState({ user: admin('admin-b'), isAuthenticated: true, isLoading: false }))
    expect(hook.result.current.data).not.toEqual(policy)
    await waitFor(() => expect(hook.result.current.data).toEqual(unknown))
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('keeps an in-flight update in the initiating admin namespace after a switch', async () => {
    let finish: ((value: ReturnType<typeof response>) => void) | undefined
    vi.mocked(api.put).mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    const { client, wrapper } = setup()
    const a = progressQueryKeys.adherenceConfig('admin-a', 'shared', '2026-09-01')
    const b = progressQueryKeys.adherenceConfig('admin-b', 'shared', '2026-09-01')
    const other = progressQueryKeys.adherenceConfig('admin-a', 'other', '2026-09-01')
    client.setQueryData(a, policy); client.setQueryData(b, unknown); client.setQueryData(other, policy)
    const hook = renderHook(() => useUpdateAdherenceConfig(), { wrapper })
    let pending: Promise<AdherenceConfig> | undefined
    act(() => { pending = hook.result.current.mutateAsync({ clientId: 'shared', config: payload }) })
    await waitFor(() => expect(finish).toBeDefined())
    act(() => useAuth.setState({ user: admin('admin-b'), isAuthenticated: true }))
    await act(async () => { finish?.(response(policy)); await pending })
    expect(client.getQueryState(a)?.isInvalidated).toBe(true)
    expect(client.getQueryState(b)?.isInvalidated).toBe(false)
    expect(client.getQueryState(other)?.isInvalidated).toBe(false)
  })

  it('isolates client and date queries, even when an old client resolves after rerender', async () => {
    let resolveA: ((value: ReturnType<typeof response>) => void) | undefined
    vi.mocked(api.get).mockImplementation((url) => String(url).includes('/a/')
      ? new Promise((resolve) => { resolveA = resolve }) : Promise.resolve(response(policy)))
    const { client, wrapper } = setup()
    const hook = renderHook(({ id, date }) => useAdherenceConfig(id, date), {
      wrapper, initialProps: { id: 'a', date: '2026-09-01' },
    })
    await waitFor(() => expect(resolveA).toBeDefined())
    hook.rerender({ id: 'b', date: '2026-09-02' })
    await waitFor(() => expect(hook.result.current.data).toEqual(policy))
    await act(async () => { resolveA?.(response(unknown)); await Promise.resolve() })
    expect(hook.result.current.data).toEqual(policy)
    expect(client.getQueryCache().findAll({ queryKey: progressQueryKeys.adherenceConfig('admin-a', 'b', '2026-09-02') })[0]?.state.data).toEqual(policy)
    expect(progressQueryKeys.adherenceConfig('admin-a', 'a', '2026-09-01')).not.toEqual(
      progressQueryKeys.adherenceConfig('admin-a', 'b', '2026-09-02'))
    expect(api.get).toHaveBeenCalledWith('/admin/clients/b/adherence/config',
      expect.objectContaining({ params: { date: '2026-09-02' } }))
  })

  it('keeps uncaptured unknown without fabricated defaults and preserves nullable steps', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(response(unknown)).mockResolvedValueOnce(response(policy))
    const { wrapper } = setup()
    const hook = renderHook(({ date }) => useAdherenceConfig('a', date), {
      wrapper, initialProps: { date: '2026-08-01' },
    })
    await waitFor(() => expect(hook.result.current.data).toEqual(unknown))
    expect(hook.result.current.data).not.toHaveProperty('steps_goal')
    hook.rerender({ date: '2026-09-01' })
    await waitFor(() => expect(hook.result.current.data).toEqual(policy))
    expect(hook.result.current.data?.known && hook.result.current.data.steps_goal).toBeNull()
  })

  it('PUT uses the mutation target and exact version/nullable policy; invalidates only that client across dates', async () => {
    let finish: ((value: ReturnType<typeof response>) => void) | undefined
    vi.mocked(api.put).mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    const { client, wrapper } = setup()
    const a = progressQueryKeys.adherenceConfig('admin-a', 'a', '2026-09-01')
    const b1 = progressQueryKeys.adherenceConfig('admin-a', 'b', '2026-09-01')
    const b2 = progressQueryKeys.adherenceConfig('admin-a', 'b', '2026-09-02')
    client.setQueryData(a, policy); client.setQueryData(b1, policy); client.setQueryData(b2, policy)
    const hook = renderHook(() => useUpdateAdherenceConfig(), { wrapper })
    let pending: Promise<AdherenceConfig> | undefined
    act(() => { pending = hook.result.current.mutateAsync({ clientId: 'b', config: payload }) })
    await waitFor(() => expect(finish).toBeDefined())
    expect(api.put).toHaveBeenCalledWith('/admin/clients/b/adherence/config', payload)
    await act(async () => { finish?.(response({ ...policy, ...payload, version: 4, source: 'revision' })); await pending })
    expect(client.getQueryState(a)?.isInvalidated).toBe(false)
    expect(client.getQueryState(b1)?.isInvalidated).toBe(true)
    expect(client.getQueryState(b2)?.isInvalidated).toBe(true)
  })

  it('surfaces a 409 without rebasing or retrying the write', async () => {
    const conflict = { isAxiosError: true, response: { status: 409 } }
    vi.mocked(api.put).mockRejectedValue(conflict)
    const { wrapper } = setup()
    const hook = renderHook(() => useUpdateAdherenceConfig(), { wrapper })
    await expect(hook.result.current.mutateAsync({ clientId: 'a', config: payload })).rejects.toBe(conflict)
    expect(api.put).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(hook.result.current.error).toBe(conflict))
  })
})
