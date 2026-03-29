import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { type ApiEnvelope, getApiErrorMessage, shouldRetryQuery, unwrapResponse } from '@/lib/api-utils'
import { normalizeTrainingTags, type TrainingFormValues } from './schemas'
import type { Training } from './types'
import type { Exercise, PaginatedResponse } from '../exercises/types'

export { getApiErrorMessage }

const trainingsQueryKeys = {
  all: ['trainings'] as const,
  list: (page: number, limit: number) => ['trainings', page, limit] as const,
  detail: (id?: string) => ['trainings', id] as const,
}

const trainingTagsQueryKey = ['trainings', 'tags'] as const
const exercisesListQueryKey = ['exercises', 'list-all'] as const

function normalizeTrainingPayload(values: TrainingFormValues) {
  return {
    name: values.name.trim(),
    type: values.type,
    level: values.level,
    estimated_duration_min: values.estimated_duration_min ?? undefined,
    estimated_calories: values.estimated_calories ?? undefined,
    warmup_description: values.warmup_description?.trim() || undefined,
    warmup_duration_min: values.warmup_duration_min ?? undefined,
    cooldown_description: values.cooldown_description?.trim() || undefined,
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

export function useTrainings(page: number, limit: number) {
  return useQuery({
    queryKey: trainingsQueryKeys.list(page, limit),
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<PaginatedResponse<Training>>>('/trainings', {
        params: { page, limit },
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

export function useCreateTraining() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: TrainingFormValues) => {
      const response = await api.post<ApiEnvelope<Training>>('/trainings', normalizeTrainingPayload(values))
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trainingsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: trainingTagsQueryKey }),
      ])
    },
  })
}

export function useUpdateTraining() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TrainingFormValues }) => {
      const response = await api.put<ApiEnvelope<Training>>(`/trainings/${id}`, normalizeTrainingPayload(values))
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trainingsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: trainingTagsQueryKey }),
      ])
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trainingsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: trainingTagsQueryKey }),
      ])
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
