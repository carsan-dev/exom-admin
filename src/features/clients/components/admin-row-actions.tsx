import { Pencil, ShieldCheck, Unlock, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AdminUserListItem } from '../types'

export interface AdminRowActionsProps {
  admin: AdminUserListItem
  /** La propia cuenta queda protegida frente a degradaciones y bajas. */
  isOwnAccount: boolean
  onEdit: (admin: AdminUserListItem) => void
  onUnlock: (admin: AdminUserListItem) => void
  onChangeRole: (admin: AdminUserListItem) => void
  onToggleStatus: (admin: AdminUserListItem) => void
  className?: string
}

/** Mismas acciones y protecciones en la tabla y en la lista móvil; por debajo de md ocupan 44 px de alto. */
export function AdminRowActions({
  admin,
  isOwnAccount,
  onEdit,
  onUnlock,
  onChangeRole,
  onToggleStatus,
  className,
}: AdminRowActionsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => onEdit(admin)}>
        <Pencil aria-hidden="true" className="h-4 w-4" />
        Editar
      </Button>
      {admin.is_locked && (
        <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => onUnlock(admin)}>
          <Unlock aria-hidden="true" className="h-4 w-4" />
          Desbloquear
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        className="max-md:h-11"
        onClick={() => onChangeRole(admin)}
        disabled={isOwnAccount}
      >
        <ShieldCheck aria-hidden="true" className="h-4 w-4" />
        Cambiar rol
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="max-md:h-11"
        onClick={() => onToggleStatus(admin)}
        disabled={isOwnAccount}
      >
        {admin.is_active ? <UserX aria-hidden="true" className="h-4 w-4" /> : <UserCheck aria-hidden="true" className="h-4 w-4" />}
        {admin.is_active ? 'Dar de baja' : 'Reactivar'}
      </Button>
    </div>
  )
}
