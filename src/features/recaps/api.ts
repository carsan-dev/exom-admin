import { useSyncExternalStore } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { invalidateAdminQueries } from '@/lib/admin-query-invalidations'
import { type ApiEnvelope, shouldRetryQuery, unwrapResponse } from '@/lib/api-utils'
import type { PaginatedRecaps, RecapItem, RecapStats, RecapStatusFilter, RecapReviewDraft, RecapReviewPublish, RecapReviewRecord } from './types'

// A → logout → A is a different session even when the persisted staff id matches.
let generation = 0
useAuth.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) generation++
})
export function recapIdentity() { return `${useAuth.getState().user?.id ?? ''}:${generation}` }
export function useRecapIdentity() { return useSyncExternalStore(useAuth.subscribe, recapIdentity, recapIdentity) }
function assertIdentity(identity: string) {
  if (!useAuth.getState().user?.id || recapIdentity() !== identity) throw new Error('La sesión ha cambiado')
}
export async function getRecapForReview(id: string, identity: string, signal?: AbortSignal) {
  assertIdentity(identity)
  const response = await api.get<ApiEnvelope<RecapItem>>(`/recaps/${id}`, { signal })
  assertIdentity(identity)
  return unwrapResponse(response)
}

export const recapsQueryKeys = {
  all: ['admin-recaps'] as const,
  list: (
    clientId?: string,
    status?: RecapStatusFilter,
    archived?: boolean,
    page?: number,
    limit?: number,
    identity?: string,
  ) => ['admin-recaps', 'list', clientId, status, archived, page, limit, identity] as const,
  stats: () => ['admin-recaps', 'stats'] as const,
  detail: (id?: string, identity?: string) => ['admin-recaps', 'detail', id, identity] as const,
}

export function useRecapsList(
  clientId?: string,
  status?: RecapStatusFilter,
  archived = false,
  page = 1,
  limit = 20,
) {
  const identity = useRecapIdentity()
  return useQuery({
    queryKey: recapsQueryKeys.list(clientId, status, archived, page, limit, identity),
    enabled: Boolean(useAuth.getState().user?.id),
    retry: false,
    queryFn: async ({ signal }) => {
      assertIdentity(identity)
      const params: Record<string, string | number | boolean> = { page, limit }
      if (clientId) params.client_id = clientId
      if (status && status !== 'ALL') params.status = status
      if (archived) params.archived = true

      const response = await api.get<ApiEnvelope<PaginatedRecaps>>('/recaps', { params, signal })
      assertIdentity(identity)
      return unwrapResponse(response)
    },
  })
}

export function useRecapStats() {
  return useQuery({
    queryKey: recapsQueryKeys.stats(),
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<RecapStats>>('/recaps/stats')
      return unwrapResponse(response)
    },
  })
}

export function useRecapDetail(id?: string) {
  const identity = useRecapIdentity()
  return useQuery({
    queryKey: recapsQueryKeys.detail(id, identity),
    enabled: Boolean(id && useAuth.getState().user?.id),
    retry: false,
    queryFn: ({ signal }) => {
      if (!id) throw new Error('Recap id is required')
      return getRecapForReview(id, identity, signal)
    },
  })
}

function useReviewCommand<T extends RecapReviewDraft | RecapReviewPublish>(publish: boolean) {
  const queryClient = useQueryClient()
  const identity = useRecapIdentity()
  return useMutation({
    retry: false,
    mutationFn: async ({ id, ...body }: T & { id: string }) => {
      assertIdentity(identity)
      const response = publish
        ? await api.post<ApiEnvelope<RecapReviewRecord>>(`/recaps/${id}/review-publish`, body)
        : await api.put<ApiEnvelope<RecapReviewRecord>>(`/recaps/${id}/review-draft`, body)
      assertIdentity(identity)
      return unwrapResponse(response)
    },
    onSuccess: (data, { id }) => {
      if (recapIdentity() !== identity) return
      queryClient.setQueryData<RecapItem>(recapsQueryKeys.detail(id, identity), (current) => current ? { ...current, ...data } : current)
      // A confirmed command must not turn into a failed save if refresh fails.
      void invalidateAdminQueries(queryClient, { includeDashboard: true, extraQueryKeys: [recapsQueryKeys.all] }).catch(() => undefined)
    },
  })
}
export function useSaveRecapReviewDraft() { return useReviewCommand<RecapReviewDraft>(false) }
export function usePublishRecapReview() { return useReviewCommand<RecapReviewPublish>(true) }

export function useReviewRecap() {
  const queryClient = useQueryClient()
  const identity = useRecapIdentity()

  return useMutation({
    retry: false,
    mutationFn: async ({
      id,
      admin_comments,
      client_feedback_text,
    }: {
      id: string
      admin_comments?: string
      client_feedback_text?: string
    }) => {
      assertIdentity(identity)
      const response = await api.put<ApiEnvelope<Omit<RecapItem, 'client'>>>(`/recaps/${id}/review`, {
        ...(admin_comments !== undefined ? { admin_comments } : {}),
        ...(client_feedback_text !== undefined ? { client_feedback_text } : {}),
      })
      assertIdentity(identity)
      return unwrapResponse(response)
    },
    onSuccess: (data, variables) => {
      if (recapIdentity() !== identity) return
      queryClient.setQueryData<RecapItem>(recapsQueryKeys.detail(variables.id, identity), (current) => current ? { ...current, ...data } : current)
      void invalidateAdminQueries(queryClient, {
        includeDashboard: true,
        extraQueryKeys: [recapsQueryKeys.all],
      }).catch(() => undefined)
    },
  })
}

export function useArchiveRecap() {
  const queryClient = useQueryClient()
  const identity = useRecapIdentity()

  return useMutation({
    retry: false,
    mutationFn: async (id: string) => {
      assertIdentity(identity)
      const response = await api.put<ApiEnvelope<Omit<RecapItem, 'client'>>>(`/recaps/${id}/archive`)
      assertIdentity(identity)
      return unwrapResponse(response)
    },
    onSuccess: (data, id) => {
      if (recapIdentity() !== identity) return
      queryClient.setQueryData<RecapItem>(recapsQueryKeys.detail(id, identity), (current) => current ? { ...current, ...data } : current)
      void invalidateAdminQueries(queryClient, {
        includeDashboard: true,
        extraQueryKeys: [recapsQueryKeys.all],
      }).catch(() => undefined)
    },
  })
}
