import { Eye, ShieldCheck, Unlock, Users } from 'lucide-react'
import { Link } from 'react-router'
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
import { getUserDisplayName, LEVEL_LABELS, type Client, type Role } from '../types'

interface ClientsTableProps {
  clients: Client[]
  currentUserRole: Role
  onUnlock: (client: Client) => void
  onChangeRole: (client: Client) => void
  onManageAssignments: (client: Client) => void
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function getInitials(client: Client) {
  const firstName = client.profile?.first_name?.[0] ?? ''
  const lastName = client.profile?.last_name?.[0] ?? ''
  const initials = `${firstName}${lastName}`.trim().toUpperCase()

  return initials || client.email.slice(0, 2).toUpperCase()
}

function getStatusBadgeClass(client: Client) {
  if (client.is_locked) {
    return 'border-status-error/30 bg-status-error/10 text-status-error'
  }

  if (client.is_active) {
    return 'border-status-success/30 bg-status-success/10 text-status-success'
  }

  return 'border-border bg-muted text-muted-foreground'
}

function getStatusLabel(client: Client) {
  if (client.is_locked) {
    return 'Bloqueada'
  }

  return client.is_active ? 'Activa' : 'Inactiva'
}

export function ClientsTable({
  clients,
  currentUserRole,
  onUnlock,
  onChangeRole,
  onManageAssignments,
}: ClientsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Nivel</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Fecha registro</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border/60">
                  <AvatarImage src={client.profile?.avatar_url ?? undefined} alt={getUserDisplayName(client)} />
                  <AvatarFallback>{getInitials(client)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{getUserDisplayName(client)}</p>
                  <p className="truncate text-sm text-muted-foreground">{client.profile?.main_goal ?? 'Sin objetivo definido'}</p>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">{client.email}</TableCell>
            <TableCell>
              {client.profile?.level ? (
                <Badge variant="outline" className="border-brand-soft/40 bg-brand-soft/10 text-brand-primary">
                  {LEVEL_LABELS[client.profile.level]}
                </Badge>
              ) : (
                <span className="text-muted-foreground">Sin nivel</span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={cn('font-medium', getStatusBadgeClass(client))}>
                {getStatusLabel(client)}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{dateFormatter.format(new Date(client.created_at))}</TableCell>
            <TableCell>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/clients/${client.id}`}>
                    <Eye className="h-4 w-4" />
                    Ver perfil
                  </Link>
                </Button>
                {client.is_locked && (
                  <Button variant="outline" size="sm" onClick={() => onUnlock(client)}>
                    <Unlock className="h-4 w-4" />
                    Desbloquear
                  </Button>
                )}
                {currentUserRole === 'SUPER_ADMIN' && (
                  <Button variant="outline" size="sm" onClick={() => onManageAssignments(client)}>
                    <Users className="h-4 w-4" />
                    Gestionar admins
                  </Button>
                )}
                {currentUserRole === 'SUPER_ADMIN' && (
                  <Button variant="outline" size="sm" onClick={() => onChangeRole(client)}>
                    <ShieldCheck className="h-4 w-4" />
                    Cambiar rol
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
