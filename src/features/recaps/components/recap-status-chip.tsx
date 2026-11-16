import { StatusChip } from '@/components/ui/status-chip'
import type { RecapStatus } from '../types'

/** Estado del recap con los mismos textos que la insignia del detalle. */
export function RecapStatusChip({ status, archivedAt }: { status: RecapStatus; archivedAt?: string | null }) {
  if (archivedAt) return <StatusChip variant="neutral">Archivado</StatusChip>
  if (status === 'DRAFT') return <StatusChip variant="neutral">Borrador</StatusChip>
  if (status === 'SUBMITTED') return <StatusChip variant="warning">Por revisar</StatusChip>
  return <StatusChip variant="success">Revisado</StatusChip>
}
