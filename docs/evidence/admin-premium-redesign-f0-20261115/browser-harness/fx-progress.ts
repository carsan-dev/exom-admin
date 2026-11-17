import { TODAY, addDays, daysFromToday, isoAt, paginate, svgImage, uuid, type FixtureCtx } from './fx-util'
import { ADMIN_IDS, MAIN_CLIENT, admins, bodyMetrics } from './fx-people'
import { exercises, trainings } from './fx-catalog'
import { buildDay } from './fx-assignments'

const isMain = (id: string) => id === MAIN_CLIENT
const dateRange = (from: string, to: string) => {
  const out: string[] = []
  for (let d = from; d <= to && out.length < 400; d = addDays(d, 1)) out.push(d)
  return out
}

// ---- Día / calendario / semana -----------------------------------------------------------------
// Entrenos completados: días pasados con entreno salvo los que cumplen (día del mes % 5 === 0).
const trainingDone = (date: string) => date < TODAY && Number(date.slice(8)) % 5 !== 0
const dietDone = (date: string) => date < TODAY && Number(date.slice(8)) % 7 !== 0

function calendarMonth(client: string, year: number, month: number) {
  if (!isMain(client)) return []
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return dateRange(first, addDays(first, count - 1)).flatMap((date) => {
    const day = buildDay(client, date)
    if (day.trainings.length === 0 && !day.diet && !day.is_rest_day) return []
    const done = trainingDone(date)
    return [{ date, has_training: day.trainings.length > 0, has_diet: Boolean(day.diet), is_rest_day: day.is_rest_day, training_completed: day.trainings.length > 0 && done,
      diet_completed: Boolean(day.diet) && dietDone(date), training_completion_mode: day.training_completion_mode, trainings_assigned: day.trainings.length, trainings_done: done ? day.trainings.length : 0 }]
  })
}
function weekSummary(client: string, weekStart: string) {
  const base = { week_start: weekStart, trainings_assigned: 0, trainings_completed: 0, training_days_assigned: 0, training_days_completed: 0, total_meals: 0, meals_completed: 0, diet_days_assigned: 0, diet_days_completed: 0 }
  if (!isMain(client)) return base
  const days = dateRange(weekStart, addDays(weekStart, 6)).map((d) => buildDay(client, d))
  const withTraining = days.filter((d) => d.trainings.length > 0), withDiet = days.filter((d) => d.diet)
  return { ...base, trainings_assigned: withTraining.reduce((n, d) => n + d.trainings.length, 0), trainings_completed: withTraining.filter((d) => trainingDone(d.date)).reduce((n, d) => n + d.trainings.length, 0),
    training_days_assigned: withTraining.length, training_days_completed: withTraining.filter((d) => trainingDone(d.date)).length,
    total_meals: withDiet.length * 5, meals_completed: withDiet.filter((d) => dietDone(d.date)).length * 5, diet_days_assigned: withDiet.length, diet_days_completed: withDiet.filter((d) => dietDone(d.date)).length }
}
function dayProgress(client: string, date: string) {
  if (!isMain(client)) return null
  const day = buildDay(client, date)
  if (day.trainings.length === 0 && !day.diet) return null
  const done = trainingDone(date)
  const doneTrainings = done ? day.trainings : []
  const dietFor = day.diet
  return {
    id: `fixture-progress-${date}`, client_id: client, date, training_completed: done && day.trainings.length > 0,
    training_summary: { training_completion_mode: day.training_completion_mode, assigned_count: day.trainings.length, completed_count: doneTrainings.length,
      assigned_training_ids: day.trainings.map((t) => t.id), completed_training_ids: doneTrainings.map((t) => t.id) },
    exercises_completed: doneTrainings.flatMap((t) => (trainings.find((x) => x.id === t.id)?.exercises ?? []).slice(0, 4).map((te) => ({
      exercise_id: te.exercise.id, exercise_name: te.exercise.name, completed_at: `${date}T18:30:00Z`,
      sets: [1, 2, 3].map((n) => ({ set_number: n, reps: 10 - n, weight_kg: 40 + n * 5 })) }))),
    meals_completed: [], meals_completed_details: dietDone(date) && dietFor ? [{ meal_id: 'fixture-meal-1', meal_name: 'Avena con plátano y yogur' }, { meal_id: 'fixture-meal-2', meal_name: 'Arroz con pollo y brócoli' }] : [],
    diet_history: [], notes: done && day.trainings.length > 0 ? 'Buenas sensaciones, subí un poco el peso en el último ejercicio.' : null,
    admin_reply_text: done && date === addDays(TODAY, -2) ? 'Perfecto, mantén ese ritmo la semana que viene.' : null, admin_reply_sent_at: done && date === addDays(TODAY, -2) ? isoAt(-1, '09:00:00') : null,
  }
}

