export const TASK_TYPES = {
  TRAINING_UPDATE: 'Actualizar entrenamiento', DIET_UPDATE: 'Actualizar dieta',
  PHOTO_REVIEW: 'Revisar fotos', RECAP_REVIEW: 'Revisar recap', REVIEW: 'Revisión',
  CALL: 'Llamada', FEEDBACK: 'Enviar feedback',
} as const
export const TASK_PRIORITIES = { HIGH: 'Alta', MEDIUM: 'Media', LOW: 'Baja' } as const
export const TASK_STATUSES = { PENDING: 'Pendiente', IN_PROGRESS: 'En progreso', COMPLETED: 'Completada', CANCELLED: 'Cancelada' } as const
export const TASK_VIEWS = { active: 'Abiertas', history: 'Historial' } as const
export type TaskType = keyof typeof TASK_TYPES
export type TaskPriority = keyof typeof TASK_PRIORITIES
export type TaskStatus = keyof typeof TASK_STATUSES
export type TaskView = keyof typeof TASK_VIEWS
export interface Assignee { id: string; display_name: string | null }
export interface Task {
  id: string; title: string; description: string | null; type: TaskType
  due_date: string; priority: TaskPriority; status: TaskStatus; version: number
  assigned_to_id: string | null; assignee: Assignee | null
  created_at: string; updated_at: string; completed_at: string | null; cancelled_at: string | null
}
// The individual GET and mutation return the persisted model, not the list display.
export type TaskRecord = Omit<Task, 'assignee'>
export interface TaskPage<T> { data: T[]; total: number; page: number; limit: number; totalPages: number }
export interface NextTask {
  id: string; title: string; type: TaskType; due_date: string; priority: TaskPriority
  assigned_to_id: string | null; version: number; overdue: boolean
}
export interface TaskSummary { as_of_date: string; next_task: NextTask | null; next_review: NextTask | null }
export interface TaskFilters { page: number; view: TaskView; status?: TaskStatus; assigned_to_id?: string }
export interface TaskFields { title: string; type: TaskType; description: string | null; due_date: string; priority: TaskPriority; assigned_to_id?: string }
export interface CreateTask extends TaskFields { id: string }
export interface UpdateTask extends TaskFields { expected_version: number; status: TaskStatus }
export function isClosed(status: TaskStatus) { return status === 'COMPLETED' || status === 'CANCELLED' }
export function civilDate(value: string) { return value.slice(0, 10) }
export function validCivilDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}
