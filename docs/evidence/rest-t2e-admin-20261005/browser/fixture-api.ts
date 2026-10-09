import axios, { AxiosError, CanceledError } from 'axios'
import { z } from 'zod'
import { FIXTURE_IDS as ids, fixtureAssignee, fixturePage, fixtureSummary, fixtureTask } from '../../../../src/features/progress/follow-up-tasks/fixtures'
import { isClosed, type Assignee, type Task } from '../../../../src/features/progress/follow-up-tasks/types'
import { fixtureGeneration, useAuth } from './fixture-auth'

const commandSchema = z.object({
  id: z.string().optional(), expected_version: z.number().optional(),
  title: z.string(), type: z.enum(['TRAINING_UPDATE', 'DIET_UPDATE', 'PHOTO_REVIEW', 'RECAP_REVIEW', 'REVIEW', 'CALL', 'FEEDBACK']),
  description: z.string().nullable(), due_date: z.string(), priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  assigned_to_id: z.string().optional(), status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
})
const tasks = new Map<string, Task[]>([
  [ids.client, [
    ...Array.from({ length: 21 }, (_, index) => ({ ...fixtureTask, id: `${String(index + 1).padStart(8, '0')}-5555-4555-8555-555555555555`, title: `${fixtureTask.title} ${index + 1}`, status: index === 1 ? 'IN_PROGRESS' as const : 'PENDING' as const })),
    { ...fixtureTask, id: '00000022-5555-4555-8555-555555555555', title: 'Tarea sin responsable', assigned_to_id: null, assignee: null },
    { ...fixtureTask, id: '00000023-5555-4555-8555-555555555555', title: 'Tarea de responsable anterior', assigned_to_id: ids.retained, assignee: { id: ids.retained, display_name: 'Profesional anterior no habilitado' } },
    { ...fixtureTask, id: '00000024-5555-4555-8555-555555555555', title: 'Tarea completada histórica', status: 'COMPLETED', assigned_to_id: ids.retained, assignee: { id: ids.retained, display_name: 'Profesional anterior no habilitado' }, completed_at: '2026-10-04T10:00:00Z' },
    { ...fixtureTask, id: '00000025-5555-4555-8555-555555555555', title: 'Tarea cancelada histórica', status: 'CANCELLED', assigned_to_id: null, assignee: null, cancelled_at: '2026-10-04T10:00:00Z' },
  ]],
  [ids.otherClient, [{ ...fixtureTask, id: '00000026-5555-4555-8555-555555555555', title: 'Tarea exclusiva B' }]],
])
const creators = new Map<string, string>([...tasks.values()].flatMap((rows) => rows.map((task) => [task.id, ids.staff] as const)))
const eligible: Assignee[] = [fixtureAssignee,
  ...Array.from({ length: 19 }, (_, index) => ({ id: `${String(index + 100).padStart(8, '0')}-3333-4333-8333-333333333333`, display_name: `Profesional habilitado ${index + 2}` })),
  { id: ids.otherStaff, display_name: 'Profesional sintética página 2' },
]
const scenario = new URLSearchParams(window.location.search).get('scenario') ?? 'data'
let lost = false
let conflicted = false
let recovered = false
let heldOwner: string | null = scenario === 'deferred' ? ids.client : null
let holdAll = scenario === 'loading'
interface Held { owner: string; path: string; release: () => void }
const pending: Held[] = []
const delivered: { owner: string; path: string; suppressed: boolean }[] = []
export interface FixtureCall { method: string; path: string; params: unknown; payload: unknown; identity: string | null; generation: number }
export const fixtureCalls: FixtureCall[] = []
export const fixtureControls = {
  recoverErrors: () => { recovered = true },
  holdReads: (owner: string) => { heldOwner = owner },
  pending: () => pending.map(({ owner, path }) => ({ owner, path })),
  delivered: () => [...delivered],
  releaseResponses: () => {
    heldOwner = null; holdAll = false
    for (const entry of pending.splice(0)) entry.release()
  },
  snapshot: () => JSON.parse(JSON.stringify(Object.fromEntries(tasks))) as unknown,
}
// Always-local adapter: unsupported paths fail closed. Captured-generation checks
// mirror the shipping apiClient session boundary; no application state is injected.
export const api = axios.create({ adapter: async (config) => {
  const url = config.url ?? ''
  const method = config.method ?? 'get'
  const generation = fixtureGeneration()
  const raw: unknown = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
  const input = raw === undefined ? undefined : commandSchema.parse(raw)
  fixtureCalls.push({ method, path: url, params: structuredClone(config.params ?? {}), payload: input, identity: useAuth.getState().user?.id ?? null, generation })
  const reply = (data: unknown, status = 200) => ({ data: { success: true, data, timestamp: '2026-10-05T12:00:00Z' }, status, statusText: 'Fixture', headers: {}, config })
  const fail = (status: number) => { throw new AxiosError('Synthetic server rejection', 'FIXTURE_ERROR', config, undefined, { ...reply(null, status), data: { message: 'Synthetic fixture rejection', statusCode: status } }) }
  if (url === '/admin/clients') return reply(fixturePage([
    { id: ids.client, email: 'client-a@example.invalid', profile: { first_name: 'Cliente', last_name: 'Sintético A', avatar_url: null } },
    { id: ids.otherClient, email: 'client-b@example.invalid', profile: { first_name: 'Cliente', last_name: 'Sintético B', avatar_url: null } },
  ]))
  const route = url.match(/^\/admin\/clients\/([^/]+)\/follow-up-tasks(?:\/(.*))?$/)
  if (route) {
    const [, owner, suffix] = route
    const rows = tasks.get(owner) ?? []
    if (method === 'get' && (holdAll || (heldOwner === owner && !suffix))) {
      await new Promise<void>((release) => pending.push({ owner, path: url, release }))
      delivered.push({ owner, path: url, suppressed: generation !== fixtureGeneration() })
      if (generation !== fixtureGeneration()) throw new CanceledError('Synthetic session changed')
    }
    if (['403', '404', '401', '423', 'network'].includes(scenario) && !recovered) {
      if (scenario === 'network') throw new AxiosError('Synthetic network outage', 'ERR_NETWORK', config)
      return fail(Number(scenario))
    }
    if (suffix === 'assignees') {
      const page = Number(config.params?.page ?? 1)
      return reply(fixturePage(eligible.slice((page - 1) * 20, page * 20), page, eligible.length))
    }
    if (suffix === 'summary') {
      const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 }
      const open = (scenario === 'empty' ? [] : rows).filter((row) => !isClosed(row.status)).sort((a, b) =>
        a.due_date.localeCompare(b.due_date) || rank[a.priority] - rank[b.priority] || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
      const project = (task: Task | undefined) => task ? { ...task, overdue: task.due_date < fixtureSummary.as_of_date } : null
      return reply({ as_of_date: fixtureSummary.as_of_date, next_task: project(open[0]), next_review: project(open.find((task) => task.type === 'REVIEW')) })
    }
    if (method === 'get' && suffix) {
      const task = rows.find((row) => row.id === suffix)
      return task ? reply({ ...task, due_date: `${task.due_date}T00:00:00.000Z` }) : fail(404)
    }
    if (method === 'get') {
      const view = config.params?.view ?? 'active'
      const filtered = scenario === 'empty' ? [] : rows.filter((row) => (view === 'history') === isClosed(row.status))
        .filter((row) => !config.params?.status || row.status === config.params.status)
        .filter((row) => !config.params?.assigned_to_id || (config.params.assigned_to_id === 'unassigned' ? !row.assigned_to_id : row.assigned_to_id === config.params.assigned_to_id))
      const page = Number(config.params?.page ?? 1)
      return reply(fixturePage(filtered.slice((page - 1) * 20, page * 20), page, filtered.length))
    }
    if (method === 'post') {
      if (!input?.id) return fail(400)
      if (scenario === 'revoked' || !eligible.some((person) => person.id === input.assigned_to_id)) return fail(403)
      const prior = rows.find((row) => row.id === input.id)
      if (prior && (creators.get(prior.id) !== useAuth.getState().user?.id || prior.version !== 1 || prior.status !== 'PENDING' ||
        prior.title !== input.title || prior.type !== input.type || prior.description !== input.description || prior.priority !== input.priority ||
        prior.due_date !== input.due_date || prior.assigned_to_id !== input.assigned_to_id)) return fail(409)
      const task: Task = prior ?? { ...fixtureTask, ...input, id: input.id, assigned_to_id: input.assigned_to_id ?? ids.staff, status: 'PENDING', version: 1,
        assignee: eligible.find((person) => person.id === input.assigned_to_id) ?? null,
      }
      if (!prior) { rows.push(task); tasks.set(owner, rows); creators.set(task.id, useAuth.getState().user?.id ?? '') }
      if (scenario === 'lost-response' && !lost) { lost = true; throw new AxiosError('Synthetic lost response', 'ERR_NETWORK', config) }
      return reply(task)
    }
    if (method === 'put') {
      if (!input) return fail(400)
      const task = rows.find((row) => row.id === suffix)
      if (!task) return fail(404)
      if (scenario === 'conflict' && !conflicted) { task.version++; task.title = 'Versión actual del servidor sintético'; conflicted = true }
      if (task.version !== input.expected_version || isClosed(task.status)) return fail(409)
      if (input.assigned_to_id && !eligible.some((person) => person.id === input.assigned_to_id)) return fail(403)
      const { expected_version: _version, id: _id, ...fields } = input
      void _version; void _id
      Object.assign(task, fields, { version: task.version + 1 })
      if (input.assigned_to_id) task.assignee = eligible.find((person) => person.id === input.assigned_to_id) ?? null
      return reply(task)
    }
  }
  if (/^\/admin\/clients\/[^/]+$/.test(url)) return reply({ user: { id: ids.client, profile: null }, profile: null, streak: null })
  if (url.includes('/calendar/')) return reply([])
  if (url.includes('/progress/')) return reply(null)
  return fail(404)
} })
