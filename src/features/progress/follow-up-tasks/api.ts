import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { getApiErrorMessage, getApiErrorStatus, unwrapResponse, type ApiEnvelope } from '@/lib/api-utils'
import type { Assignee, CreateTask, Task, TaskFilters, TaskPage, TaskRecord, TaskSummary, UpdateTask } from './types'

export const taskKeys = {
  scope: (identity: string, clientId: string) => ['admin-follow-up-tasks', identity, clientId] as const,
  list: (identity: string, clientId: string, filters: TaskFilters) => [...taskKeys.scope(identity, clientId), 'list', filters] as const,
}
export function taskBase(clientId: string) { return `/admin/clients/${clientId}/follow-up-tasks` }
// apiClient already suppresses responses from superseded Firebase sessions.
// Include the persisted staff identity in every cache, including eligible lookup.
export function useTaskIdentity() { return useAuth((state) => state.user?.id ?? '') }
export function taskError(error: unknown) {
  const status = getApiErrorStatus(error)
  if (error instanceof Error && error.name === 'ACCOUNT_BLOCKED' || status === 423) return 'Cuenta bloqueada. No se puede guardar; conserva el borrador.'
  if (status === 401) return 'Sesión caducada. Vuelve a iniciar sesión; no se ha confirmado el guardado.'
  if (status === 403) return 'Permiso o responsable no disponible. Revisa la asignación; se conserva el borrador.'
  if (status === 404) return 'Cliente o tarea no disponible. Comprueba el contexto antes de continuar.'
  if (status === 409) return 'La tarea cambió o está cerrada. Tu borrador se conserva; revisa la versión del servidor.'
  if (status === undefined || status >= 500) return 'No se pudo confirmar la respuesta. Reintenta la misma operación, sin crear otra tarea.'
  return getApiErrorMessage(error, 'Revisa los campos antes de guardar.')
}
export function uncertainResult(error: unknown) {
  const status = getApiErrorStatus(error)
  return !(error instanceof Error && error.name === 'ACCOUNT_BLOCKED') && (status === undefined || status >= 500)
}
export function useTaskList(identity: string, clientId: string, filters: TaskFilters) {
  return useQuery({ queryKey: taskKeys.list(identity, clientId, filters), enabled: Boolean(identity && clientId), retry: false,
    queryFn: async ({ signal }) => unwrapResponse(await api.get<ApiEnvelope<TaskPage<Task>>>(taskBase(clientId), { params: { ...filters, limit: 20 }, signal })),
  })
}
export function useTaskSummary(identity: string, clientId: string) {
  return useQuery({ queryKey: [...taskKeys.scope(identity, clientId), 'summary'], enabled: Boolean(identity && clientId), retry: false,
    queryFn: async ({ signal }) => unwrapResponse(await api.get<ApiEnvelope<TaskSummary>>(`${taskBase(clientId)}/summary`, { signal })),
  })
}
export function useAssignees(identity: string, clientId: string) {
  return useInfiniteQuery({ queryKey: [...taskKeys.scope(identity, clientId), 'assignees'], enabled: Boolean(identity && clientId), retry: false,
    initialPageParam: 1,
    getNextPageParam: (last: TaskPage<Assignee>) => last.page < last.totalPages ? last.page + 1 : undefined,
    queryFn: async ({ signal, pageParam }) => unwrapResponse(await api.get<ApiEnvelope<TaskPage<Assignee>>>(`${taskBase(clientId)}/assignees`, { params: { page: pageParam, limit: 20 }, signal })),
  })
}
export async function getTask(clientId: string, id: string) {
  return unwrapResponse(await api.get<ApiEnvelope<TaskRecord>>(`${taskBase(clientId)}/${id}`))
}
export async function createTask(clientId: string, payload: CreateTask) {
  return unwrapResponse(await api.post<ApiEnvelope<TaskRecord>>(taskBase(clientId), payload))
}
export async function updateTask(clientId: string, id: string, payload: UpdateTask) {
  return unwrapResponse(await api.put<ApiEnvelope<TaskRecord>>(`${taskBase(clientId)}/${id}`, payload))
}
