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
  onSelect: (date: string) => void
}

function toDisplayDate(date: string) {
  return new Date(`${date}T00:00:00`)
}

export function AssignmentDayCard({ day, isSelected, disabled = false, onSelect }: AssignmentDayCardProps) {
  const displayDate = toDisplayDate(day.date)

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(day.date)}
      className={cn(
        'flex h-full min-h-52 flex-col gap-4 rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary/40 hover:shadow-md disabled:pointer-events-none disabled:opacity-60',
        day.is_rest_day ? 'border-brand-primary/25 bg-brand-soft/5' : 'border-border/70 bg-card',
        isSelected && 'border-brand-primary bg-brand-soft/10 ring-2 ring-brand-primary/20',
      )}
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
            <p className="text-sm font-medium text-foreground">Dia de descanso</p>
            <p className="mt-1 text-sm text-muted-foreground">
              El cliente vera el estado de recuperacion para este dia.
            </p>
          </div>
        ) : day.training || day.diet ? (
          <div className="space-y-3">
            {day.training && (
              <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Entrenamiento</p>
                <p className="mt-1 text-sm font-medium text-foreground">{day.training.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {day.training.estimated_duration_min ? `${day.training.estimated_duration_min} min` : 'Duracion flexible'}
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
            <p className="text-sm font-medium text-foreground">Sin asignacion</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Selecciona este dia para planificar entrenamiento, dieta o descanso.
            </p>
          </div>
        )}
      </div>
    </button>
  )
}
