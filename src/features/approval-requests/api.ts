import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { approvalManagedResourceQueryKeys, invalidateAdminQueries } from '@/lib/admin-query-invalidations'
import { type ApiEnvelope, shouldRetryQuery, unwrapResponse } from '@/lib/api-utils'
import type {
  ApprovalRequest,
  ApprovalRequestDetail,
  ApprovalStats,
  ApprovalStatus,
  MyApprovalRequestFilters,
  PaginatedApprovalRequests,
  ResolveApprovalRequestPayload,
  ResourceApprovalSummary,
} from './types'

const APPROVAL_LIST_REFETCH_INTERVAL = 15_000
const APPROVAL_DETAIL_REFETCH_INTERVAL = 10_000

interface ApprovalRequestListFilters {
  status?: ApprovalStatus | 'ALL'
  resource_type?: string
  page?: number
  limit?: number
}

interface ApprovalRequestFilters extends ApprovalRequestListFilters {
  requester_id?: string
}

function buildListQueryParams(filters: ApprovalRequestListFilters) {
  const params: Record<string, string | number> = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
  }

  if (filters.status && filters.status !== 'ALL') {
    params.status = filters.status
  }

  if (filters.resource_type && filters.resource_type !== 'ALL') {
    params.resource_type = filters.resource_type
  }

  return params
}

function buildApprovalRequestsQueryParams(filters: ApprovalRequestFilters) {
  const params = buildListQueryParams(filters)

  if (filters.requester_id) {
    params.requester_id = filters.requester_id
  }

  return params
}

export const approvalKeys = {
  all: ['approval-requests'] as const,
  list: (filters: ApprovalRequestFilters) => ['approval-requests', 'list', filters] as const,
  my: (filters: MyApprovalRequestFilters) => ['approval-requests', 'my', filters] as const,
  detail: (id?: string) => ['approval-requests', 'detail', id] as const,
  stats: ['approval-requests', 'stats'] as const,
  byResource: (resourceType: string, resourceId?: string) => ['approval-requests', 'resource', resourceType, resourceId] as const,
  batch: (resourceType: string, resourceIds: string[]) => ['approval-requests', 'batch', resourceType, resourceIds] as const,
}

export function useApprovalRequests(filters: ApprovalRequestFilters, enabled = true) {
  return useQuery({
    queryKey: approvalKeys.list(filters),
    enabled,
    retry: shouldRetryQuery,
    staleTime: APPROVAL_DETAIL_REFETCH_INTERVAL,
    refetchInterval: enabled ? APPROVAL_LIST_REFETCH_INTERVAL : false,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<PaginatedApprovalRequests>>('/approval-requests', {
        params: buildApprovalRequestsQueryParams(filters),
      })

      return unwrapResponse(response)
    },
  })
}

export function useMyApprovalRequests(filters: MyApprovalRequestFilters, enabled = true) {
  return useQuery({
    queryKey: approvalKeys.my(filters),
    enabled,
    retry: shouldRetryQuery,
    staleTime: APPROVAL_DETAIL_REFETCH_INTERVAL,
    refetchInterval: enabled ? APPROVAL_LIST_REFETCH_INTERVAL : false,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<PaginatedApprovalRequests>>('/approval-requests/my', {
        params: buildListQueryParams(filters),
      })

      return unwrapResponse(response)
    },
  })
}

export function useApprovalRequest(id?: string, enabled = true) {
  return useQuery({
    queryKey: approvalKeys.detail(id),
    enabled: enabled && Boolean(id),
    retry: shouldRetryQuery,
    staleTime: APPROVAL_DETAIL_REFETCH_INTERVAL,
    refetchInterval: enabled && Boolean(id) ? APPROVAL_DETAIL_REFETCH_INTERVAL : false,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!id) {
        throw new Error('Approval request id is required')
      }

      const response = await api.get<ApiEnvelope<ApprovalRequestDetail>>(`/approval-requests/${id}`)
      return unwrapResponse(response)
    },
  })
}

export function useApprovalStats(enabled = true) {
  return useQuery({
    queryKey: approvalKeys.stats,
    enabled,
    retry: shouldRetryQuery,
    staleTime: APPROVAL_DETAIL_REFETCH_INTERVAL,
    refetchInterval: enabled ? APPROVAL_LIST_REFETCH_INTERVAL : false,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<ApprovalStats>>('/approval-requests/stats')
      return unwrapResponse(response)
    },
  })
}

export function useResourceApprovalStatus(resourceType: string, resourceId?: string, enabled = true) {
  return useQuery({
    queryKey: approvalKeys.byResource(resourceType, resourceId),
    enabled: enabled && Boolean(resourceId),
    retry: shouldRetryQuery,
    staleTime: APPROVAL_DETAIL_REFETCH_INTERVAL,
    refetchInterval: enabled && Boolean(resourceId) ? APPROVAL_LIST_REFETCH_INTERVAL : false,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!resourceId) {
        throw new Error('Resource id is required')
      }

      const response = await api.get<ApiEnvelope<ApprovalRequest[]>>(
        `/approval-requests/resource/${resourceType}/${resourceId}`,
      )

      return unwrapResponse(response)
    },
  })
}

export function useResourceApprovalBatch(resourceType: string, resourceIds: string[], enabled = true) {
  const normalizedIds = [...new Set(resourceIds.filter(Boolean))]

  return useQuery({
    queryKey: approvalKeys.batch(resourceType, normalizedIds),
    enabled: enabled && normalizedIds.length > 0,
    retry: shouldRetryQuery,
    staleTime: APPROVAL_DETAIL_REFETCH_INTERVAL,
    refetchInterval: enabled && normalizedIds.length > 0 ? APPROVAL_LIST_REFETCH_INTERVAL : false,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<ResourceApprovalSummary[]>>(
        `/approval-requests/resource/${resourceType}/batch`,
        {
          params: { ids: normalizedIds.join(',') },
        },
      )

      return unwrapResponse(response)
    },
  })
}

export function useResolveApprovalRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ResolveApprovalRequestPayload }) => {
      const response = await api.put<ApiEnvelope<ApprovalRequest>>(`/approval-requests/${id}/resolve`, values)
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        includeApprovalQueries: true,
        extraQueryKeys: approvalManagedResourceQueryKeys,
      })
    },
  })
}

export function useCancelApprovalRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<ApiEnvelope<{ message: string }>>(`/approval-requests/${id}`)
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        includeApprovalQueries: true,
      })
    },
  })
}
