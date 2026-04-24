import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  invalidateAdminQueries,
  invalidateAdminQueriesOnApprovalPending,
} from '@/lib/admin-query-invalidations'
import {
  type ApiEnvelope,
  getApiErrorMessage,
  shouldRetryQuery,
  unwrapResponse,
} from '@/lib/api-utils'
import { normalizeTrainingTags, type TrainingFormValues } from './schemas'
import type { Training } from './types'
import type { Exercise, PaginatedResponse } from '../exercises/types'

export { getApiErrorMessage }

interface RenameCatalogValuePayload {
  from: string
  to: string
}

interface CatalogMutationResponse {
  value: string
  affected_count: number
}

export interface TrainingsListParams {
  page: number
  limit: number
  search?: string
  type?: string[]
  level?: string[]
  tags?: string[]
  duration_min?: number
  duration_max?: number
}

const trainingsQueryKeys = {
  all: ['trainings'] as const,
  list: (params: TrainingsListParams) =>
    [
      'trainings',
      params.page,
      params.limit,
      params.search ?? '',
      params.type ?? [],
      params.level ?? [],
      params.tags ?? [],
      params.duration_min ?? null,
      params.duration_max ?? null,
    ] as const,
  detail: (id?: string) => ['trainings', id] as const,
}

const trainingTagsQueryKey = ['trainings', 'tags'] as const
const trainingTypesQueryKey = ['trainings', 'types'] as const
const exercisesListQueryKey = ['exercises', 'list-all'] as const

function normalizeTrainingPayload(values: TrainingFormValues) {
  return {
    name: values.name.trim(),
    type: values.type,
    level: values.level,
    estimated_duration_min: values.estimated_duration_min ?? undefined,
    estimated_calories: values.estimated_calories ?? undefined,
    warmup_description: values.warmup_description?.trim() || null,
    warmup_duration_min: values.warmup_duration_min ?? undefined,
    cooldown_description: values.cooldown_description?.trim() || null,
    tags: normalizeTrainingTags(values.tags),
    exercises: values.exercises.map((ex) => ({
      exercise_id: ex.exercise_id,
      order: ex.order,
      sets: ex.sets,
      reps_or_duration: ex.reps_or_duration,
      rest_seconds: ex.rest_seconds,
    })),
  }
}

function normalizeSearch(search?: string) {
  const trimmed = search?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : ''
}

export function useTrainings(params: TrainingsListParams) {
  const { page, limit, search, type, level, tags, duration_min, duration_max } = params
  const normalizedSearch = normalizeSearch(search)
  const normalizedType = type ?? []
  const normalizedLevel = level ?? []
  const normalizedTags = tags ?? []

  return useQuery({
    queryKey: trainingsQueryKeys.list({
      page,
      limit,
      search: normalizedSearch,
      type: normalizedType,
      level: normalizedLevel,
      tags: normalizedTags,
      duration_min,
      duration_max,
    }),
    placeholderData: keepPreviousData,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<PaginatedResponse<Training>>>('/trainings', {
        params: {
          page,
          limit,
          ...(normalizedSearch ? { search: normalizedSearch } : {}),
          ...(normalizedType.length > 0 ? { type: normalizedType } : {}),
          ...(normalizedLevel.length > 0 ? { level: normalizedLevel } : {}),
          ...(normalizedTags.length > 0 ? { tags: normalizedTags } : {}),
          ...(duration_min != null ? { duration_min } : {}),
          ...(duration_max != null ? { duration_max } : {}),
        },
        paramsSerializer: { indexes: null },
      })

      return unwrapResponse(response)
    },
  })
}

export function useTraining(id?: string) {
  return useQuery({
    queryKey: trainingsQueryKeys.detail(id),
    enabled: Boolean(id),
    retry: shouldRetryQuery,
    queryFn: async () => {
      if (!id) throw new Error('Training id is required')

      const response = await api.get<ApiEnvelope<Training>>(`/trainings/${id}`)
      return unwrapResponse(response)
    },
  })
}

export function useTrainingTags() {
  return useQuery({
    queryKey: trainingTagsQueryKey,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<{ tags: string[] }>>('/trainings/tags')
      return unwrapResponse(response).tags
    },
  })
}

export function useTrainingTypes() {
  return useQuery({
    queryKey: trainingTypesQueryKey,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<{ types: string[] }>>('/trainings/types')
      return unwrapResponse(response).types
    },
  })
}

export function useCreateTraining() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: TrainingFormValues) => {
      const response = await api.post<ApiEnvelope<Training>>(
        '/trainings',
        normalizeTrainingPayload(values)
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [trainingsQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [trainingsQueryKeys.all],
      })
    },
  })
}

export function useUpdateTraining() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TrainingFormValues }) => {
      const response = await api.put<ApiEnvelope<Training>>(
        `/trainings/${id}`,
        normalizeTrainingPayload(values)
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [trainingsQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [trainingsQueryKeys.all],
      })
    },
  })
}

export function useDeleteTraining() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<ApiEnvelope<Training>>(`/trainings/${id}`)
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [trainingsQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [trainingsQueryKeys.all],
      })
    },
  })
}

export function useRenameTrainingTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: RenameCatalogValuePayload) => {
      const response = await api.patch<ApiEnvelope<CatalogMutationResponse>>(
        '/trainings/tags/rename',
        values
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [trainingsQueryKeys.all],
      })
    },
  })
}

export function useRenameTrainingType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: RenameCatalogValuePayload) => {
      const response = await api.patch<ApiEnvelope<CatalogMutationResponse>>(
        '/trainings/types/rename',
        values
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [trainingsQueryKeys.all],
      })
    },
  })
}

export function useDeleteTrainingTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (value: string) => {
      const response = await api.delete<ApiEnvelope<CatalogMutationResponse>>(
        `/trainings/tags/${encodeURIComponent(value)}`
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [trainingsQueryKeys.all],
      })
    },
  })
}

export function useExercisesList() {
  return useQuery({
    queryKey: exercisesListQueryKey,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<PaginatedResponse<Exercise>>>('/exercises', {
        params: { limit: 200 },
      })

      return unwrapResponse(response)
    },
  })
}
