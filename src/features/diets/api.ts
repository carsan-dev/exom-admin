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
import { normalizeDietTags } from './schemas'
import type { Diet, DietCatalogValueWithColor } from './types'
import type { Ingredient, PaginatedResponse } from '../ingredients/types'
import type { CatalogGroup, GroupMembershipResult } from '../catalog-groups/types'

export { getApiErrorMessage }

interface RenameCatalogValuePayload {
  from: string
  to: string
}

interface CatalogMutationResponse {
  value: string
  affected_count: number
}

interface CatalogColorMutationResponse {
  value: string
  color: string
}

export interface DietsListParams {
  page: number
  limit: number
  search?: string
  tags?: string[]
  meal_types?: string[]
  nutritional_badges?: string[]
  updated_from?: string
  updated_to?: string
  group_id?: string
  ungrouped?: boolean
  enabled?: boolean
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
}

const dietsQueryKeys = {
  all: ['diets'] as const,
  list: (params: DietsListParams) =>
    [
      'diets',
      params.page,
      params.limit,
      params.search ?? '',
      params.tags ?? [],
      params.meal_types ?? [],
      params.nutritional_badges ?? [],
      params.updated_from ?? null,
      params.updated_to ?? null,
      params.group_id ?? null,
      params.ungrouped ?? false,
      params.sort_by ?? '',
      params.sort_dir ?? 'asc',
    ] as const,
  detail: (id?: string) => ['diets', id] as const,
}

const dietNutritionalBadgesQueryKey = ['diets', 'nutritional-badges'] as const
const dietTagsQueryKey = ['diets', 'tags'] as const
const ingredientsListQueryKey = ['ingredients', 'list-all'] as const
const dietGroupsQueryKey = ['diet-groups'] as const

export function normalizeDietPayload(values: DietFormValues) {
  type MealPayloadSource = Omit<DietFormValues['meals'][number], 'variants'>
  const normalizeMeal = (meal: MealPayloadSource) => ({
    ...(meal.id ? { id: meal.id } : {}),
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
        grams_equivalent: ing.unit === 'g' ? ing.quantity : (ing.grams_equivalent ?? undefined),
      })),
  })

  return {
    name: values.name.trim(),
    tags: normalizeDietTags(values.tags),
    total_calories: values.total_calories ?? undefined,
    total_protein_g: values.total_protein_g ?? undefined,
    total_carbs_g: values.total_carbs_g ?? undefined,
    total_fat_g: values.total_fat_g ?? undefined,
    meals: values.meals.map((meal) => ({
      ...normalizeMeal(meal),
      variants: (meal.variants ?? []).map(normalizeMeal),
    })),
  }
}

function normalizeSearch(search?: string) {
  const trimmed = search?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : ''
}

export function useDiets(params: DietsListParams) {
  const { page, limit, search, tags, meal_types, nutritional_badges, updated_from, updated_to, group_id, ungrouped, sort_by, sort_dir } = params
  const normalizedSearch = normalizeSearch(search)
  const normalizedTags = tags ?? []
  const normalizedMealTypes = meal_types ?? []
  const normalizedNutritionalBadges = nutritional_badges ?? []

  return useQuery({
    enabled: params.enabled ?? true,
    queryKey: dietsQueryKeys.list({
      page,
      limit,
      search: normalizedSearch,
      tags: normalizedTags,
      meal_types: normalizedMealTypes,
      nutritional_badges: normalizedNutritionalBadges,
      updated_from,
      updated_to,
      group_id,
      ungrouped,
      sort_by,
      sort_dir: sort_dir ?? 'asc',
    }),
    placeholderData: keepPreviousData,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<PaginatedResponse<Diet>>>('/diets', {
        params: {
          page,
          limit,
          ...(normalizedSearch ? { search: normalizedSearch } : {}),
          ...(normalizedTags.length > 0 ? { tags: normalizedTags } : {}),
          ...(normalizedMealTypes.length > 0 ? { meal_types: normalizedMealTypes } : {}),
          ...(normalizedNutritionalBadges.length > 0
            ? { nutritional_badges: normalizedNutritionalBadges }
            : {}),
          ...(updated_from ? { updated_from } : {}),
          ...(updated_to ? { updated_to } : {}),
          ...(group_id ? { group_id } : {}),
          ...(ungrouped ? { ungrouped: true } : {}),
          ...(sort_by ? { sort_by, sort_dir: sort_dir ?? 'asc' } : {}),
        },
        paramsSerializer: { indexes: null },
      })
      return unwrapResponse(response)
    },
  })
}

