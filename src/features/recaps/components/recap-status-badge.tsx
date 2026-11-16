import { Badge } from '@/components/ui/badge'
import type { RecapStatus } from '../types'

interface RecapStatusBadgeProps {
  status: RecapStatus
  archivedAt?: string | null
}

export function RecapStatusBadge({ status, archivedAt }: RecapStatusBadgeProps) {
  if (archivedAt) {
    return (
      <Badge variant="outline" className="border-border bg-status-neutral-soft text-foreground-secondary">
        Archivado
      </Badge>
    )
  }

  if (status === 'DRAFT') {
    return (
      <Badge variant="outline" className="border-border bg-status-neutral-soft text-foreground-secondary">
        Borrador
      </Badge>
    )
  }

  if (status === 'SUBMITTED') {
    return (
      <Badge variant="outline" className="border-status-warning/30 bg-status-warning-soft text-status-warning">
        Por revisar
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="border-status-success/30 bg-status-success-soft text-status-success">
      Revisado
    </Badge>
  )
}
