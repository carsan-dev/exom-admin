import { UNSAFE_DataRouterContext, useSearchParams } from 'react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { PeriodSelector, rangeLengthDays, usePeriodParam, type PeriodPreset } from '@/components/period'
import { TaskRouteGuard } from '../follow-up-tasks/route-guard'
import { FollowUpPanel } from '../follow-up-tasks/follow-up-panel'
import type { NavigationGuard } from '../follow-up-tasks/task-editor'
import { ClientSelector, EmptyClientState } from '../components/client-selector'
import { ProgressDashboard } from '../components/progress-dashboard'
import { ProgressOverviewCards } from '../components/progress-overview-cards'
import { ProgressCalendar } from '../components/progress-calendar'
import { DayProgressDetail } from '../components/day-progress-detail'
import { MetricsOverviewPanel, type MetricsSelection } from '../components/metrics-overview'
import { parseTrainingLoadMeasure, type TrainingLoadMeasure } from '../components/training-load-measure'
import { MetricsTable } from '../components/metrics-table'
import { TrainingProgressPanel } from '../components/training-progress-panel'
import { trainingWindowFor } from '../training-window'
import { Button } from '@/components/ui/button'
import { StreakSection } from '../components/streak-section'
import { ProgressPhotosPanel } from '../components/progress-photos-panel'
import { useClientCalendarMonth, useClientDayProgress, useClientWeekSummary } from '../api'
import { useClientProfile } from '../../clients/api'
import { ClientAdherenceTab } from '../../clients/components/client-adherence-tab'

const PROGRESS_PERIOD_OPTIONS: readonly PeriodPreset[] = ['7d', '30d', '90d', 'ytd', 'all', 'custom']
const PERIOD_SECTIONS = ['metricas', 'entrenamiento']
/** Training overview API limit (inclusive days). */
const TRAINING_MAX_DAYS = 366
const METRIC_SELECTION_PARAMS = { group: 'metric_group', metric: 'metric', compare: 'compare' } as const
const METRIC_SELECTION_FIELDS = ['group', 'metric', 'compare'] as const

function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

function getWeekStart(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const day = date.getUTCDay()
  const diff = (day + 6) % 7 // Monday-based
  date.setUTCDate(date.getUTCDate() - diff)
  return date.toISOString().split('T')[0]
}

