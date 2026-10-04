import { useId, useState } from 'react'
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartScaleSelect } from '@/components/charts/chart-scale'
import { calculateYAxisScale, type ChartScale } from '@/components/charts/chart-scale-utils'
import type { MetricSeries, Observation } from '../metrics-overview'

interface MetricVisualProps {
  series: MetricSeries[]
  period: string
  chartPeriod: string
}
const number = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })
const date = (value: string) => value.slice(0, 10).split('-').reverse().join('/')
const rating = (unit: string) => unit === '0–5' || unit === '1–10'
const valueLabel = (value: number, unit: string) => rating(unit)
  ? `${number.format(value)}/${unit === '0–5' ? 5 : 10}` : `${number.format(value)} ${unit}`
function complete(point: Observation | null): point is Observation & { value: number } {
  return point !== null && point.quality === 'complete' && point.value !== null && Number.isFinite(point.value)
}
function pointLabel(point: Observation | null, unit: string) {
  if (!complete(point)) return <span className="text-muted-foreground">Sin datos</span>
  return <>{valueLabel(point.value, unit)}<span className="mt-1 block text-xs font-normal text-muted-foreground">{date(point.date)}{point.end_date && ` – ${date(point.end_date)}`}</span>
    {point.provenance === 'legacy_available' && <span className="block text-xs font-normal">Histórico legacy disponible</span>}</>
}

/** One unit per axis; dots are observations, never interpolated daily estimates. */
export function MetricVisual({ series, period, chartPeriod }: MetricVisualProps) {
  const [selected, setSelected] = useState(series[0]?.key ?? '')
  const [scale, setScale] = useState<ChartScale>('auto')
  const id = useId()
  const metric = series.find((item) => item.key === selected) ?? series[0]
  if (!metric) return <p className="py-6 text-sm text-foreground-secondary">No hay mediciones disponibles en este grupo.</p>
  const points = metric.points.filter(complete).map((point) => ({ ...point, timestamp: Date.parse(point.date) }))
  const comparable = metric.count > 1 && complete(metric.first) && complete(metric.last) && metric.first.date < metric.last.date
    && metric.change !== null && Number.isFinite(metric.change)
  const axis = rating(metric.unit) ? { domain: metric.unit === '0–5' ? [0, 5] : [1, 10], ticks: undefined }
    : calculateYAxisScale(points.map((point) => point.value), scale, metric.unit === 'h' ? 0.5 : 1)
  const delta = comparable && metric.change !== null
    ? `${metric.change > 0 ? '+' : ''}${number.format(metric.change)} ${rating(metric.unit) ? 'puntos' : metric.unit}` : 'No comparable'

  return <section className="min-w-0 space-y-5 rounded-lg border bg-card p-4 sm:p-6 [--muted-foreground:var(--foreground-secondary)]" aria-labelledby={`${id}-title`}>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h2 id={`${id}-title`} className="text-xl font-semibold">{metric.label} · {metric.unit}</h2>
        <p className="text-sm text-muted-foreground">{metric.source} · {period}</p>
      </div>
      <label className="w-full text-sm sm:w-auto">Medición
        <select aria-label="Medición" value={metric.key} onChange={(event) => { setSelected(event.target.value); setScale('auto') }}
          className="mt-1 block min-h-10 w-full rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-w-56">
          {series.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.unit})</option>)}
        </select>
      </label>
    </div>
    <div className="space-y-4 border-y py-4" aria-live="polite">
      <p className="text-sm">{metric.count} {metric.count === 1 ? 'observación completa' : 'observaciones completas'} · {metric.incomplete_count} {metric.incomplete_count === 1 ? 'incompleta' : 'incompletas'}</p>
      <dl className="grid gap-4 sm:grid-cols-3">
        <div><dt className="text-sm text-muted-foreground">Primera observación</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{pointLabel(metric.first, metric.unit)}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Última observación</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{pointLabel(metric.last, metric.unit)}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Cambio observado</dt><dd aria-label="Cambio observado" className="mt-1 text-lg font-semibold tabular-nums">{delta}</dd>
          <p className="mt-1 text-xs text-muted-foreground">Entre primera y última observación completa; no indica por sí solo mejora o empeoramiento.</p></div>
      </dl>
      {metric.count === 0 && <p className="text-sm text-muted-foreground">Sin observaciones completas para esta medición.</p>}
      {metric.count === 1 && <p className="text-sm text-muted-foreground">Una observación no permite establecer una tendencia.</p>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-sm font-medium">Observaciones del histórico · {metric.unit}</h3>
      {!rating(metric.unit) && points.length > 0 && <ChartScaleSelect value={scale} onValueChange={setScale} />}
    </div>
    <p className="text-sm text-muted-foreground">Ventana gráfica: {chartPeriod}. No estimamos valores entre fechas; solo se muestran observaciones completas.</p>
    {points.length === 0 ? <p className="rounded-md bg-muted p-4 text-sm">Sin observaciones completas en esta página del histórico. Consulta otra página o selecciona otra medición.</p> :
      <div className="h-64 min-w-0" role="img" aria-label={`${metric.label}, ${metric.unit}, ${chartPeriod}. ${points.length} observaciones completas; alternativa en tabla de datos.`}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" name="Fecha" type="number" scale="time" domain={['dataMin', 'dataMax']}
              tickFormatter={(value: number) => date(new Date(value).toISOString())} minTickGap={40} tick={{ fill: 'var(--foreground)', fontSize: 11 }} />
            <YAxis dataKey="value" name={metric.label} tickFormatter={(value: number) => `${number.format(value)} ${metric.unit}`} width={70} domain={axis?.domain} ticks={axis?.ticks} tick={{ fill: 'var(--foreground)', fontSize: 11 }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => name === 'Fecha' ? [date(new Date(Number(value)).toISOString()), 'Fecha'] : [valueLabel(Number(value), metric.unit), metric.label]}
              contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
            <Scatter name={metric.label} data={points} fill="var(--foreground-accent)" isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>}
    <details className="border-t pt-4 text-sm">
      <summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Ver datos, semanas y procedencia</summary>
      <div role="region" aria-label="Datos de la medición" tabIndex={0} className="mt-3 overflow-x-auto rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <table className="w-full min-w-[480px] text-left text-sm tabular-nums">
          <caption className="sr-only">{metric.label} · {metric.unit} · {chartPeriod}</caption>
          <thead><tr className="border-b"><th scope="col" className="py-2 pr-4">Fecha / semana</th><th scope="col" className="pr-4">Valor ({metric.unit})</th><th scope="col">Procedencia / estado</th></tr></thead>
          <tbody>{metric.points.map((point, index) => <tr key={`${point.date}-${index}`} className="border-b align-top">
            <th scope="row" className="py-3 pr-4 font-normal">{date(point.date)}{point.end_date && ` – ${date(point.end_date)}`}</th>
            <td className="py-3 pr-4">{point.value === null || !Number.isFinite(point.value) ? 'Sin datos' : valueLabel(point.value, metric.unit)}</td>
            <td className="py-3">{point.quality === 'partial' ? 'Parcial: solo parte conocida' : point.quality === 'missing' ? 'Histórico insuficiente' : metric.source}{point.provenance === 'legacy_available' && ' · legacy disponible'}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  </section>
}
