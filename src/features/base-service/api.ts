import axios from 'axios'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  type ApiEnvelope,
  getApiErrorMessage,
  getApiErrorStatus,
  shouldRetryQuery,
  unwrapResponse,
} from '@/lib/api-utils'
import type {
  BaseDelivery,
  BaseRoute,
  BaseSubscriber,
  CreateSubscriberPayload,
  PaginatedSubscribers,
  SubscriberListParams,
  UpdateSubscriberPayload,
} from './types'

export { getApiErrorMessage, getApiErrorStatus }

const BASE = '/admin/base-service'
export const POLL_INTERVAL_MS = 5000
export const ARCHIVE_TIMEOUT_MS = 70_000

export const baseServiceQueryKeys = {
  all: ['base-service'] as const,
  routes: ['base-service', 'routes'] as const,
  list: (params: SubscriberListParams) => ['base-service', 'subscribers', 'list', params] as const,
  subscriber: (id: string) => ['base-service', 'subscribers', 'detail', id] as const,
  deliveries: (id: string) => ['base-service', 'deliveries', id] as const,
}

export function getApiErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError<{ code?: unknown }>(error)) {
    const code = error.response?.data?.code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}

export function getApiErrorMessages(error: unknown, fallback: string): string[] {
  if (axios.isAxiosError<{ message?: unknown }>(error)) {
    const message = error.response?.data?.message
    if (Array.isArray(message)) {
      const lines = message.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
      if (lines.length > 0) return lines
    }
  }
  return [getApiErrorMessage(error, fallback)]
}

export function isNoResponseError(error: unknown) {
  return axios.isAxiosError(error) && error.response === undefined
}

export function isNotConfiguredError(error: unknown) {
  if (getApiErrorStatus(error) !== 503) return false
  const code = getApiErrorCode(error)
  return code === 'SOURCE_NOT_CONFIGURED' || code === 'EMAIL_NOT_CONFIGURED'
}

export function useBaseRoutes() {
  return useQuery({
    queryKey: baseServiceQueryKeys.routes,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => !isNotConfiguredError(error) && shouldRetryQuery(failureCount, error),
    queryFn: async () => unwrapResponse(await api.get<ApiEnvelope<BaseRoute[]>>(`${BASE}/routes`)),
  })
}

export function useBaseSubscribers(params: SubscriberListParams) {
  return useQuery({
    queryKey: baseServiceQueryKeys.list(params),
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => !isNotConfiguredError(error) && shouldRetryQuery(failureCount, error),
    refetchInterval: (query) =>
      query.state.data?.data.some((item) => item.latest_delivery?.status === 'PENDING') ? POLL_INTERVAL_MS : false,
    queryFn: async () => {
      const query: Record<string, string | number> = { archive: params.archive, page: params.page, limit: params.limit }
      if (params.q) query.q = params.q
      return unwrapResponse(
        await api.get<ApiEnvelope<PaginatedSubscribers>>(`${BASE}/subscribers`, { params: query }),
      )
    },
  })
}

export function useBaseSubscriber(id: string | null) {
  return useQuery({
    queryKey: baseServiceQueryKeys.subscriber(id ?? ''),
    enabled: Boolean(id),
    retry: shouldRetryQuery,
    refetchInterval: (query) =>
      query.state.data?.latest_delivery?.status === 'PENDING' ? POLL_INTERVAL_MS : false,
    queryFn: async () =>
      unwrapResponse(await api.get<ApiEnvelope<BaseSubscriber>>(`${BASE}/subscribers/${id}`)),
  })
}

export function useBaseDeliveries(id: string | null) {
  return useQuery({
    queryKey: baseServiceQueryKeys.deliveries(id ?? ''),
    enabled: Boolean(id),
    retry: shouldRetryQuery,
    refetchInterval: (query) =>
      query.state.data?.some((item) => item.status === 'PENDING') ? POLL_INTERVAL_MS : false,
    queryFn: async () =>
      unwrapResponse(await api.get<ApiEnvelope<BaseDelivery[]>>(`${BASE}/subscribers/${id}/deliveries`)),
  })
}

function useRefreshBaseService() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: baseServiceQueryKeys.all })
}

export function useCreateSubscriber() {
  const refresh = useRefreshBaseService()
  return useMutation({
    mutationFn: async (payload: CreateSubscriberPayload) =>
      unwrapResponse(await api.post<ApiEnvelope<BaseSubscriber>>(`${BASE}/subscribers`, payload)),
    onSuccess: refresh,
  })
}

export function useUpdateSubscriber() {
  const refresh = useRefreshBaseService()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateSubscriberPayload }) =>
      unwrapResponse(await api.patch<ApiEnvelope<BaseSubscriber>>(`${BASE}/subscribers/${id}`, payload)),
    onSuccess: refresh,
    onError: refresh,
  })
}

export function useArchiveSubscriber() {
  const refresh = useRefreshBaseService()
  return useMutation({
    mutationFn: async ({ id, is_archived }: { id: string; is_archived: boolean }) =>
      unwrapResponse(
        await api.put<ApiEnvelope<BaseSubscriber>>(
          `${BASE}/subscribers/${id}/archive`,
          { is_archived },
          // The server may wait up to ~60 s for an email being sent; the shared client times out at 15 s.
          { timeout: ARCHIVE_TIMEOUT_MS },
        ),
      ),
    onSuccess: refresh,
    onError: refresh,
  })
}

export function useSendMonth() {
  const refresh = useRefreshBaseService()
  return useMutation({
    mutationFn: async ({ id, month }: { id: string; month: number }) =>
      unwrapResponse(
        await api.post<ApiEnvelope<BaseDelivery>>(`${BASE}/subscribers/${id}/deliveries`, { month }),
      ),
    onSuccess: refresh,
    onError: refresh,
  })
}

export function useResendDelivery() {
  const refresh = useRefreshBaseService()
  return useMutation({
    mutationFn: async ({ subscriberId, deliveryId }: { subscriberId: string; deliveryId: string }) =>
      unwrapResponse(
        await api.post<ApiEnvelope<BaseDelivery>>(
          `${BASE}/subscribers/${subscriberId}/deliveries/${deliveryId}/resend`,
        ),
      ),
    onSuccess: refresh,
    onError: refresh,
  })
}
