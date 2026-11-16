import { useEffect, useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { getApiErrorMessage, useUpdateNotificationTemplateSchedule } from '../api'
import {
  getScheduleDraft,
  mealTimeLabels,
  normalizeScheduleDraft,
  schedulesEqual,
  weekdayOptions,
  type ScheduleDraft,
} from '../template-helpers'
import type { NotificationTemplate } from '../types'

export function ScheduleEditor({ template }: { template: NotificationTemplate }) {
  const updateSchedule = useUpdateNotificationTemplateSchedule()
  const [draft, setDraft] = useState<ScheduleDraft>(() => getScheduleDraft(template))
  const delivery = template.delivery_info
  const kind = delivery.schedule_kind ?? 'daily'

  useEffect(() => {
    setDraft(getScheduleDraft(template))
  }, [template])

  const baseline = useMemo(
    () => normalizeScheduleDraft(template, getScheduleDraft(template)),
    [template],
  )
  const normalizedDraft = normalizeScheduleDraft(template, draft)
  const hasChanges = !schedulesEqual(normalizedDraft, baseline)
  useUnsavedChanges(`notification-schedule-${template.key}`, hasChanges || updateSchedule.isPending)
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

  const handleSave = async () => {
    const nextDraft = normalizeScheduleDraft(template, draft)

    if (!nextDraft.timezone) {
      toast.error('El huso horario es obligatorio')
      return
    }

    if (nextDraft.times.some((time) => !time)) {
      toast.error('Completa todas las horas')
      return
    }

    try {
      await updateSchedule.mutateAsync({
        key: template.key,
        values: {
          enabled: nextDraft.enabled,
          timezone: nextDraft.timezone,
          times: nextDraft.times,
          weekday: kind === 'weekly' ? nextDraft.weekday : null,
        },
      })
      toast.success('Horario actualizado')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido actualizar el horario'))
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-start gap-3">
        <input
          id={`schedule-enabled-${template.key}`}
          type="checkbox"
          checked={draft.enabled}
          onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
          disabled={updateSchedule.isPending}
          className="mt-1 h-4 w-4 rounded border-input"
        />
        <div className="space-y-1">
          <Label htmlFor={`schedule-enabled-${template.key}`}>Programación activa</Label>
          <p className="text-sm text-muted-foreground">
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
            disabled={updateSchedule.isPending}
            placeholder="Europe/Madrid"
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
              disabled={updateSchedule.isPending}
              className="flex h-10 w-full rounded-lg border border-input bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

      <div className={cn('grid gap-3', kind === 'meal_daily' ? 'sm:grid-cols-2' : 'sm:grid-cols-[220px]')}>
        {timeLabels.map((label, index) => (
          <div key={label} className="space-y-2">
            <Label htmlFor={`schedule-time-${template.key}-${index}`}>{label}</Label>
            <Input
              id={`schedule-time-${template.key}-${index}`}
              type="time"
              value={draft.times[index] ?? ''}
              onChange={(event) => handleTimeChange(index, event.target.value)}
              disabled={updateSchedule.isPending}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          El cambio se aplica en la siguiente comprobación del programador.
        </p>
        <Button type="button" onClick={handleSave} disabled={updateSchedule.isPending || !hasChanges}>
          <Save className="h-4 w-4" />
          {updateSchedule.isPending ? 'Guardando...' : 'Guardar horario'}
        </Button>
      </div>
    </div>
  )
}
