import { AlertTriangle, CalendarDays, Globe, Target, WandSparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ChallengeSummary } from '../types'

interface ChallengesStatsCardsProps {
  summary?: ChallengeSummary
  isLoading: boolean
  isError: boolean
  isFetching: boolean
  onRetry: () => void
}

export function ChallengesStatsCards({ summary, isLoading, isError, isFetching, onRetry }: ChallengesStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
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
              Reintenta para recuperar el total, los retos semanales, los automaticos y el alcance global.
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

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Retos semanales</CardTitle>
          <CalendarDays className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-amber-600">{summary?.weekly ?? 0}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Objetivos principales</CardTitle>
          <Target className="h-4 w-4 text-brand-primary" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-foreground">{summary?.main_goal ?? 0}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Retos automáticos</CardTitle>
          <WandSparkles className="h-4 w-4 text-violet-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-violet-600">{summary?.automatic ?? 0}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Alcance global</CardTitle>
          <Globe className="h-4 w-4 text-sky-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-sky-600">{summary?.global ?? 0}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total retos</CardTitle>
          <Target className="h-4 w-4 text-status-success" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-status-success">{summary?.total ?? 0}</p>
        </CardContent>
      </Card>
    </div>
  )
}
