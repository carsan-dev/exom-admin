import type { Dispatch, SetStateAction } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { mealTimeLabels, weekdayOptions, type ScheduleDraft } from '../template-helpers'
import type { NotificationTemplate } from '../types'

interface ScheduleEditorProps {
  template: NotificationTemplate
  draft: ScheduleDraft
  setDraft: Dispatch<SetStateAction<ScheduleDraft>>
  disabled: boolean
}

/** Schedule fields of the selected template. The draft and its save live in the page (single save). */
export function ScheduleEditor({ template, draft, setDraft, disabled }: ScheduleEditorProps) {
  const delivery = template.delivery_info
  const kind = delivery.schedule_kind ?? 'daily'
  const timeLabels = kind === 'meal_daily' ? mealTimeLabels : ['Hora']

  if (delivery.type !== 'schedule') {
    return null
  }

  const handleTimeChange = (index: number, value: string) => {
    setDraft((current) => {
      const nextTimes = [...current.times]
      nextTimes[index] = value
      return { ...current, times: nextTimes }
    })
  }

  return (
    <div className="space-y-4 border border-border bg-background-surface p-4">
      <div className="flex items-start gap-3 max-md:min-h-11">
        <input
          id={`schedule-enabled-${template.key}`}
          type="checkbox"
          checked={draft.enabled}
          onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
          disabled={disabled}
          className="mt-0.5 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus max-md:size-6"
        />
        <div className="space-y-1">
          <Label htmlFor={`schedule-enabled-${template.key}`}>Programación activa</Label>
          <p className="text-[13px] leading-5 text-foreground-secondary">
            Si está pausada, el horario no se ejecuta aunque el texto de la plantilla siga activo.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`schedule-timezone-${template.key}`}>Huso horario</Label>
          <Input
            id={`schedule-timezone-${template.key}`}
            value={draft.timezone}
            onChange={(event) => setDraft((current) => ({ ...current, timezone: event.target.value }))}
            disabled={disabled}
            placeholder="Europe/Madrid"
            className="max-md:h-11"
          />
        </div>

        {kind === 'weekly' ? (
          <div className="space-y-2">
            <Label htmlFor={`schedule-weekday-${template.key}`}>Día de la semana</Label>
            <select
              id={`schedule-weekday-${template.key}`}
              value={draft.weekday}
              onChange={(event) =>
                setDraft((current) => ({ ...current, weekday: Number(event.target.value) }))
              }
              disabled={disabled}
              className="flex h-10 w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground transition-[border-color,background-color] duration-(--dur-fast) ease-(--ease-out) hover:border-control-border-hover focus-visible:border-focus focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-muted-foreground max-md:h-11"
            >
              {weekdayOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className={cn('grid gap-3', kind === 'meal_daily' ? 'grid-cols-2 md:grid-cols-4' : 'sm:grid-cols-[220px]')}>
        {timeLabels.map((label, index) => (
          <div key={label} className="space-y-2">
            <Label htmlFor={`schedule-time-${template.key}-${index}`}>{label}</Label>
            <Input
              id={`schedule-time-${template.key}-${index}`}
              type="time"
              value={draft.times[index] ?? ''}
              onChange={(event) => handleTimeChange(index, event.target.value)}
              disabled={disabled}
              className="max-md:h-11"
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-foreground-muted">
        El cambio se aplica en la siguiente comprobación del programador.
      </p>
    </div>
  )
}
