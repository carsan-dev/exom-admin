import { AlertTriangle, Award, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { AchievementSummary } from '../types'
import { CRITERIA_TYPE_LABELS } from '../types'

interface AchievementsStatsCardsProps {
  summary?: AchievementSummary
  isLoading: boolean
  isError: boolean
  isFetching: boolean
  onRetry: () => void
}

export function AchievementsStatsCards({ summary, isLoading, isError, isFetching, onRetry }: AchievementsStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <Card className="border-status-error/30">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base">No se pudo cargar el resumen</CardTitle>
            <p className="text-sm text-muted-foreground">
              Reintenta para recuperar el total de logros y la distribución por tipo de criterio.
            </p>
          </div>
          <AlertTriangle className="h-5 w-5 text-status-error" />
        </CardHeader>
        <CardContent>
          <Button size="sm" variant="outline" onClick={onRetry} disabled={isFetching}>
            {isFetching ? 'Reintentando...' : 'Reintentar'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const criteriaEntries = Object.entries(summary?.criteria_types ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total logros</CardTitle>
          <Trophy className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-amber-600">{summary?.total ?? 0}</p>
        </CardContent>
      </Card>

      {criteriaEntries.map(([type, count]) => (
        <Card key={type}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {CRITERIA_TYPE_LABELS[type] ?? type}
            </CardTitle>
            <Award className="h-4 w-4 text-brand-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{count}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
