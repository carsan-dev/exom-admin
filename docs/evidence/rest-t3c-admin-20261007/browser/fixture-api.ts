import axios, { AxiosError, CanceledError } from 'axios'
import { z } from 'zod'
import { FIXTURE_IDS as ids, fixtureAssignee, fixturePage, fixtureTask } from '../../../../src/features/progress/follow-up-tasks/fixtures'
import type { ClientDetail } from '../../../../src/features/clients/types'
import type { RecapItem } from '../../../../src/features/recaps/types'
import { fixtureGeneration, useAuth } from './fixture-auth'

export const recapIds = { reviewed: 'recap-a', submitted: 'recap-submitted', draft: 'recap-unsent', other: 'recap-b', reviewedUnsent: 'recap-reviewed-unsent' } as const
export const longSummary = `RESUMEN_PUBLICADO_ANTERIOR\n${'Párrafo largo confirmado con observaciones semanales. '.repeat(180)}\nFINAL_RESUMEN_ANTERIOR`
const draftSchema = z.object({ expected_version: z.number().int().nonnegative(), coach_summary: z.string().max(3000).nullable(), changes: z.string().max(3000).nullable(), next_week_goals: z.string().max(3000).nullable() }).strict()
const publishSchema = z.object({ expected_version: z.number().int().nonnegative(), confirm: z.literal(true) }).strict()
const legacySchema = z.object({ admin_comments: z.string().optional(), client_feedback_text: z.string().optional() }).strict()
const date = '2026-10-07T12:00:00Z'
function detail(clientId: string): ClientDetail {
  return { id: clientId, email: 'EMAIL_SENTINEL@example.invalid', role: 'CLIENT', is_active: true, is_locked: false,
    firebase_uid: 'synthetic-not-firebase', created_at: date, updated_at: date, bodyMetrics: [], streak: null,
    profile: { id: `profile-${clientId}`, user_id: clientId, first_name: 'Cliente', last_name: clientId === ids.client ? 'Sintético A' : 'Sintético B', avatar_url: null,
      level: 'INTERMEDIO', main_goal: 'Objetivo sintético', muscle_mass_goal: null, target_calories: null, current_weight: 70, height: 170, birth_date: null, created_at: date, updated_at: date } }
}
function recap(id: string, clientId = ids.client): RecapItem {
  return {
    id, client_id: clientId, week_start_date: '2026-09-28', week_end_date: '2026-10-04', status: 'REVIEWED', submitted_at: date, reviewed_at: date, archived_at: null, created_at: date, updated_at: date,
    training_effort: 7, training_sessions: 3, average_daily_steps: 8000, training_progress: 'BUENO',
    training_notes: `RESPUESTA_CLIENTE_LARGA\n${'Respuesta extensa del cliente con continuidad de párrafos. '.repeat(140)}\nFINAL_RESPUESTA_CLIENTE`,
    nutrition_quality: 'BUENO', food_quality: 8, hydration_enabled: false, hydration_level: null, nutrition_notes: null,
    sleep_hours_range: null, fatigue_level: null, muscle_pain_zones: [], pain_intensity: null, recovery_notes: null,
    mood: null, stress_enabled: false, stress_level: null, general_notes: null,
    improvement_app_rating: 9, improvement_service_rating: 9, improvement_areas: [], improvement_feedback_text: null,
    admin_comments: 'INTERNAL_NOTE_SENTINEL', client_feedback_text: 'FEEDBACK_LEGACY_ENVIADO', client_feedback_sent_at: date, client_feedback_read_at: null,
    review_version: 3, draft_coach_summary: 'PRIVATE_DRAFT_SENTINEL', draft_changes: 'PRIVATE_CHANGES_SENTINEL', draft_next_week_goals: 'PRIVATE_GOALS_SENTINEL',
    published_coach_summary: longSummary, published_changes: `CAMBIOS_PUBLICADOS\n${'Cambio confirmado. '.repeat(60)}`,
    published_next_week_goals: `OBJETIVOS_PUBLICADOS\n${'W'.repeat(2900)}\nFINAL_OBJETIVOS`,
    client: { id: clientId, email: 'EMAIL_SENTINEL@example.invalid', profile: { first_name: 'Cliente', last_name: clientId === ids.client ? 'Sintético A' : 'Sintético B' } },
  }
}
const rows = new Map<string, RecapItem>([
  [recapIds.reviewed, recap(recapIds.reviewed)],
  [recapIds.submitted, { ...recap(recapIds.submitted), status: 'SUBMITTED', reviewed_at: null, published_coach_summary: null, published_changes: null, published_next_week_goals: null, client_feedback_text: 'UNSENT_FEEDBACK_SENTINEL', client_feedback_sent_at: null }],
  [recapIds.draft, { ...recap(recapIds.draft), status: 'DRAFT', submitted_at: null, reviewed_at: null, published_coach_summary: null, published_changes: null, published_next_week_goals: null, client_feedback_text: null, client_feedback_sent_at: null }],
  [recapIds.other, { ...recap(recapIds.other, ids.otherClient), draft_coach_summary: 'BORRADOR_CLIENTE_B', published_coach_summary: 'PUBLICACION_CLIENTE_B' }],
  [recapIds.reviewedUnsent, { ...recap(recapIds.reviewedUnsent), client_feedback_text: 'UNSENT_FEEDBACK_SENTINEL', client_feedback_sent_at: null }],
])
// Fresh browser contexts isolate this initial GET fixture from the original 14 cases.
// Archived is a timestamp on REVIEWED, never a new status or an API mutation.
if (new URLSearchParams(location.search).get('fixture') === 'archived-submitted') {
  rows.set(recapIds.reviewed, { ...recap(recapIds.reviewed), archived_at: date,
    nutrition_notes: `RESPUESTA_NUTRICION_LARGA\n${'Respuesta extensa del cliente con continuidad de párrafos. '.repeat(140)}\nFINAL_RESPUESTA_NUTRICION` })
}
for (let i = 1; i <= 20; i++) rows.set(`recap-page-${i}`, { ...recap(`recap-page-${i}`), training_notes: null })
interface Call { method: string; path: string; params: unknown; payload: unknown; identity: string | null; generation: number }
export const fixtureCalls: Call[] = []
const recapResponses: { method: string; path: string; status: number; generation: number; body: unknown }[] = []
const unexpected: string[] = []
const pending: { path: string; release: () => void }[] = []
const delivered: { path: string; suppressed: boolean }[] = []
let holdPath: string | null = new URLSearchParams(location.search).get('fixture') === 'loading' ? '/recaps/recap-a' : null
let losePublish = false
let rejection: { command: string; status: number } | null = null
let rejectRead = false
export const fixtureControls = {
  snapshot: () => structuredClone(Object.fromEntries(rows)),
  recapResponses: () => structuredClone(recapResponses),
  unsupported: () => [...unexpected],
  rejectNext: (command: string, status = 409) => { rejection = { command, status } },
  failNextRead: () => { rejectRead = true },
  loseNextPublish: () => { losePublish = true },
  hold: (path: string) => { holdPath = path },
  pending: () => pending.map(({ path }) => path), delivered: () => [...delivered],
  release: () => { holdPath = null; for (const item of pending.splice(0)) item.release() },
}
function reviewRecord(row: RecapItem) {
  return { id: row.id, status: row.status, reviewed_at: row.reviewed_at, review_version: row.review_version,
    draft_coach_summary: row.draft_coach_summary, draft_changes: row.draft_changes, draft_next_week_goals: row.draft_next_week_goals,
    published_coach_summary: row.published_coach_summary, published_changes: row.published_changes, published_next_week_goals: row.published_next_week_goals }
}
// Closed route/method allowlist; this adapter never calls a transport fallback.
export const api = axios.create({ adapter: async (config) => {
  const path = config.url ?? ''; const method = config.method ?? 'get'
  const generation = fixtureGeneration()
  const input: unknown = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
  fixtureCalls.push({ method, path, params: structuredClone(config.params ?? {}), payload: input, identity: useAuth.getState().user?.id ?? null, generation })
  const reply = (data: unknown, status = 200) => {
    const body = { success: true, data, timestamp: date }
    // Controlled fixture rows only, never auth state, transport headers or credentials.
    if (method === 'get' && status === 200 && /^\/recaps\/[^/]+$/.test(path) && rows.has(path.slice('/recaps/'.length))) {
      recapResponses.push({ method, path, status, generation, body: structuredClone(body) })
    }
    return { data: body, status, statusText: 'Synthetic fixture', headers: {}, config }
  }
  const fail = (status: number, message = 'Rechazo sintético') => { throw new AxiosError(message, 'FIXTURE_ERROR', config, undefined, { ...reply(null, status), data: { message } }) }
  if (!useAuth.getState().user) return fail(401)
  if (path === holdPath) {
    await new Promise<void>((release) => pending.push({ path, release }))
    const suppressed = generation !== fixtureGeneration()
    delivered.push({ path, suppressed })
    if (suppressed) throw new CanceledError('Synthetic identity generation changed')
  }
  if (method === 'get' && rejectRead && /^\/recaps\/[^/]+$/.test(path)) { rejectRead = false; return fail(503, 'Consulta sintética no disponible') }
  if (method === 'get' && path === '/admin/clients') return reply(fixturePage([detail(ids.client), detail(ids.otherClient)]))
  const ownerRoute = path.match(/^\/admin\/clients\/([^/]+)(?:\/(.*))?$/)
  if (method === 'get' && ownerRoute && [ids.client, ids.otherClient].some((id) => id === ownerRoute[1])) {
    const [, owner, suffix] = ownerRoute
    if (!suffix) return reply(detail(owner))
    if (suffix === 'calendar/month') return reply([])
    if (suffix === 'calendar/week-summary' || suffix === 'progress') return reply(null)
    if (suffix === 'follow-up-tasks') return reply(fixturePage([{ ...fixtureTask, client_id: owner }]))
    if (suffix === 'follow-up-tasks/summary') return reply({ as_of_date: '2026-10-07', next_task: null, next_review: null })
    if (suffix === 'follow-up-tasks/assignees') return reply(fixturePage([fixtureAssignee]))
  }
  if (method === 'get' && path === '/recaps/stats') return reply({ total: rows.size, submitted: 1, reviewed: rows.size - 2, archived: [...rows.values()].filter((row) => row.archived_at !== null).length })
  if (method === 'get' && path === '/recaps') {
    const params = config.params ?? {}
    const filtered = [...rows.values()].filter((row) => (!params.client_id || row.client_id === params.client_id) && row.status !== 'DRAFT' && (!params.status || row.status === params.status) && Boolean(row.archived_at) === Boolean(params.archived))
    const page = Number(params.page ?? 1), limit = Number(params.limit ?? 20)
    return reply({ data: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit, totalPages: Math.ceil(filtered.length / limit) })
  }
  const route = path.match(/^\/recaps\/([^/]+)(?:\/(review-draft|review-publish|review|archive))?$/)
  if (route) {
    const [, id, command] = route; const row = rows.get(id)
    if (!row) return fail(404)
    if (!command && method === 'get') return reply(structuredClone(row))
    if ((command === 'review-publish' && method === 'post') || (['review-draft', 'review', 'archive'].includes(command) && method === 'put')) {
      if (row.status === 'DRAFT' || row.archived_at) return fail(403)
      if (rejection?.command === command) {
        const status = rejection.status; rejection = null
        if (status === 409) { row.review_version = (row.review_version ?? 0) + 1; row.draft_coach_summary = 'VERSIÓN_REMOTA_SINTÉTICA' }
        return fail(status)
      }
      if (command === 'review-draft') {
        const body = draftSchema.parse(input)
        if (body.expected_version !== row.review_version) return fail(409)
        Object.assign(row, { draft_coach_summary: body.coach_summary, draft_changes: body.changes, draft_next_week_goals: body.next_week_goals, review_version: body.expected_version + 1 })
        return reply(reviewRecord(row))
      }
      if (command === 'review-publish') {
        const body = publishSchema.parse(input)
        if (body.expected_version !== row.review_version) return fail(409)
        Object.assign(row, { published_coach_summary: row.draft_coach_summary, published_changes: row.draft_changes, published_next_week_goals: row.draft_next_week_goals, review_version: body.expected_version + 1, status: 'REVIEWED', reviewed_at: row.reviewed_at ?? date })
        if (losePublish) { losePublish = false; throw new AxiosError('Respuesta sintética perdida tras publicar', 'ERR_NETWORK', config) }
        return reply(reviewRecord(row))
      }
      if (command === 'review') {
        const body = legacySchema.parse(input)
        if (body.admin_comments !== undefined) row.admin_comments = body.admin_comments || null
        if (body.client_feedback_text !== undefined && row.client_feedback_text !== body.client_feedback_text) {
          row.client_feedback_text = body.client_feedback_text || null
          row.client_feedback_sent_at = body.client_feedback_text ? date : null
          row.client_feedback_read_at = null
        }
        row.status = 'REVIEWED'; row.reviewed_at ??= date
      } else row.archived_at = date
      const { client: relation, ...scalar } = row; void relation
      return reply(scalar)
    }
  }
  unexpected.push(`${method} ${path}`)
  return fail(404, 'Ruta o método fuera de la allowlist del harness')
} })