// ---- Entrenamiento --------------------------------------------------------------------------------
const pastTrainingDays = dateRange(addDays(TODAY, -60), addDays(TODAY, -1)).filter((d) => buildDay(MAIN_CLIENT, d).trainings.length > 0 && trainingDone(d)).reverse()
const sessions = pastTrainingDays.slice(0, 8).map((date, i) => {
  const t = buildDay(MAIN_CLIENT, date).trainings[0]
  return { date, training_id: t.id, training_session_id: uuid('5e550000', i + 1), training_name: t.name, training_name_source: 'snapshot' as const, rpe: 6 + (i % 3), note: i % 3 === 0 ? 'Buena sesión, algo de fatiga en el último bloque.' : null }
})
const setRow = (date: string, session: string, exerciseId: string, name: string, set: number, reps: number, weight: number, rir: number) => ({
  date, exercise_id: exerciseId, exercise_name: name, exercise_name_source: 'snapshot' as const, training_session_id: session, training_exercise_id: `te-${exerciseId.slice(-3)}`,
  set_number: set, reps, seconds: null, weight_kg: weight, rir, volume: reps * weight,
})
const setsOfSession = (s: (typeof sessions)[number]) => (trainings.find((t) => t.id === s.training_id)?.exercises ?? []).slice(0, 3).flatMap((te, e) =>
  [1, 2, 3].map((n) => setRow(s.date, s.training_session_id, te.exercise.id, te.exercise.name, n, 10 - n, 40 + e * 10 + n * 2.5, 3 - (n - 1))))
const exerciseSummaries = exercises.slice(0, 7).map((e, i) => ({
  exercise_id: e.id, exercise_name: e.name, name_source: 'snapshot' as const, sets: 12 - i, max_reps: 12, max_seconds: null, volume: 5200 - i * 450, mean_rir: 2,
  pr: i < 4 ? { weight_kg: 60 + i * 10, reps: 6, date: addDays(TODAY, -6 - i), training_session_id: sessions[i]?.training_session_id ?? null, set_number: 2 } : null,
}))

// ---- Métricas ------------------------------------------------------------------------------------
const obs = (date: string, value: number) => ({ date, value, quality: 'complete' as const, provenance: 'observed' })
const series = (key: string, label: string, unit: string, group: 'body' | 'habits' | 'nutrition', source: string, values: number[]) => {
  const points = values.map((v, i) => obs(addDays(TODAY, -14 * (values.length - 1 - i)), v))
  const nums = values
  return { key, label, unit, group, source, first: points[0], last: points[points.length - 1], change: Number((nums[nums.length - 1] - nums[0]).toFixed(2)),
    min: Math.min(...nums), max: Math.max(...nums), mean: Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)), count: points.length, incomplete_count: 0, points }
}
const metricSeries = [
  series('weight_kg', 'Peso', 'kg', 'body', 'Mediciones corporales', bodyMetrics.map((m) => m.weight_kg ?? 0)),
  series('muscle_mass_kg', 'Masa muscular', 'kg', 'body', 'Mediciones corporales', bodyMetrics.map((m) => m.muscle_mass_kg ?? 0)),
  series('waist_cm', 'Cintura', 'cm', 'body', 'Mediciones corporales', bodyMetrics.map((m) => m.waist_cm ?? 0)),
  series('estimated_calories', 'Calorías estimadas', 'kcal', 'nutrition', 'Comidas completadas', [2150, 2210, 2080, 2240, 2190, 2160]),
  series('estimated_protein_g', 'Proteína estimada', 'g', 'nutrition', 'Comidas completadas', [138, 142, 135, 150, 147, 149]),
  series('sleep_hours', 'Horas de sueño', 'h', 'habits', 'Recaps semanales', [7, 7.5, 6.5, 7, 8, 7.5]),
  series('steps', 'Pasos diarios', 'pasos', 'habits', 'Recaps semanales', [8200, 9100, 7600, 10200, 9800, 9400]),
]

// ---- Fotos ---------------------------------------------------------------------------------------
const VIEWS = ['FRONT', 'LEFT', 'RIGHT', 'BACK'] as const
const photoSessions = [-30, -16, -2].map((delta, s) => ({
  id: uuid('9a070000', s + 1), session_date: daysFromToday(delta), created_at: isoAt(delta, '08:15:00'), updated_at: isoAt(delta, '08:20:00'), is_complete: s !== 1,
  photos: VIEWS.filter((_, v) => !(s === 1 && v === 3)).map((view, v) => ({ id: uuid('9a0f0000', s * 10 + v + 1), view, state: 'ACTIVE' as const, replaces_photo_id: null, created_at: isoAt(delta, '08:16:00'),
    image_url: svgImage(`${view} · ${daysFromToday(delta)}`, 200 + s * 30 + v * 15, 360, 480), content_type: 'image/svg+xml', bytes: 24_000 + v * 800 })),
}))

