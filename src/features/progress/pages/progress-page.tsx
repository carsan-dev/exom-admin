import { useSearchParams } from 'react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState } from 'react'
import { ClientSelector, EmptyClientState } from '../components/client-selector'
import { ProgressOverviewCards } from '../components/progress-overview-cards'
import { ProgressCalendar } from '../components/progress-calendar'
import { DayProgressDetail } from '../components/day-progress-detail'
import { MetricsOverviewPanel } from '../components/metrics-overview'
import { metricsPeriod } from '../metrics-overview'
import { MetricsTable } from '../components/metrics-table'
import { TrainingProgressPanel } from '../components/training-progress-panel'
import { trainingWindowFor } from '../training-window'
import { Button } from '@/components/ui/button'
import { StreakSection } from '../components/streak-section'
import { ProgressPhotosPanel } from '../components/progress-photos-panel'
import { useClientCalendarMonth, useClientDayProgress, useClientWeekSummary } from '../api'
import { useClientProfile } from '../../clients/api'
import { ClientAdherenceTab } from '../../clients/components/client-adherence-tab'

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
  const requestedSection = searchParams.get('section') ?? 'resumen'
  const section = ['resumen', 'metricas', 'fotos', 'entrenamiento', 'adherencia', 'racha'].includes(requestedSection) ? requestedSection : 'metricas'
  const period = metricsPeriod(searchParams)
  const historyPage = Math.max(1, Number(searchParams.get('historyPage')) || 1)
  const trainingWindow = trainingWindowFor(getTodayStr(), searchParams.get('trainingWindow'))
  const trainingFrom = period.period === 'all' ? trainingWindow.from : period.from ?? period.to
  const trainingTo = period.period === 'all' ? trainingWindow.to : period.to
  const trainingValid = period.period === 'all' || (period.valid &&
    (Date.parse(`${trainingTo}T00:00:00Z`) - Date.parse(`${trainingFrom}T00:00:00Z`)) / 86400000 <= 365)

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

  function handleClientSelect(id: string) {
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

  function handleMonthChange(year: number, month: number) {
    setCalendarView({ clientId, date: calendarDate, year, month })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-3 sm:space-y-5 [--muted-foreground:var(--foreground-secondary)] [--primary-foreground:#30271e] [&_button]:duration-150 [&_button]:motion-reduce:transition-none">
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
        <Tabs value={section} onValueChange={(value) => updateParams({ section: value })} className="space-y-4">
          <section aria-label="Contexto del cliente y periodo" className="border-y border-border py-2">
            <details>
              <summary aria-label={`Periodo de métricas y entrenamiento: ${period.from ?? 'Inicio'} a ${period.to} UTC`} className="min-h-11 cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Periodo · {period.from ?? 'Inicio'} → {period.to} · UTC
              </summary>
              <div className="flex flex-wrap items-end gap-3 pt-3">
              <label className="text-sm">Periodo
                <select aria-label="Periodo" value={period.period} onChange={(event) => updateParams({ period: event.target.value, historyPage: '1', trainingWindow: '0' })}
                  className="mt-1 block min-h-11 max-w-full rounded-md border bg-background p-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="all">Desde inicio</option><option value="4w">Últimas cuatro semanas</option><option value="3m">Últimos tres meses</option><option value="custom">Personalizado</option>
                </select>
              </label>
              {period.period === 'custom' && <>
                <label className="text-sm">Desde<input type="date" value={period.from ?? ''} max={period.to} onChange={(event) => updateParams({ from: event.target.value, historyPage: '1' })} className="mt-1 block min-h-11 rounded-md border bg-background p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
                <label className="text-sm">Hasta<input type="date" value={period.to} max={getTodayStr()} onChange={(event) => updateParams({ to: event.target.value, historyPage: '1' })} className="mt-1 block min-h-11 rounded-md border bg-background p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
              </>}
              <p className="max-w-prose text-sm text-muted-foreground">Métricas y entrenamiento: {period.from ?? 'Inicio'} → {period.to} · UTC. Resumen usa la semana del día seleccionado; Adherencia y Fotos tienen su propia consulta. Racha muestra los contadores registrados.</p>
              </div>
            </details>
            {!period.valid && <p role="alert" className="text-sm text-status-error">Revisa el periodo: las fechas deben estar ordenadas y no superar hoy.</p>}
          </section>
          <div>
          <TabsList aria-label="Secciones de progreso" className="h-auto w-full max-w-full justify-start gap-1 overflow-x-auto bg-transparent p-0 [&_button]:min-h-11 [&_button]:shrink-0 sm:flex-wrap [&_button]:rounded-md [&_button]:data-[state=active]:bg-brand-soft/10 [&_button]:data-[state=active]:text-foreground [&_button]:data-[state=active]:shadow-none">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="metricas">Métricas</TabsTrigger>
            <TabsTrigger value="fotos">Fotos</TabsTrigger>
            <TabsTrigger value="entrenamiento">Entrenamiento</TabsTrigger>
            <TabsTrigger value="adherencia">Adherencia</TabsTrigger>
            <TabsTrigger value="racha">Racha</TabsTrigger>
            <TabsTrigger value="dashboard" disabled>Dashboard · pendiente</TabsTrigger>
            <TabsTrigger value="seguimiento" disabled>Seguimiento · pendiente</TabsTrigger>
          </TabsList>
          </div>

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
            <MetricsOverviewPanel key={clientId} clientId={clientId} from={period.from} to={period.to}
              valid={period.valid} page={historyPage} onPageChange={(page) => updateParams({ historyPage: String(page) })} />
            <details><summary className="cursor-pointer text-sm">Registros corporales originales · historial completo</summary>
              <MetricsTable key={clientId} clientId={clientId} page={metricsPage} onPageChange={setMetricsPage} />
            </details>
          </TabsContent>

          {/* Fotos Tab */}
          <TabsContent value="fotos" className="space-y-4">
            <ProgressPhotosPanel key={clientId} clientId={clientId} />
          </TabsContent>

          <TabsContent value="entrenamiento" className="space-y-4">
            {period.period === 'all' && <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4 text-sm" aria-label="Ventanas consecutivas desde inicio">
              <p>Desde inicio · ventana {trainingWindow.index + 1}: {trainingFrom} – {trainingTo} (hasta 366 días inclusivos). Consulta las ventanas anteriores para ver todo el histórico.</p>
              <Button variant="outline" disabled={!trainingWindow.hasOlder} onClick={() => updateParams({ trainingWindow: String(trainingWindow.index + 1) })}>Ventana anterior</Button>
              <Button variant="outline" disabled={!trainingWindow.hasNewer} onClick={() => updateParams({ trainingWindow: String(trainingWindow.index - 1) })}>Ventana posterior</Button>
            </div>}
            <TrainingProgressPanel key={`${clientId}:${trainingFrom}:${trainingTo}`} clientId={clientId} from={trainingFrom} to={trainingTo} valid={trainingValid} />
          </TabsContent>

          <TabsContent value="adherencia" className="space-y-4">
            <ClientAdherenceTab key={clientId} clientId={clientId} />
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
