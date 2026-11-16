import { Badge } from '@/components/ui/badge'
import type { NotificationTemplate } from '../types'

export function DeliveryInfo({ template }: { template: NotificationTemplate }) {
  const delivery = template.delivery_info
  const typeLabel =
    delivery.type === 'schedule'
      ? 'Programada'
      : delivery.type === 'event'
        ? 'Por evento'
        : 'Manual'

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-brand-primary/20 bg-brand-soft/10 text-accent-text">
          {typeLabel}
        </Badge>
        <p className="text-sm font-medium text-foreground">{delivery.label}</p>
      </div>
      <p className="text-sm text-muted-foreground">{delivery.description}</p>
      {delivery.type === 'schedule' ? (
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
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
