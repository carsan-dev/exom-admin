import { Apple, Check, Dumbbell, PauseCircle } from 'lucide-react'
import { StatusChip } from '@/components/ui/status-chip'
import { Tag } from '@/components/ui/tag'
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

const focusClassName =
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus'

function getBaseClassName(isSelected: boolean, variant: 'week' | 'month') {
  return cn(
    'relative w-full min-w-0 text-left transition-colors duration-(--dur-fast) ease-(--ease-out) disabled:pointer-events-none disabled:opacity-60',
    focusClassName,
    isSelected ? 'bg-lime-soft' : 'hover:bg-background-surface',
    variant === 'week'
      ? 'border-b border-border max-md:grid max-md:min-h-[72px] max-md:grid-cols-[64px_minmax(0,1fr)] md:flex md:min-h-[26rem] md:flex-col md:border-b md:border-l md:first:border-l-0'
      : 'border-b border-border max-md:grid max-md:min-h-14 max-md:grid-cols-[64px_minmax(0,1fr)_auto] max-md:items-start max-md:gap-y-0.5 max-md:py-2.5 md:flex md:h-[110px] md:flex-col md:gap-1 md:border-r md:px-2.5 md:py-2',
  )
}

function SelectionMark({ isSelected, label, className }: { isSelected: boolean; label: string; className?: string }) {
  return (
    <span
      aria-hidden={isSelected ? undefined : true}
      className={cn(
        'grid size-[18px] flex-none place-items-center border border-control-border text-transparent transition-colors duration-(--dur-fast) ease-(--ease-out)',
        isSelected && 'border-primary bg-primary text-primary-foreground',
        className,
      )}
    >
      {isSelected && (
        <>
          <Check aria-hidden="true" className="size-3.5" />
          <span className="sr-only">{label}</span>
        </>
      )}
    </span>
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
  const trainings = day.trainings ?? (day.training ? [day.training] : [])
  const retiredTrainings = trainings.filter((training) => training.is_active === false)

  if (variant === 'month') {
    return (
      <button
        type="button"
        aria-pressed={isSelected}
        disabled={disabled}
        onClick={() => onSelect(day.date)}
        className={getBaseClassName(isSelected, variant)}
      >
        <div className="flex items-center gap-1.5 max-md:contents">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground-muted max-md:col-start-1 max-md:row-start-1 md:hidden">
            {weekdayFormatter.format(displayDate)}
          </p>
          <p className="flex items-baseline gap-1 max-md:col-start-1 max-md:row-start-2 max-md:pt-0.5">
            <span className="font-display text-[22px] font-extrabold leading-none tabular-nums text-foreground md:text-[13px] md:font-semibold md:font-sans">
              {dayFormatter.format(displayDate)}
            </span>
            <span className="sr-only">{monthFormatter.format(displayDate)}</span>
          </p>
          <div className="flex items-center gap-1 text-foreground-muted md:ml-auto max-md:col-start-3 max-md:row-start-1 max-md:pl-2">
            {trainings.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Dumbbell aria-hidden="true" className="size-3.5" />
                <span className="sr-only">
                  {trainings.length} entreno{trainings.length === 1 ? '' : 's'}
                </span>
              </span>
            )}
            {retiredTrainings.length > 0 && (
              <span className="sr-only">
                {retiredTrainings.length} retirado{retiredTrainings.length === 1 ? '' : 's'}
              </span>
            )}
            {day.diet && (
              <span className="inline-flex items-center gap-1">
                <Apple aria-hidden="true" className="size-3.5" />
                <span className="sr-only">Dieta</span>
              </span>
            )}
            {day.is_rest_day && (
              <span className="inline-flex items-center gap-1">
                <PauseCircle aria-hidden="true" className="size-3.5" />
                <span className="sr-only">Descanso</span>
              </span>
            )}
          </div>
          {isSelected && (
            <SelectionMark
              isSelected
              label="Selección"
              className="size-4 md:ml-0 max-md:col-start-3 max-md:row-start-2 max-md:mt-1 max-md:justify-self-end"
            />
          )}
        </div>

        <div className="min-w-0 space-y-0.5 max-md:col-start-2 max-md:row-start-1 max-md:row-span-2">
          {day.is_rest_day ? (
            <p className="text-xs leading-4 font-medium text-foreground">Recuperación</p>
          ) : (
            <>
              <p className="line-clamp-2 text-xs leading-4 font-medium text-foreground">{trainings.map((training) => `${training.name}${training.is_active === false ? ' (retirado)' : ''}`).join(' · ') || 'Sin entreno'}</p>
              <p className="truncate text-xs leading-4 text-foreground-muted">{day.diet?.name ?? 'Sin dieta'}</p>
            </>
          )}
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      disabled={disabled}
      onClick={() => onSelect(day.date)}
      className={getBaseClassName(isSelected, variant)}
    >
      <div className="flex items-start justify-between gap-2 px-3 pt-3.5 pb-3 max-md:flex-col max-md:items-start max-md:justify-start max-md:gap-1.5 max-md:px-0.5 md:border-b md:border-border max-lg:md:px-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground-muted">
            {weekdayFormatter.format(displayDate)}
          </p>
          <p className="mt-1.5 flex items-baseline gap-1.5 max-md:mt-1">
            <span className="font-display text-[28px] font-extrabold leading-[0.9] tabular-nums text-foreground max-lg:md:text-2xl">
              {dayFormatter.format(displayDate)}
            </span>
            <span className="text-xs text-foreground-muted">{monthFormatter.format(displayDate)}</span>
          </p>
        </div>

        {isSelected && (
          <span className="inline-flex items-center max-md:order-3">
            <SelectionMark isSelected label="Seleccionado" />
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-2 pb-3 max-md:pr-2 md:px-3 max-lg:md:px-2">
        <div className="flex flex-wrap gap-1.5">
          {trainings.length > 0 && (
            <StatusChip variant="info" dot={false} className="gap-1">
              <Dumbbell aria-hidden="true" className="size-3" />
              {trainings.length} entreno{trainings.length === 1 ? '' : 's'}
            </StatusChip>
          )}
          {retiredTrainings.length > 0 && (
            <StatusChip variant="warning" dot={false} className="gap-1">
              {retiredTrainings.length} retirado{retiredTrainings.length === 1 ? '' : 's'}
            </StatusChip>
          )}
          {day.diet && (
            <StatusChip variant="success" dot={false} className="gap-1">
              <Apple aria-hidden="true" className="size-3" />
              Dieta
            </StatusChip>
          )}
          {day.is_rest_day && (
            <StatusChip variant="brand" dot={false} className="gap-1">
              <PauseCircle aria-hidden="true" className="size-3" />
              Descanso
            </StatusChip>
          )}
        </div>

        {day.is_rest_day ? (
          <div className="flex flex-1 flex-col justify-center border-t border-border pt-3 max-md:justify-start">
            <p className="text-[13px] font-semibold text-foreground">Día de descanso</p>
            <p className="mt-1 text-xs leading-4 text-foreground-muted">
              El cliente verá el estado de recuperación para este día.
            </p>
          </div>
        ) : trainings.length > 0 || day.diet ? (
          <div className="min-w-0 divide-y divide-border border-t border-border">
            {trainings.length > 0 && (
              <div className="py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground-muted max-lg:md:text-[10px] max-lg:md:tracking-[0.04em]">Entrenamiento</p>
                <div className="mt-1.5 space-y-1">
                  {trainings.map((training, index) => (
                    <p key={training.id} className="flex flex-wrap items-baseline gap-x-1.5 text-[13px] leading-[18px] font-semibold text-foreground">
                      <span>{index + 1}. {training.name}</span>
                      {training.is_active === false && (
                        <Tag className="h-[18px] border-status-warning px-1.5 text-[11px] text-status-warning">
                          Retirado
                        </Tag>
                      )}
                      <span className="text-xs font-normal text-foreground-muted">
                        {training.estimated_duration_min ? `${training.estimated_duration_min} min` : 'Flexible'}
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {day.diet && (
              <div className="py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground-muted max-lg:md:text-[10px] max-lg:md:tracking-[0.04em]">Plan nutricional</p>
                <p className="mt-1.5 text-[13px] leading-[18px] text-foreground">{day.diet.name}</p>
                <p className="text-xs leading-4 tabular-nums text-foreground-muted">
                  {day.diet.total_calories ? `${day.diet.total_calories} kcal` : 'Macros personalizadas'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-center border border-dashed border-border-strong p-3 max-md:flex-none">
            <p className="text-[13px] font-semibold text-foreground">Sin asignación</p>
            <p className="mt-1 text-xs leading-4 text-foreground-muted">
              Selecciona este día para planificar entrenamiento, dieta o descanso.
            </p>
          </div>
        )}
      </div>
    </button>
  )
}
