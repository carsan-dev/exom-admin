import { Badge } from '@/components/ui/badge'
import { DELIVERY_STATUS_LABELS } from '../labels'
import type { DeliveryStatus } from '../types'

const STATUS_CLASSES: Record<DeliveryStatus, string> = {
  PENDING: 'border-amber-400 bg-amber-50 text-amber-700',
  SENT: 'border-green-400 bg-green-50 text-green-700',
  FAILED: 'border-status-error/40 bg-status-error/10 text-status-error',
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus | null }) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Sin envíos
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={STATUS_CLASSES[status]}>
      {DELIVERY_STATUS_LABELS[status]}
    </Badge>
  )
}