// ---- Adherencia ----------------------------------------------------------------------------------
const comp = (num: number, den: number) => ({ status: den === 0 ? 'not_applicable' as const : 'evaluable' as const, numerator: num, denominator: den, ratio: den === 0 ? null : num / den, caveats: [] as string[] })
const aggregate = (t: [number, number], n: [number, number]) => ({ training: comp(t[0], t[1]), nutrition: comp(n[0], n[1]), global: { ...comp(t[0] + n[0], t[1] + n[1]), source: 'both' as const } })
function adherence(start: string, end: string) {
  const dates = dateRange(start, end)
  const days = dates.map((date) => {
    const day = buildDay(MAIN_CLIENT, date)
    const past = date < TODAY
    const t = day.trainings.length > 0, n = Boolean(day.diet)
    const tDone = t && trainingDone(date), nDone = n && dietDone(date)
    const calendar = !past ? 'future' as const : day.is_rest_day ? 'rest' as const : !t && !n ? 'not_assigned' as const : tDone && nDone ? 'complete' as const : tDone || nDone ? 'partial' as const : 'incomplete' as const
    return { date, revision: 1, basis: 'original' as const,
      evaluation: { date, period: past ? 'closed' as const : 'future' as const, includeInClosedAggregate: past, ...aggregate([tDone ? 1 : 0, t && past ? 1 : 0], [nDone ? 1 : 0, n && past ? 1 : 0]) },
      indicators: { calories: { status: nDone ? 'met' as const : 'insufficient' as const }, protein: { status: nDone ? 'met' as const : 'insufficient' as const }, weeklySteps: { status: 'met' as const } },
      intake: { estimated_calories: nDone ? 2180 : null, estimated_protein_g: nDone ? 146 : null }, calendar, targets: { calories: 2200, protein_g: 150 },
      configuration: { known: true, version: 1, low_global_percent: 80 }, schedule: { training: t ? 'assigned' as const : 'not_assigned' as const, nutrition: n ? 'assigned' as const : 'not_assigned' as const } }
  })
  const weekStarts = [...new Set(dates.map((d) => addDays(d, -(((new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7)))))]
  const weeks = weekStarts.map((weekStart) => ({ start: weekStart, average_daily_steps: 9100, weeklySteps: { status: 'met' as const, threshold: 8000 },
    dailyTargets: [{ date: weekStart, goal: 10000, steps_min_percent: 80, version: 1, effective_date: '2026-09-01', status: 'met' as const }], aggregate: aggregate([4, 5], [30, 35]) }))
  return { version: 1 as const, start, end, evaluated_at: `${TODAY}T10:00:00.000Z`, today: TODAY, days, weeks, aggregate: aggregate([14, 18], [96, 120]),
    recentClosed: { start: addDays(TODAY, -7), end: addDays(TODAY, -1), anchor: 'selected_end_or_last_closed_utc' as const, provisional: false as const, aggregate: aggregate([5, 6], [29, 35]),
      configuration: { known: true, version: 1, low_global_percent: 80, effective_date: '2026-09-01' }, coverage: { expected: 7, available: 7, evaluable: 7, not_applicable: 0, insufficient: 0 }, status: 'not_low' as const } }
}
const adherenceConfig = { version: 1, known: true as const, source: 'default' as const, effective_date: null, steps_goal: 10000, calorie_lower_percent: 90, calorie_upper_percent: 110, protein_min_percent: 90, steps_min_percent: 80, low_global_percent: 80 }

// ---- Tareas de seguimiento -----------------------------------------------------------------------
const mkTask = (n: number, title: string, type: string, due: number, priority: string, status: string, assignee: number | null) => ({
  id: uuid('7a5c0000', n), title, description: n % 2 === 0 ? 'Nota interna de seguimiento.' : null, type, due_date: daysFromToday(due), priority, status, version: 1,
  assigned_to_id: assignee === null ? null : ADMIN_IDS[assignee], assignee: assignee === null ? null : { id: ADMIN_IDS[assignee], display_name: `${admins[assignee].profile.first_name} ${admins[assignee].profile.last_name}` },
  created_at: isoAt(-10 + n), updated_at: isoAt(-3), completed_at: status === 'COMPLETED' ? isoAt(-2) : null, cancelled_at: status === 'CANCELLED' ? isoAt(-2) : null,
})
const tasks = [
  mkTask(1, 'Ajustar el plan de pierna tras el recap', 'TRAINING_UPDATE', -1, 'HIGH', 'PENDING', 0), mkTask(2, 'Revisar fotos de la semana', 'PHOTO_REVIEW', 2, 'MEDIUM', 'IN_PROGRESS', 1),
  mkTask(3, 'Llamada de seguimiento mensual', 'CALL', 6, 'LOW', 'PENDING', 0), mkTask(4, 'Actualizar la dieta de definición', 'DIET_UPDATE', 9, 'MEDIUM', 'PENDING', null),
  mkTask(5, 'Enviar feedback de la sesión de fuerza', 'FEEDBACK', -6, 'LOW', 'COMPLETED', 1), mkTask(6, 'Revisión trimestral', 'REVIEW', -12, 'MEDIUM', 'CANCELLED', 0),
]
const toNext = (t: (typeof tasks)[number]) => ({ id: t.id, title: t.title, type: t.type, due_date: t.due_date, priority: t.priority, assigned_to_id: t.assigned_to_id, version: t.version, overdue: t.due_date < TODAY })

export const handleProgress = ({ method, path, params }: FixtureCtx): unknown => {
  if (method !== 'get') return undefined
  const m = path.match(/^\/admin\/clients\/([^/]+)\/(.+)$/)
  if (!m) return undefined
  const [, client, rest] = m
  const main = isMain(client)
  if (rest === 'progress') return dayProgress(client, String(params.date))
  if (rest === 'calendar/month') return calendarMonth(client, Number(params.year), Number(params.month))
  if (rest === 'calendar/week-summary') return weekSummary(client, String(params.week_start))
  if (rest === 'metrics/overview') {
    return { client_id: client, from: String(params.from ?? addDays(TODAY, -90)), to: String(params.to ?? TODAY), chart_from: addDays(TODAY, -70), chart_to: TODAY, page: 1, total_pages: 1, series: main ? metricSeries : [] }
  }
  if (rest === 'metrics') return paginate(main ? [...bodyMetrics].reverse() : [], params)
  if (rest === 'metrics/weight-history') return main ? bodyMetrics.map((b) => ({ date: b.date, value: b.weight_kg ?? 0 })) : []
  if (rest === 'metrics/body-history') return main ? bodyMetrics.map((b) => ({ date: b.date, value: Number((b as unknown as Record<string, number>)[String(params.field)] ?? 0) })) : []
  if (rest === 'progress-photos/sessions') return { ...paginate(main ? photoSessions : [], params, 20) }
  if (rest === 'adherence') return adherence(String(params.start), String(params.end))
  if (rest === 'adherence/config') return adherenceConfig
  if (rest === 'progress/training-overview') {
    const search = String(params.search ?? '').toLowerCase()
    return { indicators: main ? { trainings_completed: sessions.length, volume: 31_800, mean_rir: 2, mean_rpe: 6.9 } : { trainings_completed: 0, volume: null, mean_rir: null, mean_rpe: null },
      exercises: main ? exerciseSummaries.filter((e) => !search || e.exercise_name.toLowerCase().includes(search)) : [], next_cursor: null }
  }
  if (rest === 'progress/training-sessions') return { page: main ? sessions : [], nextCursor: null }
  if (rest === 'progress/legacy-training-records') return { page: [], nextCursor: null }
  const detail = rest.match(/^progress\/training-sessions\/([^/]+)\/([^/]+)$/)
  if (detail) {
    const s = sessions.find((x) => x.training_session_id === decodeURIComponent(detail[2]))
    return s && main ? { training_id: s.training_id, training_session_id: s.training_session_id, training_name: s.training_name, training_name_source: s.training_name_source, rpe: s.rpe, note: s.note, page: setsOfSession(s), nextCursor: null } : null
  }
  const load = rest.match(/^progress\/exercises\/([^/]+)\/load-history$/)
  if (load) return { page: main ? sessions.flatMap(setsOfSession).filter((r) => r.exercise_id === decodeURIComponent(load[1])).sort((a, b) => a.date.localeCompare(b.date)) : [], nextCursor: null }
  if (rest === 'follow-up-tasks') {
    const closed = params.view === 'history'
    const filtered = tasks.filter((t) => (t.status === 'COMPLETED' || t.status === 'CANCELLED') === closed && (!params.status || t.status === params.status))
    return { data: main ? filtered : [], page: 1, total: main ? filtered.length : 0, limit: 20, totalPages: 1 }
  }
  if (rest === 'follow-up-tasks/summary') return { as_of_date: TODAY, next_task: main ? toNext(tasks[0]) : null, next_review: main ? toNext(tasks[5]) : null }
  if (rest === 'follow-up-tasks/assignees') return { data: admins.slice(0, 3).map((a) => ({ id: a.id, display_name: `${a.profile.first_name} ${a.profile.last_name}` })), page: 1, total: 3, limit: 20, totalPages: 1 }
  const task = rest.match(/^follow-up-tasks\/([^/]+)$/)
  if (task) return tasks.find((t) => t.id === task[1])
  return undefined
}
