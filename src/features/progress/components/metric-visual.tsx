import { useId, useState } from 'react'
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, XAxis, YAxis } from 'recharts'
import { ChartScaleSelect } from '@/components/charts/chart-scale'
import { calculateYAxisScale, type ChartScale } from '@/components/charts/chart-scale-utils'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MetricSeries, Observation } from '../metrics-overview'
import { ProgressChartTooltip } from './progress-chart-tooltip'
import { observedChartSeries, observationTimestamp } from './observed-chart-series'

export interface MetricVisualSelection {
  metric: string | null
  compare: string | null
}

interface MetricVisualProps {
  series: MetricSeries[]
  period: string
  chartPeriod: string
  compact?: boolean
  /** Controlled selection (e.g. persisted in the URL). Without `onSelectionChange` the component keeps its own state. */
  selection?: MetricVisualSelection
  onSelectionChange?: (updates: Partial<MetricVisualSelection>) => void
}
const NO_COMPARE = '__none__'
const number = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })
const date = (value: string) => value.slice(0, 10).split('-').reverse().join('/')
const rating = (unit: string) => unit === '0–5' || unit === '1–10'
const valueLabel = (value: number, unit: string) => rating(unit)
  ? `${number.format(value)}/${unit === '0–5' ? 5 : 10}` : `${number.format(value)} ${unit}`
const statLabel = (value: number | null | undefined, unit: string) =>
  value === null || value === undefined || !Number.isFinite(value) ? '—' : valueLabel(value, unit)
function complete(point: Observation | null): point is Observation & { value: number } {
  return point !== null && point.quality === 'complete' && point.value !== null && Number.isFinite(point.value)
}
function pointLabel(point: Observation | null, unit: string) {
  if (!complete(point)) return <span className="text-muted-foreground">Sin datos</span>
  return <>{valueLabel(point.value, unit)}<span className="mt-1 block text-xs font-normal text-muted-foreground">{date(point.date)}{point.end_date && ` – ${date(point.end_date)}`}</span>
    {point.provenance === 'legacy_available' && <span className="block text-xs font-normal">Histórico legacy disponible</span>}</>
}
function chartSeries(metric: MetricSeries) {
  return observedChartSeries(
    metric.points.map((point) => ({ ...point, timestamp: observationTimestamp(point.date), seriesLabel: metric.label })), complete,
  )
}
function isComparable(metric: MetricSeries) {
  return metric.count > 1 && complete(metric.first) && complete(metric.last) && metric.first.date < metric.last.date
    && metric.change !== null && Number.isFinite(metric.change)
}
function seriesLabelOf(payload: unknown, fallback: string) {
  return typeof payload === 'object' && payload !== null && 'seriesLabel' in payload && typeof payload.seriesLabel === 'string'
    ? payload.seriesLabel : fallback
}

