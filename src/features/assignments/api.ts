import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { type ApiEnvelope, getApiErrorMessage, shouldRetryQuery, unwrapResponse } from '@/lib/api-utils'
import type { Client, PaginatedResponse } from '../clients/types'
import type { Diet } from '../diets/types'
import type { Training } from '../trainings/types'
import type {
  AssignmentDay,
  AssignmentEditorValues,
  AssignmentWeekResponse,
  CatalogAvailability,
  CatalogKey,
  CatalogLoadState,
  CopyWeekValues,
} from './types'

export { getApiErrorMessage }

interface MutationMessage {
  message: string
}

interface UpdateAssignmentPayload {
  assignmentId: string
  values: AssignmentEditorValues
}

interface CatalogLoadStateInput {
  key: CatalogKey
  label: string
  count: number
  isLoading: boolean
  isError: boolean
  error: unknown
}

type QueryParams = Record<string, string | number | boolean | undefined>
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const assignmentsQueryKeys = {
  weeks: ['assignments', 'week'] as const,
  week: (clientId?: string, weekStart?: string) => ['assignments', 'week', clientId, weekStart] as const,
  clients: ['assignments', 'clients'] as const,
  trainings: ['assignments', 'trainings'] as const,
  diets: ['assignments', 'diets'] as const,
}

function normalizeAssignmentPayload(values: AssignmentEditorValues) {
  return {
    client_id: values.client_id,
    dates: Array.from(new Set(values.dates)).sort(),
    training_id: values.is_rest_day ? null : (values.training_id ?? null),
    diet_id: values.is_rest_day ? null : (values.diet_id ?? null),
    is_rest_day: values.is_rest_day,
  }
}

function normalizeUpdatePayload(values: AssignmentEditorValues) {
  return {
    date: values.date || undefined,
    training_id: values.is_rest_day ? null : (values.training_id ?? null),
    diet_id: values.is_rest_day ? null : (values.diet_id ?? null),
    is_rest_day: values.is_rest_day,
  }
}

async function fetchAllPaginatedData<T>(path: string, baseParams: QueryParams = {}) {
  const limit = 200
  const items: T[] = []
  let page = 1
  let totalPages = 1

  do {
    const response = await api.get<ApiEnvelope<PaginatedResponse<T>>>(path, {
      params: {
        ...baseParams,
        page,
        limit,
      },
    })

    const result = unwrapResponse(response)
    items.push(...result.data)
    totalPages = Math.max(result.totalPages, 1)
    page += 1
  } while (page <= totalPages)

  return items
}

export function isUuidString(value: string | null | undefined): value is string {
  return typeof value === 'string' && uuidRegex.test(value)
}

function buildCatalogLoadState({ key, label, count, isLoading, isError, error }: CatalogLoadStateInput): CatalogLoadState {
  const hasData = count > 0
  const isLoadingState = isLoading && !hasData
  const isErrorState = isError && !hasData
  const isEmptyState = !hasData && !isLoadingState && !isErrorState

  return {
    key,
    label,
    has_data: hasData,
    is_loading: isLoadingState,
    is_error: isErrorState,
    is_empty: isEmptyState,
    error_message: isErrorState ? getApiErrorMessage(error, `No se pudo cargar ${label.toLowerCase()}.`) : null,
  }
}

export function buildCatalogAvailability(input: {
  trainingsCount: number
  trainingsLoading: boolean
  trainingsError: boolean
  trainingsErrorReason: unknown
  dietsCount: number
  dietsLoading: boolean
  dietsError: boolean
  dietsErrorReason: unknown
}): CatalogAvailability {
  const trainings = buildCatalogLoadState({
    key: 'trainings',
    label: 'Entrenamientos',
    count: input.trainingsCount,
    isLoading: input.trainingsLoading,
    isError: input.trainingsError,
    error: input.trainingsErrorReason,
  })

  const diets = buildCatalogLoadState({
    key: 'diets',
    label: 'Dietas',
    count: input.dietsCount,
    isLoading: input.dietsLoading,
    isError: input.dietsError,
    error: input.dietsErrorReason,
  })

  const canUseAnyPlanCatalog = trainings.has_data || diets.has_data

  return {
    trainings,
    diets,
    is_loading: trainings.is_loading || diets.is_loading,
    has_error: trainings.is_error || diets.is_error,
    has_empty_catalogs: trainings.is_empty || diets.is_empty,
    can_use_training_catalog: trainings.has_data,
    can_use_diet_catalog: diets.has_data,
    can_use_any_plan_catalog: canUseAnyPlanCatalog,
    is_rest_only: !canUseAnyPlanCatalog && !trainings.is_loading && !diets.is_loading,
  }
}

export function useAssignmentsWeek(clientId?: string, weekStart?: string) {
  return useQuery({
    queryKey: assignmentsQueryKeys.week(clientId, weekStart),
    enabled: Boolean(clientId && weekStart),
    retry: shouldRetryQuery,
    queryFn: async () => {
      if (!clientId || !weekStart) {
        throw new Error('Client id and week start are required')
      }

      const response = await api.get<ApiEnvelope<AssignmentWeekResponse>>('/assignments/week', {
        params: {
          client_id: clientId,
          week_start: weekStart,
        },
      })

      return unwrapResponse(response)
    },
  })
}

export function useAssignmentClients() {
  return useQuery({
    queryKey: assignmentsQueryKeys.clients,
    retry: shouldRetryQuery,
    queryFn: async () => {
      const clients = await fetchAllPaginatedData<Client>('/admin/clients')
      return clients.filter((client) => isUuidString(client.id))
    },
  })
}

export function useAssignmentTrainingsCatalog() {
  return useQuery({
    queryKey: assignmentsQueryKeys.trainings,
    retry: shouldRetryQuery,
    queryFn: () => fetchAllPaginatedData<Training>('/trainings'),
  })
}

export function useAssignmentDietsCatalog() {
  return useQuery({
    queryKey: assignmentsQueryKeys.diets,
    retry: shouldRetryQuery,
    queryFn: () => fetchAllPaginatedData<Diet>('/diets'),
  })
}

export function useBulkAssign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: AssignmentEditorValues) => {
      const response = await api.post<ApiEnvelope<AssignmentDay[]>>('/assignments/bulk', normalizeAssignmentPayload(values))
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.weeks })
    },
  })
}

export function useCopyWeek() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: CopyWeekValues) => {
      const response = await api.post<ApiEnvelope<AssignmentWeekResponse>>('/assignments/copy-week', values)
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.weeks })
    },
  })
}

export function useUpdateAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ assignmentId, values }: UpdateAssignmentPayload) => {
      const response = await api.put<ApiEnvelope<AssignmentDay>>(`/assignments/${assignmentId}`, normalizeUpdatePayload(values))
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.weeks })
    },
  })
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const response = await api.delete<ApiEnvelope<MutationMessage>>(`/assignments/${assignmentId}`)
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.weeks })
    },
  })
}
