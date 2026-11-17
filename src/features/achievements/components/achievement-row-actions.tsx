import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AchievementListItem } from '../types'

export interface AchievementRowActionsProps {
  achievement: AchievementListItem
  onEdit: (achievement: AchievementListItem) => void
  onViewUsers: (achievement: AchievementListItem) => void
  onGrant: (achievement: AchievementListItem) => void
  onDelete: (achievement: AchievementListItem) => void
  canDelete: boolean
  className?: string
}

/** Mismas acciones en tabla y lista móvil; por debajo de md ocupan 44 px de alto. */
export function AchievementRowActions({
  achievement,
  onEdit,
  onViewUsers,
  onGrant,
  onDelete,
  canDelete,
  className,
}: AchievementRowActionsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <Button variant="ghost" size="sm" className="max-md:h-11" onClick={() => onViewUsers(achievement)}>
        Usuarios
      </Button>
      <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => onGrant(achievement)}>
        Otorgar
      </Button>
      <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => onEdit(achievement)}>
        Editar
      </Button>
      {canDelete && (
        <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => onDelete(achievement)}>
          Eliminar
        </Button>
      )}
    </div>
  )
}
