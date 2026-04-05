import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { invalidateAdminQueries, invalidateAdminQueriesOnApprovalPending } from '@/lib/admin-query-invalidations'
import {
  type ApiEnvelope,
  getApiErrorMessage,
  shouldRetryQuery,
  unwrapResponse,
} from '@/lib/api-utils'
import type {
  NotificationStats,
  NotificationStatusFilter,
  PaginatedNotifications,
  SendNotificationPayload,
  SendNotificationResponse,
  SendToAllClientsPayload,
} from './types'

export { getApiErrorMessage }

export const notificationsQueryKeys = {
  all: ['admin-notifications'] as const,
  list: (
    recipientId?: string,
    status?: NotificationStatusFilter,
    search?: string,
    page?: number,
    limit?: number,
  ) => ['admin-notifications', 'list', recipientId, status, search, page, limit] as const,
  stats: () => ['admin-notifications', 'stats'] as const,
}

export function useNotificationHistory(
  recipientId?: string,
  status?: NotificationStatusFilter,
  search?: string,
  page = 1,
  limit = 20,
) {
  return useQuery({
    queryKey: notificationsQueryKeys.list(recipientId, status, search, page, limit),
    retry: shouldRetryQuery,
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit }
      if (recipientId) params.recipient_id = recipientId
      if (status && status !== 'ALL') params.status = status
      if (search?.trim()) params.search = search.trim()

      const response = await api.get<ApiEnvelope<PaginatedNotifications>>('/notifications/history', {
        params,
      })
      return unwrapResponse(response)
    },
  })
}

export function useNotificationStats() {
  return useQuery({
    queryKey: notificationsQueryKeys.stats(),
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<NotificationStats>>('/notifications/stats')
      return unwrapResponse(response)
    },
  })
}

export function useSendNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SendNotificationPayload) => {
      const response = await api.post<ApiEnvelope<SendNotificationResponse>>('/notifications/send', payload)
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [notificationsQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [notificationsQueryKeys.all],
      })
    },
  })
}

export function useSendToAllClients() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SendToAllClientsPayload) => {
      const response = await api.post<ApiEnvelope<SendNotificationResponse>>('/notifications/send-all', payload)
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [notificationsQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [notificationsQueryKeys.all],
      })
    },
  })
}
