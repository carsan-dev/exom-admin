import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChartScaleSelect } from '@/components/charts/chart-scale'
import { calculateYAxisScale, type ChartScale } from '@/components/charts/chart-scale-utils'
import { useMetricsOverview } from '../api'
import type { MetricSeries, Observation } from '../metrics-overview'

const number = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })
const date = (value: string) => value.split('-').reverse().join('/')
const isRating = (unit: string) => unit === '0–5' || unit === '1–10'
const formattedValue = (value: number, unit: string) => isRating(unit)
  ? `${number.format(value)}/${unit === '0–5' ? 5 : 10}` : `${number.format(value)} ${unit}`
const groups = [['body', 'Evolución corporal'], ['nutrition', 'Nutrición estimada'], ['habits', 'Hábitos']] as const

function observation(point: Observation | null, unit: string) {
  if (!point || point.value === null) return <span className="text-muted-foreground">Sin datos</span>
  return <><span>{formattedValue(point.value, unit)}</span>
    <span className="block text-xs text-muted-foreground">{date(point.date)}{point.end_date && ` – ${date(point.end_date)}`}</span>
    {point.provenance === 'legacy_available' && <span className="block text-xs">Histórico legacy disponible</span>}</>
}

function MetricChart({ series, title, period }: { series: MetricSeries[], title: string, period: string }) {
  const [selected, setSelected] = useState(series[0]?.key ?? '')
  const [scale, setScale] = useState<ChartScale>('auto')
  const metric = series.find((item) => item.key === selected) ?? series[0]
  if (!metric) return null
  const axis = isRating(metric.unit) ? { domain: metric.unit === '0–5' ? [0, 5] : [1, 10], ticks: undefined }
    : calculateYAxisScale(metric.points.map((point) => point.quality === 'complete' ? point.value : null), scale, metric.unit === 'h' ? 0.5 : 1)
  return <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <label className="text-sm">Métrica
        <select aria-label={`Métrica de ${title}`} className="mt-1 block w-full rounded-md border bg-background p-2 text-foreground" value={metric.key} onChange={(event) => { setSelected(event.target.value); setScale('auto') }}>
          {series.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.unit})</option>)}
        </select>
      </label>
      {!isRating(metric.unit) && <ChartScaleSelect value={scale} onValueChange={setScale} />}
      <CardDescription>{metric.source} · {metric.unit} · {period}</CardDescription>
    </CardHeader>
    <CardContent>
      {!metric.points.length ? <p className="py-12 text-center text-sm text-muted-foreground">Sin datos en esta página del histórico</p> : <>
        <div className="h-64" role="img" aria-label={`${metric.label}, ${metric.unit}, ${period}. Datos en tabla desplegable.`}>
          <ResponsiveContainer>
            <LineChart data={metric.points.map((point) => ({ ...point, timestamp: Date.parse(point.date), completeValue: point.quality === 'complete' ? point.value : null }))} margin={{ top: 8, right: 12, bottom: 8, left: 0 }} accessibilityLayer>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(value: number) => date(new Date(value).toISOString().slice(0, 10))} minTickGap={30} tick={{ fill: 'var(--foreground)', fontSize: 11 }} />
              <YAxis width={55} domain={axis?.domain} ticks={axis?.ticks} tick={{ fill: 'var(--foreground)', fontSize: 11 }} />
              <Tooltip labelFormatter={(value) => date(new Date(Number(value)).toISOString().slice(0, 10))} formatter={(value) => [formattedValue(Number(value), metric.unit), metric.label]}
                contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
              <Line dataKey="completeValue" type="linear" stroke="var(--foreground-accent)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <details className="mt-3 text-sm"><summary className="cursor-pointer">Ver datos, semanas y procedencia</summary>
          <div className="overflow-x-auto"><table className="mt-2 w-full text-left"><caption className="sr-only">{metric.label} · {period}</caption>
            <thead><tr><th>Fecha / semana</th><th>Valor ({metric.unit})</th><th>Procedencia / estado</th></tr></thead>
            <tbody>{metric.points.map((point) => <tr key={point.date} className="border-t"><td className="py-2">{date(point.date)}{point.end_date && ` – ${date(point.end_date)}`}</td>
              <td>{point.value === null ? 'Sin datos' : number.format(point.value)}</td>
              <td>{point.quality === 'partial' ? 'Parcial: solo parte conocida' : point.quality === 'missing' ? 'Histórico insuficiente' : metric.source}
                {point.provenance === 'legacy_available' && ' · legacy disponible'}</td></tr>)}</tbody>
          </table></div>
        </details>
      </>}
    </CardContent>
  </Card>
}

