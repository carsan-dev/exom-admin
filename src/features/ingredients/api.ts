import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { invalidateAdminQueries, invalidateAdminQueriesOnApprovalPending } from '@/lib/admin-query-invalidations'
import { type ApiEnvelope, getApiErrorMessage, shouldRetryQuery, unwrapResponse } from '@/lib/api-utils'
import type { IngredientFormValues } from './schemas'
import type { Ingredient, PaginatedResponse } from './types'

export { getApiErrorMessage }

const ingredientsQueryKeys = {
  all: ['ingredients'] as const,
  list: (params: IngredientsListParams) =>
    [
      'ingredients',
      params.page,
      params.limit,
      params.search ?? '',
      params.has_icon ?? [],
      params.calories_per_100g_min ?? null,
      params.calories_per_100g_max ?? null,
      params.protein_per_100g_min ?? null,
      params.protein_per_100g_max ?? null,
      params.carbs_per_100g_min ?? null,
      params.carbs_per_100g_max ?? null,
      params.fat_per_100g_min ?? null,
      params.fat_per_100g_max ?? null,
      params.updated_from ?? null,
      params.updated_to ?? null,
    ] as const,
}

export interface IngredientsListParams {
  page: number
  limit: number
  search?: string
  has_icon?: string[]
  calories_per_100g_min?: number
  calories_per_100g_max?: number
  protein_per_100g_min?: number
  protein_per_100g_max?: number
  carbs_per_100g_min?: number
  carbs_per_100g_max?: number
  fat_per_100g_min?: number
  fat_per_100g_max?: number
  updated_from?: string
  updated_to?: string
}

function normalizeSearch(search?: string) {
  const trimmed = search?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : ''
}

function normalizeCreateIngredientPayload(values: IngredientFormValues) {
  return {
    name: values.name.trim(),
    icon: values.icon?.trim() || null,
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

export function useIngredients(params: IngredientsListParams) {
  const normalizedSearch = normalizeSearch(params.search)
  const normalizedIconState = params.has_icon ?? []

  return useQuery({
    queryKey: ingredientsQueryKeys.list({
      ...params,
      search: normalizedSearch,
      has_icon: normalizedIconState,
    }),
    placeholderData: keepPreviousData,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<PaginatedResponse<Ingredient>>>('/ingredients', {
        params: {
          page: params.page,
          limit: params.limit,
          ...(normalizedSearch ? { search: normalizedSearch } : {}),
          ...(normalizedIconState.length > 0 ? { has_icon: normalizedIconState } : {}),
          ...(params.calories_per_100g_min != null
            ? { calories_per_100g_min: params.calories_per_100g_min }
            : {}),
          ...(params.calories_per_100g_max != null
            ? { calories_per_100g_max: params.calories_per_100g_max }
            : {}),
          ...(params.protein_per_100g_min != null
            ? { protein_per_100g_min: params.protein_per_100g_min }
            : {}),
          ...(params.protein_per_100g_max != null
            ? { protein_per_100g_max: params.protein_per_100g_max }
            : {}),
          ...(params.carbs_per_100g_min != null
            ? { carbs_per_100g_min: params.carbs_per_100g_min }
            : {}),
          ...(params.carbs_per_100g_max != null
            ? { carbs_per_100g_max: params.carbs_per_100g_max }
            : {}),
          ...(params.fat_per_100g_min != null ? { fat_per_100g_min: params.fat_per_100g_min } : {}),
          ...(params.fat_per_100g_max != null ? { fat_per_100g_max: params.fat_per_100g_max } : {}),
          ...(params.updated_from ? { updated_from: params.updated_from } : {}),
          ...(params.updated_to ? { updated_to: params.updated_to } : {}),
        },
        paramsSerializer: { indexes: null },
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
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [ingredientsQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [ingredientsQueryKeys.all],
      })
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
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [ingredientsQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [ingredientsQueryKeys.all],
      })
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
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [ingredientsQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [ingredientsQueryKeys.all],
      })
    },
  })
}
