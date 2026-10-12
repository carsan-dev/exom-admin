import axios, { AxiosError } from 'axios'

// Synthetic transport only: no network, no Firebase. Unknown routes throw instead of falling back.
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const T = ['aaaaaaa1-0000-4000-8000-000000000001', 'aaaaaaa2-0000-4000-8000-000000000002', 'aaaaaaa3-0000-4000-8000-000000000003',
  'aaaaaaa4-0000-4000-8000-000000000004', 'aaaaaaa5-0000-4000-8000-000000000005']
const DIETS = ['dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000002']
const RULE_ID = 'eeeeeeee-0000-4000-8000-000000000001'
const TODAY = '2026-10-12'
const FRIDAY_ALL = '2026-10-09'

export const fixtureCalls: { method: string; path: string; params: unknown; body: unknown }[] = []

type Json = Record<string, unknown>
const trainingBase = [
  { id: T[0], name: 'Fuerza tren superior', type: 'Fuerza', level: 'INTERMEDIO', estimated_duration_min: 60, estimated_calories: 420, exercises_count: 7 },
  { id: T[1], name: 'Pierna y glúteo', type: 'Fuerza', level: 'INTERMEDIO', estimated_duration_min: 55, estimated_calories: 480, exercises_count: 6 },
  { id: T[2], name: 'Cardio base', type: 'Cardio', level: 'PRINCIPIANTE', estimated_duration_min: 40, estimated_calories: 350, exercises_count: 3 },
  { id: T[3], name: 'Movilidad y core', type: 'Movilidad', level: 'PRINCIPIANTE', estimated_duration_min: 30, estimated_calories: 150, exercises_count: 8 },
  { id: T[4], name: 'HIIT corto', type: 'Cardio', level: 'AVANZADO', estimated_duration_min: 25, estimated_calories: 300, exercises_count: 5 },
].map((item) => ({ ...item, is_active: true, accentColor: null, types: [item.type], requires_last_set_video: false, last_set_video_policy: 'AUTO' }))
const trainingById = (id: string) => trainingBase.find((item) => item.id === id) ?? trainingBase[0]
const dietBase = [
  { id: DIETS[0], name: 'Dieta base 2200 kcal', total_calories: 2200, total_protein_g: 150, total_carbs_g: 240, total_fat_g: 70, tags: [], meals_count: 5 },
  { id: DIETS[1], name: 'Dieta descarga 1900 kcal', total_calories: 1900, total_protein_g: 140, total_carbs_g: 190, total_fat_g: 65, tags: [], meals_count: 4 },
]
const dietById = (id: string | null | undefined) => dietBase.find((item) => item.id === id) ?? null

// ---- Assignments (in-memory) -------------------------------------------------------------
interface DayOverride { id: string; client_id: string; date: string; is_rest_day: boolean; training_ids: string[]; diet_id: string | null; mode: 'ALL' | 'ANY' }
const overrides = new Map<string, DayOverride>()
const keyOf = (client: string, date: string) => `${client}:${date}`
function seedOverride(date: string, training_ids: string[], mode: 'ALL' | 'ANY') {
  overrides.set(keyOf(A, date), { id: `manual-${date}`, client_id: A, date, is_rest_day: false, training_ids, diet_id: DIETS[0], mode })
}
// Manual days before the rule starts (2 trainings each) and a manual override inside the rule week (Friday, ALL, 2 trainings).
seedOverride('2026-09-30', [T[0], T[1]], 'ALL')
seedOverride('2026-10-02', [T[2], T[3]], 'ANY')
seedOverride(FRIDAY_ALL, [T[0], T[1]], 'ALL')

