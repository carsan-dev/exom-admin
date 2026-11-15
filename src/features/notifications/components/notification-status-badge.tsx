import { Badge } from '@/components/ui/badge'
import type { NotificationStatus } from '../types'

interface NotificationStatusBadgeProps {
  status: NotificationStatus
}

export function NotificationStatusBadge({ status }: NotificationStatusBadgeProps) {
  if (status === 'FAILED') {
    return (
      <Badge variant="outline" className="border-status-error/40 bg-status-error/10 text-status-error">
        Fallida
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="border-status-success/30 bg-status-success-soft text-status-success">
      Enviada
    </Badge>
  )
}
