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
import { StreakSection } from '../components/streak-section'
import { ProgressPhotosPanel } from '../components/progress-photos-panel'
import { useClientCalendarMonth, useClientDayProgress, useClientWeekSummary } from '../api'
import { useClientProfile } from '../../clients/api'

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
  const section = ['resumen', 'metricas', 'fotos', 'racha'].includes(requestedSection) ? requestedSection : 'metricas'
  const period = metricsPeriod(searchParams)
  const historyPage = Math.max(1, Number(searchParams.get('historyPage')) || 1)

  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1)
  const [metricsPage, setMetricsPage] = useState(1)

  const weekStart = getWeekStart(selectedDate)

  const { data: clientData, isLoading: profileLoading } = useClientProfile(clientId || undefined)
  const { data: calendarData, isLoading: calendarLoading } = useClientCalendarMonth(
    clientId,
    calYear,
    calMonth
  )
  const { data: dayProgress, isLoading: dayLoading } = useClientDayProgress(clientId, selectedDate)
  const { data: weekSummary, isLoading: weekLoading } = useClientWeekSummary(clientId, weekStart)

  function handleClientSelect(id: string) {
    updateParams({ clientId: id, date: getTodayStr(), historyPage: '1' })
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
    setCalYear(year)
    setCalMonth(month)
  }

  return (
    <div className="space-y-6 [--muted-foreground:var(--foreground-secondary)]">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">Progreso de clientes</h1>
        <p className="text-sm text-muted-foreground">
          Monitorea el progreso, métricas y cumplimiento de tus clientes
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Cliente:</span>
        <ClientSelector selectedClientId={clientId} onSelect={handleClientSelect} />
      </div>

      {!clientId ? (
        <EmptyClientState />
      ) : (
        <Tabs value={section} onValueChange={(value) => updateParams({ section: value })} className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <p className="font-medium">{profileLoading ? 'Cargando cliente…' : clientData?.profile ? `${clientData.profile.first_name} ${clientData.profile.last_name}` : 'Cliente seleccionado'}</p>
            {clientData?.profile?.main_goal && <p className="text-sm text-muted-foreground">{clientData.profile.main_goal}</p>}
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm">Periodo
                <select aria-label="Periodo" value={period.period} onChange={(event) => updateParams({ period: event.target.value, historyPage: '1' })}
                  className="mt-1 block rounded-md border bg-background p-2 text-foreground">
                  <option value="all">Desde inicio</option><option value="4w">Últimas cuatro semanas</option><option value="3m">Últimos tres meses</option><option value="custom">Personalizado</option>
                </select>
              </label>
              {period.period === 'custom' && <>
                <label className="text-sm">Desde<input type="date" value={period.from ?? ''} max={period.to} onChange={(event) => updateParams({ from: event.target.value, historyPage: '1' })} className="mt-1 block rounded-md border bg-background p-2" /></label>
                <label className="text-sm">Hasta<input type="date" value={period.to} max={getTodayStr()} onChange={(event) => updateParams({ to: event.target.value, historyPage: '1' })} className="mt-1 block rounded-md border bg-background p-2" /></label>
              </>}
              <p className="text-sm text-muted-foreground">Métricas: {period.from ?? 'Inicio'} → {period.to}. Resumen conserva su calendario diario.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="dashboard" disabled>Dashboard · pendiente</TabsTrigger>
            <TabsTrigger value="metricas">Métricas</TabsTrigger>
            <TabsTrigger value="fotos">Fotos</TabsTrigger>
            <TabsTrigger value="entrenamiento" disabled>Entrenamiento · pendiente</TabsTrigger>
            <TabsTrigger value="adherencia" disabled>Adherencia · pendiente</TabsTrigger>
            <TabsTrigger value="seguimiento" disabled>Seguimiento · pendiente</TabsTrigger>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="racha">Racha</TabsTrigger>
          </TabsList>
          </div>

          {/* Resumen Tab */}
          <TabsContent value="resumen" className="space-y-4 pt-2 sm:pt-3">
            <ProgressOverviewCards
              streak={clientData?.streak}
              weekSummary={weekSummary}
              isLoading={profileLoading || weekLoading}
            />
            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
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

          {/* Racha Tab */}
          <TabsContent value="racha">
            <StreakSection clientId={clientId} streak={clientData?.streak} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
