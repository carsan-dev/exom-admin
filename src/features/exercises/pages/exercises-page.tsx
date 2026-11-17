import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Dumbbell, Plus } from 'lucide-react'
import { useSearchParams } from 'react-router'
import {
  filtersToApiParams,
  type FilterOption,
  type FilterSectionConfig,
  useListFilters,
} from '@/components/filters'
import { EmptyState, ErrorState, PageHeader, Pagination } from '@/components/page'
import { Button } from '@/components/ui/button'
import { BulkDeleteDialog } from '@/components/workspace/bulk-delete-dialog'
import type { BulkDeleteEntityLabels } from '@/components/workspace/bulk-delete-labels'
import { SelectionBar } from '@/components/workspace/selection-bar'
import { useBulkDeleteFlow } from '@/components/workspace/use-bulk-delete-flow'
import { useNamedSelection } from '@/components/workspace/use-named-selection'
import { useResourceApprovalBatch } from '@/features/approval-requests/api'
import { buildResourceApprovalMap } from '@/features/approval-requests/types'
import {
  getPageSearchParam,
  replacePaginationSearchParams,
} from '@/lib/pagination-search-params'
import { getSortSearchParams, toggleSortSearchParams } from '@/lib/sort-search-params'
import {
  getApiErrorMessage,
  type ExercisesListParams,
  useBulkDeleteExercises,
  useExerciseEquipment,
  useExerciseMuscleGroups,
  useExercises,
} from '../api'
import { DeleteExerciseDialog } from '../components/delete-exercise-dialog'
import { ExerciseDetailDialog } from '../components/exercise-detail-dialog'
import { ExerciseFormDialog } from '../components/exercise-form-dialog'
import { ExercisesFiltersBar } from '../components/exercises-filters-bar'
import { ExercisesList } from '../components/exercises-list'
import { ExercisesListSkeleton } from '../components/exercises-list-skeleton'
import type { Exercise } from '../types'

const PAGE_SIZE = 10
const EXERCISE_LABELS: BulkDeleteEntityLabels = {
  singular: 'ejercicio',
  plural: 'ejercicios',
  gender: 'masculine',
}
const BULK_DELETE_CONSEQUENCES =
  'Dejarán de estar disponibles en el catálogo. Los entrenamientos que ya los usan y el histórico de los clientes se conservan. No se puede deshacer desde el panel.'
const LEVEL_OPTIONS: FilterOption[] = [
  { value: 'PRINCIPIANTE', label: 'Principiante' },
  { value: 'INTERMEDIO', label: 'Intermedio' },
  { value: 'AVANZADO', label: 'Avanzado' },
]
const TRAINING_USAGE_OPTIONS = ['all', 'used', 'unused'] as const
type TrainingUsageFilter = (typeof TRAINING_USAGE_OPTIONS)[number]

function getTrainingUsageFilter(value: string | null): TrainingUsageFilter {
  return TRAINING_USAGE_OPTIONS.includes(value as TrainingUsageFilter)
    ? (value as TrainingUsageFilter)
    : 'all'
}

function toFilterOptions(values?: string[]): FilterOption[] {
  return values?.map((value) => ({ value, label: value })) ?? []
}