interface RuleDay { id: string; weekday: number; training_ids: string[]; diet_id: string | null; is_rest_day: boolean }
const rule = {
  id: RULE_ID, client_id: A, admin_id: null, source_week_start: '2026-10-05', starts_on: '2026-10-05', ends_on: null as string | null,
  is_active: true, deactivated_at: null as string | null, training_completion_mode: 'ANY' as 'ALL' | 'ANY',
  days: [1, 2, 3, 4, 5, 6, 7].map((weekday): RuleDay => ({ id: `rule-day-${weekday}`, weekday, training_ids: [T[0], T[1], T[2]], diet_id: DIETS[0], is_rest_day: false })),
}
function ruleView() {
  return {
    ...rule,
    days: rule.days.map((day) => {
      const trainings = day.training_ids.map(trainingById)
      return { ...day, training_id: trainings[0]?.id ?? null, training: trainings[0] ?? null, trainings, diet: dietById(day.diet_id) }
    }),
  }
}
function isoWeekday(date: string) {
  const value = new Date(`${date}T00:00:00Z`).getUTCDay()
  return value === 0 ? 7 : value
}
function assignmentDay(client: string, date: string) {
  const empty = { id: null, client_id: client, date, is_rest_day: false, training: null, trainings: [], training_ids: [], diet: null, training_completion_mode: 'ALL' as 'ALL' | 'ANY' }
  const manual = overrides.get(keyOf(client, date))
  if (manual) {
    const trainings = manual.is_rest_day ? [] : manual.training_ids.map(trainingById)
    return { id: manual.id, client_id: client, date, is_rest_day: manual.is_rest_day, training: trainings[0] ?? null, trainings,
      training_ids: trainings.map((item) => item.id), diet: dietById(manual.diet_id), training_completion_mode: manual.mode }
  }
  if (client === A && rule.is_active && date >= rule.starts_on && (!rule.ends_on || date <= rule.ends_on)) {
    const ruleDay = rule.days.find((day) => day.weekday === isoWeekday(date))
    if (ruleDay) {
      const trainings = ruleDay.is_rest_day ? [] : ruleDay.training_ids.map(trainingById)
      return { id: `auto-${date}`, client_id: client, date, is_rest_day: ruleDay.is_rest_day, training: trainings[0] ?? null, trainings,
        training_ids: trainings.map((item) => item.id), diet: dietById(ruleDay.diet_id), training_completion_mode: rule.training_completion_mode }
    }
  }
  return empty
}
const datesFrom = (start: string, count: number) => Array.from({ length: count }, (_, index) => new Date(Date.parse(`${start}T00:00:00Z`) + index * 86400000).toISOString().slice(0, 10))

