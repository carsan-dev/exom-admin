import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import { usePublishRecapReview, useSaveRecapReviewDraft, useRecapDetail } from './api'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
vi.mock('@/hooks/use-auth', async () => {
  const { create } = await import('zustand')
  return { useAuth: create(() => ({ user: { id: 'staff' } })) }
})
const envelope = (data: unknown) => ({ data: { data } })
beforeEach(() => {
  api.get.mockReset(); api.put.mockReset(); api.post.mockReset()
  useAuth.setState({ user: { id: 'staff', email: 'staff@example.invalid', role: 'ADMIN', profile: null } })
})
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: 3 } } })
  return { client, wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> }
}
it('sends exact draft and explicit publish commands without legacy fields', async () => {
  api.put.mockResolvedValue(envelope({ id: 'recap', review_version: 4 }))
  api.post.mockResolvedValue(envelope({ id: 'recap', review_version: 5 }))
  const context = wrapper()
  const draft = renderHook(useSaveRecapReviewDraft, context)
  const publish = renderHook(usePublishRecapReview, context)
  await act(async () => { await draft.result.current.mutateAsync({ id: 'recap', expected_version: 3, coach_summary: 'Resumen', changes: null, next_week_goals: 'Objetivos' }) })
  expect(api.put).toHaveBeenCalledWith('/recaps/recap/review-draft', { expected_version: 3, coach_summary: 'Resumen', changes: null, next_week_goals: 'Objetivos' })
  expect(api.post).not.toHaveBeenCalled()
  await act(async () => { await publish.result.current.mutateAsync({ id: 'recap', expected_version: 4, confirm: true }) })
  expect(api.post).toHaveBeenCalledWith('/recaps/recap/review-publish', { expected_version: 4, confirm: true })
})
it('never retries publication even when the QueryClient defaults to retry', async () => {
  api.post.mockRejectedValue(new Error('Lost response'))
  const hook = renderHook(usePublishRecapReview, wrapper())
  await act(async () => { await expect(hook.result.current.mutateAsync({ id: 'recap', expected_version: 4, confirm: true })).rejects.toThrow('Lost response') })
  expect(api.post).toHaveBeenCalledTimes(1)
})
it('suppresses a late read across logout and login to the same account', async () => {
  let finish: (value: unknown) => void = () => undefined
  api.get.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
  api.get.mockResolvedValue(envelope({ id: 'recap', admin_comments: 'new session' }))
  const hook = renderHook(() => useRecapDetail('recap'), wrapper())
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1))
  await act(async () => { useAuth.setState({ user: null }) })
  await act(async () => { useAuth.setState({ user: { id: 'staff', email: 'staff@example.invalid', role: 'ADMIN', profile: null } }) })
  await waitFor(() => expect(hook.result.current.data?.admin_comments).toBe('new session'))
  await act(async () => { finish(envelope({ id: 'recap', admin_comments: 'old session' })) })
  expect(hook.result.current.data?.admin_comments).toBe('new session')
})
it('rejects a late mutation and does not refresh the replacement identity', async () => {
  let finish: (value: unknown) => void = () => undefined
  api.post.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
  const context = wrapper()
  const invalidate = vi.spyOn(context.client, 'invalidateQueries')
  const hook = renderHook(usePublishRecapReview, context)
  let result: Promise<unknown>
  act(() => { result = hook.result.current.mutateAsync({ id: 'recap', expected_version: 4, confirm: true }).catch((error: unknown) => error) })
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
  await act(async () => { useAuth.setState({ user: null }); finish(envelope({ id: 'recap', review_version: 5 })); await result })
  expect(invalidate).not.toHaveBeenCalled()
})
