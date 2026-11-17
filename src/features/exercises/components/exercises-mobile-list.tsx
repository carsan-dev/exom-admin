import { ArrowDown, ArrowUp, ArrowUpDown, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tag } from '@/components/ui/tag'
import { usePageSelection } from '@/components/workspace/use-page-selection'
import { cn } from '@/lib/utils'
import type { SortDir } from '@/lib/sort-search-params'
import { ResourceApprovalIndicator } from '../../approval-requests/components/resource-approval-indicator'
import { LEVEL_LABELS } from '../types'
import { ExerciseRowActions } from './exercise-row-actions'
import { ExerciseTagList } from './exercise-tag-list'
import { ExerciseThumbnail } from './exercise-thumbnail'
import type { ExercisesTableProps } from './exercises-table'
import { TrainingUsageCell } from './training-usage-cell'

const SORT_FIELDS = [
  { field: 'name', label: 'Nombre' },
  { field: 'level', label: 'Nivel' },
  { field: 'video', label: 'Vídeo' },
  { field: 'training_usage_count', label: 'En entrenamientos' },
] as const

function SortControls({
  sortBy,
  sortDir,
  onSortChange,
}: {
  sortBy?: string
  sortDir: SortDir
  onSortChange: (field: string) => void
}) {
  return (
    <div role="group" aria-label="Ordenar ejercicios" className="flex flex-wrap items-center gap-1 pb-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Ordenar</span>
      {SORT_FIELDS.map(({ field, label }) => {
        const active = sortBy === field
        const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
        return (
          <Button
            key={field}
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Ordenar por ${label}`}
            aria-pressed={active}
            onClick={() => onSortChange(field)}
            className={cn('gap-1 px-2 text-xs', active && 'text-foreground')}
          >
            {label}
            <Icon className={cn('h-3.5 w-3.5', active ? 'text-accent-line' : 'opacity-50')} aria-hidden="true" />
          </Button>
        )
      })}
    </div>
  )
}

/** Filas apiladas por debajo de md; mismos datos y acciones que la tabla. */
export function ExercisesMobileList({
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
    <div>
      <SortControls sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
      <div className="flex items-center border-t border-border">
        <span className="flex size-11 items-center justify-center">
          <Checkbox aria-label="Seleccionar página" checked={selection.headerChecked} onChange={selection.toggleAll} />
        </span>
      </div>
      <ul className="divide-y divide-border border-y border-border">
        {exercises.map((exercise) => (
          <li
            key={exercise.id}
            className={cn('flex items-start gap-3 py-3', selectedIds?.has(exercise.id) && 'bg-lime-soft')}
          >
            <span className="-mr-2 flex size-11 flex-none items-center justify-center">
              <Checkbox
                aria-label={`Seleccionar ${exercise.name}`}
                checked={selectedIds?.has(exercise.id) ?? false}
                onChange={() => selection.toggle(exercise.id)}
              />
            </span>
            <ExerciseThumbnail name={exercise.name} url={exercise.thumbnail_url} className="mt-0.5" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="space-y-1.5">
                <p className="break-words font-medium text-foreground">{exercise.name}</p>
                <ResourceApprovalIndicator pendingActions={approvalById[exercise.id]?.pending_approval_actions ?? []} />
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Tag>{LEVEL_LABELS[exercise.level]}</Tag>
                <ExerciseTagList values={exercise.muscle_groups} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <TrainingUsageCell exercise={exercise} />
                {exercise.video_url ? (
                  <>
                    <Video className="h-4 w-4 text-status-success" aria-hidden="true" />
                    <span className="sr-only">Con vídeo</span>
                  </>
                ) : (
                  <span className="sr-only">Sin vídeo</span>
                )}
              </div>
            </div>
            <ExerciseRowActions
              exercise={exercise}
              onView={onView}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
