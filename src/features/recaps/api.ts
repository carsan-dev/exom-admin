import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { type ApiEnvelope, shouldRetryQuery, unwrapResponse } from '@/lib/api-utils'
import type { PaginatedRecaps, RecapItem, RecapStats, RecapStatusFilter } from './types'

export const recapsQueryKeys = {
  all: ['admin-recaps'] as const,
  list: (
    clientId?: string,
    status?: RecapStatusFilter,
    archived?: boolean,
    page?: number,
    limit?: number,
  ) => ['admin-recaps', 'list', clientId, status, archived, page, limit] as const,
  stats: () => ['admin-recaps', 'stats'] as const,
  detail: (id?: string) => ['admin-recaps', 'detail', id] as const,
}

export function useRecapsList(
  clientId?: string,
  status?: RecapStatusFilter,
  archived = false,
  page = 1,
  limit = 20,
) {
  return useQuery({
    queryKey: recapsQueryKeys.list(clientId, status, archived, page, limit),
    retry: shouldRetryQuery,
    queryFn: async () => {
      const params: Record<string, string | number | boolean> = { page, limit }
      if (clientId) params.client_id = clientId
      if (status && status !== 'ALL') params.status = status
      if (archived) params.archived = true

      const response = await api.get<ApiEnvelope<PaginatedRecaps>>('/recaps', { params })
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
  return useQuery({
    queryKey: recapsQueryKeys.detail(id),
    enabled: Boolean(id),
    retry: shouldRetryQuery,
    queryFn: async () => {
      if (!id) {
        throw new Error('Recap id is required')
      }

      const response = await api.get<ApiEnvelope<RecapItem>>(`/recaps/${id}`)
      return unwrapResponse(response)
    },
  })
}

export function useReviewRecap() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      admin_comments,
      client_feedback_text,
    }: {
      id: string
      admin_comments?: string
      client_feedback_text?: string
    }) => {
      const response = await api.put<ApiEnvelope<RecapItem>>(`/recaps/${id}/review`, {
        ...(admin_comments !== undefined ? { admin_comments } : {}),
        ...(client_feedback_text !== undefined ? { client_feedback_text } : {}),
      })
      return unwrapResponse(response)
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: recapsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: recapsQueryKeys.detail(variables.id) }),
      ])
    },
  })
}

export function useArchiveRecap() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.put<ApiEnvelope<RecapItem>>(`/recaps/${id}/archive`)
      return unwrapResponse(response)
    },
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: recapsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: recapsQueryKeys.detail(id) }),
      ])
    },
  })
}
