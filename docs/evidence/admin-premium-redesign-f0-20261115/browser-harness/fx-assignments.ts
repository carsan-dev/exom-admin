import { addDays, daysFromToday, uuid, type FixtureCtx } from './fx-util'
import { MAIN_CLIENT, clientRef, clients } from './fx-people'
import { DIET_IDS, TRAINING_IDS, diets, trainings } from './fx-catalog'

const trainingOption = (id: string) => {
  const t = trainings.find((x) => x.id === id) ?? trainings[0]
  return { id: t.id, name: t.name, type: t.type, level: t.level, estimated_duration_min: t.estimated_duration_min, estimated_calories: t.estimated_calories,
    is_active: t.is_active, requires_last_set_video: false, last_set_video_policy: 'AUTO' as const, types: t.types, accentColor: t.accentColor ?? null, exercises_count: t.exercises_count }
}
const dietOption = (id: string | null) => {
  const d = diets.find((x) => x.id === id)
  return d ? { id: d.id, name: d.name, total_calories: d.total_calories, total_protein_g: d.total_protein_g, total_carbs_g: d.total_carbs_g, total_fat_g: d.total_fat_g, tags: d.tags, meals_count: d.meals_count } : null
}

interface DaySpec { trainings: number[]; diet: number | null; rest?: boolean; mode?: 'ALL' | 'ANY' }
// Semana manual 16-22 nov de 2026 (lunes a domingo) del cliente protagonista.
const MANUAL: Record<string, DaySpec> = {
  '2026-11-16': { trainings: [0], diet: 0 },
  '2026-11-17': { trainings: [1, 7], diet: 0, mode: 'ALL' },
  '2026-11-18': { trainings: [2], diet: 1 },
  '2026-11-19': { trainings: [], diet: 1, rest: true },
  '2026-11-20': { trainings: [0], diet: 0 },
  '2026-11-21': { trainings: [4, 3], diet: 2, mode: 'ANY' },
  '2026-11-22': { trainings: [], diet: 1 },
}
// Regla automática semanal (lunes=1 ... domingo=7), activa desde el 2 de noviembre.
const RULE_PATTERN: DaySpec[] = [
  { trainings: [0], diet: 0 }, { trainings: [1], diet: 0 }, { trainings: [2], diet: 1 }, { trainings: [], diet: 1, rest: true },
  { trainings: [0, 3], diet: 0, mode: 'ALL' }, { trainings: [4], diet: 2 }, { trainings: [], diet: 1 },
]
const RULE_START = '2026-11-02'
const RULE_ID = uuid('a0700000', 1)

const weekday = (date: string) => { const d = new Date(`${date}T00:00:00Z`).getUTCDay(); return d === 0 ? 7 : d }

export function buildDay(clientId: string, date: string) {
  const empty = { id: null, client_id: clientId, date, is_rest_day: false, training: null, trainings: [], training_ids: [], diet: null, training_completion_mode: 'ALL' as const }
  if (clientId !== MAIN_CLIENT) return empty
  const manual = MANUAL[date]
  const spec = manual ?? (date >= RULE_START ? RULE_PATTERN[weekday(date) - 1] : undefined)
  if (!spec) return empty
  const dayTrainings = spec.trainings.map((i) => trainingOption(TRAINING_IDS[i]))
  return { id: manual ? `fixture-manual-${date}` : `fixture-auto-${date}`, client_id: clientId, date, is_rest_day: Boolean(spec.rest), training: dayTrainings[0] ?? null, trainings: dayTrainings,
    training_ids: dayTrainings.map((t) => t.id), diet: spec.diet === null ? null : dietOption(DIET_IDS[spec.diet]), training_completion_mode: spec.mode ?? 'ALL' }
}
const range = (start: string, count: number) => Array.from({ length: count }, (_, i) => addDays(start, i))

const activeRule = {
  id: RULE_ID, client_id: MAIN_CLIENT, admin_id: null, source_week_start: RULE_START, starts_on: RULE_START, ends_on: null, is_active: true, deactivated_at: null, training_completion_mode: 'ALL',
  days: RULE_PATTERN.map((spec, i) => {
    const dayTrainings = spec.trainings.map((t) => trainingOption(TRAINING_IDS[t]))
    return { id: uuid('a07d0000', i + 1), weekday: i + 1, training_id: dayTrainings[0]?.id ?? null, training_ids: dayTrainings.map((t) => t.id), diet_id: spec.diet === null ? null : DIET_IDS[spec.diet],
      is_rest_day: Boolean(spec.rest), training: dayTrainings[0] ?? null, trainings: dayTrainings, diet: spec.diet === null ? null : dietOption(DIET_IDS[spec.diet]) }
  }),
}

const RIR_START = '2026-11-09'
function rirState(from: string, to: string) {
  const count = Math.min(60, Math.max(1, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1))
  const sequence = [3, 2, 1, 0]
  const dates = range(from, count).flatMap((date) => {
    const day = buildDay(MAIN_CLIENT, date)
    if (day.trainings.length === 0) return []
    const week = Math.floor((Date.parse(`${addDays(date, -(weekday(date) - 1))}T00:00:00Z`) - Date.parse(`${RIR_START}T00:00:00Z`)) / 604_800_000)
    return [{ date, protected: date < daysFromToday(0), week: week < 0 ? null : week % 4, weeks: 4, target_rir: week < 0 ? null : sequence[week % 4],
      trainings: day.trainings.map((t) => {
        const full = trainings.find((x) => x.id === t.id) ?? trainings[0]
        return { id: t.id, name: t.name, rir_proposal: [3, 2, 1, 0], exercises: full.exercises.map((e) => ({ id: e.id, name: e.exercise.name, base_rir: e.target_rir, target_rir: week < 0 ? e.target_rir : sequence[week % 4], rir_override: null, block_id: null })) }
      }) }]
  })
  return { revision: 1, versions: [{ revision: 1, effective_from: RIR_START, starts_on: RIR_START, config: { sequence, overrides: {} } }], dates }
}

export const handleAssignments = ({ method, path, params }: FixtureCtx): unknown => {
  if (method !== 'get') return undefined
  const client = String(params.client_id ?? '')
  if (path === '/assignments/client-options') return clients.filter((c) => !c.is_archived).map((c) => clientRef(c.id))
  if (path === '/assignments/catalog-options') return { trainings: trainings.filter((t) => t.is_active).map((t) => trainingOption(t.id)), diets: diets.map((d) => dietOption(d.id)) }
  if (path === '/assignments/auto-rules/active') return client === MAIN_CLIENT ? activeRule : null
  if (path === '/assignments/week') {
    const dates = range(String(params.week_start), 7)
    return { client_id: client, week_start: dates[0], week_end: dates[6], days: dates.map((d) => buildDay(client, d)) }
  }
  if (path === '/assignments/month') {
    const year = Number(params.year), month = Number(params.month)
    const first = `${year}-${String(month).padStart(2, '0')}-01`
    const count = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const dates = range(first, count)
    return { client_id: client, year, month, month_start: dates[0], month_end: dates[count - 1], days: dates.map((d) => buildDay(client, d)) }
  }
  const rir = path.match(/^\/assignments\/clients\/([^/]+)\/rir-cycle$/)
  if (rir) return rir[1] === MAIN_CLIENT ? rirState(String(params.from), String(params.to)) : { revision: 0, versions: [], dates: [] }
  return undefined
}
