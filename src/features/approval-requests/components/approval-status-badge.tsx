import { AlertTriangle, CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { APPROVAL_STATUS_LABELS, type ApprovalStatus } from '../types'

function getStatusStyles(status: ApprovalStatus) {
  switch (status) {
    case 'PENDING':
      return {
        className: 'border-status-warning/30 bg-status-warning-soft text-status-warning',
        icon: Clock3,
      }
    case 'APPROVED':
      return {
        className: 'border-status-success/30 bg-status-success-soft text-status-success',
        icon: CheckCircle2,
      }
    case 'REJECTED':
      return {
        className: 'border-status-error/30 bg-status-error-soft text-status-error',
        icon: XCircle,
      }
    case 'FAILED':
      return {
        className: 'border-status-warning/30 bg-status-warning-soft text-status-warning',
        icon: AlertTriangle,
      }
  }
}

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const { className, icon: Icon } = getStatusStyles(status)

  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', className)}>
      <Icon className="h-3.5 w-3.5" />
      {APPROVAL_STATUS_LABELS[status]}
    </Badge>
  )
}
