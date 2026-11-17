import { CheckCircle2 } from 'lucide-react'
import type { NotificationStatus } from '../types'
import { NotificationStatusBadge } from './notification-status-badge'

export function NotificationStatusCell({ status }: { status: NotificationStatus }) {
  return (
    <div className="space-y-2">
      <NotificationStatusBadge status={status} />
      {status === 'SENT' && (
        <div className="flex items-center gap-1.5 text-xs text-status-success">
          <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
          Registrada
        </div>
      )}
    </div>
  )
}
