import { Archive, ArchiveRestore, Eye, MoreHorizontal, ShieldCheck, Trash2, Unlock, UserCheck, UserX, Users } from 'lucide-react'
import type { RefObject } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { getClientDetailRoute, getUserDisplayName, type Client, type Role } from '../types'

export interface ClientRowActionsProps {
  client: Client
  currentUserRole: Role
  /** Último disparador del menú usado, para devolverle el foco al cerrar un diálogo. */
  actionTriggerRef: RefObject<HTMLButtonElement | null>
  onUnlock: (client: Client) => void
  onChangeRole: (client: Client) => void
  onManageAssignments: (client: Client) => void
  onToggleStatus: (client: Client) => void
  onArchive: (client: Client) => void
  onDelete: (client: Client) => void
  className?: string
}

/** Mismas acciones y permisos por rol en la tabla y en la lista móvil. */
export function ClientRowActions({
  client,
  currentUserRole,
  actionTriggerRef,
  onUnlock,
  onChangeRole,
  onManageAssignments,
  onToggleStatus,
  onArchive,
  onDelete,
  className,
}: ClientRowActionsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button variant="ghost" size="sm" asChild>
        <Link to={getClientDetailRoute(client.id, currentUserRole)}>
          <Eye aria-hidden="true" className="h-4 w-4" />
          Ver perfil
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 max-md:size-11"
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
  )
}