// ---- Progress ----------------------------------------------------------------------------
const WEEK = datesFrom('2026-10-05', 8) // Mon 05 .. Mon 12
const DONE_ANY = new Set(['2026-10-06', '2026-10-07'])
function dayTraining(date: string) {
  const day = assignmentDay(A, date)
  const mode = day.training_completion_mode ?? 'ALL'
  const ids = day.training_ids
  const doneIds = date === FRIDAY_ALL ? [ids[0]] : DONE_ANY.has(date) ? [ids[0]] : []
  const completed = mode === 'ANY' ? doneIds.length >= 1 : doneIds.length === ids.length && ids.length > 0
  return { mode, ids, doneIds, completed }
}
function calendarMonth(client: string, year: number, month: number) {
  if (client !== A || year !== 2026 || month !== 10) return []
  return datesFrom('2026-10-01', 31).filter((date) => date >= '2026-10-05').map((date) => {
    const info = dayTraining(date)
    return { date, has_training: true, has_diet: true, is_rest_day: false, training_completed: info.completed, diet_completed: date < TODAY && date !== '2026-10-08',
      training_completion_mode: info.mode, trainings_assigned: info.ids.length, trainings_done: info.doneIds.length }
  })
}
function weekSummary(client: string, weekStart: string) {
  const base = { week_start: weekStart, total_meals: 35, meals_completed: 0, diet_days_assigned: 0, diet_days_completed: 0, trainings_assigned: 0, trainings_completed: 0, training_days_assigned: 0, training_days_completed: 0 }
  if (client !== A) return base
  const dates = datesFrom(weekStart, 7).filter((date) => date >= '2026-10-05')
  const infos = dates.map(dayTraining)
  return { ...base, meals_completed: weekStart === '2026-10-05' ? 21 : 0, diet_days_assigned: dates.length, diet_days_completed: weekStart === '2026-10-05' ? 3 : 0,
    trainings_assigned: infos.reduce((sum, item) => sum + item.ids.length, 0), trainings_completed: infos.reduce((sum, item) => sum + item.doneIds.length, 0),
    training_days_assigned: infos.length, training_days_completed: infos.filter((item) => item.completed).length }
}
const exercisesFor = (date: string) => {
  if (date === '2026-10-06') return [
    { exercise_id: 'xxxxxxx1-0000-4000-8000-000000000001', exercise_name: 'Sentadilla', completed_at: `${date}T09:10:00Z`,
      sets: [{ set_number: 1, reps: 8, weight_kg: 80 }, { set_number: 2, reps: 8, weight_kg: 80 }, { set_number: 3, reps: 6, weight_kg: 85 }] },
    { exercise_id: 'xxxxxxx9-0000-4000-8000-000000000009', exercise_name: null, completed_at: `${date}T09:40:00Z`, sets: [{ set_number: 1, reps: 12, weight_kg: 30 }] },
  ]
  if (date === '2026-10-07') return [
    { exercise_id: 'xxxxxxx2-0000-4000-8000-000000000002', exercise_name: 'Press banca', completed_at: `${date}T18:05:00Z`,
      sets: [{ set_number: 1, reps: 10, weight_kg: 60 }, { set_number: 2, reps: 8, weight_kg: 65 }] },
  ]
  if (date === FRIDAY_ALL) return [
    { exercise_id: 'xxxxxxx3-0000-4000-8000-000000000003', exercise_name: 'Remo con barra', completed_at: `${date}T17:30:00Z`, sets: [{ set_number: 1, reps: 10, weight_kg: 50 }] },
  ]
  return []
}
function dayProgress(client: string, date: string) {
  if (client !== A || !WEEK.includes(date)) return null
  const info = dayTraining(date)
  return { id: `progress-${date}`, client_id: client, date, training_completed: info.completed,
    training_summary: { training_completion_mode: info.mode, assigned_count: info.ids.length, completed_count: info.doneIds.length,
      assigned_training_ids: info.ids, completed_training_ids: info.doneIds },
    exercises_completed: exercisesFor(date), meals_completed: [], meals_completed_details: [], diet_history: [],
    notes: DONE_ANY.has(date) ? 'Nota sintética del cliente.' : null, admin_reply_text: null, admin_reply_sent_at: null }
}

