import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { type ApiEnvelope, shouldRetryQuery, unwrapResponse } from '@/lib/api-utils'
import type { BodyField, CalendarDay, DayProgress, MetricHistoryPoint, WeekSummary } from './types'
import type { BodyMetric, PaginatedResponse } from '../clients/types'

export const progressQueryKeys = {
  all: ['admin-progress'] as const,
  dayProgress: (clientId: string, date: string) =>
    ['admin-progress', clientId, 'day', date] as const,
  calendarMonth: (clientId: string, year: number, month: number) =>
    ['admin-progress', clientId, 'calendar', year, month] as const,
  weekSummary: (clientId: string, weekStart: string) =>
    ['admin-progress', clientId, 'week', weekStart] as const,
  metrics: (clientId: string, page: number) =>
    ['admin-progress', clientId, 'metrics', page] as const,
  weightHistory: (clientId: string) =>
    ['admin-progress', clientId, 'weight-history'] as const,
  bodyHistory: (clientId: string, field: string) =>
    ['admin-progress', clientId, 'body-history', field] as const,
}

export function useClientDayProgress(clientId: string, date: string) {
  return useQuery({
    queryKey: progressQueryKeys.dayProgress(clientId, date),
    enabled: Boolean(clientId) && Boolean(date),
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<DayProgress | null>>(
        `/admin/clients/${clientId}/progress`,
        { params: { date } },
      )
      return unwrapResponse(response)
    },
  })
}

export function useClientCalendarMonth(clientId: string, year: number, month: number) {
  return useQuery({
    queryKey: progressQueryKeys.calendarMonth(clientId, year, month),
    enabled: Boolean(clientId),
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<CalendarDay[]>>(
        `/admin/clients/${clientId}/calendar/month`,
        { params: { year, month } },
      )
      return unwrapResponse(response)
    },
  })
}

export function useClientWeekSummary(clientId: string, weekStart: string) {
  return useQuery({
    queryKey: progressQueryKeys.weekSummary(clientId, weekStart),
    enabled: Boolean(clientId) && Boolean(weekStart),
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<WeekSummary>>(
        `/admin/clients/${clientId}/calendar/week-summary`,
        { params: { week_start: weekStart } },
      )
      return unwrapResponse(response)
    },
  })
}

export function useClientMetrics(clientId: string, page: number, limit = 10) {
  return useQuery({
    queryKey: progressQueryKeys.metrics(clientId, page),
    enabled: Boolean(clientId),
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<PaginatedResponse<BodyMetric>>>(
        `/admin/clients/${clientId}/metrics`,
        { params: { page, limit } },
      )
      return unwrapResponse(response)
    },
  })
}

export function useClientWeightHistory(clientId: string) {
  return useQuery({
    queryKey: progressQueryKeys.weightHistory(clientId),
    enabled: Boolean(clientId),
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<MetricHistoryPoint[]>>(
        `/admin/clients/${clientId}/metrics/weight-history`,
      )
      return unwrapResponse(response)
    },
  })
}

export function useClientBodyHistory(clientId: string, field: BodyField) {
  return useQuery({
    queryKey: progressQueryKeys.bodyHistory(clientId, field),
    enabled: Boolean(clientId),
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<MetricHistoryPoint[]>>(
        `/admin/clients/${clientId}/metrics/body-history`,
        { params: { field } },
      )
      return unwrapResponse(response)
    },
  })
}

export function useResetStreak(clientId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<ApiEnvelope<{ message: string }>>(
        `/streaks/${clientId}/reset`,
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clients', clientId] })
    },
  })
}
