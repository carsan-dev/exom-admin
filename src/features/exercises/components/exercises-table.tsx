import { Eye, Pencil, Trash2, Video, MoreHorizontal } from 'lucide-react'
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
import { getLevelBadgeClass, LEVEL_LABELS, type Exercise } from '../types'

interface ExercisesTableProps {
  exercises: Exercise[]
  onView: (exercise: Exercise) => void
  onEdit: (exercise: Exercise) => void
  onDelete: (exercise: Exercise) => void
}

export function ExercisesTable({ exercises, onView, onEdit, onDelete }: ExercisesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Grupos musculares</TableHead>
          <TableHead className="hidden lg:table-cell">Equipamiento</TableHead>
          <TableHead>Nivel</TableHead>
          <TableHead className="text-center">Video</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {exercises.map((exercise) => (
          <TableRow key={exercise.id}>
            <TableCell className="font-medium text-foreground">{exercise.name}</TableCell>

            <TableCell>
              <div className="flex flex-wrap gap-1">
                {exercise.muscle_groups.slice(0, 2).map((group) => (
                  <Badge key={group} variant="outline" className="border-brand-soft/40 bg-brand-soft/10 text-brand-primary text-xs">
                    {group}
                  </Badge>
                ))}
                {exercise.muscle_groups.length > 2 && (
                  <Badge variant="outline" className="border-border bg-muted text-muted-foreground text-xs">
                    +{exercise.muscle_groups.length - 2}
                  </Badge>
                )}
              </div>
            </TableCell>

            <TableCell className="hidden lg:table-cell">
              <div className="flex flex-wrap gap-1">
                {exercise.equipment.slice(0, 2).map((item) => (
                  <Badge key={item} variant="outline" className="border-border bg-muted text-muted-foreground text-xs">
                    {item}
                  </Badge>
                ))}
                {exercise.equipment.length > 2 && (
                  <Badge variant="outline" className="border-border bg-muted text-muted-foreground text-xs">
                    +{exercise.equipment.length - 2}
                  </Badge>
                )}
                {exercise.equipment.length === 0 && (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </TableCell>

            <TableCell>
              <Badge variant="outline" className={cn('font-medium', getLevelBadgeClass(exercise.level))}>
                {LEVEL_LABELS[exercise.level]}
              </Badge>
            </TableCell>

            <TableCell className="text-center">
              {exercise.video_url ? (
                <Video className="inline-block h-4 w-4 text-status-success" />
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
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
                  <DropdownMenuItem onClick={() => onView(exercise)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalle
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(exercise)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(exercise)}
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
