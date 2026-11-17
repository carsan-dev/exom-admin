import { QueryClient, QueryClientProvider, type QueryKey, type UseMutationResult } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApprovalPendingError } from '@/lib/api-utils'
import type { BulkDeleteItem, BulkDeleteProgress, BulkDeleteSummary } from '@/lib/bulk-delete'
import { useBulkDeleteDiets, useDeleteDiet } from './diets/api'
import { useBulkDeleteExercises, useDeleteExercise } from './exercises/api'
import { useBulkDeleteIngredients, useDeleteIngredient } from './ingredients/api'
import { useBulkDeleteTrainings, useDeleteTraining } from './trainings/api'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }))
vi.mock('@/lib/api', () => ({ api }))
const session = vi.hoisted(() => ({ auth: { currentUser: { uid: 'u-1' } as { uid: string } | null } }))
vi.mock('@/lib/firebase', () => ({ auth: session.auth, getIdToken: vi.fn() }))

interface BulkVariables {
  items: ReadonlyArray<BulkDeleteItem>
  onProgress?: (progress: BulkDeleteProgress) => void
}

type SingleHook = () => UseMutationResult<unknown, Error, string>
type BulkHook = () => UseMutationResult<BulkDeleteSummary, Error, BulkVariables>

const FEATURES: ReadonlyArray<[string, SingleHook, BulkHook]> = [
  ['diets', useDeleteDiet, useBulkDeleteDiets],
  ['trainings', useDeleteTraining, useBulkDeleteTrainings],
  ['exercises', useDeleteExercise, useBulkDeleteExercises],
  ['ingredients', useDeleteIngredient, useBulkDeleteIngredients],
]

const ITEMS: BulkDeleteItem[] = [
  { id: 'x-1', name: 'Uno' },
  { id: 'x-2', name: 'Dos' },
]

const deleted = () => Promise.resolve({ data: { data: null }, status: 200 })
const approval = () =>
  Promise.reject(new ApprovalPendingError({ approval_request_id: 'req-1', message: 'Pendiente' }))

function forbidden() {
  const config = { headers: new AxiosHeaders() }
  return Promise.reject(
    new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, {
      status: 403,
      statusText: 'Forbidden',
      headers: {},
      config,
      data: { statusCode: 403, message: 'No tienes permiso' },
    })
  )
}

/** Renders a mutation hook and returns the query keys it invalidates, in call order. */
function renderWithSpy<T>(useHook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const spy = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(useHook, { wrapper })
  const keys = () => spy.mock.calls.map(([filters]): QueryKey | undefined => filters?.queryKey)
  return { result, keys }
}

async function singleDeleteKeys(useSingle: SingleHook) {
  const { result, keys } = renderWithSpy(useSingle)
  await act(async () => {
    await result.current.mutateAsync('x-1').catch(() => undefined)
  })
  return keys()
}

async function bulkDeleteKeys(useBulk: BulkHook) {
  const { result, keys } = renderWithSpy(useBulk)
  await act(async () => {
    await result.current.mutateAsync({ items: ITEMS })
  })
  return keys()
}

const sorted = (keys: ReadonlyArray<QueryKey | undefined>) => keys.map((key) => JSON.stringify(key)).sort()

describe.each(FEATURES)('bulk delete invalidations (%s)', (_feature, useSingle, useBulk) => {
  beforeEach(() => {
    api.delete.mockReset()
    session.auth.currentUser = { uid: 'u-1' }
  })

  it('invalidates once the same keys as the single deletion, without approvals', async () => {
    api.delete.mockImplementation(deleted)
    const single = await singleDeleteKeys(useSingle)
    const bulk = await bulkDeleteKeys(useBulk)

    expect(api.delete).toHaveBeenCalledTimes(1 + ITEMS.length)
    expect(single).not.toContainEqual(['approval-requests'])
    expect(sorted(bulk)).toEqual(sorted(single))
    expect(new Set(sorted(bulk)).size).toBe(bulk.length)
  })

  it('also invalidates approvals, once, when an item went to approval', async () => {
    api.delete.mockImplementation(approval)
    const single = await singleDeleteKeys(useSingle)
    api.delete.mockReset()
    api.delete.mockImplementationOnce(deleted).mockImplementationOnce(approval)
    const bulk = await bulkDeleteKeys(useBulk)

    expect(single).toContainEqual(['approval-requests'])
    expect(sorted(bulk)).toEqual(sorted(single))
    expect(new Set(sorted(bulk)).size).toBe(bulk.length)
  })

  it('does not invalidate approvals when items only failed', async () => {
    api.delete.mockImplementation(deleted)
    const single = await singleDeleteKeys(useSingle)
    api.delete.mockReset()
    api.delete.mockImplementation(forbidden)
    const bulk = await bulkDeleteKeys(useBulk)

    expect(bulk).not.toContainEqual(['approval-requests'])
    expect(sorted(bulk)).toEqual(sorted(single))
  })
})