export function MetricsOverviewPanel({ clientId, from, to, page, onPageChange, valid }: {
  clientId: string, from?: string, to: string, page: number, onPageChange: (page: number) => void, valid: boolean
}) {
  const query = useMetricsOverview(clientId, from, to, page, valid)
  if (!valid) return <p role="alert">Selecciona un periodo válido, sin fechas futuras.</p>
  if (query.isPending) return <p role="status">Cargando métricas…</p>
  if (query.isError) return <div role="alert"><p>No se pudieron cargar las métricas. Comprueba el acceso y el periodo.</p><Button variant="outline" onClick={() => void query.refetch()}>Reintentar</Button></div>
  const data = query.data
  return <div className="space-y-4">
    <Card><CardHeader><CardTitle>Inicio → Actual → Cambio</CardTitle>
      <CardDescription>{date(data.from)} – {date(data.to)} · Primera y última observación válida del periodo. Un solo registro no permite calcular cambio.</CardDescription></CardHeader>
      <CardContent><p className="mb-4 text-sm text-muted-foreground">Recaps: semanas cuyo lunes pertenece al periodo, sin repartir valores por días. Sueño: mediciones corporales; los rangos del recap no se convierten en horas. Nutrición: estimaciones de comidas marcadas, no ingesta real. Los datos parciales no entran en la comparación ni en la línea del gráfico; pueden consultarse en su tabla. El histórico legacy refleja lo disponible al capturarlo, no reconstruye ediciones anteriores.</p>
        <p className="mb-4 text-sm text-muted-foreground">Hambre: 1 sin hambre, 10 extrema. Energía: 1 sin energía, 10 mucha. Digestión: 1 muy mala, 10 muy buena. Estrés: escala histórica 0 sin estrés, 5 máximo.</p>
        <p className="mb-2 text-sm sm:hidden">Desliza la tabla para ver Actual y Cambio.</p>
        <div className="overflow-x-auto" role="region" aria-label="Tabla comparativa desplazable" tabIndex={0}><table className="w-full min-w-[580px] text-left text-sm"><caption className="sr-only">Comparativa de métricas del periodo</caption>
          <thead><tr className="border-b"><th className="py-3">Métrica / fuente</th><th>Inicio</th><th>Actual</th><th>Cambio</th></tr></thead>
          <tbody>{data.series.map((metric) => <tr key={metric.key} className="border-b align-top">
            <th scope="row" className="py-3 pr-3 font-medium">{metric.label}<span className="block text-xs font-normal text-muted-foreground">{metric.source}</span>
              {metric.incomplete_count > 0 && <span className="block text-xs font-normal">{metric.incomplete_count} observaciones con información incompleta</span>}</th>
            <td className="py-3 pr-3">{observation(metric.first, metric.unit)}</td><td className="py-3 pr-3">{observation(metric.last, metric.unit)}</td>
            <td className="py-3">{metric.change === null ? 'No comparable' : `${metric.change > 0 ? '+' : ''}${number.format(metric.change)} ${isRating(metric.unit) ? 'puntos' : metric.unit}`}</td>
          </tr>)}</tbody></table></div>
      </CardContent></Card>
    <div className="flex flex-wrap items-center justify-between gap-2" aria-label="Paginación del histórico">
      <p className="text-sm">Gráficos: {date(data.chart_from)} – {date(data.chart_to)} · Página {data.page} de {data.total_pages}</p>
      <div className="flex gap-2"><Button variant="outline" disabled={page >= data.total_pages} onClick={() => onPageChange(page + 1)}>Más antiguo</Button><Button variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Más reciente</Button></div>
    </div>
    <div className="grid gap-4 xl:grid-cols-3">{groups.map(([group, title]) => <MetricChart key={group} title={title}
      period={`${date(data.chart_from)} – ${date(data.chart_to)}`} series={data.series.filter((item) => item.group === group)} />)}</div>
  </div>
}
