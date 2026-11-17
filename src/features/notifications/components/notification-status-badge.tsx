import { StatusChip } from '@/components/ui/status-chip'
import type { NotificationStatus } from '../types'

interface NotificationStatusBadgeProps {
  status: NotificationStatus
}

export function NotificationStatusBadge({ status }: NotificationStatusBadgeProps) {
  if (status === 'FAILED') {
    return <StatusChip variant="danger">Fallida</StatusChip>
  }

  return <StatusChip variant="success">Enviada</StatusChip>
}