export function ExercisesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const page = getPageSearchParam(searchParams.get('page'))
  const trainingUsage = getTrainingUsageFilter(searchParams.get('training_usage'))
  const sort = getSortSearchParams(searchParams)
  const deferredSearch = useDeferredValue(search)
  const activeSearch = deferredSearch.trim()
  const muscleGroupsQuery = useExerciseMuscleGroups()
  const equipmentQuery = useExerciseEquipment()
  const bulkDeleteExercises = useBulkDeleteExercises()
  const sections = useMemo<FilterSectionConfig[]>(
    () => [
      {
        type: 'multi',
        key: 'muscle_groups',
        label: 'Grupo muscular',
        options: toFilterOptions(muscleGroupsQuery.data),
        isLoading: muscleGroupsQuery.isLoading,
      },
      {
        type: 'multi',
        key: 'equipment',
        label: 'Equipamiento',
        options: toFilterOptions(equipmentQuery.data),
        isLoading: equipmentQuery.isLoading,
      },
      {
        type: 'multi',
        key: 'level',
        label: 'Nivel',
        options: LEVEL_OPTIONS,
      },
    ],
    [
      muscleGroupsQuery.data,
      muscleGroupsQuery.isLoading,
      equipmentQuery.data,
      equipmentQuery.isLoading,
    ]
  )
  const filters = useListFilters(sections)
  const exerciseFilterParams = filtersToApiParams(filters.values, sections) as Partial<ExercisesListParams>
  const pageResetKey = `${activeSearch}::${JSON.stringify(exerciseFilterParams)}::${trainingUsage}`
  const lastPageResetKeyRef = useRef(pageResetKey)

  useEffect(() => {
    if (lastPageResetKeyRef.current === pageResetKey) {
      return
    }

    lastPageResetKeyRef.current = pageResetKey
    replacePaginationSearchParams(setSearchParams, { page: 1 })
  }, [pageResetKey, setSearchParams])

  const exercisesQuery = useExercises({
    page,
    limit: PAGE_SIZE,
    search: activeSearch,
    training_usage: trainingUsage,
    sort_by: sort.sort_by,
    sort_dir: sort.sort_dir,
    ...exerciseFilterParams,
  })
  const exercises = exercisesQuery.data?.data ?? []
  const { selectedIds, updateSelection, clearSelection, retainSelection, toItems } = useNamedSelection(
    exercises,
    pageResetKey
  )
  const bulkDelete = useBulkDeleteFlow({
    labels: EXERCISE_LABELS,
    consequences: BULK_DELETE_CONSEQUENCES,
    run: bulkDeleteExercises.mutateAsync,
    onDeleted: () => replacePaginationSearchParams(setSearchParams, { page: 1 }),
    onSettled: (retryableIds) => (retryableIds ? retainSelection(retryableIds) : clearSelection()),
  })
  const exerciseApprovalQuery = useResourceApprovalBatch(
    'exercise',
    exercises.map((exercise) => exercise.id)
  )
  const exerciseApprovalById = buildResourceApprovalMap(exerciseApprovalQuery.data ?? [])
  const total = exercisesQuery.data?.total ?? 0
  const totalPages = Math.max(1, exercisesQuery.data?.totalPages ?? 1)
  const hasActiveFilters = filters.activeCount > 0
  const hasQuery = activeSearch.length > 0 || hasActiveFilters

  const handleCreate = () => {
    setEditingExercise(null)
    setIsDuplicate(false)
    setFormDialogOpen(true)
  }

  const handleView = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setDetailDialogOpen(true)
  }

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise)
    setIsDuplicate(false)
    setFormDialogOpen(true)
  }

  const handleDuplicate = (exercise: Exercise) => {
    setEditingExercise(exercise)
    setIsDuplicate(true)
    setFormDialogOpen(true)
  }

  const handleDelete = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setDeleteDialogOpen(true)
  }

  const handleFormDialogOpenChange = (open: boolean) => {
    setFormDialogOpen(open)

    if (!open) {
      setEditingExercise(null)
      setIsDuplicate(false)
    }
  }

  const handleTrainingUsageChange = (value: string) => {
    const nextSearchParams = new URLSearchParams(searchParams)
    if (value === 'all') {
      nextSearchParams.delete('training_usage')
    } else {
      nextSearchParams.set('training_usage', value)
    }
    nextSearchParams.delete('page')
    setSearchParams(nextSearchParams)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title="Ejercicios"
        description={
          <>
            Gestiona el catálogo completo de ejercicios. Crea, edita y adjunta videos instructivos
            para cada movimiento.
            <span className="mt-1 block text-foreground-muted">
              {total > 0
                ? `${total} ejercicios en el catálogo`
                : 'Aún no hay ejercicios en el catálogo'}
            </span>
          </>
        }
        actions={
          <Button onClick={handleCreate}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nuevo ejercicio
          </Button>
        }
      />

      {/* Content */}
      {exercisesQuery.isLoading ? (
        <ExercisesListSkeleton />
      ) : exercisesQuery.isError ? (
        <ErrorState
          className="border-y border-border"
          title="No se ha podido cargar el catálogo"
          description={getApiErrorMessage(exercisesQuery.error, 'Inténtalo de nuevo en unos segundos.')}
          onRetry={() => exercisesQuery.refetch()}
        />
      ) : total === 0 && !hasQuery ? (
        <EmptyState
          className="border-y border-border"
          icon={<Dumbbell aria-hidden="true" />}
          title="Aún no hay ejercicios"
          description="Crea el primer ejercicio para empezar a construir el catálogo que usarán tus clientes."
          action={
            <Button onClick={handleCreate}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Crear primer ejercicio
            </Button>
          }
        />
      ) : (
        <section aria-labelledby="exercises-list-title" className="space-y-4">
          <div>
            <h2
              id="exercises-list-title"
              className="font-display text-lg font-bold uppercase leading-none text-foreground"
            >
              Listado de ejercicios
            </h2>
            <p className="mt-1 text-[13px] text-foreground-secondary">
              Vista paginada del catálogo con búsqueda y acciones por ejercicio
            </p>
          </div>
          <ExercisesFiltersBar
            search={search}
            onSearchChange={setSearch}
            sections={sections}
            filters={filters}
            trainingUsage={trainingUsage}
            onTrainingUsageChange={handleTrainingUsageChange}
          />

          {exercises.length === 0 ? (
            <EmptyState
              className="border-y border-border"
              title="Sin resultados"
              description="No se encontraron ejercicios con la búsqueda y filtros actuales."
            />
          ) : (
            <ExercisesList
              exercises={exercises}
              approvalById={exerciseApprovalById}
              onView={handleView}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              selectedIds={selectedIds}
              onSelectionChange={updateSelection}
              sortBy={sort.sort_by}
              sortDir={sort.sort_dir}
              onSortChange={(field) => toggleSortSearchParams(setSearchParams, field)}
            />
          )}

          {/* Pagination: la compartida no se pinta con una sola página, el texto sí se conserva. */}
          {totalPages > 1 ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(nextPage) =>
                replacePaginationSearchParams(setSearchParams, { page: nextPage })
              }
            />
          ) : (
            <p className="pt-4 text-[13px] tabular-nums text-foreground-muted">
              Página {page} de {totalPages}
            </p>
          )}
        </section>
      )}

      {/* Dialogs */}
      <SelectionBar
        count={selectedIds.size}
        onClear={clearSelection}
        aria-label="Acciones de selección de ejercicios"
        className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px)+12px)] left-4 right-4 z-40 mt-0 w-auto max-md:overflow-x-visible md:bottom-6 md:left-1/2 md:right-auto md:w-auto md:min-w-96 md:-translate-x-1/2"
      >
        <Button variant="destructive" onClick={() => bulkDelete.open(toItems())} className="max-md:h-11">
          Eliminar ({selectedIds.size})
        </Button>
      </SelectionBar>
      <BulkDeleteDialog {...bulkDelete.dialogProps} />
      <ExerciseFormDialog
        open={formDialogOpen}
        onOpenChange={handleFormDialogOpenChange}
        exercise={editingExercise}
        isDuplicate={isDuplicate}
        onSaved={() => {
          if (!editingExercise || isDuplicate) {
            replacePaginationSearchParams(setSearchParams, { page: 1 })
          }
        }}
      />

      <ExerciseDetailDialog
        exercise={selectedExercise}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
      />

      <DeleteExerciseDialog
        exercise={selectedExercise}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={() => replacePaginationSearchParams(setSearchParams, { page: 1 })}
      />
    </div>
  )
}
