import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { invalidateAdminQueries, invalidateAdminQueriesOnApprovalPending } from '@/lib/admin-query-invalidations'
import { type ApiEnvelope, getApiErrorMessage, shouldRetryQuery, unwrapResponse } from '@/lib/api-utils'
import type {
  AchievementDetail,
  AchievementDetailFilters,
  AchievementFilters,
  AchievementFormValues,
  GrantedAchievementRecord,
  AchievementListItem,
  AchievementsResponse,
  GrantAchievementValues,
  RecomputeAchievementsResult,
  RecomputeAchievementsValues,
} from './types'

export { getApiErrorMessage }

interface MutationMessage {
  message: string
}

interface UpdateAchievementPayload {
  id: string
  values: AchievementFormValues
}

interface GrantAchievementPayload {
  id: string
  values: GrantAchievementValues
}

interface RevokeAchievementPayload {
  id: string
  user_id: string
}

interface RecomputeAchievementPayload {
  values: RecomputeAchievementsValues
}

export const achievementsQueryKeys = {
  all: ['admin-achievements'] as const,
  list: (page: number, limit: number, search?: string, criteriaType?: string) =>
    ['admin-achievements', 'list', page, limit, search, criteriaType] as const,
  detail: (id?: string, page?: number, limit?: number) =>
    ['admin-achievements', 'detail', id, page, limit] as const,
}

function normalizeAchievementPayload(values: AchievementFormValues) {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    icon_url: values.icon_url?.trim() || null,
    criteria_type: values.criteria_type,
    criteria_value: values.criteria_value,
    rule_config:
      values.criteria_type === 'TRAINING_DAYS' && values.rule_config.training_type
        ? values.rule_config
        : undefined,
  }
}

export function useAchievements(filters: AchievementFilters) {
  return useQuery({
    queryKey: achievementsQueryKeys.list(filters.page, filters.limit, filters.search, filters.criteria_type),
    retry: shouldRetryQuery,
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: filters.page,
        limit: filters.limit,
      }

      if (filters.search?.trim()) params.search = filters.search.trim()
      if (filters.criteria_type) params.criteria_type = filters.criteria_type

      const response = await api.get<ApiEnvelope<AchievementsResponse>>('/achievements', { params })
      return unwrapResponse(response)
    },
  })
}

export function useAchievementDetail(id: string | undefined, filters: AchievementDetailFilters, enabled = true) {
  return useQuery({
    queryKey: achievementsQueryKeys.detail(id, filters.page, filters.limit),
    enabled: enabled && Boolean(id),
    retry: shouldRetryQuery,
    queryFn: async () => {
      if (!id) throw new Error('Achievement id is required')

      const params: Record<string, string | number> = {
        page: filters.page,
        limit: filters.limit,
      }

      const response = await api.get<ApiEnvelope<AchievementDetail>>(`/achievements/${id}`, { params })
      return unwrapResponse(response)
    },
  })
}

export function useCreateAchievement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: AchievementFormValues) => {
      const response = await api.post<ApiEnvelope<AchievementListItem>>('/achievements', normalizeAchievementPayload(values))
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [achievementsQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [achievementsQueryKeys.all],
      })
    },
  })
}

export function useUpdateAchievement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: UpdateAchievementPayload) => {
      const response = await api.put<ApiEnvelope<AchievementListItem>>(`/achievements/${id}`, normalizeAchievementPayload(values))
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [achievementsQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [achievementsQueryKeys.all],
      })
    },
  })
}

export function useDeleteAchievement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<ApiEnvelope<MutationMessage>>(`/achievements/${id}`)
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [achievementsQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [achievementsQueryKeys.all],
      })
    },
  })
}

export function useGrantAchievement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: GrantAchievementPayload) => {
      const response = await api.post<ApiEnvelope<GrantedAchievementRecord>>(`/achievements/${id}/grant`, {
        user_id: values.client_ids[0],
      })
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [achievementsQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [achievementsQueryKeys.all],
      })
    },
  })
}

export function useRevokeAchievement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, user_id }: RevokeAchievementPayload) => {
      const response = await api.delete<ApiEnvelope<MutationMessage>>(`/achievements/${id}/revoke`, { data: { user_id } })
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [achievementsQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [achievementsQueryKeys.all],
      })
    },
  })
}

export function useRecomputeAchievements() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ values }: RecomputeAchievementPayload) => {
      const response = await api.post<ApiEnvelope<RecomputeAchievementsResult>>('/achievements/recompute', values)
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [achievementsQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [achievementsQueryKeys.all],
      })
    },
  })
}
