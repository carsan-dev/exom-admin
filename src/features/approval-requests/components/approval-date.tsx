import { NotificationDateTime } from '../../notifications/components/notification-date-time'
import { getRelativeApprovalDate } from '../types'

interface ApprovalDateProps {
  value: string
  /** Fecha absoluta y relativa en dos líneas en lugar de en línea. */
  stacked?: boolean
  className?: string
}

/** Fecha absoluta (`dd/mm/aaaa HH:mm`, hora local) junto a la relativa existente. */
export function ApprovalDate({ value, stacked = false, className }: ApprovalDateProps) {
  if (stacked) {
    return (
      <span className={className}>
        <NotificationDateTime value={value} />
        <span className="block text-xs text-muted-foreground">{getRelativeApprovalDate(value)}</span>
      </span>
    )
  }

  return (
    <span className={className}>
      <NotificationDateTime value={value} />
      <span aria-hidden="true"> · </span>
      <span>{getRelativeApprovalDate(value)}</span>
    </span>
  )
}
