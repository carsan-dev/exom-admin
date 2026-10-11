import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useClientAdherence } from '@/features/clients/adherence.api'
import { useRecapsList } from '@/features/recaps/api'
import { useClientWeekSummary, useMetricsOverview } from '../api'
import { useTaskIdentity, useTaskSummary } from '../follow-up-tasks/api'
import { NextTaskSummary } from '../follow-up-tasks/next-task-summary'
import { MetricVisual } from './metric-visual'
import { AdherenceEvolution } from './adherence-evolution'

const number = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })
const shift = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
const displayDate = (date: string) => date.split('-').reverse().join('/')
interface QueryState { isPending: boolean; isError: boolean; refetch: () => unknown }
function QueryContent({ query, label, children }: { query: QueryState; label: string; children: ReactNode }) {
  if (query.isError) return <div role="alert" className="min-w-0 space-y-2 text-sm"><p>No se pudo cargar {label}.</p><Button className="h-auto min-h-11 max-w-full whitespace-normal text-left" variant="outline" size="sm" onClick={() => { void query.refetch() }}>Reintentar {label}</Button></div>
  if (query.isPending) return <div role="status"><span className="sr-only">Cargando {label}…</span><Skeleton className="h-16 w-full motion-reduce:animate-none" /></div>
  return children
}
const linkClass = 'inline-flex min-h-11 items-center gap-1 rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function ProgressDashboard({ clientId }: { clientId: string }) {
  const [params] = useSearchParams()
  const today = new Date().toISOString().slice(0, 10)
  const from = shift(today, -29)
  const weekStart = shift(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7))
  const weekEnd = shift(weekStart, 6)
  const historical = useMetricsOverview(clientId, undefined, today, 1)
  const chart = useMetricsOverview(clientId, from, today, 1)
  const adherence = useClientAdherence(clientId, { start: from, end: today })
  const week = useClientWeekSummary(clientId, weekStart)
  const summary = useTaskSummary(useTaskIdentity(), clientId)
  const recaps = useRecapsList(clientId, 'SUBMITTED', false, 1, 20)
  const weight = historical.data?.client_id === clientId ? historical.data.series.find((item) => item.key === 'weight_kg') : undefined
  const chartData = chart.data?.client_id === clientId ? chart.data : undefined
  const report = adherence.data
  const global = report?.aggregate.global
  const weekly = week.data?.week_start === weekStart ? week.data : undefined
  function href(section: string, updates: Record<string, string> = {}) {
    const next = new URLSearchParams(params)
    next.set('clientId', clientId); next.set('section', section)
    for (const [key, value] of Object.entries(updates)) next.set(key, value)
    return `/progress?${next}`
  }
  const adherenceHref = href('adherencia', { adherence_start: from, adherence_end: today })
  const closedDays = report?.days.filter((day) => day.evaluation.period === 'closed' && day.date < report.today &&
    day.date < today && (day.calendar === 'partial' || day.calendar === 'incomplete') &&
    (day.schedule.training === 'assigned' || day.schedule.nutrition === 'assigned')) ?? []
  const overdue = [summary.data?.next_task, summary.data?.next_review].filter((task, index, tasks) => task?.overdue && tasks.findIndex((item) => item?.id === task.id) === index)
  const submitted = recaps.data?.data.filter((recap) => recap.client_id === clientId && recap.status === 'SUBMITTED' &&
    recap.submitted_at !== null && recap.submitted_at.slice(0, 10) <= today && recap.week_end_date.slice(0, 10) < today) ?? []
  const recent = report?.recentClosed
  const low = report && recent?.status === 'low' && recent.end < report.today && recent.end < today
  return <section aria-label="Dashboard del cliente" className="min-w-0 space-y-6">
    <header className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-xl font-semibold">Una mirada al progreso</h2>
      <p className="text-sm text-muted-foreground">Actualizado a {displayDate(today)} · UTC</p>
    </header>
    <section aria-label="Estado y cobertura" className="space-y-4 border-y border-border py-4">
      <dl className="grid grid-cols-2 gap-x-5 gap-y-4 lg:grid-cols-4">
        <div className="min-w-0 space-y-1"><dt className="text-sm text-muted-foreground">Peso actual</dt><dd>
          <QueryContent query={historical} label="el peso histórico">
            {weight?.last?.quality === 'complete' && weight.last.value !== null && Number.isFinite(weight.last.value)
              ? <><p className="text-3xl font-semibold tabular-nums">{number.format(weight.last.value)} kg</p><p className="text-xs text-muted-foreground">Registro: {displayDate(weight.last.date)}</p><p className="mt-2 text-sm">{weight.change !== null && weight.count > 1 ? <><strong className="font-medium tabular-nums">{weight.change > 0 ? '+' : ''}{number.format(weight.change)} kg</strong> desde inicio</> : 'Cambio no comparable'}</p></>
              : <p className="text-sm">Sin registros de peso</p>}
          </QueryContent>
        </dd></div>
        <div className="min-w-0 space-y-1"><dt className="text-sm text-muted-foreground">Adherencia global</dt><dd>
          <QueryContent query={adherence} label="la adherencia">
            <p className="text-3xl font-semibold tabular-nums">{global?.status === 'evaluable' && global.ratio !== null ? `${number.format(global.ratio * 100)} %` : global?.status === 'not_applicable' ? 'Sin componentes evaluables' : 'Información insuficiente'}</p>
            <p className="text-xs text-muted-foreground">30 días · solo días cerrados</p>
          </QueryContent>
        </dd></div>
        <div className="min-w-0 space-y-1"><dt className="text-sm text-muted-foreground">Entrenamientos esta semana</dt><dd>
          <QueryContent query={week} label="la semana"><p className="text-2xl font-semibold tabular-nums">{!weekly ? 'Semana no disponible' : weekly.trainings_assigned === 0 ? 'Sin pauta esta semana' : `${weekly.trainings_completed} / ${weekly.trainings_assigned}`}</p></QueryContent>
        </dd></div>
        <div className="min-w-0 space-y-1"><dt className="text-sm text-muted-foreground">Días de dieta esta semana</dt><dd>
          <QueryContent query={week} label="los días de dieta"><p className="text-2xl font-semibold tabular-nums">{weekly?.diet_days_assigned === undefined || weekly.diet_days_completed === undefined ? 'Días de dieta no disponibles' : weekly.diet_days_assigned === 0 ? 'Sin pauta esta semana' : `${weekly.diet_days_completed} / ${weekly.diet_days_assigned}`}</p></QueryContent>
        </dd></div>
      </dl>
      <p className="text-xs text-muted-foreground">Semana UTC completa: {displayDate(weekStart)} – {displayDate(weekEnd)}. La programación futura cuenta en la semana, no genera alertas ni penaliza la adherencia cerrada.</p>
      <div className="flex flex-wrap gap-x-5">
        <Link className={linkClass} to={href('metricas', { period: 'all', historyPage: '1' })}>Ver peso desde inicio <ArrowUpRight size={14} aria-hidden="true" /></Link>
        <Link className={linkClass} to={adherenceHref}>Ver adherencia <ArrowUpRight size={14} aria-hidden="true" /></Link>
        <Link className={linkClass} to={href('resumen', { date: today })}>Ver semana completa <ArrowUpRight size={14} aria-hidden="true" /></Link>
      </div>
      {report?.recentClosed ? <p className="text-xs text-muted-foreground">Cobertura reciente: {report.recentClosed.coverage.available} / {report.recentClosed.coverage.expected} días disponibles · {report.recentClosed.coverage.evaluable} evaluables · {report.recentClosed.coverage.insufficient} insuficientes.</p> : !adherence.isPending && !adherence.isError && <p className="text-xs text-muted-foreground">Clasificación reciente no disponible; no se infiere desde el porcentaje global.</p>}
    </section>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,1fr)]">
    <section aria-label="Evolución de los últimos treinta días" className="order-2 min-w-0 space-y-4 xl:order-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg font-semibold">Evolución · últimos 30 días</h2><p className="text-sm text-muted-foreground">{displayDate(from)} – {displayDate(today)} · UTC</p></div>
      <QueryContent query={chart} label="la evolución del peso">{chartData ? <MetricVisual compact series={chartData.series.filter((item) => item.key === 'weight_kg')} period={`${displayDate(from)} – ${displayDate(today)}`} chartPeriod={`${displayDate(chartData.chart_from)} – ${displayDate(chartData.chart_to)}`} /> : <p className="text-sm">Evolución del peso no disponible.</p>}</QueryContent>
      <Link className={linkClass} to={href('metricas', { period: 'custom', from, to: today, historyPage: '1' })}>Ver métricas de estos 30 días <ArrowUpRight size={14} aria-hidden="true" /></Link>
      <QueryContent query={adherence} label="la evolución de adherencia">{report ? <AdherenceEvolution days={report.days} /> : <p className="text-sm">Evolución de adherencia no disponible.</p>}</QueryContent>
    </section>
      <div className="order-1 min-w-0 space-y-5 xl:order-2">
      <section aria-label="Próximos pasos" className="min-w-0 space-y-2"><h2 className="text-lg font-semibold">Próximos pasos</h2><NextTaskSummary query={summary} /><Link className={linkClass} to={href('seguimiento')}>Abrir seguimiento <ArrowUpRight size={14} aria-hidden="true" /></Link></section>
      <section aria-label="Alertas importantes" className="min-w-0 space-y-3">
        <h2 className="text-lg font-semibold">Alertas importantes</h2>
        <QueryContent query={summary} label="las alertas de tareas">{overdue.length > 0 && <div><h3 className="text-sm font-medium">Tareas y revisiones vencidas</h3><ul>{overdue.map((task) => task && <li key={task.id}><Link className={linkClass} to={href('seguimiento')}>{task.title} · {task.due_date}</Link></li>)}</ul><p className="text-xs text-muted-foreground">Próximas acciones vencidas; consulta el resto de tareas en Seguimiento.</p></div>}</QueryContent>
        <QueryContent query={recaps} label="los recaps pendientes">
          {submitted.length > 0 && <div><h3 className="text-sm font-medium">Recaps enviados pendientes de revisión</h3><ul>{submitted.map((recap) => <li key={recap.id}><Link className={linkClass} to={`/recaps/${recap.id}?returnTo=${encodeURIComponent(href('dashboard'))}`}>Recap · {recap.week_start_date.slice(0, 10)} – {recap.week_end_date.slice(0, 10)}</Link></li>)}</ul></div>}
          {recaps.data && recaps.data.totalPages > 1 && <Link className={linkClass} to={href('seguimiento')}>Consultar todos los recaps en Seguimiento</Link>}
        </QueryContent>
        <QueryContent query={adherence} label="las alertas de adherencia">
          {low && recent && <div><h3 className="text-sm font-medium">Baja adherencia global</h3><Link className={linkClass} to={href('adherencia', { adherence_start: recent.start, adherence_end: recent.end })}>Revisar los siete días cerrados · umbral individual del servidor</Link></div>}
          {closedDays.length > 0 && <div><h3 className="text-sm font-medium">Días cerrados sin completar · {closedDays.length}</h3><details><summary className={`${linkClass} cursor-pointer`}>Ver días con entrenamiento o dieta pendientes</summary><ul>{closedDays.map((day) => <li key={day.date}><Link className={linkClass} to={href('adherencia', { adherence_start: day.date, adherence_end: day.date })}>{day.date} · {day.calendar === 'partial' ? 'Cumplimiento parcial' : 'Sin cumplimiento registrado'}</Link></li>)}</ul></details></div>}
          {!low && closedDays.length === 0 && report && <p className="text-sm text-muted-foreground">Sin avisos de incumplimiento en los días cerrados disponibles. No acredita cobertura completa.</p>}
        </QueryContent>
      </section>
    </div>
    </div>
  </section>
}
