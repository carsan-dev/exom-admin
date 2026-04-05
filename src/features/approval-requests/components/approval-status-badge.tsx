import { AlertTriangle, CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { APPROVAL_STATUS_LABELS, type ApprovalStatus } from '../types'

function getStatusStyles(status: ApprovalStatus) {
  switch (status) {
    case 'PENDING':
      return {
        className: 'border-amber-500/20 bg-amber-500/10 text-amber-700',
        icon: Clock3,
      }
    case 'APPROVED':
      return {
        className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700',
        icon: CheckCircle2,
      }
    case 'REJECTED':
      return {
        className: 'border-rose-500/20 bg-rose-500/10 text-rose-700',
        icon: XCircle,
      }
    case 'FAILED':
      return {
        className: 'border-orange-500/20 bg-orange-500/10 text-orange-700',
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
