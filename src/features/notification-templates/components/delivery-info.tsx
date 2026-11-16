import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { NotificationTemplate } from '../types'

export function DeliveryInfo({ template }: { template: NotificationTemplate }) {
  const delivery = template.delivery_info
  const typeLabel =
    delivery.type === 'schedule'
      ? 'Programada'
      : delivery.type === 'event'
        ? 'Por evento'
        : 'Manual'

  // La etiqueta del API suele repetir el tipo («Manual», «Programada»): solo se oculta a la vista, el texto se conserva.
  const isLabelRedundant = delivery.label.trim().toLowerCase() === typeLabel.toLowerCase()

  return (
    <div className="space-y-3 border border-border bg-background-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="rounded-none border-accent-line/40 bg-lime-soft text-accent-text">
          {typeLabel}
        </Badge>
        <p className={cn('text-sm font-medium text-foreground', isLabelRedundant && 'sr-only')}>{delivery.label}</p>
      </div>
      <p className="text-[13px] leading-5 text-foreground-secondary">{delivery.description}</p>
      {delivery.type === 'schedule' ? (
        <div className="grid gap-2 text-xs text-foreground-secondary sm:grid-cols-2">
          <p>
            Estado horario:{' '}
            <span className="font-medium text-foreground">
              {delivery.schedule_enabled === false ? 'Pausado' : 'Activo'}
            </span>
          </p>
          <p>
            Huso horario: <span className="font-medium text-foreground">{delivery.timezone ?? 'Europe/Madrid'}</span>
          </p>
          {delivery.cron ? (
            <p>
              Cron: <span className="font-mono text-foreground">{delivery.cron}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
