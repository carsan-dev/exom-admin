import { SortableTableHead } from '@/components/sortable-table-head'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tag } from '@/components/ui/tag'
import { CatalogDragHandle } from '../../catalog-groups/components/catalog-drag-handle'
import type { TrainingsListViewProps } from './trainings-table'
import { TrainingRowActions } from './training-row-actions'
import {
  TrainingLevelTag,
  TrainingNameBlock,
  TrainingTagList,
  TrainingTypeTags,
} from './training-row-parts'
import {
  formatTrainingCalories,
  formatTrainingDuration,
  getTrainingExerciseCount,
} from './training-row-format'

/** Tabla desde md; duración y calorías desde md y etiquetas desde lg. */
export function TrainingsDesktopTable({
  trainings,
  approvalById,
  selectedIds,
  allSelected,
  onToggleAll,
  onToggle,
  movementDisabled,
  sortBy,
  sortDir,
  onSortChange,
  colorMap,
  ...actions
}: TrainingsListViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[4.5rem]">
            <div className="flex items-center">
              <Checkbox aria-label="Seleccionar página" checked={allSelected} onChange={onToggleAll} />
              <span className="sr-only">Mover</span>
            </div>
          </TableHead>
          <SortableTableHead field="name" label="Nombre" sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
          <TableHead>Grupo</TableHead>
          <TableHead>Tipos</TableHead>
          <SortableTableHead field="level" label="Nivel" sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} />
          <TableHead className="text-center">Ejercicios</TableHead>
          <SortableTableHead
            field="estimated_duration_min"
            label="Duración"
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={onSortChange}
            className="hidden md:table-cell"
          />
          <SortableTableHead
            field="estimated_calories"
            label="Calorías"
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={onSortChange}
            className="hidden md:table-cell"
          />
          <TableHead className="hidden lg:table-cell">Etiquetas</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trainings.map((training) => (
          <TableRow key={training.id} data-state={selectedIds.has(training.id) ? 'selected' : undefined}>
            <TableCell>
              <div className="flex items-center gap-1">
                <Checkbox
                  aria-label={`Seleccionar ${training.name}`}
                  checked={selectedIds.has(training.id)}
                  onChange={() => onToggle(training.id)}
                />
                <CatalogDragHandle id={training.id} label={training.name} disabled={movementDisabled} />
              </div>
            </TableCell>
            <TableCell className="min-w-[11rem] max-w-[20rem]">
              <TrainingNameBlock training={training} approval={approvalById[training.id]} />
            </TableCell>
            <TableCell>
              {training.group ? (
                <Tag className="max-w-40 truncate">{training.group.name}</Tag>
              ) : (
                <span className="text-xs text-foreground-muted">Sin grupo</span>
              )}
            </TableCell>
            <TableCell>
              <TrainingTypeTags training={training} colorMap={colorMap} />
            </TableCell>
            <TableCell>
              <TrainingLevelTag level={training.level} />
            </TableCell>
            <TableCell className="text-center tabular-nums text-foreground-secondary">
              {getTrainingExerciseCount(training)}
            </TableCell>
            <TableCell className="hidden whitespace-nowrap tabular-nums text-foreground-secondary md:table-cell">
              {formatTrainingDuration(training)}
            </TableCell>
            <TableCell className="hidden whitespace-nowrap tabular-nums text-foreground-secondary md:table-cell">
              {formatTrainingCalories(training)}
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <TrainingTagList tags={training.tags} />
            </TableCell>
            <TableCell className="w-px whitespace-nowrap text-right">
              <TrainingRowActions training={training} {...actions} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
