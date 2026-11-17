import { Video } from 'lucide-react'
import { SortableTableHead } from '@/components/sortable-table-head'
import { Checkbox } from '@/components/ui/checkbox'
import { Tag } from '@/components/ui/tag'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePageSelection } from '@/components/workspace/use-page-selection'
import type { SortDir } from '@/lib/sort-search-params'
import { ResourceApprovalIndicator } from '../../approval-requests/components/resource-approval-indicator'
import { LEVEL_LABELS, type Exercise } from '../types'
import { ExerciseRowActions } from './exercise-row-actions'
import { ExerciseTagList } from './exercise-tag-list'
import { ExerciseThumbnail } from './exercise-thumbnail'
import { TrainingUsageCell } from './training-usage-cell'

export interface ExerciseApprovalSummary {
  pending_approval_actions: string[]
}

export interface ExercisesTableProps {
  exercises: Exercise[]
  approvalById?: Record<string, ExerciseApprovalSummary>
  onView: (exercise: Exercise) => void
  onEdit: (exercise: Exercise) => void
  onDuplicate: (exercise: Exercise) => void
  onDelete: (exercise: Exercise) => void
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  sortBy?: string
  sortDir?: SortDir
  onSortChange?: (field: string) => void
}

export function ExercisesTable({
  exercises,
  approvalById = {},
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  selectedIds,
  onSelectionChange,
  sortBy,
  sortDir = 'asc',
  onSortChange = () => {},
}: ExercisesTableProps) {
  const selection = usePageSelection(exercises, selectedIds, onSelectionChange)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <div className="flex items-center">
              <Checkbox aria-label="Seleccionar página" checked={selection.headerChecked} onChange={selection.toggleAll} />
            </div>
          </TableHead>
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
          <TableRow key={exercise.id} data-state={selectedIds?.has(exercise.id) ? 'selected' : undefined}>
            <TableCell>
              <div className="flex items-center">
                <Checkbox
                  aria-label={`Seleccionar ${exercise.name}`}
                  checked={selectedIds?.has(exercise.id) ?? false}
                  onChange={() => selection.toggle(exercise.id)}
                />
              </div>
            </TableCell>

            <TableCell>
              <div className="flex min-w-0 items-center gap-3">
                <ExerciseThumbnail name={exercise.name} url={exercise.thumbnail_url} />
                <div className="min-w-0 space-y-1.5">
                  <p className="font-medium text-foreground">{exercise.name}</p>
                  <ResourceApprovalIndicator pendingActions={approvalById[exercise.id]?.pending_approval_actions ?? []} />
                </div>
              </div>
            </TableCell>

            <TableCell>
              <ExerciseTagList values={exercise.muscle_groups} />
            </TableCell>

            <TableCell className="hidden lg:table-cell">
              <ExerciseTagList values={exercise.equipment} emptyLabel="—" />
            </TableCell>

            <TableCell>
              <Tag>{LEVEL_LABELS[exercise.level]}</Tag>
            </TableCell>

            <TableCell className="text-center">
              {exercise.video_url ? (
                <>
                  <Video className="inline-block h-4 w-4 text-status-success" aria-hidden="true" />
                  <span className="sr-only">Con vídeo</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="text-xs text-muted-foreground">—</span>
                  <span className="sr-only">Sin vídeo</span>
                </>
              )}
            </TableCell>

            <TableCell className="text-center"><TrainingUsageCell exercise={exercise} /></TableCell>

            <TableCell className="text-right">
              <ExerciseRowActions
                exercise={exercise}
                onView={onView}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
