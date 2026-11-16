import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Streak } from '../../clients/types'
import type { WeekSummary } from '../types'

interface ProgressOverviewCardsProps {
  streak: Streak | null | undefined
  weekSummary: WeekSummary | null | undefined
  isLoading?: boolean
  onStreakSelect?: () => void
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })

export function ProgressOverviewCards({ streak, weekSummary, isLoading, onStreakSelect }: ProgressOverviewCardsProps) {
  if (isLoading) return <Skeleton className="h-40 w-full" />
  const weekEnd = weekSummary ? new Date(`${weekSummary.week_start}T12:00:00Z`) : null
  if (weekEnd) weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
  const observations = weekSummary ? [
    { label: 'Cumplimiento entrenamiento', value: weekSummary.training_days_assigned !== undefined && weekSummary.training_days_completed !== undefined
      ? (weekSummary.training_days_assigned > 0
        ? `${weekSummary.training_days_completed} de ${weekSummary.training_days_assigned} días con entrenamiento · ${Math.round(weekSummary.training_days_completed / weekSummary.training_days_assigned * 100)} %`
        : 'Sin entrenamientos asignados')
      : weekSummary.trainings_assigned > 0
      ? `${weekSummary.trainings_completed} de ${weekSummary.trainings_assigned} entrenamientos · ${Math.round(weekSummary.trainings_completed / weekSummary.trainings_assigned * 100)} %`
      : 'Sin entrenamientos asignados' },
    { label: 'Cumplimiento dieta', value: weekSummary.total_meals > 0
      ? `${weekSummary.meals_completed} de ${weekSummary.total_meals} comidas · ${Math.round(weekSummary.meals_completed / weekSummary.total_meals * 100)} %`
      : 'Sin comidas asignadas' },
  ] : []

  return <section aria-label="Resumen semanal" className="space-y-5">
    <div className="space-y-1">
      <h2 className="font-display text-xl font-extrabold uppercase leading-7 text-foreground">Actividad de la semana</h2>
      <p className="text-sm text-foreground-secondary">{weekSummary && weekEnd ? `Semana del ${weekSummary.week_start} al ${weekEnd.toISOString().slice(0, 10)} · UTC` : 'Resumen semanal no disponible'}</p>
      <p className="max-w-prose text-sm text-foreground-muted">Semana del día seleccionado, de lunes a domingo. Completados sobre asignados; no es el veredicto de Adherencia de siete días cerrados.</p>
    </div>
    <div className="grid overflow-hidden border-y border-border-strong lg:grid-cols-[2fr_1fr]">
      <dl className="grid sm:grid-cols-2">
        {observations.map(({ label, value }) => <div key={label} className="-ml-px -mt-px min-w-0 space-y-3 border-l border-t border-border px-5 pb-[18px] pt-4"><dt className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground-muted">{label}</dt><dd className="text-base font-semibold leading-6 tabular-nums text-foreground">{value}</dd></div>)}
      </dl>
      <div className="flex min-w-0 flex-col items-start gap-2 border-t border-border px-5 pb-[18px] pt-4 lg:border-l">
        <p className="text-base font-semibold leading-6 text-foreground">{streak ? `Racha actual: ${streak.current_days} días` : streak === null ? 'Sin racha registrada' : 'Racha no disponible'}</p>
        <p className="text-sm text-foreground-muted">Última actividad: {streak?.last_active_date ? dateFormatter.format(new Date(streak.last_active_date)) : 'Fecha no disponible'}</p>
        {onStreakSelect && <Button variant="outline" size="sm" onClick={onStreakSelect}>Ver racha</Button>}
      </div>
    </div>
  </section>
}
