import { Copy, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
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
import { getLevelBadgeClass, LEVEL_LABELS } from '../../exercises/types'
import {
  getTrainingTypeBadgeClass,
  TRAINING_TYPE_LABELS,
  type Training,
} from '../types'

interface TrainingsTableProps {
  trainings: Training[]
  onView: (training: Training) => void
  onEdit: (training: Training) => void
  onDuplicate: (training: Training) => void
  onDelete: (training: Training) => void
}

export function TrainingsTable({ trainings, onView, onEdit, onDuplicate, onDelete }: TrainingsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Nivel</TableHead>
          <TableHead className="text-center">Ejercicios</TableHead>
          <TableHead className="hidden md:table-cell">Duración</TableHead>
          <TableHead className="hidden md:table-cell">Calorías</TableHead>
          <TableHead className="hidden lg:table-cell">Etiquetas</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trainings.map((training) => (
          <TableRow key={training.id}>
            <TableCell className="font-medium text-foreground max-w-[200px] truncate">
              {training.name}
            </TableCell>

            <TableCell>
              <Badge
                variant="outline"
                className={cn('font-medium', getTrainingTypeBadgeClass(training.type))}
              >
                {TRAINING_TYPE_LABELS[training.type]}
              </Badge>
            </TableCell>

            <TableCell>
              <Badge
                variant="outline"
                className={cn('font-medium', getLevelBadgeClass(training.level))}
              >
                {LEVEL_LABELS[training.level]}
              </Badge>
            </TableCell>

            <TableCell className="text-center text-sm text-muted-foreground">
              {training.exercises.length}
            </TableCell>

            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
              {training.estimated_duration_min ? `${training.estimated_duration_min} min` : '—'}
            </TableCell>

            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
              {training.estimated_calories ? `${training.estimated_calories} kcal` : '—'}
            </TableCell>

            <TableCell className="hidden lg:table-cell">
              <div className="flex flex-wrap gap-1">
                {training.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="outline" className="border-border bg-muted text-muted-foreground text-xs">
                    {tag}
                  </Badge>
                ))}
                {training.tags.length > 2 && (
                  <Badge variant="outline" className="border-border bg-muted text-muted-foreground text-xs">
                    +{training.tags.length - 2}
                  </Badge>
                )}
                {training.tags.length === 0 && (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </TableCell>

            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Abrir menú</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(training)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalle
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(training)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(training)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(training)}
                    className="text-status-error focus:text-status-error"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
