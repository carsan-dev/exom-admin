import { StatusChip } from '@/components/ui/status-chip'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tag } from '@/components/ui/tag'
import { getUserDisplayName, ROLE_LABELS } from '../types'
import { AdminRowActions } from './admin-row-actions'
import type { AdminsListViewProps } from './admins-table'
import { formatRegistrationDate, getUserStatus } from './user-display'
import { UserIdentity } from './user-identity'

/** Tabla desde md; el email pasa a una línea bajo el nombre hasta lg. */
export function AdminsDesktopTable({ admins, currentUserId, ...actions }: AdminsListViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuario</TableHead>
          <TableHead className="hidden lg:table-cell">Email</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Fecha registro</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {admins.map((admin) => {
          const isOwnAccount = admin.id === currentUserId
          const status = getUserStatus(admin)

          return (
            <TableRow key={admin.id}>
              <TableCell className="min-w-[15rem] max-w-[18rem]">
                <UserIdentity
                  user={admin}
                  name={getUserDisplayName(admin)}
                  subtitle="Acceso al panel de administración"
                  badge={isOwnAccount ? <StatusChip variant="brand" dot={false}>Tú</StatusChip> : undefined}
                >
                  <p className="text-xs text-foreground-muted [overflow-wrap:anywhere] lg:hidden">{admin.email}</p>
                </UserIdentity>
              </TableCell>
              <TableCell className="hidden min-w-[15rem] max-w-[16rem] text-foreground-secondary [overflow-wrap:anywhere] lg:table-cell">
                {admin.email}
              </TableCell>
              <TableCell>
                <Tag>{ROLE_LABELS[admin.role]}</Tag>
              </TableCell>
              <TableCell>
                <StatusChip variant={status.variant}>{status.label}</StatusChip>
              </TableCell>
              <TableCell className="whitespace-nowrap text-foreground-secondary">
                {formatRegistrationDate(admin.created_at)}
              </TableCell>
              <TableCell>
                <AdminRowActions admin={admin} isOwnAccount={isOwnAccount} className="justify-end" {...actions} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
