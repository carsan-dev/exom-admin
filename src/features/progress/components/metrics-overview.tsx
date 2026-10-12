import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMetricsOverview } from '../api'
import type { Observation } from '../metrics-overview'
import { MetricVisual } from './metric-visual'

const number = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })
const date = (value: string) => value.split('-').reverse().join('/')
const isRating = (unit: string) => unit === '0–5' || unit === '1–10'
const formattedValue = (value: number, unit: string) => isRating(unit)
  ? `${number.format(value)}/${unit === '0–5' ? 5 : 10}` : `${number.format(value)} ${unit}`
const groups = [['body', 'Evolución corporal'], ['nutrition', 'Nutrición estimada'], ['habits', 'Hábitos']] as const

function observation(point: Observation | null, unit: string) {
  if (!point || point.value === null || point.quality !== 'complete') return <span className="text-muted-foreground">Sin datos</span>
  return <><span>{formattedValue(point.value, unit)}</span>
    <span className="block text-xs text-muted-foreground">{date(point.date)}{point.end_date && ` – ${date(point.end_date)}`}</span>
    {point.provenance === 'legacy_available' && <span className="block text-xs">Histórico legacy disponible</span>}</>
}

export function MetricsOverviewPanel({ clientId, from, to, page, onPageChange, valid }: {
  clientId: string, from?: string, to: string, page: number, onPageChange: (page: number) => void, valid: boolean
}) {
  return <MetricsOverviewContent key={`${clientId}:${from ?? 'all'}:${to}`} clientId={clientId} from={from} to={to} page={page} onPageChange={onPageChange} valid={valid} />
}

function MetricsOverviewContent({ clientId, from, to, page, onPageChange, valid }: Parameters<typeof MetricsOverviewPanel>[0]) {
  const [group, setGroup] = useState<(typeof groups)[number][0]>('body')
  const query = useMetricsOverview(clientId, from, to, page, valid)
  if (!valid) return <p role="alert">Selecciona un periodo válido, sin fechas futuras.</p>
  if (query.isPending) return <div role="status" className="space-y-4"><p className="text-sm text-muted-foreground">Cargando métricas…</p><Skeleton className="h-40 w-full motion-reduce:animate-none" /><Skeleton className="h-64 w-full motion-reduce:animate-none" /></div>
  if (query.isError) return <div role="alert" className="space-y-3 rounded-lg border p-4"><p>No se pudieron cargar las métricas. Comprueba el acceso y el periodo.</p><Button variant="outline" onClick={() => void query.refetch()}>Reintentar</Button></div>
  const data = query.data
  if (!data || data.client_id !== clientId) return <p role="status">Cargando métricas del cliente seleccionado…</p>
  const visibleSeries = data.series.filter((item) => item.group === group)
  return <div className="min-w-0 space-y-5">
    <div className="space-y-1">
      <h2 className="text-xl font-semibold">Mediciones del periodo</h2>
      <p className="text-sm text-muted-foreground">{date(data.from)} – {date(data.to)} · Selecciona una medición para interpretar sus observaciones, no un objetivo clínico.</p>
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Grupo de métricas">
      {groups.map(([key, label]) => <Button key={key} variant={group === key ? 'default' : 'outline'} aria-pressed={group === key} onClick={() => setGroup(key)}>{label}</Button>)}
    </div>
    <MetricVisual key={group} period={`${date(data.from)} – ${date(data.to)}`} chartPeriod={`${date(data.chart_from)} – ${date(data.chart_to)}`} series={visibleSeries} />
    <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Paginación del histórico">
      <p className="text-sm text-muted-foreground">Gráficos: {date(data.chart_from)} – {date(data.chart_to)} · Página {data.page} de {data.total_pages}. La comparación conserva el periodo completo.</p>
      <div className="flex gap-2"><Button variant="outline" disabled={page >= data.total_pages} onClick={() => onPageChange(page + 1)}>Más antiguo</Button><Button variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Más reciente</Button></div>
    </nav>
    <details className="rounded-lg border bg-card p-4 text-sm sm:p-6">
      <summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Comparar todas las mediciones del grupo</summary>
      <p className="mt-3 text-muted-foreground">Primera y última observación completa del periodo. Un solo registro no permite calcular cambio.</p>
      <p className="mt-2 text-muted-foreground sm:hidden">Desliza la tabla para ver Actual y Cambio.</p>
      <div className="mt-3 max-h-96 overflow-auto rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" role="region" aria-label="Tabla comparativa desplazable" tabIndex={0}>
        <table className="w-full min-w-[580px] text-left text-sm tabular-nums">
          <caption className="sr-only">Comparativa de métricas del periodo</caption>
          <thead className="sticky top-0 z-10 bg-card"><tr className="border-b"><th scope="col" className="py-3">Métrica / fuente</th><th scope="col">Inicio</th><th scope="col">Actual</th><th scope="col">Cambio</th></tr></thead>
          <tbody>{visibleSeries.map((metric) => <tr key={metric.key} className="border-b align-top">
            <th scope="row" className="py-3 pr-3 font-medium">{metric.label} ({metric.unit})<span className="block text-xs font-normal text-muted-foreground">{metric.source}</span>
              {metric.incomplete_count > 0 && <span className="block text-xs font-normal">{metric.incomplete_count} observaciones con información incompleta</span>}</th>
            <td className="py-3 pr-3">{observation(metric.first, metric.unit)}</td><td className="py-3 pr-3">{observation(metric.last, metric.unit)}</td>
            <td className="py-3">{metric.count < 2 || !metric.first || !metric.last || metric.first.date >= metric.last.date || metric.change === null ? 'No comparable' : `${metric.change > 0 ? '+' : ''}${number.format(metric.change)} ${isRating(metric.unit) ? 'puntos' : metric.unit}`}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
    <details className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
      <summary className="cursor-pointer rounded-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cómo se calculan las métricas y sus escalas</summary>
      <p className="mt-3 max-w-prose">Recaps: semanas cuyo lunes pertenece al periodo, sin repartir valores por días. Sueño: mediciones corporales; los rangos del recap no se convierten en horas. Nutrición: estimaciones de comidas marcadas, no ingesta real. Los datos parciales no entran en la comparación ni en el gráfico; pueden consultarse en su tabla. El histórico legacy refleja lo disponible al capturarlo, no reconstruye ediciones anteriores.</p>
      <p className="mt-3 max-w-prose">Hambre: 1 sin hambre, 10 extrema. Energía: 1 sin energía, 10 mucha. Digestión: 1 muy mala, 10 muy buena. Estrés: escala histórica 0 sin estrés, 5 máximo.</p>
    </details>
  </div>
}
