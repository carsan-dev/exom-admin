import { StatusChip } from '@/components/ui/status-chip'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tag } from '@/components/ui/tag'
import { getUserDisplayName, LEVEL_LABELS } from '../types'
import { ClientAssignedAdminsChip } from './client-assigned-admins-chip'
import { ClientRowActions } from './client-row-actions'
import type { ClientsListViewProps } from './clients-table'
import { formatRegistrationDate, getUserStatus } from './user-display'
import { UserIdentity } from './user-identity'

/** Tabla desde md; el email pasa a una línea bajo el nombre hasta lg. */
export function ClientsDesktopTable({ clients, currentUserRole, actionTriggerRef, ...actions }: ClientsListViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead className="hidden lg:table-cell">Email</TableHead>
          <TableHead>Nivel</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Admins</TableHead>
          <TableHead>Fecha registro</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => {
          const status = getUserStatus(client)

          return (
            <TableRow key={client.id}>
              <TableCell className="min-w-[15rem] max-w-[18rem]">
                <UserIdentity
                  user={client}
                  name={getUserDisplayName(client)}
                  subtitle={client.profile?.main_goal ?? 'Sin objetivo definido'}
                >
                  <p className="text-xs text-foreground-muted [overflow-wrap:anywhere] lg:hidden">{client.email}</p>
                </UserIdentity>
              </TableCell>
              <TableCell className="hidden min-w-[15rem] max-w-[16rem] text-foreground-secondary [overflow-wrap:anywhere] lg:table-cell">
                {client.email}
              </TableCell>
              <TableCell>
                {client.profile?.level ? (
                  <Tag>{LEVEL_LABELS[client.profile.level]}</Tag>
                ) : (
                  <span className="text-foreground-muted">Sin nivel</span>
                )}
              </TableCell>
              <TableCell>
                <StatusChip variant={status.variant}>{status.label}</StatusChip>
              </TableCell>
              <TableCell>
                <ClientAssignedAdminsChip client={client} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-foreground-secondary">
                {formatRegistrationDate(client.created_at)}
              </TableCell>
              <TableCell className="w-px whitespace-nowrap">
                <ClientRowActions
                  client={client}
                  currentUserRole={currentUserRole}
                  actionTriggerRef={actionTriggerRef}
                  className="justify-end"
                  {...actions}
                />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