// ---- Training tab ------------------------------------------------------------------------
const EX = {
  press: 'xxxxxxx2-0000-4000-8000-000000000002', squat: 'xxxxxxx1-0000-4000-8000-000000000001', row: 'xxxxxxx3-0000-4000-8000-000000000003',
  dead: 'xxxxxxx4-0000-4000-8000-000000000004', missing: 'xxxxxxx9-0000-4000-8000-000000000009',
}
const exerciseSummaries = [
  { exercise_id: EX.press, exercise_name: 'Press banca', name_source: 'snapshot', sets: 6, max_reps: 10, max_seconds: null, volume: 3900, mean_rir: 2, pr: { weight_kg: 65, reps: 8, date: '2026-10-07', training_session_id: 'sess-1', set_number: 2 } },
  { exercise_id: EX.squat, exercise_name: 'Sentadilla', name_source: 'current_catalog', sets: 6, max_reps: 8, max_seconds: null, volume: 3880, mean_rir: 2, pr: null },
  { exercise_id: EX.row, exercise_name: 'Remo con barra', name_source: 'snapshot', sets: 3, max_reps: 10, max_seconds: null, volume: 1500, mean_rir: 3, pr: null },
  { exercise_id: EX.dead, exercise_name: 'Peso muerto', name_source: 'current_catalog', sets: 4, max_reps: 5, max_seconds: null, volume: 2400, mean_rir: 1, pr: null },
  { exercise_id: EX.missing, exercise_name: null, name_source: null, sets: 2, max_reps: 12, max_seconds: null, volume: 720, mean_rir: null, pr: null },
]
const sessions = [
  { date: '2026-10-09', training_id: T[0], training_session_id: 'sess-3', training_name: null, training_name_source: null, rpe: 6, note: null },
  { date: '2026-10-07', training_id: T[0], training_session_id: 'sess-1', training_name: 'Fuerza tren superior', training_name_source: 'snapshot', rpe: 8, note: 'Buen ritmo, nota sintética.' },
  { date: '2026-10-06', training_id: T[1], training_session_id: 'sess-2', training_name: 'Pierna y glúteo', training_name_source: 'current_catalog', rpe: 7, note: null },
  { date: '2026-10-02', training_id: T[2], training_session_id: 'sess-4', training_name: 'Cardio base', training_name_source: 'snapshot', rpe: 5, note: null },
]
const setRow = (date: string, session: string, id: string, name: string | null, source: string | null, set: number, reps: number | null, weight: number | null, rir: number | null) => ({
  date, exercise_id: id, exercise_name: name, exercise_name_source: source, training_session_id: session, training_exercise_id: `te-${id.slice(-2)}`,
  set_number: set, reps, seconds: null, weight_kg: weight, rir, volume: reps !== null && weight !== null ? reps * weight : null,
})
const sessionSets: Record<string, ReturnType<typeof setRow>[]> = {
  'sess-1': [setRow('2026-10-07', 'sess-1', EX.press, 'Press banca', 'snapshot', 1, 10, 60, 3), setRow('2026-10-07', 'sess-1', EX.press, 'Press banca', 'snapshot', 2, 8, 65, 2),
    setRow('2026-10-07', 'sess-1', EX.row, 'Remo con barra', 'snapshot', 1, 10, 50, 3)],
  'sess-2': [setRow('2026-10-06', 'sess-2', EX.squat, 'Sentadilla', 'current_catalog', 1, 8, 80, 2), setRow('2026-10-06', 'sess-2', EX.squat, 'Sentadilla', 'current_catalog', 2, 8, 80, 2),
    setRow('2026-10-06', 'sess-2', EX.dead, 'Peso muerto', 'current_catalog', 1, 5, 120, 1), setRow('2026-10-06', 'sess-2', EX.missing, null, null, 1, 12, 30, null)],
  'sess-3': [setRow('2026-10-09', 'sess-3', EX.row, 'Remo con barra', 'snapshot', 1, 10, 50, 3), setRow('2026-10-09', 'sess-3', EX.missing, null, null, 1, 12, 30, null)],
  'sess-4': [setRow('2026-10-02', 'sess-4', EX.dead, 'Peso muerto', 'current_catalog', 1, 5, 110, 2)],
}

// ---- Dashboard minimum (the default section; not the focus of this harness) ---------------
const component = { status: 'evaluable', numerator: 1, denominator: 2, ratio: 0.5, caveats: [] }
const aggregate = { training: component, nutrition: component, global: { ...component, source: 'both' } }
const point = (date: string, value: number) => ({ date, value, quality: 'complete', provenance: 'observed' })
function adherence(start: string, end: string) {
  return { version: 1, start, end, today: TODAY, evaluated_at: `${TODAY}T12:00:00Z`, days: [], weeks: [], aggregate,
    recentClosed: { start: '2026-10-04', end: '2026-10-10', anchor: 'selected_end_or_last_closed_utc', provisional: false, aggregate,
      configuration: { known: true, version: 1, low_global_percent: 80, effective_date: '2026-09-01' },
      coverage: { expected: 7, available: 7, evaluable: 6, not_applicable: 0, insufficient: 1 }, status: 'ok' } }
}

function envelope(config: unknown, data: unknown) {
  return { data: { success: true, data, timestamp: `${TODAY}T12:00:00Z` }, status: 200, statusText: 'Synthetic', headers: {}, config }
}

