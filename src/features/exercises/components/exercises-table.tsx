import { useState } from 'react'
import { Check, Copy, Eye, Info, Loader2, Pencil, Trash2, Video, MoreHorizontal, X } from 'lucide-react'
import { SortableTableHead } from '@/components/sortable-table-head'
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
import type { SortDir } from '@/lib/sort-search-params'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ResourceApprovalIndicator } from '../../approval-requests/components/resource-approval-indicator'
import { useExerciseTrainingUsage } from '../api'
import { getLevelBadgeClass, LEVEL_LABELS, type Exercise } from '../types'

interface ExerciseApprovalSummary {
  pending_approval_actions: string[]
}

interface ExercisesTableProps {
  exercises: Exercise[]
  approvalById?: Record<string, ExerciseApprovalSummary>
  onView: (exercise: Exercise) => void
  onEdit: (exercise: Exercise) => void
  onDuplicate: (exercise: Exercise) => void
  onDelete: (exercise: Exercise) => void
  sortBy?: string
  sortDir?: SortDir
  onSortChange?: (field: string) => void
}

function TrainingUsageCell({ exercise }: { exercise: Exercise }) {
  const [open, setOpen] = useState(false)
  const usage = useExerciseTrainingUsage(exercise.id, open && exercise.training_usage_count > 0)

  if (!exercise.is_used_in_training) {
    return <span className="inline-flex items-center gap-1 text-xs text-status-error"><X className="h-4 w-4" />Sin asignar</span>
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <Check className="h-4 w-4 text-status-success" aria-hidden="true" />
      <span className="text-sm font-medium">{exercise.training_usage_count}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label={`Ver entrenamientos que usan ${exercise.name}`}>
            <Info className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72">
          <p className="mb-2 font-medium">Usado en entrenamientos</p>
          {usage.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Cargando...</div>
          ) : usage.isError ? (
            <p className="text-sm text-status-error">No se pudo cargar el uso.</p>
          ) : usage.data?.trainings.length ? (
            <ul className="max-h-56 space-y-1 overflow-auto text-sm">
              {usage.data.trainings.map((training) => <li key={training.id}>{training.name}</li>)}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Sin entrenamientos activos.</p>}
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function ExercisesTable({
  exercises,
  approvalById = {},
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  sortBy,
  sortDir = 'asc',
  onSortChange = () => {},
}: ExercisesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableTableHead field="name" label="Nombre" sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
          <TableHead>Grupos musculares</TableHead>
          <TableHead className="hidden lg:table-cell">Equipamiento</TableHead>
          <SortableTableHead field="level" label="Nivel" sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
          <SortableTableHead field="video" label="Vídeo" sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} className="text-center" />
          <SortableTableHead field="training_usage_count" label="En entrenamientos" sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} className="text-center" />
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {exercises.map((exercise) => (
          <TableRow key={exercise.id}>
            <TableCell>
              <div className="space-y-2">
                <p className="font-medium text-foreground">{exercise.name}</p>
                <ResourceApprovalIndicator pendingActions={approvalById[exercise.id]?.pending_approval_actions ?? []} />
              </div>
            </TableCell>

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

            <TableCell className="text-center"><TrainingUsageCell exercise={exercise} /></TableCell>

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
                  <DropdownMenuItem onClick={() => onDuplicate(exercise)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicar
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