export function useDietGroups() {
  return useQuery({ queryKey: dietGroupsQueryKey, retry: shouldRetryQuery, queryFn: async () => unwrapResponse(await api.get<ApiEnvelope<CatalogGroup[]>>('/diet-groups')) })
}

function useInvalidateDietGroups() {
  const queryClient = useQueryClient()
  return () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: dietGroupsQueryKey }),
      queryClient.invalidateQueries({ queryKey: dietsQueryKeys.all }),
    ]).catch(() => undefined)
  }
}

export function useCreateDietGroup() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateDietGroups()
  return useMutation({
    mutationFn: async (name: string) => unwrapResponse(await api.post<ApiEnvelope<CatalogGroup>>('/diet-groups', { name })),
    onSuccess: (group) => {
      queryClient.setQueryData<CatalogGroup[]>(dietGroupsQueryKey, (current = []) => [...current, group].sort((left, right) => left.name.localeCompare(right.name, 'es')))
      invalidate()
    },
  })
}

export function useUpdateDietGroup() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateDietGroups()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => unwrapResponse(await api.patch<ApiEnvelope<CatalogGroup>>(`/diet-groups/${id}`, { name })),
    onSuccess: (group) => {
      queryClient.setQueryData<CatalogGroup[]>(dietGroupsQueryKey, (current = []) => current.map((item) => item.id === group.id ? group : item).sort((left, right) => left.name.localeCompare(right.name, 'es')))
      invalidate()
    },
  })
}

export function useDeleteDietGroup() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateDietGroups()
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/diet-groups/${id}`); return id },
    onSuccess: (id) => {
      queryClient.setQueryData<CatalogGroup[]>(dietGroupsQueryKey, (current = []) => current.filter((group) => group.id !== id))
      invalidate()
    },
  })
}

export function useUpdateDietGroupMembership() {
  const invalidate = useInvalidateDietGroups()
  return useMutation({ mutationFn: async ({ ids, groupId }: { ids: string[]; groupId: string | null }) => unwrapResponse(await api.patch<ApiEnvelope<GroupMembershipResult>>('/diets/group-membership', { diet_ids: ids, group_id: groupId })), onSuccess: invalidate })
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
      const response = await api.get<ApiEnvelope<{ nutritional_badges: Array<string | DietCatalogValueWithColor> }>>(
        '/diets/nutritional-badges'
      )
      return unwrapResponse(response).nutritional_badges.map((badge) => typeof badge === 'string' ? badge : badge.value)
    },
  })
}

export function useDietNutritionalBadgeCatalogColors() {
  return useQuery({
    queryKey: [...dietNutritionalBadgesQueryKey, 'colors'] as const,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<{ nutritional_badges: DietCatalogValueWithColor[] }>>(
        '/diets/nutritional-badges'
      )
      return unwrapResponse(response).nutritional_badges
    },
  })
}

export function useDietTags() {
  return useQuery({
    queryKey: dietTagsQueryKey,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<{ tags: string[] }>>('/diets/tags')
      return unwrapResponse(response).tags
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

export function useUpdateDietNutritionalBadgeColor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ value, color }: { value: string; color: string }) => {
      const response = await api.patch<ApiEnvelope<CatalogColorMutationResponse>>(
        `/diets/nutritional-badges/${encodeURIComponent(value)}/color`,
        { color }
      )
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await invalidateAdminQueries(queryClient, {
        extraQueryKeys: [dietsQueryKeys.all],
      })
      await queryClient.invalidateQueries({ queryKey: dietNutritionalBadgesQueryKey })
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

export function useIngredientsList(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ingredientsListQueryKey,
    enabled: options.enabled ?? true,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<PaginatedResponse<Ingredient>>>('/ingredients', {
        params: { limit: 200 },
      })
      return unwrapResponse(response)
    },
  })
}