export const api = axios.create({ adapter: async (config) => {
  const path = config.url ?? ''
  const method = (config.method ?? 'get').toLowerCase()
  const params = (config.params ?? {}) as Record<string, string>
  const body: Json = typeof config.data === 'string' && config.data ? JSON.parse(config.data) as Json : {}
  fixtureCalls.push({ method, path, params: structuredClone(params), body })
  const reply = (data: unknown) => envelope(config, data) as never
  const unsupported = (): never => { throw new AxiosError(`Unsupported synthetic route: ${method} ${path}`, 'FIXTURE', config, undefined,
    { ...(envelope(config, null) as object), status: 404, data: { message: `Unsupported synthetic route: ${method} ${path}`, statusCode: 404 } } as never) }

  // ---- Assignments
  if (path === '/assignments/client-options') return reply([A, B].map((id, index) => ({ id, email: `client-${index}@example.invalid`, profile: { first_name: 'Cliente', last_name: `Sintético ${index === 0 ? 'A' : 'B'}`, avatar_url: null } })))
  if (path === '/assignments/catalog-options') return reply({ trainings: trainingBase, diets: dietBase })
  if (path === '/assignments/auto-rules/active') return reply(params.client_id === A && rule.is_active ? ruleView() : null)
  if (path === '/assignments/week') {
    const dates = datesFrom(params.week_start, 7)
    return reply({ client_id: params.client_id, week_start: dates[0], week_end: dates[6], days: dates.map((date) => assignmentDay(params.client_id, date)) })
  }
  if (path === '/assignments/month') {
    const year = Number(params.year); const month = Number(params.month)
    const first = `${year}-${String(month).padStart(2, '0')}-01`
    const count = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const dates = datesFrom(first, count)
    return reply({ client_id: params.client_id, year, month, month_start: dates[0], month_end: dates[count - 1], days: dates.map((date) => assignmentDay(params.client_id, date)) })
  }
  if (path.startsWith('/assignments/clients/') && path.endsWith('/rir-cycle') && method === 'get') return reply({ revision: 1, versions: [], dates: [] })
  if (path === '/assignments/batch' && method === 'post') {
    const days = (body.days as { date: string; training_ids?: string[]; diet_id?: string | null; is_rest_day: boolean; training_completion_mode?: 'ALL' | 'ANY' }[])
    const clientId = String(body.client_id)
    return reply(days.map((day) => {
      const previous = overrides.get(keyOf(clientId, day.date))
      overrides.set(keyOf(clientId, day.date), { id: previous?.id ?? `manual-${day.date}`, client_id: clientId, date: day.date, is_rest_day: day.is_rest_day,
        training_ids: day.training_ids ?? [], diet_id: day.diet_id ?? null, mode: day.training_completion_mode ?? previous?.mode ?? 'ALL' })
      return assignmentDay(clientId, day.date)
    }))
  }
  if (path === '/assignments/auto-rules' && method === 'post') return reply(ruleView())
  if (path === `/assignments/auto-rules/${RULE_ID}` && method === 'put') {
    const mode = body.training_completion_mode as 'ALL' | 'ANY' | undefined
    if (mode) rule.training_completion_mode = mode
    rule.ends_on = (body.ends_on as string | null | undefined) ?? null
    const days = body.days as { weekday: number; training_ids?: string[]; diet_id?: string | null; is_rest_day: boolean }[] | undefined
    if (days) rule.days = days.map((day): RuleDay => ({ id: `rule-day-${day.weekday}`, weekday: day.weekday, training_ids: day.training_ids ?? [], diet_id: day.diet_id ?? null, is_rest_day: day.is_rest_day }))
    return reply(ruleView())
  }
  if (path === `/assignments/auto-rules/${RULE_ID}/deactivate` && method === 'put') {
    rule.is_active = false; rule.deactivated_at = `${TODAY}T12:00:00Z`
    return reply(ruleView())
  }
  if (path.startsWith('/assignments/manual-') && method === 'put') {
    const found = [...overrides.values()].find((item) => path === `/assignments/${item.id}`)
    if (!found) return unsupported()
    const mode = body.training_completion_mode as 'ALL' | 'ANY' | undefined
    const next = { ...found, date: (body.date as string | undefined) ?? found.date, is_rest_day: Boolean(body.is_rest_day),
      training_ids: (body.training_ids as string[] | undefined) ?? found.training_ids, diet_id: (body.diet_id as string | null | undefined) ?? null, mode: mode ?? found.mode }
    overrides.delete(keyOf(found.client_id, found.date)); overrides.set(keyOf(next.client_id, next.date), next)
    return reply(assignmentDay(next.client_id, next.date))
  }
  if (path === '/assignments/delete-batch' && method === 'post') {
    const ids = body.assignment_ids as string[]
    let deleted = 0
    for (const [key, item] of overrides) if (ids.includes(item.id)) { overrides.delete(key); deleted++ }
    return reply({ deleted_count: deleted })
  }

  // ---- Clients / progress
  const match = path.match(/^\/admin\/clients\/([^/]+)(?:\/(.*))?$/)
  if (path === '/admin/clients') return reply({ data: [A, B].map((id, index) => ({ id, email: `client-${index}@example.invalid`, profile: { first_name: 'Cliente', last_name: `Sintético ${index === 0 ? 'A' : 'B'}`, avatar_url: null } })), page: 1, total: 2, limit: 20, totalPages: 1 })
  if (path === '/recaps') return reply({ data: [], page: 1, total: 0, limit: 20, totalPages: 1 })
  if (!match) return unsupported()
  const client = match[1]
  const suffix = match[2] ?? ''
  if (method !== 'get') return unsupported()
  if (!suffix) return reply({ user: { id: client, profile: null }, profile: null, streak: null })
  if (suffix === 'progress') return reply(dayProgress(client, params.date))
  if (suffix === 'calendar/month') return reply(calendarMonth(client, Number(params.year), Number(params.month)))
  if (suffix === 'calendar/week-summary') return reply(weekSummary(client, params.week_start))
  if (suffix === 'progress/training-overview') {
    const withData = client === A
    const identified = params.identification !== 'all'
    const search = (params.search ?? '').toLowerCase()
    const exercises = withData ? exerciseSummaries.filter((item) => (!identified || item.exercise_name) && (!search || (item.exercise_name ?? '').toLowerCase().includes(search))) : []
    return reply({ indicators: withData ? { trainings_completed: 4, volume: 12400, mean_rir: 2, mean_rpe: 6.5 } : { trainings_completed: 0, volume: null, mean_rir: null, mean_rpe: null }, exercises, next_cursor: null })
  }
  if (suffix === 'progress/training-sessions') return reply({ page: client === A ? sessions : [], nextCursor: null })
  if (suffix === 'progress/legacy-training-records') return reply({ page: [], nextCursor: null })
  const detail = suffix.match(/^progress\/training-sessions\/([^/]+)\/([^/]+)$/)
  if (detail) {
    const session = sessions.find((item) => item.training_session_id === decodeURIComponent(detail[2]))
    if (!session || client !== A) return reply(null)
    return reply({ training_id: session.training_id, training_session_id: session.training_session_id, training_name: session.training_name, training_name_source: session.training_name_source,
      rpe: session.rpe, note: session.note, page: sessionSets[session.training_session_id] ?? [], nextCursor: null })
  }
  const load = suffix.match(/^progress\/exercises\/([^/]+)\/load-history$/)
  if (load) return reply({ page: client === A ? Object.values(sessionSets).flat().filter((item) => item.exercise_id === decodeURIComponent(load[1])).sort((a, b) => a.date.localeCompare(b.date)) : [], nextCursor: null })
  if (suffix === 'metrics/overview') {
    const points = [point('2026-09-12', 86), point('2026-10-11', 82)]
    return reply({ client_id: client, from: params.from ?? '2025-01-01', to: params.to, chart_from: '2026-09-12', chart_to: '2026-10-11', page: 1, total_pages: 1,
      series: [{ key: 'weight_kg', label: 'Peso', unit: 'kg', group: 'body', source: 'Mediciones corporales', first: points[0], last: points[1], change: -4, count: 2, incomplete_count: 0, points }] })
  }
  if (suffix === 'metrics') return reply({ data: [], total: 0, page: 1, totalPages: 1 })
  if (suffix === 'adherence') return reply(adherence(params.start, params.end))
  if (suffix === 'adherence/config') return reply({ version: 1, known: false, source: 'uncaptured', effective_date: null })
  if (suffix === 'follow-up-tasks/summary') return reply({ as_of_date: TODAY, next_task: null, next_review: null })
  return unsupported()
} })
