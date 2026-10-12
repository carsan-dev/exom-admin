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
  /** Range statistics over complete observations; absent on older APIs and then treated as null. */
  min?: number | null
  max?: number | null
  mean?: number | null
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
