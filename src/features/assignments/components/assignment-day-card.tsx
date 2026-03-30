import { Apple, Dumbbell, PauseCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AssignmentDay } from '../types'

const weekdayFormatter = new Intl.DateTimeFormat('es-ES', { weekday: 'short' })
const dayFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric' })
const monthFormatter = new Intl.DateTimeFormat('es-ES', { month: 'short' })

interface AssignmentDayCardProps {
  day: AssignmentDay
  isSelected: boolean
  disabled?: boolean
  variant?: 'week' | 'month'
  onSelect: (date: string) => void
}

function toDisplayDate(date: string) {
  return new Date(`${date}T00:00:00`)
}

function getBaseClassName(day: AssignmentDay, isSelected: boolean, variant: 'week' | 'month') {
  return cn(
    'text-left transition hover:border-brand-primary/40 disabled:pointer-events-none disabled:opacity-60',
    day.is_rest_day ? 'border-brand-primary/25 bg-brand-soft/5' : 'border-border/70 bg-card',
    isSelected && 'border-brand-primary bg-brand-soft/10 ring-2 ring-brand-primary/20',
    variant === 'week'
      ? 'flex h-full min-h-52 flex-col gap-4 rounded-2xl border p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md'
      : 'flex w-full min-h-40 flex-col gap-4 rounded-2xl border p-4 shadow-sm md:min-h-32 md:gap-3 md:p-3',
  )
}

export function AssignmentDayCard({
  day,
  isSelected,
  disabled = false,
  variant = 'week',
  onSelect,
}: AssignmentDayCardProps) {
  const displayDate = toDisplayDate(day.date)

  if (variant === 'month') {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(day.date)}
        className={getBaseClassName(day, isSelected, variant)}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {weekdayFormatter.format(displayDate)}
            </p>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-2xl font-semibold tracking-tight text-foreground">{dayFormatter.format(displayDate)}</span>
              <span className="pb-1 text-xs text-muted-foreground">{monthFormatter.format(displayDate)}</span>
            </div>
          </div>

          {isSelected && (
            <Badge variant="outline" className="border-brand-primary/30 bg-brand-soft/20 px-2 py-0 text-[10px] text-brand-primary">
              Selección
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {day.training && (
            <Badge variant="outline" className="gap-1 border-status-info/30 bg-status-info/10 px-2 py-0 text-[10px] text-status-info">
              <Dumbbell className="h-3 w-3" />
              Entreno
            </Badge>
          )}
          {day.diet && (
            <Badge variant="outline" className="gap-1 border-status-success/30 bg-status-success/10 px-2 py-0 text-[10px] text-status-success">
              <Apple className="h-3 w-3" />
              Dieta
            </Badge>
          )}
          {day.is_rest_day && (
            <Badge variant="outline" className="gap-1 border-brand-primary/30 bg-brand-soft/20 px-2 py-0 text-[10px] text-brand-primary">
              <PauseCircle className="h-3 w-3" />
              Descanso
            </Badge>
          )}
        </div>

        <div className="mt-auto space-y-1">
          {day.is_rest_day ? (
            <p className="text-xs font-medium text-foreground">Recuperación</p>
          ) : (
            <>
              <p className="line-clamp-1 text-xs font-medium text-foreground">{day.training?.name ?? 'Sin entreno'}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{day.diet?.name ?? 'Sin dieta'}</p>
            </>
          )}
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(day.date)}
      className={getBaseClassName(day, isSelected, variant)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {weekdayFormatter.format(displayDate)}
          </p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-semibold tracking-tight text-foreground">{dayFormatter.format(displayDate)}</span>
            <span className="pb-1 text-sm text-muted-foreground">{monthFormatter.format(displayDate)}</span>
          </div>
        </div>

        {isSelected && (
          <Badge variant="outline" className="border-brand-primary/30 bg-brand-soft/20 text-brand-primary">
            Seleccionado
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {day.training && (
          <Badge variant="outline" className="gap-1 border-status-info/30 bg-status-info/10 text-status-info">
            <Dumbbell className="h-3 w-3" />
            Entreno
          </Badge>
        )}
        {day.diet && (
          <Badge variant="outline" className="gap-1 border-status-success/30 bg-status-success/10 text-status-success">
            <Apple className="h-3 w-3" />
            Dieta
          </Badge>
        )}
        {day.is_rest_day && (
          <Badge variant="outline" className="gap-1 border-brand-primary/30 bg-brand-soft/20 text-brand-primary">
            <PauseCircle className="h-3 w-3" />
            Descanso
          </Badge>
        )}
      </div>

      <div className="flex-1 space-y-3">
        {day.is_rest_day ? (
          <div className="rounded-xl border border-brand-primary/20 bg-background/60 p-3">
            <p className="text-sm font-medium text-foreground">Día de descanso</p>
            <p className="mt-1 text-sm text-muted-foreground">
              El cliente verá el estado de recuperación para este día.
            </p>
          </div>
        ) : day.training || day.diet ? (
          <div className="space-y-3">
            {day.training && (
              <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Entrenamiento</p>
                <p className="mt-1 text-sm font-medium text-foreground">{day.training.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {day.training.estimated_duration_min ? `${day.training.estimated_duration_min} min` : 'Duración flexible'}
                </p>
              </div>
            )}

            {day.diet && (
              <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan nutricional</p>
                <p className="mt-1 text-sm font-medium text-foreground">{day.diet.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {day.diet.total_calories ? `${day.diet.total_calories} kcal` : 'Macros personalizadas'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3">
            <p className="text-sm font-medium text-foreground">Sin asignación</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Selecciona este día para planificar entrenamiento, dieta o descanso.
            </p>
          </div>
        )}
      </div>
    </button>
  )
}
