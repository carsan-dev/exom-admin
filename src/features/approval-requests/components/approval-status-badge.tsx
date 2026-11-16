import { StatusChip } from '@/components/ui/status-chip'
import { APPROVAL_STATUS_LABELS, type ApprovalStatus } from '../types'

const STATUS_VARIANTS = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  FAILED: 'warning',
} as const

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  return <StatusChip variant={STATUS_VARIANTS[status]}>{APPROVAL_STATUS_LABELS[status]}</StatusChip>
}
