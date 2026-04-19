import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { type ApiEnvelope, getApiErrorMessage, shouldRetryQuery, unwrapResponse } from '@/lib/api-utils'
import type {
  CreateNotificationTemplatePayload,
  DeletedNotificationTemplate,
  NotificationTemplate,
  UpdateNotificationTemplateSchedulePayload,
  UpdateNotificationTemplatePayload,
} from './types'

export { getApiErrorMessage }

export const notificationTemplateKeys = {
  all: ['notification-templates'] as const,
  list: () => ['notification-templates', 'list'] as const,
}

export function useNotificationTemplates(enabled = true) {
  return useQuery({
    queryKey: notificationTemplateKeys.list(),
    enabled,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<NotificationTemplate[]>>('/notifications/templates')
      return unwrapResponse(response)
    },
  })
}

export function useCreateNotificationTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: CreateNotificationTemplatePayload) => {
      const response = await api.post<ApiEnvelope<NotificationTemplate>>('/notifications/templates', values)
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationTemplateKeys.all })
    },
  })
}

export function useUpdateNotificationTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ key, values }: { key: string; values: UpdateNotificationTemplatePayload }) => {
      const response = await api.patch<ApiEnvelope<NotificationTemplate>>(
        `/notifications/templates/${key}`,
        values,
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationTemplateKeys.all })
    },
  })
}

export function useUpdateNotificationTemplateSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ key, values }: { key: string; values: UpdateNotificationTemplateSchedulePayload }) => {
      const response = await api.patch<ApiEnvelope<NotificationTemplate>>(
        `/notifications/templates/${key}/schedule`,
        values,
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationTemplateKeys.all })
    },
  })
}

export function useResetNotificationTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (key: string) => {
      const response = await api.delete<ApiEnvelope<NotificationTemplate | DeletedNotificationTemplate>>(
        `/notifications/templates/${key}`,
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationTemplateKeys.all })
    },
  })
}
