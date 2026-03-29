import axios, { type AxiosResponse } from 'axios'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { IngredientFormValues } from './schemas'
import type { Ingredient, PaginatedResponse } from './types'

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

const ingredientsQueryKeys = {
  all: ['ingredients'] as const,
  list: (page: number, limit: number, search: string) =>
    ['ingredients', page, limit, search] as const,
}

function unwrapResponse<T>(response: AxiosResponse<ApiEnvelope<T>>) {
  return response.data.data
}

function normalizeSearch(search?: string) {
  const trimmed = search?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : ''
}

function normalizeCreateIngredientPayload(values: IngredientFormValues) {
  return {
    name: values.name.trim(),
    icon: values.icon?.trim() || undefined,
    calories_per_100g: values.calories_per_100g,
    protein_per_100g: values.protein_per_100g,
    carbs_per_100g: values.carbs_per_100g,
    fat_per_100g: values.fat_per_100g,
  }
}

function normalizeUpdateIngredientPayload(values: IngredientFormValues) {
  const trimmedIcon = values.icon?.trim() ?? ''

  return {
    name: values.name.trim(),
    icon: trimmedIcon ? trimmedIcon : null,
    calories_per_100g: values.calories_per_100g,
    protein_per_100g: values.protein_per_100g,
    carbs_per_100g: values.carbs_per_100g,
    fat_per_100g: values.fat_per_100g,
  }
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

export function shouldRetryQuery(failureCount: number, error: unknown) {
  const status = getApiErrorStatus(error)

  if (status === 400 || status === 403 || status === 404) {
    return false
  }

  return failureCount < 2
}

export function useIngredients(page: number, limit: number, search?: string) {
  const normalizedSearch = normalizeSearch(search)

  return useQuery({
    queryKey: ingredientsQueryKeys.list(page, limit, normalizedSearch),
    placeholderData: keepPreviousData,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<PaginatedResponse<Ingredient>>>('/ingredients', {
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

export function useCreateIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: IngredientFormValues) => {
      const response = await api.post<ApiEnvelope<Ingredient>>(
        '/ingredients',
        normalizeCreateIngredientPayload(values)
      )

      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ingredientsQueryKeys.all })
    },
  })
}

export function useUpdateIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: IngredientFormValues }) => {
      const response = await api.put<ApiEnvelope<Ingredient>>(
        `/ingredients/${id}`,
        normalizeUpdateIngredientPayload(values)
      )

      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ingredientsQueryKeys.all })
    },
  })
}

export function useDeleteIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/ingredients/${id}`)
      return id
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ingredientsQueryKeys.all })
    },
  })
}
