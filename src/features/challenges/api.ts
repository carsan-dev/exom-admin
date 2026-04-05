import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { invalidateAdminQueries, invalidateAdminQueriesOnApprovalPending } from '@/lib/admin-query-invalidations'
import { type ApiEnvelope, getApiErrorMessage, shouldRetryQuery, unwrapResponse } from '@/lib/api-utils'
import type {
  AssignChallengeValues,
  ChallengeDetail,
  ChallengeDetailFilters,
  ChallengeFilters,
  ChallengeFormValues,
  ChallengeMutationResponse,
  ChallengesResponse,
} from './types'

export { getApiErrorMessage }

interface MutationMessage {
  message: string
}

interface AssignChallengeResponse {
  challenge_id: string
  assigned_clients: number
}

interface UpdateChallengePayload {
  id: string
  values: ChallengeFormValues
}

interface AssignChallengePayload {
  id: string
  values: AssignChallengeValues
}

export const challengesQueryKeys = {
  all: ['admin-challenges'] as const,
  list: (
    page: number,
    limit: number,
    search?: string,
    type?: string,
    isManual?: boolean,
    isGlobal?: boolean,
    completionStatus?: string,
  ) => ['admin-challenges', 'list', page, limit, search, type, isManual, isGlobal, completionStatus] as const,
  detail: (id?: string, page?: number, limit?: number, clientId?: string, isCompleted?: boolean) =>
    ['admin-challenges', 'detail', id, page, limit, clientId, isCompleted] as const,
}

function normalizeChallengePayload(values: ChallengeFormValues) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    type: values.type,
    target_value: values.target_value,
    unit: values.unit.trim(),
    is_manual: values.is_manual,
    is_global: values.is_global,
    deadline: values.deadline.trim() || null,
    rule_key: values.is_manual ? null : values.rule_key,
    ...(values.is_manual ? {} : { rule_config: values.rule_config ?? undefined }),
  }
}

export function useChallenges(filters: ChallengeFilters) {
  return useQuery({
    queryKey: challengesQueryKeys.list(
      filters.page,
      filters.limit,
      filters.search,
      filters.type,
      filters.is_manual,
      filters.is_global,
      filters.completion_status,
    ),
    retry: shouldRetryQuery,
    queryFn: async () => {
      const params: Record<string, string | number | boolean> = {
        page: filters.page,
        limit: filters.limit,
      }

      if (filters.search?.trim()) params.search = filters.search.trim()
      if (filters.type) params.type = filters.type
      if (filters.is_manual !== undefined) params.is_manual = filters.is_manual
      if (filters.is_global !== undefined) params.is_global = filters.is_global
      if (filters.completion_status) params.completion_status = filters.completion_status

      const response = await api.get<ApiEnvelope<ChallengesResponse>>('/challenges', { params })
      return unwrapResponse(response)
    },
  })
}

export function useChallengeDetail(id: string | undefined, filters: ChallengeDetailFilters, enabled = true) {
  return useQuery({
    queryKey: challengesQueryKeys.detail(id, filters.page, filters.limit, filters.client_id, filters.is_completed),
    enabled: enabled && Boolean(id),
    retry: shouldRetryQuery,
    queryFn: async () => {
      if (!id) {
        throw new Error('Challenge id is required')
      }

      const params: Record<string, string | number | boolean> = {
        page: filters.page,
        limit: filters.limit,
      }

      if (filters.client_id) params.client_id = filters.client_id
      if (filters.is_completed !== undefined) params.is_completed = filters.is_completed

      const response = await api.get<ApiEnvelope<ChallengeDetail>>(`/challenges/${id}`, { params })
      return unwrapResponse(response)
    },
  })
}

export function useCreateChallenge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: ChallengeFormValues) => {
      const response = await api.post<ApiEnvelope<ChallengeMutationResponse>>('/challenges', normalizeChallengePayload(values))
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [challengesQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [challengesQueryKeys.all],
      })
    },
  })
}

export function useUpdateChallenge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: UpdateChallengePayload) => {
      const response = await api.put<ApiEnvelope<ChallengeMutationResponse>>(`/challenges/${id}`, normalizeChallengePayload(values))
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [challengesQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [challengesQueryKeys.all],
      })
    },
  })
}

export function useDeleteChallenge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<ApiEnvelope<MutationMessage>>(`/challenges/${id}`)
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [challengesQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [challengesQueryKeys.all],
      })
    },
  })
}

export function useAssignChallenge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: AssignChallengePayload) => {
      const response = await api.post<ApiEnvelope<AssignChallengeResponse>>(`/challenges/${id}/assign`, values)
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [challengesQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [challengesQueryKeys.all],
      })
    },
  })
}
