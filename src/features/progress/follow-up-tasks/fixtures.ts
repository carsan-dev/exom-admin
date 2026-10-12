import type { Assignee, Task, TaskPage, TaskSummary } from './types'
// Synthetic-only fixture data for unit and isolated browser verification.
export const FIXTURE_IDS = {
  client: '11111111-1111-4111-8111-111111111111', otherClient: '22222222-2222-4222-8222-222222222222',
  staff: '33333333-3333-4333-8333-333333333333', otherStaff: '44444444-4444-4444-8444-444444444444',
  task: '55555555-5555-4555-8555-555555555555', retained: '66666666-6666-4666-8666-666666666666',
} as const
export const fixtureAssignee: Assignee = { id: FIXTURE_IDS.staff, display_name: 'Profesional sintético' }
export const fixtureTask: Task = {
  id: FIXTURE_IDS.task, title: 'Revisar planificación sintética', description: 'Nota interna sintética', type: 'REVIEW',
  due_date: '2026-10-04', priority: 'HIGH', status: 'PENDING', version: 3,
  assigned_to_id: FIXTURE_IDS.staff, assignee: fixtureAssignee,
  created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', completed_at: null, cancelled_at: null,
}
export const fixtureSummary: TaskSummary = {
  as_of_date: '2026-10-05',
  next_task: { ...fixtureTask, title: 'Próxima tarea canónica, fuera de esta página', overdue: true },
  next_review: { ...fixtureTask, title: 'Revisión canónica', due_date: '2026-10-05', overdue: false },
}
export function fixturePage<T>(data: T[], page = 1, total = data.length): TaskPage<T> {
  return { data, page, total, limit: 20, totalPages: Math.ceil(total / 20) }
}
