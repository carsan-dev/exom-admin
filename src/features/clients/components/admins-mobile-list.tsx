import { StatusChip } from '@/components/ui/status-chip'
import { Tag } from '@/components/ui/tag'
import { getUserDisplayName, ROLE_LABELS } from '../types'
import { AdminRowActions } from './admin-row-actions'
import type { AdminsListViewProps } from './admins-table'
import { formatRegistrationDate, getUserStatus } from './user-display'
import { UserIdentity } from './user-identity'

/** Filas apiladas por debajo de md; mismos datos y acciones que la tabla. */
export function AdminsMobileList({ admins, currentUserId, ...actions }: AdminsListViewProps) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {admins.map((admin) => {
        const isOwnAccount = admin.id === currentUserId
        const status = getUserStatus(admin)

        return (
          <li key={admin.id} className="space-y-3 py-4">
            <UserIdentity
              user={admin}
              name={getUserDisplayName(admin)}
              subtitle="Acceso al panel de administración"
              badge={isOwnAccount ? <StatusChip variant="brand" dot={false}>Tú</StatusChip> : undefined}
            >
              <p className="text-xs text-foreground-muted [overflow-wrap:anywhere]">{admin.email}</p>
            </UserIdentity>
            <div className="flex flex-wrap items-center gap-2">
              <Tag>{ROLE_LABELS[admin.role]}</Tag>
              <StatusChip variant={status.variant}>{status.label}</StatusChip>
            </div>
            <p className="text-xs text-foreground-muted">{formatRegistrationDate(admin.created_at)}</p>
            <AdminRowActions admin={admin} isOwnAccount={isOwnAccount} {...actions} />
          </li>
        )
      })}
    </ul>
  )
}
