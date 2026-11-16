import { StatusChip } from '@/components/ui/status-chip'
import { Tag } from '@/components/ui/tag'
import { getUserDisplayName, LEVEL_LABELS } from '../types'
import { ClientAssignedAdminsChip } from './client-assigned-admins-chip'
import { ClientRowActions } from './client-row-actions'
import type { ClientsListViewProps } from './clients-table'
import { formatRegistrationDate, getUserStatus } from './user-display'
import { UserIdentity } from './user-identity'

/** Filas apiladas por debajo de md; mismos datos y acciones que la tabla. */
export function ClientsMobileList({ clients, currentUserRole, actionTriggerRef, ...actions }: ClientsListViewProps) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {clients.map((client) => {
        const status = getUserStatus(client)

        return (
          <li key={client.id} className="space-y-3 py-4">
            <UserIdentity
              user={client}
              name={getUserDisplayName(client)}
              subtitle={client.profile?.main_goal ?? 'Sin objetivo definido'}
            >
              <p className="text-xs text-foreground-muted [overflow-wrap:anywhere]">{client.email}</p>
            </UserIdentity>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip variant={status.variant}>{status.label}</StatusChip>
              <ClientAssignedAdminsChip client={client} />
              {client.profile?.level ? (
                <Tag>{LEVEL_LABELS[client.profile.level]}</Tag>
              ) : (
                <span className="text-xs text-foreground-muted">Sin nivel</span>
              )}
            </div>
            <p className="text-xs text-foreground-muted">{formatRegistrationDate(client.created_at)}</p>
            <ClientRowActions
              client={client}
              currentUserRole={currentUserRole}
              actionTriggerRef={actionTriggerRef}
              {...actions}
            />
          </li>
        )
      })}
    </ul>
  )
}
