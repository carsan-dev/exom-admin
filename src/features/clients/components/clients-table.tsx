import { Archive, ArchiveRestore, Eye, MoreHorizontal, ShieldCheck, Trash2, Unlock, UserCheck, UserX, Users } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { getClientDetailRoute, getUserDisplayName, LEVEL_LABELS, type Client, type Role } from '../types'

interface ClientsTableProps {
  clients: Client[]
  currentUserRole: Role
  actionDialogOpen?: boolean
  onUnlock: (client: Client) => void
  onChangeRole: (client: Client) => void
  onManageAssignments: (client: Client) => void
  onToggleStatus: (client: Client) => void
  onArchive: (client: Client) => void
  onDelete: (client: Client) => void
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

function renderAssignedAdminsCount(client: Client) {
  const count = client.active_admins_count ?? 0

  if (count === 0) {
    return (
      <Badge variant="outline" className="border-status-warning/30 bg-status-warning/10 text-status-warning">
        Sin admins
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="border-brand-primary/30 bg-brand-soft/10 text-brand-primary">
      {count} admin{count === 1 ? '' : 's'}
    </Badge>
  )
}

export function ClientsTable({
  clients,
  currentUserRole,
  actionDialogOpen = false,
  onUnlock,
  onChangeRole,
  onManageAssignments,
  onToggleStatus,
  onArchive,
  onDelete,
}: ClientsTableProps) {
  const tableRef = useRef<HTMLTableElement>(null)
  const actionTriggerRef = useRef<HTMLButtonElement | null>(null)
  const wasActionDialogOpen = useRef(actionDialogOpen)

  useEffect(() => {
    const shouldRestoreFocus = wasActionDialogOpen.current && !actionDialogOpen
    wasActionDialogOpen.current = actionDialogOpen
    if (!shouldRestoreFocus) return

    // Dialogs are controlled by the page, outside the row's Radix trigger scope.
    // Restore after their focus trap closes; the row may have been removed.
    const frame = requestAnimationFrame(() => {
      const trigger = actionTriggerRef.current
      if (trigger?.isConnected) trigger.focus()
      else tableRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [actionDialogOpen])

  return (
    <Table ref={tableRef} tabIndex={-1}>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Nivel</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Admins</TableHead>
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
            <TableCell>{renderAssignedAdminsCount(client)}</TableCell>
            <TableCell className="text-muted-foreground">{dateFormatter.format(new Date(client.created_at))}</TableCell>
            <TableCell className="w-px whitespace-nowrap">
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" asChild>
                  <Link to={getClientDetailRoute(client.id, currentUserRole)}>
                    <Eye className="h-4 w-4" />
                    Ver perfil
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      aria-label={`Acciones de ${getUserDisplayName(client)}`}
                      onFocus={(event) => { actionTriggerRef.current = event.currentTarget }}
                      onPointerDown={(event) => { actionTriggerRef.current = event.currentTarget }}
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-60 max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto bg-background shadow-lg"
                    collisionPadding={8}
                  >
                    {currentUserRole === 'SUPER_ADMIN' && (
                      <>
                        <DropdownMenuGroup>
                          <DropdownMenuItem onSelect={() => onManageAssignments(client)}>
                            <Users aria-hidden="true" />
                            Gestionar admins
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onChangeRole(client)}>
                            <ShieldCheck aria-hidden="true" />
                            Cambiar rol
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="bg-foreground/10" />
                      </>
                    )}
                    <DropdownMenuGroup>
                      {client.is_locked && (
                        <DropdownMenuItem onSelect={() => onUnlock(client)}>
                          <Unlock aria-hidden="true" />
                          Desbloquear
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => onArchive(client)}>
                        {client.is_archived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}
                        {client.is_archived ? 'Desarchivar' : 'Archivar'}
                      </DropdownMenuItem>
                      {currentUserRole === 'SUPER_ADMIN' && (
                        <DropdownMenuItem onSelect={() => onToggleStatus(client)}>
                          {client.is_active ? <UserX aria-hidden="true" /> : <UserCheck aria-hidden="true" />}
                          {client.is_active ? 'Dar de baja' : 'Reactivar'}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                    {currentUserRole === 'SUPER_ADMIN' && (
                      <>
                        <DropdownMenuSeparator className="bg-foreground/10" />
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onSelect={() => onDelete(client)}>
                          <Trash2 aria-hidden="true" />
                          Eliminar definitivamente
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
