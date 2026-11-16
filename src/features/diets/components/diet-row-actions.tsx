import { Copy, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Diet } from '../types'

export interface DietRowActionsProps {
  diet: Diet
  onView: (diet: Diet) => void
  onEdit: (diet: Diet) => void
  onDuplicate: (diet: Diet) => void
  onDelete: (diet: Diet) => void
}

/** Menú de acciones de una fila (tabla y lista apilada comparten las mismas). */
export function DietRowActions({ diet, onView, onEdit, onDuplicate, onDelete }: DietRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 max-md:size-11">
          <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(diet)}>
          <Eye aria-hidden="true" className="mr-2 h-4 w-4" />
          Ver detalle
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(diet)}>
          <Pencil aria-hidden="true" className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDuplicate(diet)}>
          <Copy aria-hidden="true" className="mr-2 h-4 w-4" />
          Duplicar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(diet)}
          className="text-status-error focus:text-status-error"
        >
          <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
