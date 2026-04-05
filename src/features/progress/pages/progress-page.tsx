import { useSearchParams } from 'react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState } from 'react'
import { ClientSelector, EmptyClientState } from '../components/client-selector'
import { ProgressOverviewCards } from '../components/progress-overview-cards'
import { ProgressCalendar } from '../components/progress-calendar'
import { DayProgressDetail } from '../components/day-progress-detail'
import { MetricsCharts } from '../components/metrics-charts'
import { MetricsTable } from '../components/metrics-table'
import { StreakSection } from '../components/streak-section'
import {
  useClientCalendarMonth,
  useClientDayProgress,
  useClientWeekSummary,
} from '../api'
import { useClientProfile } from '../../clients/api'
import type { BodyField } from '../types'

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

  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1)
  const [metricsPage, setMetricsPage] = useState(1)
  const [selectedBodyField, setSelectedBodyField] = useState<BodyField>('weight_kg')

  const weekStart = getWeekStart(selectedDate)

  const { data: clientData, isLoading: profileLoading } = useClientProfile(clientId || undefined)
  const { data: calendarData, isLoading: calendarLoading } = useClientCalendarMonth(
    clientId,
    calYear,
    calMonth,
  )
  const { data: dayProgress, isLoading: dayLoading } = useClientDayProgress(clientId, selectedDate)
  const { data: weekSummary, isLoading: weekLoading } = useClientWeekSummary(clientId, weekStart)

  function handleClientSelect(id: string) {
    setSearchParams({ clientId: id, date: getTodayStr() })
  }

  function handleDateSelect(date: string) {
    setSearchParams({ clientId, date })
  }

  function handleMonthChange(year: number, month: number) {
    setCalYear(year)
    setCalMonth(month)
  }

  return (
    <div className="space-y-6">
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
        <Tabs defaultValue="resumen" className="space-y-4">
          <TabsList>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="metricas">Métricas</TabsTrigger>
            <TabsTrigger value="racha">Racha</TabsTrigger>
          </TabsList>

          {/* Resumen Tab */}
          <TabsContent value="resumen" className="space-y-4">
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
                date={selectedDate}
                progress={dayProgress}
                isLoading={dayLoading}
              />
            </div>
          </TabsContent>

          {/* Métricas Tab */}
          <TabsContent value="metricas" className="space-y-4">
            <MetricsCharts
              clientId={clientId}
              selectedField={selectedBodyField}
              onFieldChange={setSelectedBodyField}
            />
            <MetricsTable
              clientId={clientId}
              page={metricsPage}
              onPageChange={setMetricsPage}
            />
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
