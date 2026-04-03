import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { type ApiEnvelope, shouldRetryQuery, unwrapResponse } from '@/lib/api-utils'
import type { FeedbackItem, FeedbackStats, FeedbackStatusFilter, PaginatedFeedback } from './types'

export const feedbackQueryKeys = {
  all: ['admin-feedback'] as const,
  list: (clientId?: string, status?: FeedbackStatusFilter, page?: number, limit?: number) =>
    ['admin-feedback', 'list', clientId, status, page, limit] as const,
  stats: () => ['admin-feedback', 'stats'] as const,
}

export function useFeedbackList(
  clientId?: string,
  status?: FeedbackStatusFilter,
  page = 1,
  limit = 20,
) {
  return useQuery({
    queryKey: feedbackQueryKeys.list(clientId, status, page, limit),
    retry: shouldRetryQuery,
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit }
      if (clientId) params.client_id = clientId
      if (status && status !== 'ALL') params.status = status
      const response = await api.get<ApiEnvelope<PaginatedFeedback>>('/feedback', { params })
      return unwrapResponse(response)
    },
  })
}

export function useFeedbackStats() {
  return useQuery({
    queryKey: feedbackQueryKeys.stats(),
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<FeedbackStats>>('/feedback/stats')
      return unwrapResponse(response)
    },
  })
}

export function useRespondFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, admin_response }: { id: string; admin_response: string }) => {
      const response = await api.put<ApiEnvelope<FeedbackItem>>(`/feedback/${id}/respond`, {
        admin_response,
      })
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: feedbackQueryKeys.all })
    },
  })
}
