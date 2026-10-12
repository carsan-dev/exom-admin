import { subMonths } from 'date-fns'

export interface Observation {
  date: string
  end_date?: string
  value: number | null
  quality: 'complete' | 'partial' | 'missing'
  provenance: string
}
export interface MetricSeries {
  key: string
  label: string
  unit: string
  group: 'body' | 'habits' | 'nutrition'
  source: string
  first: Observation | null
  last: Observation | null
  change: number | null
  count: number
  incomplete_count: number
  points: Observation[]
}
export interface MetricsOverview {
  client_id: string
  from: string
  to: string
  chart_from: string
  chart_to: string
  page: number
  total_pages: number
  series: MetricSeries[]
}

export function metricsPeriod(params: URLSearchParams, today = new Date().toISOString().slice(0, 10)) {
  const period = params.get('period') ?? 'all'
  const to = period === 'custom' ? params.get('to') ?? today : today
  const from = period === 'custom' ? params.get('from') ?? to
    : period === '4w' ? new Date(new Date(`${to}T00:00:00Z`).getTime() - 27 * 86400000).toISOString().slice(0, 10)
    : period === '3m' ? subMonths(new Date(`${to}T12:00:00Z`), 3).toISOString().slice(0, 10) : undefined
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
  return { period, from, to, valid: validDate(to) && (!from || (validDate(from) && from <= to)) && to <= today }
}
