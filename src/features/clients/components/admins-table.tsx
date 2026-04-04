import { Pencil, ShieldCheck, Unlock, UserCheck, UserX } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { getUserDisplayName, ROLE_LABELS, type AdminUserListItem } from '../types'

interface AdminsTableProps {
  admins: AdminUserListItem[]
  currentUserId?: string
  onEdit: (admin: AdminUserListItem) => void
  onUnlock: (admin: AdminUserListItem) => void
  onChangeRole: (admin: AdminUserListItem) => void
  onToggleStatus: (admin: AdminUserListItem) => void
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function getInitials(admin: AdminUserListItem) {
  const firstName = admin.profile?.first_name?.[0] ?? ''
  const lastName = admin.profile?.last_name?.[0] ?? ''
  const initials = `${firstName}${lastName}`.trim().toUpperCase()

  return initials || admin.email.slice(0, 2).toUpperCase()
}

function getStatusBadgeClass(admin: AdminUserListItem) {
  if (admin.is_locked) {
    return 'border-status-error/30 bg-status-error/10 text-status-error'
  }

  if (admin.is_active) {
    return 'border-status-success/30 bg-status-success/10 text-status-success'
  }

  return 'border-border bg-muted text-muted-foreground'
}

function getStatusLabel(admin: AdminUserListItem) {
  if (admin.is_locked) {
    return 'Bloqueada'
  }

  return admin.is_active ? 'Activa' : 'Inactiva'
}

export function AdminsTable({
  admins,
  currentUserId,
  onEdit,
  onUnlock,
  onChangeRole,
  onToggleStatus,
}: AdminsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuario</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Fecha registro</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {admins.map((admin) => {
          const isOwnAccount = admin.id === currentUserId

          return (
            <TableRow key={admin.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border/60">
                    <AvatarImage src={admin.profile?.avatar_url ?? undefined} alt={getUserDisplayName(admin)} />
                    <AvatarFallback>{getInitials(admin)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-foreground">{getUserDisplayName(admin)}</p>
                      {isOwnAccount && (
                        <Badge variant="outline" className="border-brand-primary/30 bg-brand-soft/10 text-brand-primary">
                          Tú
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">Acceso al panel de administración</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{admin.email}</TableCell>
              <TableCell>
                <Badge variant="outline" className="border-brand-primary/30 bg-brand-soft/10 text-brand-primary">
                  {ROLE_LABELS[admin.role]}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn('font-medium', getStatusBadgeClass(admin))}>
                  {getStatusLabel(admin)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{dateFormatter.format(new Date(admin.created_at))}</TableCell>
              <TableCell>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(admin)}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  {admin.is_locked && (
                    <Button variant="outline" size="sm" onClick={() => onUnlock(admin)}>
                      <Unlock className="h-4 w-4" />
                      Desbloquear
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => onChangeRole(admin)} disabled={isOwnAccount}>
                    <ShieldCheck className="h-4 w-4" />
                    Cambiar rol
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onToggleStatus(admin)} disabled={isOwnAccount}>
                    {admin.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    {admin.is_active ? 'Dar de baja' : 'Reactivar'}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
