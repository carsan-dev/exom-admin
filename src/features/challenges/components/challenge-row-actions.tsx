import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ChallengeListItem } from '../types'

export interface ChallengeRowActionsProps {
  challenge: ChallengeListItem
  onEdit: (challenge: ChallengeListItem) => void
  onAssign: (challenge: ChallengeListItem) => void
  onViewProgress: (challenge: ChallengeListItem) => void
  onDelete: (challenge: ChallengeListItem) => void
  className?: string
}

/** Mismas cuatro acciones en tabla y lista móvil; por debajo de md ocupan 44 px de alto. */
export function ChallengeRowActions({
  challenge,
  onEdit,
  onAssign,
  onViewProgress,
  onDelete,
  className,
}: ChallengeRowActionsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <Button variant="ghost" size="sm" className="max-md:h-11" onClick={() => onViewProgress(challenge)}>
        Progreso
      </Button>
      <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => onAssign(challenge)}>
        Asignar
      </Button>
      <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => onEdit(challenge)}>
        Editar
      </Button>
      <Button variant="outline" size="sm" className="max-md:h-11" onClick={() => onDelete(challenge)}>
        Eliminar
      </Button>
    </div>
  )
}
