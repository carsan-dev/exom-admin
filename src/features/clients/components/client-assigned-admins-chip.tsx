import { StatusChip } from '@/components/ui/status-chip'
import type { Client } from '../types'

export function ClientAssignedAdminsChip({ client }: { client: Client }) {
  const count = client.active_admins_count ?? 0

  if (count === 0) {
    return <StatusChip variant="warning">Sin admins</StatusChip>
  }

  return (
    <StatusChip variant="brand">
      {count} admin{count === 1 ? '' : 's'}
    </StatusChip>
  )
}
