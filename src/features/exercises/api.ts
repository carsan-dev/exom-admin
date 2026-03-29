import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { type ApiEnvelope, getApiErrorMessage, shouldRetryQuery, unwrapResponse } from '@/lib/api-utils'
import type { ExerciseFormValues } from './schemas'
import type { Exercise, PaginatedResponse } from './types'

export { getApiErrorMessage }

interface PresignedUrlResponse {
  upload_url: string
  file_url: string
}

const exercisesQueryKeys = {
  all: ['exercises'] as const,
  list: (page: number, limit: number) => ['exercises', page, limit] as const,
  detail: (id?: string) => ['exercises', id] as const,
}

function normalizeExercisePayload(values: ExerciseFormValues) {
  return {
    name: values.name.trim(),
    muscle_groups: values.muscle_groups,
    equipment: values.equipment,
    level: values.level,
    video_url: values.video_url?.trim() || undefined,
    video_stream_id: values.video_stream_id?.trim() || undefined,
    thumbnail_url: values.thumbnail_url?.trim() || undefined,
    technique_text: values.technique_text?.trim() || undefined,
    common_errors_text: values.common_errors_text?.trim() || undefined,
    explanation_text: values.explanation_text?.trim() || undefined,
  }
}

export function useExercises(page: number, limit: number) {
  return useQuery({
    queryKey: exercisesQueryKeys.list(page, limit),
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<PaginatedResponse<Exercise>>>('/exercises', {
        params: { page, limit },
      })

      return unwrapResponse(response)
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
      const response = await api.post<ApiEnvelope<Exercise>>('/exercises', normalizeExercisePayload(values))
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: exercisesQueryKeys.all })
    },
  })
}

export function useUpdateExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ExerciseFormValues }) => {
      const response = await api.put<ApiEnvelope<Exercise>>(`/exercises/${id}`, normalizeExercisePayload(values))
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: exercisesQueryKeys.all })
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
      await queryClient.invalidateQueries({ queryKey: exercisesQueryKeys.all })
    },
  })
}

export function usePresignedUrl() {
  return useMutation({
    mutationFn: async (payload: { file_key: string; content_type: string }) => {
      const response = await api.post<ApiEnvelope<PresignedUrlResponse>>('/uploads/presigned', payload)
      return unwrapResponse(response)
    },
  })
}