export function ProgressPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const clientId = searchParams.get('clientId') ?? ''
  const selectedDate = searchParams.get('date') ?? getTodayStr()
  const requestedSection = searchParams.get('section') ?? 'dashboard'
  const section = ['dashboard', 'resumen', 'metricas', 'fotos', 'entrenamiento', 'adherencia', 'racha', 'seguimiento'].includes(requestedSection) ? requestedSection : 'metricas'
  const period = usePeriodParam({ section: 'progress', options: PROGRESS_PERIOD_OPTIONS, defaultPreset: '30d' })
  const { range, previousRange } = period
  const allHistory = period.effectivePreset === 'all'
  const historyPage = Math.max(1, Number(searchParams.get('historyPage')) || 1)
  const trainingWindow = trainingWindowFor(getTodayStr(), searchParams.get('trainingWindow'))
  const trainingFrom = allHistory ? trainingWindow.from : range.from ?? range.to
  const trainingTo = allHistory ? trainingWindow.to : range.to
  const trainingValid = allHistory || rangeLengthDays(trainingFrom, trainingTo) <= TRAINING_MAX_DAYS
  const trainingPrevious = !allHistory && trainingValid && previousRange?.from
    && rangeLengthDays(previousRange.from, previousRange.to) <= TRAINING_MAX_DAYS ? { from: previousRange.from, to: previousRange.to } : null
  const trainingMeasure: TrainingLoadMeasure = parseTrainingLoadMeasure(searchParams.get('measure')) ?? 'weight_kg'
  const metricSelection: MetricsSelection = {
    group: searchParams.get(METRIC_SELECTION_PARAMS.group),
    metric: searchParams.get(METRIC_SELECTION_PARAMS.metric),
    compare: searchParams.get(METRIC_SELECTION_PARAMS.compare),
  }

  // A new period restarts history paging and training windows (the period hook owns its own URL write).
  const periodKey = `${period.effectivePreset}:${range.from ?? ''}:${range.to}`
  const lastPeriodKey = useRef(periodKey)
  useEffect(() => {
    if (lastPeriodKey.current === periodKey) return
    lastPeriodKey.current = periodKey
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set('historyPage', '1')
      next.set('trainingWindow', '0')
      return next
    }, { replace: true })
  }, [periodKey, setSearchParams])

  const calendarDate = /^\d{4}-\d{2}-\d{2}$/.test(selectedDate) ? selectedDate : getTodayStr()
  const [calendarView, setCalendarView] = useState({ clientId, date: calendarDate, year: Number(calendarDate.slice(0, 4)), month: Number(calendarDate.slice(5, 7)) })
  const sameContext = calendarView.clientId === clientId && calendarView.date === calendarDate
  const calYear = sameContext ? calendarView.year : Number(calendarDate.slice(0, 4))
  const calMonth = sameContext ? calendarView.month : Number(calendarDate.slice(5, 7))
  const [metricsPage, setMetricsPage] = useState(1)

  const weekStart = getWeekStart(selectedDate)

  const profileQuery = useClientProfile(clientId || undefined)
  const { data: clientData, isLoading: profileLoading } = profileQuery
  const calendarQuery = useClientCalendarMonth(
    clientId,
    calYear,
    calMonth
  )
  const { data: calendarData, isLoading: calendarLoading } = calendarQuery
  const dayQuery = useClientDayProgress(clientId, selectedDate)
  const { data: dayProgress, isLoading: dayLoading } = dayQuery
  const weekQuery = useClientWeekSummary(clientId, weekStart)
  const { data: weekSummary, isLoading: weekLoading } = weekQuery

  const dataRouter = useContext(UNSAFE_DataRouterContext)
  const taskGuard = useRef<NavigationGuard | null>(null)
  const registerTaskGuard = useCallback((guard: NavigationGuard | null) => { taskGuard.current = guard }, [])

  function handleClientSelect(id: string) {
    if (!dataRouter && id !== clientId && taskGuard.current && !taskGuard.current()) return
    updateParams({ clientId: id, date: getTodayStr(), historyPage: '1', trainingWindow: '0' })
    setMetricsPage(1)
  }

  function handleDateSelect(date: string) {
    updateParams({ date })
  }

  function updateParams(updates: Record<string, string>) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      for (const [key, value] of Object.entries(updates)) next.set(key, value)
      return next
    })
  }

  function handleMetricSelection(updates: Partial<MetricsSelection>) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      for (const field of METRIC_SELECTION_FIELDS) {
        if (!(field in updates)) continue
        const value = updates[field]
        if (value) next.set(METRIC_SELECTION_PARAMS[field], value)
        else next.delete(METRIC_SELECTION_PARAMS[field])
      }
      return next
    }, { replace: true })
  }

  function handleMonthChange(year: number, month: number) {
    setCalendarView({ clientId, date: calendarDate, year, month })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-3 sm:space-y-5 [--muted-foreground:var(--foreground-secondary)] [--primary-foreground:#30271e] [&_button]:duration-150 [&_button]:motion-reduce:transition-none">
      <TaskRouteGuard guard={taskGuard} />
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Progreso</h1>
        <div className="min-w-0 flex-1 sm:flex-none">
          <span className="sr-only">Cliente:</span>
          <ClientSelector selectedClientId={clientId} onSelect={handleClientSelect} />
        </div>
      </div>

      {!clientId ? (
        <EmptyClientState />
      ) : (
        <Tabs value={section} onValueChange={(value) => { if (dataRouter || !taskGuard.current || taskGuard.current()) updateParams({ section: value }) }} className="space-y-4">
          {PERIOD_SECTIONS.includes(section) && <section aria-label="Contexto del cliente y periodo" className="space-y-2 border-y border-border py-3">
            <PeriodSelector label="Periodo de métricas y entrenamiento" value={period.preset} options={PROGRESS_PERIOD_OPTIONS}
              onChange={period.setPreset} custom={period.custom} onCustomChange={period.setCustomRange} error={period.error}
              range={range} previousRange={previousRange} effectivePreset={period.effectivePreset} />
            <p className="max-w-prose text-sm text-muted-foreground">Se aplica a Métricas y Entrenamiento · fechas UTC. Resumen usa la semana del día seleccionado; Adherencia y Fotos tienen su propia consulta. Racha muestra los contadores registrados.</p>
          </section>}
          <div>
          <TabsList aria-label="Secciones de progreso" className="h-auto w-full max-w-full justify-start gap-1 overflow-x-auto bg-transparent p-0 [&_button]:min-h-11 [&_button]:shrink-0 sm:flex-wrap [&_button]:rounded-md [&_button]:data-[state=active]:bg-brand-soft/10 [&_button]:data-[state=active]:text-foreground [&_button]:data-[state=active]:shadow-none">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="metricas">Métricas</TabsTrigger>
            <TabsTrigger value="fotos">Fotos</TabsTrigger>
            <TabsTrigger value="entrenamiento">Entrenamiento</TabsTrigger>
            <TabsTrigger value="adherencia">Adherencia</TabsTrigger>
            <TabsTrigger value="racha">Racha</TabsTrigger>
            <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
          </TabsList>
          </div>

          <TabsContent value="dashboard" className="pt-2"><ProgressDashboard key={clientId} clientId={clientId} /></TabsContent>

          {/* Resumen Tab */}
          <TabsContent value="resumen" className="space-y-4 pt-2 sm:pt-3">
            {(profileQuery.isError || weekQuery.isError) && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
              <p>No se pudo cargar el resumen completo. Los datos ausentes no son ceros.</p>
              <Button variant="outline" size="sm" onClick={() => { void profileQuery.refetch(); void weekQuery.refetch() }}>Reintentar resumen</Button>
            </div>}
            <ProgressOverviewCards
              streak={clientData?.streak}
              weekSummary={weekSummary}
              isLoading={profileLoading || weekLoading}
              onStreakSelect={() => updateParams({ section: 'racha' })}
            />
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm font-medium">Día de consulta · UTC<input type="date" value={selectedDate} onChange={(event) => { if (event.target.value) handleDateSelect(event.target.value) }} className="mt-1 block min-h-11 rounded-md border bg-background p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
              <Button variant="outline" onClick={() => handleDateSelect(getTodayStr())}>Ir a hoy</Button>
            </div>
            {calendarQuery.isError && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm"><p>No se pudo cargar el calendario.</p><Button variant="outline" size="sm" onClick={() => { void calendarQuery.refetch() }}>Reintentar calendario</Button></div>}
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <ProgressCalendar
                year={calYear}
                month={calMonth}
                days={calendarData}
                isLoading={calendarLoading}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                onMonthChange={handleMonthChange}
              />
              <DayProgressDetail
                key={`${clientId}:${selectedDate}`}
                isError={dayQuery.isError}
                onRetry={() => { void dayQuery.refetch() }}
                clientId={clientId}
                date={selectedDate}
                progress={dayProgress}
                isLoading={dayLoading}
              />
            </div>
          </TabsContent>

          {/* Métricas Tab */}
          <TabsContent value="metricas" className="space-y-4">
            <MetricsOverviewPanel key={clientId} clientId={clientId} from={range.from} to={range.to}
              page={historyPage} onPageChange={(page) => updateParams({ historyPage: String(page) })}
              selection={metricSelection} onSelectionChange={handleMetricSelection} />
            <details><summary className="cursor-pointer text-sm">Registros corporales originales · historial completo</summary>
              <MetricsTable key={clientId} clientId={clientId} page={metricsPage} onPageChange={setMetricsPage} />
            </details>
          </TabsContent>

          {/* Fotos Tab */}
          <TabsContent value="fotos" className="space-y-4">
            <ProgressPhotosPanel key={clientId} clientId={clientId} />
          </TabsContent>

          <TabsContent value="entrenamiento" className="space-y-4">
            {allHistory && <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4 text-sm" aria-label="Ventanas consecutivas desde inicio">
              <p>Desde inicio · ventana {trainingWindow.index + 1}: {trainingFrom} – {trainingTo} (hasta 366 días inclusivos). Consulta las ventanas anteriores para ver todo el histórico.</p>
              <Button variant="outline" disabled={!trainingWindow.hasOlder} onClick={() => updateParams({ trainingWindow: String(trainingWindow.index + 1) })}>Ventana anterior</Button>
              <Button variant="outline" disabled={!trainingWindow.hasNewer} onClick={() => updateParams({ trainingWindow: String(trainingWindow.index - 1) })}>Ventana posterior</Button>
            </div>}
            {trainingValid
              ? <TrainingProgressPanel key={`${clientId}:${trainingFrom}:${trainingTo}`} clientId={clientId} from={trainingFrom} to={trainingTo} valid
                previousFrom={trainingPrevious?.from} previousTo={trainingPrevious?.to}
                measure={trainingMeasure} onMeasureChange={(measure) => updateParams({ measure })} />
              : <p role="alert" className="rounded-lg border p-4 text-sm">El periodo seleccionado tiene {rangeLengthDays(trainingFrom, trainingTo)} días y Entrenamiento admite hasta {TRAINING_MAX_DAYS}. Reduce el intervalo o elige «Todo el historial» para consultarlo por ventanas consecutivas.</p>}
          </TabsContent>

          <TabsContent value="adherencia" className="space-y-4">
            <ClientAdherenceTab key={clientId} clientId={clientId} />
          </TabsContent>

          <TabsContent value="seguimiento" className="space-y-4">
            <FollowUpPanel key={clientId} clientId={clientId} onGuard={registerTaskGuard} />
          </TabsContent>

          {/* Racha Tab */}
          <TabsContent value="racha" className="space-y-4">
            {profileQuery.isError && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm"><p>No se pudo cargar la racha.</p><Button variant="outline" size="sm" onClick={() => { void profileQuery.refetch() }}>Reintentar racha</Button></div>}
            <StreakSection key={clientId} clientId={clientId} streak={clientData?.streak} isLoading={profileLoading} />
            <Button variant="outline" onClick={() => updateParams({ section: 'resumen' })}>Consultar actividad diaria en Resumen</Button>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
