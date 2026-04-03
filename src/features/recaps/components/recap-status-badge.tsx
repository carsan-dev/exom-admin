import { Badge } from '@/components/ui/badge'
import type { RecapStatus } from '../types'

interface RecapStatusBadgeProps {
  status: RecapStatus
  archivedAt?: string | null
}

export function RecapStatusBadge({ status, archivedAt }: RecapStatusBadgeProps) {
  if (archivedAt) {
    return (
      <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">
        Archivado
      </Badge>
    )
  }

  if (status === 'DRAFT') {
    return (
      <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">
        Borrador
      </Badge>
    )
  }

  if (status === 'SUBMITTED') {
    return (
      <Badge variant="outline" className="border-yellow-400 bg-yellow-50 text-yellow-700">
        Por revisar
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="border-green-400 bg-green-50 text-green-700">
      Revisado
    </Badge>
  )
}
