import axios, { type AxiosResponse } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ExerciseFormValues } from './schemas'
import type { Exercise, PaginatedResponse } from './types'

interface ApiEnvelope<T> {
  success: boolean
  data: T
  timestamp: string
}

interface ApiErrorResponse {
  statusCode?: number
  message?: string | string[]
  error?: string
  timestamp?: string
  path?: string
}

interface PresignedUrlResponse {
  upload_url: string
  file_url: string
}

const exercisesQueryKeys = {
  all: ['exercises'] as const,
  list: (page: number, limit: number) => ['exercises', page, limit] as const,
  detail: (id?: string) => ['exercises', id] as const,
}

function unwrapResponse<T>(response: AxiosResponse<ApiEnvelope<T>>) {
  return response.data.data
}

export function getApiErrorMessage(error: unknown, fallback = 'Ha ocurrido un error') {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data?.message

    if (Array.isArray(message) && message.length > 0) {
      return message.join(', ')
    }

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

function getApiErrorStatus(error: unknown) {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.status
  }

  return undefined
}

function shouldRetryQuery(failureCount: number, error: unknown) {
  const status = getApiErrorStatus(error)

  if (status === 400 || status === 403 || status === 404) {
    return false
  }

  return failureCount < 2
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
