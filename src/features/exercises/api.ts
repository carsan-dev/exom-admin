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
import type { ExerciseFormValues } from './schemas'
import type { Exercise, PaginatedResponse } from './types'
export { usePresignedUrl, useUploadFile } from '../uploads/api'

export { getApiErrorMessage }

interface RenameCatalogValuePayload {
  from: string
  to: string
}

interface CatalogMutationResponse {
  value: string
  affected_count: number
}

const exercisesQueryKeys = {
  all: ['exercises'] as const,
  list: (page: number, limit: number, search: string) =>
    ['exercises', page, limit, search] as const,
  detail: (id?: string) => ['exercises', id] as const,
}

const exerciseMuscleGroupsQueryKey = ['exercises', 'muscle-groups'] as const
const exerciseEquipmentQueryKey = ['exercises', 'equipment'] as const

function normalizeExercisePayload(values: ExerciseFormValues) {
  return {
    name: values.name.trim(),
    muscle_groups: values.muscle_groups,
    equipment: values.equipment,
    level: values.level,
    video_url: values.video_url?.trim() || null,
    video_stream_id: values.video_stream_id?.trim() || null,
    thumbnail_url: values.thumbnail_url?.trim() || null,
    technique_text: values.technique_text?.trim() || null,
    common_errors_text: values.common_errors_text?.trim() || null,
    explanation_text: values.explanation_text?.trim() || null,
  }
}

function normalizeSearch(search?: string) {
  const trimmed = search?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : ''
}

export function useExercises(page: number, limit: number, search?: string) {
  const normalizedSearch = normalizeSearch(search)

  return useQuery({
    queryKey: exercisesQueryKeys.list(page, limit, normalizedSearch),
    placeholderData: keepPreviousData,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<PaginatedResponse<Exercise>>>('/exercises', {
        params: {
          page,
          limit,
          ...(normalizedSearch ? { search: normalizedSearch } : {}),
        },
      })

      return unwrapResponse(response)
    },
  })
}

export function useExerciseMuscleGroups() {
  return useQuery({
    queryKey: exerciseMuscleGroupsQueryKey,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<{ muscle_groups: string[] }>>(
        '/exercises/muscle-groups'
      )
      return unwrapResponse(response).muscle_groups
    },
  })
}

export function useExerciseEquipment() {
  return useQuery({
    queryKey: exerciseEquipmentQueryKey,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<{ equipment: string[] }>>('/exercises/equipment')
      return unwrapResponse(response).equipment
    },
  })
}

export function useExercise(id?: string) {
  return useQuery({
    queryKey: exercisesQueryKeys.detail(id),
    enabled: Boolean(id),
    retry: shouldRetryQuery,
    queryFn: async () => {
      if (!id) throw new Error('Exercise id is required')

      const response = await api.get<ApiEnvelope<Exercise>>(`/exercises/${id}`)
      return unwrapResponse(response)
    },
  })
}

export function useCreateExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: ExerciseFormValues) => {
      const response = await api.post<ApiEnvelope<Exercise>>(
        '/exercises',
        normalizeExercisePayload(values)
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [exercisesQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [exercisesQueryKeys.all],
      })
    },
  })
}

export function useUpdateExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ExerciseFormValues }) => {
      const response = await api.put<ApiEnvelope<Exercise>>(
        `/exercises/${id}`,
        normalizeExercisePayload(values)
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [exercisesQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [exercisesQueryKeys.all],
      })
    },
  })
}

export function useDeleteExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<ApiEnvelope<Exercise>>(`/exercises/${id}`)
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [exercisesQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [exercisesQueryKeys.all],
      })
    },
  })
}

export function useRenameExerciseMuscleGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: RenameCatalogValuePayload) => {
      const response = await api.patch<ApiEnvelope<CatalogMutationResponse>>(
        '/exercises/muscle-groups/rename',
        values
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [exercisesQueryKeys.all],
      })
    },
  })
}

export function useDeleteExerciseMuscleGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (value: string) => {
      const response = await api.delete<ApiEnvelope<CatalogMutationResponse>>(
        `/exercises/muscle-groups/${encodeURIComponent(value)}`
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [exercisesQueryKeys.all],
      })
    },
  })
}

export function useRenameExerciseEquipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: RenameCatalogValuePayload) => {
      const response = await api.patch<ApiEnvelope<CatalogMutationResponse>>(
        '/exercises/equipment/rename',
        values
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [exercisesQueryKeys.all],
      })
    },
  })
}

export function useDeleteExerciseEquipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (value: string) => {
      const response = await api.delete<ApiEnvelope<CatalogMutationResponse>>(
        `/exercises/equipment/${encodeURIComponent(value)}`
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [exercisesQueryKeys.all],
      })
    },
  })
}
