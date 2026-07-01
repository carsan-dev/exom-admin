import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { assignmentOptionQueryKeys } from '@/lib/assignment-query-keys'
import { type ApiEnvelope, getApiErrorMessage, shouldRetryQuery, unwrapResponse } from '@/lib/api-utils'
import type { Role } from '../clients/types'
import type {
  AssignmentCatalogOptions,
  AssignmentDay,
  AssignmentEditorValues,
  AssignmentMonthResponse,
  AssignmentUpdateValues,
  AssignmentWeekResponse,
  AutoAssignmentRule,
  CatalogAvailability,
  CatalogKey,
  CatalogLoadState,
  ClientOption,
  CreateAutoAssignmentRuleValues,
  CopyWeekValues,
} from './types'

export { getApiErrorMessage }

interface MutationMessage {
  message: string
}

interface UpdateAssignmentPayload {
  assignmentId: string
  values: AssignmentUpdateValues
}

interface CatalogLoadStateInput {
  key: CatalogKey
  label: string
  count: number
  isLoading: boolean
  isError: boolean
  error: unknown
}

export const assignmentsQueryKeys = {
  weeks: ['assignments', 'week'] as const,
  week: (clientId?: string, weekStart?: string) => ['assignments', 'week', clientId, weekStart] as const,
  months: ['assignments', 'month'] as const,
  month: (clientId?: string, year?: number, month?: number) => ['assignments', 'month', clientId, year, month] as const,
  clients: assignmentOptionQueryKeys.clients,
  catalogs: assignmentOptionQueryKeys.catalogs,
  autoRule: (clientId?: string) => ['assignments', 'auto-rule', clientId] as const,
}

function normalizeOptionalId(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null
  }

  const normalizedValue = value.trim()

  if (!normalizedValue || normalizedValue === '__none__') {
    return null
  }

  return normalizedValue
}

function normalizeBatchPayload(values: AssignmentEditorValues) {
  return {
    client_id: values.client_id,
    days: values.days.map((day) => ({
      date: day.date,
      training_id: day.is_rest_day ? null : normalizeOptionalId(day.training_id),
      diet_id: day.is_rest_day ? null : normalizeOptionalId(day.diet_id),
      is_rest_day: day.is_rest_day,
    })),
  }
}

function normalizeUpdatePayload(values: AssignmentUpdateValues) {
  return {
    date: values.date || undefined,
    training_id: values.is_rest_day ? null : normalizeOptionalId(values.training_id),
    diet_id: values.is_rest_day ? null : normalizeOptionalId(values.diet_id),
    is_rest_day: values.is_rest_day,
  }
}

function normalizeAutoRulePayload(values: CreateAutoAssignmentRuleValues) {
  return {
    client_id: values.client_id,
    source_week_start: values.source_week_start,
    starts_on: values.starts_on,
    ends_on: values.ends_on || null,
    days: values.days.map((day) => ({
      weekday: day.weekday,
      training_id: day.is_rest_day ? null : normalizeOptionalId(day.training_id),
      diet_id: day.is_rest_day ? null : normalizeOptionalId(day.diet_id),
      is_rest_day: day.is_rest_day,
    })),
  }
}

export function hasClientId(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
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

export function useAssignmentsMonth(clientId?: string, year?: number, month?: number) {
  return useQuery({
    queryKey: assignmentsQueryKeys.month(clientId, year, month),
    enabled: Boolean(clientId && year && month),
    retry: shouldRetryQuery,
    queryFn: async () => {
      if (!clientId || !year || !month) {
        throw new Error('Client id, year and month are required')
      }

      const response = await api.get<ApiEnvelope<AssignmentMonthResponse>>('/assignments/month', {
        params: {
          client_id: clientId,
          year,
          month,
        },
      })

      return unwrapResponse(response)
    },
  })
}

export function useAssignmentClients(currentUserRole?: Role) {
  return useQuery({
    queryKey: assignmentsQueryKeys.clients,
    enabled: Boolean(currentUserRole),
    retry: shouldRetryQuery,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<ClientOption[]>>('/assignments/client-options')
      return unwrapResponse(response)
    },
  })
}

export function useAssignmentCatalogOptions(enabled: boolean) {
  return useQuery({
    queryKey: assignmentsQueryKeys.catalogs,
    enabled,
    retry: shouldRetryQuery,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const response = await api.get<ApiEnvelope<AssignmentCatalogOptions>>('/assignments/catalog-options')
      return unwrapResponse(response)
    },
  })
}

export function useActiveAutoAssignmentRule(clientId?: string) {
  return useQuery({
    queryKey: assignmentsQueryKeys.autoRule(clientId),
    enabled: Boolean(clientId),
    retry: shouldRetryQuery,
    queryFn: async () => {
      if (!clientId) {
        throw new Error('Client id is required')
      }

      const response = await api.get<ApiEnvelope<AutoAssignmentRule | null>>('/assignments/auto-rules/active', {
        params: { client_id: clientId },
      })

      return unwrapResponse(response)
    },
  })
}

export function useCreateAutoAssignmentRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: CreateAutoAssignmentRuleValues) => {
      const response = await api.post<ApiEnvelope<AutoAssignmentRule>>(
        '/assignments/auto-rules',
        normalizeAutoRulePayload(values),
      )
      return unwrapResponse(response)
    },
    onSuccess: async (_rule, values) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.weeks }),
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.months }),
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.autoRule(values.client_id) }),
      ])
    },
  })
}

export function useUpdateAutoAssignmentRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ ruleId, values }: { ruleId: string; values: CreateAutoAssignmentRuleValues }) => {
      const response = await api.put<ApiEnvelope<AutoAssignmentRule>>(
        `/assignments/auto-rules/${ruleId}`,
        normalizeAutoRulePayload(values),
      )
      return unwrapResponse(response)
    },
    onSuccess: async (rule) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.weeks }),
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.months }),
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.autoRule(rule.client_id) }),
      ])
    },
  })
}

export function useDeactivateAutoAssignmentRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ruleId: string) => {
      const response = await api.put<ApiEnvelope<AutoAssignmentRule>>(`/assignments/auto-rules/${ruleId}/deactivate`)
      return unwrapResponse(response)
    },
    onSuccess: async (rule) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.weeks }),
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.months }),
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.autoRule(rule.client_id) }),
      ])
    },
  })
}

export function useBatchAssign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: AssignmentEditorValues) => {
      const response = await api.post<ApiEnvelope<AssignmentDay[]>>('/assignments/batch', normalizeBatchPayload(values))
      return unwrapResponse(response)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.weeks }),
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.months }),
      ])
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.weeks }),
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.months }),
      ])
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.weeks }),
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.months }),
      ])
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.weeks }),
        queryClient.invalidateQueries({ queryKey: assignmentsQueryKeys.months }),
      ])
    },
  })
}