/** One unit per axis; straight guides join observations, never daily estimates. */
export function MetricVisual({ series, period, chartPeriod, compact = false, selection, onSelectionChange }: MetricVisualProps) {
  const [localSelection, setLocalSelection] = useState<MetricVisualSelection>({ metric: null, compare: null })
  const [scale, setScale] = useState<ChartScale>('auto')
  const id = useId()
  const current = onSelectionChange ? selection ?? { metric: null, compare: null } : localSelection
  const select = (updates: Partial<MetricVisualSelection>) => {
    if (onSelectionChange) onSelectionChange(updates)
    else setLocalSelection((previous) => ({ ...previous, ...updates }))
  }
  const metric = series.find((item) => item.key === current.metric) ?? series[0]
  if (!metric) return <p className="py-6 text-sm text-foreground-secondary">No hay mediciones disponibles en este grupo.</p>
  // Only the same group and identical unit may share the axis (kg, reps and seconds never mix).
  const compareOptions = compact ? [] : series.filter((item) => item.key !== metric.key && item.group === metric.group && item.unit === metric.unit)
  const compare = compareOptions.find((item) => item.key === current.compare) ?? null
  const { points, segments } = chartSeries(metric)
  const compared = compare ? chartSeries(compare) : null
  const plotted = [...points, ...(compared?.points ?? [])]
  const comparable = isComparable(metric)
  const axis = rating(metric.unit) ? { domain: metric.unit === '0–5' ? [0, 5] : [1, 10], ticks: undefined }
    : calculateYAxisScale(plotted.map((point) => point.value ?? NaN), scale, metric.unit === 'h' ? 0.5 : 1)
  const delta = comparable && metric.change !== null
    ? `${metric.change > 0 ? '+' : ''}${number.format(metric.change)} ${rating(metric.unit) ? 'puntos' : metric.unit}` : 'No comparable'
  const stats: [string, string][] = [
    ['Primera', complete(metric.first) ? valueLabel(metric.first.value, metric.unit) : '—'],
    ['Última', complete(metric.last) ? valueLabel(metric.last.value, metric.unit) : '—'],
    ['Cambio', comparable ? delta : '—'],
    ['Mín', statLabel(metric.min, metric.unit)],
    ['Máx', statLabel(metric.max, metric.unit)],
    ['Media', statLabel(metric.mean, metric.unit)],
    ['Mediciones', number.format(metric.count)],
  ]
  const tableRows = [metric, ...(compare ? [compare] : [])].flatMap((item) => item.points.map((point, index) => ({ item, point, index })))

  const observationSummary = (<div className="space-y-4 border-y py-4" aria-live="polite">
      <p className="text-sm">{metric.count} {metric.count === 1 ? 'observación completa' : 'observaciones completas'} · {metric.incomplete_count} {metric.incomplete_count === 1 ? 'incompleta' : 'incompletas'}</p>
      <dl className="grid gap-4 sm:grid-cols-3">
        <div><dt className="text-sm text-muted-foreground">Primera observación</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{pointLabel(metric.first, metric.unit)}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Última observación</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{pointLabel(metric.last, metric.unit)}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Cambio observado</dt><dd aria-label="Cambio observado" className="mt-1 text-lg font-semibold tabular-nums">{delta}</dd>
          <p className="mt-1 text-xs text-muted-foreground">Entre primera y última observación completa; no indica por sí solo mejora o empeoramiento.</p></div>
      </dl>
      {metric.count === 0 && <p className="text-sm text-muted-foreground">Sin observaciones completas para esta medición.</p>}
      {metric.count === 1 && <p className="text-sm text-muted-foreground">Una observación no permite establecer una tendencia.</p>}
    </div>)

  return <section className="min-w-0 space-y-5 rounded-lg border bg-card p-4 sm:p-6 [--muted-foreground:var(--foreground-secondary)]" aria-labelledby={`${id}-title`}>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h2 id={`${id}-title`} className="text-xl font-semibold">{metric.label} · {metric.unit}</h2>
        <p className="text-sm text-muted-foreground">{metric.source} · {period}</p>
      </div>
      {!compact && <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
        <label className="w-full text-sm sm:w-auto">Medición
          <select aria-label="Medición" value={metric.key} onChange={(event) => { select({ metric: event.target.value, compare: null }); setScale('auto') }}
            className="mt-1 block min-h-10 w-full rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-w-56">
            {series.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.unit})</option>)}
          </select>
        </label>
        <div className="w-full space-y-1 text-sm sm:w-auto">
          <Label htmlFor={`${id}-compare`}>Comparar con</Label>
          <Select value={compare?.key ?? NO_COMPARE} disabled={compareOptions.length === 0}
            onValueChange={(next) => select({ compare: next === NO_COMPARE ? null : next })}>
            <SelectTrigger id={`${id}-compare`} className="min-h-10 w-full sm:min-w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_COMPARE}>Ninguna</SelectItem>
              {compareOptions.map((item) => <SelectItem key={item.key} value={item.key}>{item.label} ({item.unit})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>}
    </div>
    {!compact && observationSummary}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-sm font-medium">Observaciones del histórico · {metric.unit}</h3>
      {!rating(metric.unit) && plotted.length > 0 && <ChartScaleSelect value={scale} onValueChange={setScale} />}
    </div>
    {!compact && <p className="text-sm text-muted-foreground">Ventana gráfica: {chartPeriod}. No estimamos valores entre fechas; solo se muestran observaciones completas. Las líneas son una guía visual entre ellas; los registros incompletos interrumpen la guía.</p>}
    {plotted.length === 0 ? <p className="rounded-md bg-muted p-4 text-sm">Sin observaciones completas en esta página del histórico. Consulta otra página o selecciona otra medición.</p> :
      <div className="h-64 min-w-0" role="img" aria-label={`${metric.label}, ${metric.unit}, ${chartPeriod}. ${points.length} observaciones completas${compare && compared ? `; comparado con ${compare.label}, ${compared.points.length} observaciones completas` : ''}; alternativa en tabla de datos.`}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" name="Fecha" type="number" scale="time" domain={['dataMin', 'dataMax']}
              tickFormatter={(value: number) => date(new Date(value).toISOString())} minTickGap={40} tick={{ fill: 'var(--foreground)', fontSize: 11 }} />
            <YAxis dataKey="value" name={metric.label} tickFormatter={(value: number) => `${number.format(value)} ${metric.unit}`} width={70} domain={axis?.domain} ticks={axis?.ticks} tick={{ fill: 'var(--foreground)', fontSize: 11 }} />
            <ProgressChartTooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name, item) => name === 'Fecha' ? [date(new Date(Number(value)).toISOString()), 'Fecha'] : [valueLabel(Number(value), metric.unit), seriesLabelOf(item?.payload, metric.label)]} />
            {segments.map((segment, index) => <Scatter key={index} data={segment} line lineType="joint" lineJointType="linear"
              shape={() => <g />} legendType="none" tooltipType="none" fill="var(--foreground-accent)"
              isAnimationActive={false} />)}
            {points.length > 0 && <Scatter name={metric.label} data={points} fill="var(--foreground-accent)" isAnimationActive={false} />}
            {compared?.segments.map((segment, index) => <Scatter key={`compare-${index}`} data={segment} line={{ strokeDasharray: '6 4' }} lineType="joint" lineJointType="linear"
              shape={() => <g />} legendType="none" tooltipType="none" fill="var(--foreground)"
              isAnimationActive={false} />)}
            {compare && compared && compared.points.length > 0 && <Scatter name={compare.label} data={compared.points} fill="var(--foreground)" shape="diamond" isAnimationActive={false} />}
          </ScatterChart>
        </ResponsiveContainer>
      </div>}
    {compare && <p className="text-xs text-muted-foreground">{metric.label}: círculos y guía continua · {compare.label}: rombos y guía discontinua. Mismo eje en {metric.unit}; cada medición interrumpe su guía en sus propios huecos.</p>}
    {!compact && <div className="space-y-2 border-t pt-4">
      <dl aria-label={`Estadísticas del periodo · ${metric.label}`} className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4 lg:grid-cols-7">
        {stats.map(([label, text]) => <div key={label} className="min-w-0"><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold tabular-nums">{text}</dd></div>)}
      </dl>
      <p className="text-xs text-muted-foreground">Mín, Máx y Media se calculan sobre el periodo completo con observaciones completas; «—» indica que no hay datos.</p>
    </div>}
    {compact && <p className="text-xs text-muted-foreground">{metric.count} observaciones completas · {metric.incomplete_count} incompletas · {chartPeriod}</p>}
    <details className="border-t pt-4 text-sm">
      <summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Ver datos, semanas y procedencia</summary>
      {compact && <><p className="my-3 text-sm text-muted-foreground">Solo observaciones completas; los huecos no son ceros y las líneas no reconstruyen días sin datos.</p>{observationSummary}</>}
      <div role="region" aria-label="Datos de la medición" tabIndex={0} className="mt-3 overflow-x-auto rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <table className="w-full min-w-[480px] text-left text-sm tabular-nums">
          <caption className="sr-only">{metric.label}{compare && ` y ${compare.label}`} · {metric.unit} · {chartPeriod}</caption>
          <thead><tr className="border-b">{compare && <th scope="col" className="py-2 pr-4">Medición</th>}<th scope="col" className="py-2 pr-4">Fecha / semana</th><th scope="col" className="pr-4">Valor ({metric.unit})</th><th scope="col">Procedencia / estado</th></tr></thead>
          <tbody>{tableRows.map(({ item, point, index }) => <tr key={`${item.key}-${point.date}-${index}`} className="border-b align-top">
            {compare && <td className="py-3 pr-4">{item.label}</td>}
            <th scope="row" className="py-3 pr-4 font-normal">{date(point.date)}{point.end_date && ` – ${date(point.end_date)}`}</th>
            <td className="py-3 pr-4">{point.value === null || !Number.isFinite(point.value) ? 'Sin datos' : valueLabel(point.value, item.unit)}</td>
            <td className="py-3">{point.quality === 'partial' ? 'Parcial: solo parte conocida' : point.quality === 'missing' ? 'Histórico insuficiente' : item.source}{point.provenance === 'legacy_available' && ' · legacy disponible'}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  </section>
}
