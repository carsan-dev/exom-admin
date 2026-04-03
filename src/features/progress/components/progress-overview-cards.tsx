import { CalendarClock, Flame, Salad, Dumbbell } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Streak } from '../../clients/types'
import type { WeekSummary } from '../types'

interface ProgressOverviewCardsProps {
  streak: Streak | null | undefined
  weekSummary: WeekSummary | null | undefined
  isLoading?: boolean
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

export function ProgressOverviewCards({
  streak,
  weekSummary,
  isLoading,
}: ProgressOverviewCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const trainingPct =
    weekSummary && weekSummary.trainings_assigned > 0
      ? Math.round((weekSummary.trainings_completed / weekSummary.trainings_assigned) * 100)
      : null

  const dietPct =
    weekSummary && weekSummary.total_meals > 0
      ? Math.round((weekSummary.meals_completed / weekSummary.total_meals) * 100)
      : null

  const cards = [
    {
      label: 'Racha actual',
      value: streak ? `${streak.current_days} días` : '—',
      icon: Flame,
      accent: 'text-status-warning',
    },
    {
      label: 'Última actividad',
      value: streak?.last_active_date
        ? dateFormatter.format(new Date(streak.last_active_date))
        : '—',
      icon: CalendarClock,
      accent: 'text-status-info',
    },
    {
      label: 'Cumplimiento entrenamiento',
      value:
        weekSummary && weekSummary.trainings_assigned > 0
          ? `${weekSummary.trainings_completed}/${weekSummary.trainings_assigned} (${trainingPct}%)`
          : '—',
      icon: Dumbbell,
      accent: 'text-brand-primary',
    },
    {
      label: 'Cumplimiento dieta',
      value:
        weekSummary && weekSummary.total_meals > 0
          ? `${weekSummary.meals_completed}/${weekSummary.total_meals} (${dietPct}%)`
          : '—',
      icon: Salad,
      accent: 'text-status-success',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                <Icon className={`h-4 w-4 ${card.accent}`} />
                {card.label}
              </div>
              <p className="text-2xl font-semibold text-foreground">{card.value}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
