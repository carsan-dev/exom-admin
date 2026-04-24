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
import type { DietFormValues } from './schemas'
import type { Diet } from './types'
import type { Ingredient, PaginatedResponse } from '../ingredients/types'

export { getApiErrorMessage }

interface RenameCatalogValuePayload {
  from: string
  to: string
}

interface CatalogMutationResponse {
  value: string
  affected_count: number
}

export interface DietsListParams {
  page: number
  limit: number
  search?: string
  meal_types?: string[]
  nutritional_badges?: string[]
  updated_from?: string
  updated_to?: string
}

const dietsQueryKeys = {
  all: ['diets'] as const,
  list: (params: DietsListParams) =>
    [
      'diets',
      params.page,
      params.limit,
      params.search ?? '',
      params.meal_types ?? [],
      params.nutritional_badges ?? [],
      params.updated_from ?? null,
      params.updated_to ?? null,
    ] as const,
  detail: (id?: string) => ['diets', id] as const,
}

const dietNutritionalBadgesQueryKey = ['diets', 'nutritional-badges'] as const
const ingredientsListQueryKey = ['ingredients', 'list-all'] as const

function normalizeDietPayload(values: DietFormValues) {
  return {
    name: values.name.trim(),
    total_calories: values.total_calories ?? undefined,
    total_protein_g: values.total_protein_g ?? undefined,
    total_carbs_g: values.total_carbs_g ?? undefined,
    total_fat_g: values.total_fat_g ?? undefined,
    meals: values.meals.map((meal) => ({
      type: meal.type,
      name: meal.name.trim(),
      image_url: meal.image_url?.trim() ? meal.image_url.trim() : undefined,
      calories: meal.calories ?? undefined,
      protein_g: meal.protein_g ?? undefined,
      carbs_g: meal.carbs_g ?? undefined,
      fat_g: meal.fat_g ?? undefined,
      nutritional_badges:
        meal.nutritional_badges?.map((badge) => badge.trim()).filter(Boolean) ?? [],
      order: meal.order,
      ingredients: meal.ingredients.map((ing) => ({
        ingredient_id: ing.ingredient_id,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    })),
  }
}

function normalizeSearch(search?: string) {
  const trimmed = search?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : ''
}

export function useDiets(params: DietsListParams) {
  const { page, limit, search, meal_types, nutritional_badges, updated_from, updated_to } = params
  const normalizedSearch = normalizeSearch(search)
  const normalizedMealTypes = meal_types ?? []
  const normalizedNutritionalBadges = nutritional_badges ?? []

  return useQuery({
    queryKey: dietsQueryKeys.list({
      page,
      limit,
      search: normalizedSearch,
      meal_types: normalizedMealTypes,
      nutritional_badges: normalizedNutritionalBadges,
      updated_from,
      updated_to,
    }),
    placeholderData: keepPreviousData,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<PaginatedResponse<Diet>>>('/diets', {
        params: {
          page,
          limit,
          ...(normalizedSearch ? { search: normalizedSearch } : {}),
          ...(normalizedMealTypes.length > 0 ? { meal_types: normalizedMealTypes } : {}),
          ...(normalizedNutritionalBadges.length > 0
            ? { nutritional_badges: normalizedNutritionalBadges }
            : {}),
          ...(updated_from ? { updated_from } : {}),
          ...(updated_to ? { updated_to } : {}),
        },
        paramsSerializer: { indexes: null },
      })
      return unwrapResponse(response)
    },
  })
}

export function useDiet(id?: string) {
  return useQuery({
    queryKey: dietsQueryKeys.detail(id),
    enabled: Boolean(id),
    retry: shouldRetryQuery,
    queryFn: async () => {
      if (!id) throw new Error('Diet id is required')
      const response = await api.get<ApiEnvelope<Diet>>(`/diets/${id}`)
      return unwrapResponse(response)
    },
  })
}

export function useDietNutritionalBadges() {
  return useQuery({
    queryKey: dietNutritionalBadgesQueryKey,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<{ nutritional_badges: string[] }>>(
        '/diets/nutritional-badges'
      )
      return unwrapResponse(response).nutritional_badges
    },
  })
}

export function useCreateDiet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: DietFormValues) => {
      const response = await api.post<ApiEnvelope<Diet>>('/diets', normalizeDietPayload(values))
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [dietsQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [dietsQueryKeys.all],
      })
    },
  })
}

export function useUpdateDiet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: DietFormValues }) => {
      const response = await api.put<ApiEnvelope<Diet>>(
        `/diets/${id}`,
        normalizeDietPayload(values)
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [dietsQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [dietsQueryKeys.all],
      })
    },
  })
}

export function useDeleteDiet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<ApiEnvelope<void>>(`/diets/${id}`)
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [dietsQueryKeys.all],
      })
    },
    onError: async (error) => {
      await invalidateAdminQueriesOnApprovalPending(queryClient, error, {
        extraQueryKeys: [dietsQueryKeys.all],
      })
    },
  })
}

export function useRenameDietNutritionalBadge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: RenameCatalogValuePayload) => {
      const response = await api.patch<ApiEnvelope<CatalogMutationResponse>>(
        '/diets/nutritional-badges/rename',
        values
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [dietsQueryKeys.all],
      })
    },
  })
}

export function useDeleteDietNutritionalBadge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (value: string) => {
      const response = await api.delete<ApiEnvelope<CatalogMutationResponse>>(
        `/diets/nutritional-badges/${encodeURIComponent(value)}`
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [dietsQueryKeys.all],
      })
    },
  })
}

export function useIngredientsList() {
  return useQuery({
    queryKey: ingredientsListQueryKey,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<PaginatedResponse<Ingredient>>>('/ingredients', {
        params: { limit: 200 },
      })
      return unwrapResponse(response)
    },
  })
}
