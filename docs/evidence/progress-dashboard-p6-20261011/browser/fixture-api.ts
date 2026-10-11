import axios, { AxiosError, CanceledError } from 'axios'
import { FIXTURE_IDS as ids, fixtureAssignee, fixturePage, fixtureTask } from '../../../../src/features/progress/follow-up-tasks/fixtures'
import { fixtureGeneration } from './fixture-auth'
import summaryCases from './summary-cases.json'

const scenario = new URLSearchParams(location.search).get('scenario') ?? 'data'
let recovered = false
let heldOwner: string | null = scenario === 'held' ? ids.client : null
let summaryCase = summaryCases.cases[0]
const pending: (() => void)[] = []
const delivered: { client: string; suppressed: boolean }[] = []
export const fixtureCalls: { path: string; params: unknown; generation: number; method: string }[] = []
export const fixtureControls = {
  recover: () => { recovered = true },
  release: () => { heldOwner = null; for (const release of pending.splice(0)) release() },
  pending: () => pending.length,
  delivered: () => delivered,
  setSummaryCase: (name: string) => {
    const selected = summaryCases.cases.find((item) => item.name === name)
    if (!selected) throw new Error('Unknown canonical summary fixture')
    summaryCase = selected
  },
}
const component = { status: 'evaluable', numerator: 1, denominator: 2, ratio: 0.5, caveats: [] }
const aggregate = { training: component, nutrition: component, global: { ...component, source: 'both' } }
const dates = ['2026-09-12', '2026-09-15', '2026-09-19', '2026-09-24', '2026-10-01', '2026-10-05', '2026-10-10', '2026-10-11', '2026-10-12']
function adherence(start: string, end: string) {
  const noData = scenario === 'new' || scenario === 'no-pauta'
  const today = new Date().toISOString().slice(0, 10)
  const days = noData ? [] : dates.filter((date) => date >= start && date <= end).map((date, index) => ({
    date, revision: 1, basis: 'original', calendar: date > today ? 'future' : date === today ? 'partial' : index % 3 === 0 ? 'partial' : 'complete',
    evaluation: { ...aggregate, date, period: date < today ? 'closed' : date === today ? 'provisional' : 'future', includeInClosedAggregate: date < today },
    indicators: { calories: { status: 'met' }, protein: { status: 'met' }, weeklySteps: { status: 'not_applicable' } },
    intake: { estimated_calories: 1800, estimated_protein_g: 120 }, targets: { calories: 1800, protein_g: 120 },
    configuration: { known: true, version: 1, low_global_percent: 80 }, schedule: { training: 'assigned', nutrition: 'assigned' },
  }))
  const value = noData ? { ...aggregate, global: { ...aggregate.global, status: 'not_applicable', ratio: null } } : aggregate
  return { version: 1, start, end, today, evaluated_at: `${today}T12:00:00Z`, days, weeks: [], aggregate: value,
    recentClosed: { start: '2026-10-04', end: '2026-10-10', anchor: 'selected_end_or_last_closed_utc', provisional: false, aggregate: value,
      configuration: { known: true, version: 1, low_global_percent: 80, effective_date: '2026-09-01' },
      coverage: { expected: 7, available: noData ? 0 : 7, evaluable: noData ? 0 : 6, not_applicable: 0, insufficient: noData ? 7 : 1 }, status: noData ? 'not_applicable' : 'low' } }
}
const point = (date: string, value: number) => ({ date, value, quality: 'complete', provenance: 'observed' })
export const api = axios.create({ adapter: async (config) => {
  const path = config.url ?? ''
  const method = config.method ?? 'get'
  const generation = fixtureGeneration()
  const match = path.match(/^\/admin\/clients\/([^/]+)(?:\/(.*))?$/)
  const client = match?.[1]
  fixtureCalls.push({ path, params: structuredClone(config.params ?? {}), generation, method })
  const reply = (data: unknown) => ({ data: { success: true, data }, status: 200, statusText: 'Synthetic', headers: {}, config })
  if (path !== '/admin/clients' && !match && path !== '/recaps') throw new Error(`Unsupported synthetic path: ${path}`)
  if (method !== 'get') throw new Error(`Unsupported synthetic mutation: ${path}`)
  if (path === '/admin/clients') return reply(fixturePage([ids.client, ids.otherClient].map((id, index) => ({ id, email: `client-${index}@example.invalid`, profile: { first_name: 'Cliente', last_name: `Sintético ${index === 0 ? 'A' : 'B'}`, avatar_url: null } }))))
  if (scenario === 'loading' || heldOwner === client) {
    await new Promise<void>((release) => pending.push(release))
    delivered.push({ client: client ?? '', suppressed: generation !== fixtureGeneration() })
  }
  if (generation !== fixtureGeneration() || config.signal?.aborted) throw new CanceledError('Synthetic stale response suppressed')
  if (scenario === 'error' && !recovered) throw new AxiosError('Synthetic rejected read', 'FIXTURE', config, undefined,
    { ...reply(null), status: 403, data: { message: 'Synthetic unavailable', statusCode: 403 } })
  if (path === '/recaps' && scenario === 'recap-pages') return reply({ data: [
    { id: ids.retained, client_id: config.params.client_id, status: 'SUBMITTED', submitted_at: '2026-10-11T10:00:00Z', week_start_date: '2026-10-05', week_end_date: '2026-10-11' },
    { id: ids.task, client_id: config.params.client_id, status: 'SUBMITTED', submitted_at: '2026-10-12T10:00:00Z', week_start_date: '2026-10-12', week_end_date: '2026-10-18' },
  ], page: 1, total: 21, limit: 20, totalPages: 2 })
  if (path === '/recaps') return reply({ data: scenario === 'data' ? [
    { id: ids.retained, client_id: config.params.client_id, status: 'SUBMITTED', submitted_at: '2026-10-10T10:00:00Z', week_start_date: '2026-10-05', week_end_date: '2026-10-10' },
    { id: ids.task, client_id: config.params.client_id, status: 'SUBMITTED', submitted_at: '2099-01-01T10:00:00Z', week_start_date: '2099-01-01', week_end_date: '2099-01-07' },
  ] : [], page: 1, total: scenario === 'data' ? 2 : 0, limit: 20, totalPages: 1 })
  const suffix = match?.[2] ?? ''
  if (!suffix) return reply({ user: { id: client, profile: null }, profile: null, streak: null })
  if (suffix === 'calendar/month') return reply([])
  if (suffix === 'progress') return reply(null)
  if (suffix === 'calendar/week-summary') return reply({ week_start: config.params.week_start, trainings_assigned: scenario === 'no-pauta' ? 0 : 4, trainings_completed: 2, total_meals: 35, meals_completed: 21, diet_days_assigned: scenario === 'no-pauta' ? 0 : 7, diet_days_completed: 3 })
  if (suffix === 'metrics/overview') {
    const empty = scenario === 'new'
    const points = empty ? [] : [point('2026-09-12', 86), point('2026-09-19', 85), point('2026-09-24', 84), point('2026-10-05', 83), point('2026-10-11', 82)]
    const from = config.params.from ?? '2025-01-01'
    const historical = config.params.from === undefined
    return reply({ client_id: client, from, to: config.params.to, chart_from: '2026-09-12', chart_to: '2026-10-11', page: 1, total_pages: 1,
      series: [{ key: 'weight_kg', label: 'Peso', unit: 'kg', group: 'body', source: 'Mediciones corporales', first: empty ? null : historical ? point('2025-01-01', 90) : points[0], last: empty ? null : points[4], change: empty ? null : historical ? -8 : -4, count: empty ? 0 : historical ? 6 : 5, incomplete_count: 0, points }] })
  }
  if (suffix === 'metrics') return reply({ data: [], total: 0, page: 1, totalPages: 1 })
  if (suffix === 'adherence') return reply(adherence(config.params.start, config.params.end))
  if (suffix === 'adherence/config') return reply({ version: 1, known: false, source: 'uncaptured', effective_date: null })
  if (suffix === 'follow-up-tasks/summary') return reply(client === ids.otherClient
    ? summaryCases.cases.find((item) => item.name === 'client-isolation')!.summary
    : scenario === 'new' ? { as_of_date: '2026-10-11', next_task: null, next_review: null } : summaryCase.summary)
  if (suffix === 'follow-up-tasks/assignees') return reply(fixturePage([fixtureAssignee]))
  if (suffix === 'follow-up-tasks') return reply(fixturePage([fixtureTask]))
  throw new Error(`Unsupported synthetic path: ${path}`)
} })
