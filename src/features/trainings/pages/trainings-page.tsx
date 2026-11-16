import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import {
  filtersToApiParams,
  type FilterOption,
  type FilterSectionConfig,
  useListFilters,
} from '@/components/filters'
import { useResourceApprovalBatch } from '@/features/approval-requests/api'
import { buildResourceApprovalMap } from '@/features/approval-requests/types'
import { getPageSearchParam, replacePaginationSearchParams } from '@/lib/pagination-search-params'
import { getSortSearchParams, toggleSortSearchParams } from '@/lib/sort-search-params'
import {
  getApiErrorMessage,
  type TrainingsListParams,
  useTraining,
  useTrainingTypeCatalogColors,
  useTrainingTags,
  useTrainingTypes,
  useTrainings,
  useExercisesList,
  useTrainingGroups,
  useCreateTrainingGroup,
  useUpdateTrainingGroup,
  useDeleteTrainingGroup,
  useUpdateTrainingGroupMembership,
} from '../api'
import { AiImportPromptDialog } from '../components/ai-import-prompt-dialog'
import { DeleteTrainingDialog } from '../components/delete-training-dialog'
import { TrainingDetailDialog } from '../components/training-detail-dialog'
import { TrainingFormDialog } from '../components/training-form-dialog'
import { TrainingsEmptyCard } from '../components/trainings-empty-card'
import { TrainingsErrorCard } from '../components/trainings-error-card'
import { TrainingsListPanel } from '../components/trainings-list-panel'
import { TrainingsPageHeader } from '../components/trainings-page-header'
import { TrainingsSelectionBar } from '../components/trainings-selection-bar'
import { TrainingsTableSkeleton } from '../components/trainings-table-skeleton'
import { AI_IMPORT_PROMPT, buildImportPromptWithExerciseCatalog } from '../ai-import-prompt'
import { parseTrainingImport } from '../import-training'
import { getTrainingTypeLabel, type Training } from '../types'
import type { TrainingFormValues } from '../schemas'
import type { CatalogGroup, CatalogGroupFilter } from '../../catalog-groups/types'
import { CatalogGroupStrip } from '../../catalog-groups/components/catalog-group-strip'
import {
  CatalogGroupDialog,
  DeleteCatalogGroupDialog,
  MoveToGroupDialog,
} from '../../catalog-groups/components/catalog-group-dialogs'
import { resolveDraggedCatalogIds } from '../../catalog-groups/drag-selection'

const PAGE_SIZE = 10
const LEVEL_OPTIONS: FilterOption[] = [
  { value: 'PRINCIPIANTE', label: 'Principiante' },
  { value: 'INTERMEDIO', label: 'Intermedio' },
  { value: 'AVANZADO', label: 'Avanzado' },
]

function toFilterOptions(
  values: string[] | undefined,
  getLabel?: (value: string) => string
): FilterOption[] {
  return values?.map((value) => ({ value, label: getLabel ? getLabel(value) : value })) ?? []
}

export function TrainingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null)
  const [editingTraining, setEditingTraining] = useState<Training | null>(null)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [importedValues, setImportedValues] = useState<TrainingFormValues | null>(null)
  const [importIssues, setImportIssues] = useState<string[]>([])
  const [importPromptOpen, setImportPromptOpen] = useState(false)
  const [exerciseCatalogRequested, setExerciseCatalogRequested] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [groupToEdit, setGroupToEdit] = useState<CatalogGroup | null>(null)
  const [groupToDelete, setGroupToDelete] = useState<CatalogGroup | null>(null)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [groupFilter, setGroupFilter] = useState<CatalogGroupFilter>('all')
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const page = getPageSearchParam(searchParams.get('page'))
  const sort = getSortSearchParams(searchParams)
  const deferredSearch = useDeferredValue(search)
  const activeSearch = deferredSearch.trim()
  const tagsQuery = useTrainingTags()
  const trainingTypesQuery = useTrainingTypes()
  const trainingTypeColorsQuery = useTrainingTypeCatalogColors()
  const exercisesQuery = useExercisesList({ enabled: importPromptOpen || exerciseCatalogRequested })
  const groupsQuery = useTrainingGroups()
  const createGroup = useCreateTrainingGroup()
  const updateGroup = useUpdateTrainingGroup()
  const deleteGroup = useDeleteTrainingGroup()
  const moveMembership = useUpdateTrainingGroupMembership()
  const sections = useMemo<FilterSectionConfig[]>(
    () => [
      {
        type: 'multi',
        key: 'type',
        label: 'Tipos',
        options: toFilterOptions(trainingTypesQuery.data, getTrainingTypeLabel),
        isLoading: trainingTypesQuery.isLoading,
      },
      {
        type: 'multi',
        key: 'level',
        label: 'Nivel',
        options: LEVEL_OPTIONS,
      },
      {
        type: 'multi',
        key: 'tags',
        label: 'Tags',
        options: toFilterOptions(tagsQuery.data),
        isLoading: tagsQuery.isLoading,
      },
      {
        type: 'range',
        key: 'duration',
        label: 'Duración',
        min: 0,
        max: 180,
        step: 5,
        unit: 'min',
      },
    ],
    [tagsQuery.data, tagsQuery.isLoading, trainingTypesQuery.data, trainingTypesQuery.isLoading]
  )
  const filters = useListFilters(sections)
  const trainingFilterParams = filtersToApiParams(
    filters.values,
    sections
  ) as Partial<TrainingsListParams>
  const pageResetKey = `${activeSearch}::${JSON.stringify(trainingFilterParams)}::${groupFilter}`
  const lastPageResetKeyRef = useRef(pageResetKey)

  useEffect(() => {
    if (lastPageResetKeyRef.current === pageResetKey) {
      return
    }

    lastPageResetKeyRef.current = pageResetKey
    replacePaginationSearchParams(setSearchParams, { page: 1 })
  }, [pageResetKey, setSearchParams])

  const trainingsQuery = useTrainings({
    page,
    limit: PAGE_SIZE,
    search: activeSearch,
    group_id: groupFilter !== 'all' && groupFilter !== 'ungrouped' ? groupFilter : undefined,
    ungrouped: groupFilter === 'ungrouped',
    sort_by: sort.sort_by,
    sort_dir: sort.sort_dir,
    ...trainingFilterParams,
  })
  const trainings = trainingsQuery.data?.data ?? []
  const selectedTrainingDetailQuery = useTraining(
    detailDialogOpen ? selectedTraining?.id : undefined
  )
  const editingTrainingDetailQuery = useTraining(
    formDialogOpen && editingTraining ? editingTraining.id : undefined
  )
  const trainingApprovalQuery = useResourceApprovalBatch(
    'training',
    trainings.map((training) => training.id)
  )
  const trainingApprovalById = buildResourceApprovalMap(trainingApprovalQuery.data ?? [])
  const total = trainingsQuery.data?.total ?? 0
  const totalPages = Math.max(1, trainingsQuery.data?.totalPages ?? 1)
  const hasActiveFilters = filters.activeCount > 0
  const hasQuery = activeSearch.length > 0 || hasActiveFilters
  const groups = groupsQuery.data ?? []
  const activeGroupName =
    groupFilter === 'all'
      ? null
      : groupFilter === 'ungrouped'
        ? 'Sin grupo'
        : (groups.find((group) => group.id === groupFilter)?.name ?? null)
  const organizationPending =
    createGroup.isPending ||
    updateGroup.isPending ||
    deleteGroup.isPending ||
    moveMembership.isPending

  useEffect(() => {
    setSelectedIds(new Set())
  }, [pageResetKey])

  const handleGroupSubmit = (name: string) => {
    const mutation = groupToEdit
      ? updateGroup.mutateAsync({ id: groupToEdit.id, name })
      : createGroup.mutateAsync(name)
    mutation
      .then(() => {
        setGroupDialogOpen(false)
        setGroupToEdit(null)
        toast.success('Grupo guardado')
      })
      .catch((error) => toast.error(getApiErrorMessage(error, 'No se pudo guardar el grupo')))
  }

  const handleMove = (ids: string[], groupId: string | null) => {
    moveMembership.mutate(
      { ids, groupId },
      {
        onSuccess: (result) => {
          setSelectedIds(new Set())
          setMoveDialogOpen(false)
          toast.success(`${result.affected_count} elementos movidos`)
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(error, 'No se pudieron mover los elementos')),
      }
    )
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || !String(over.id).startsWith('group:')) return
    const destination = String(over.id).slice(6)
    const activeId = String(active.id)
    const ids = resolveDraggedCatalogIds(activeId, selectedIds)
    handleMove(ids, destination === 'ungrouped' ? null : destination)
  }

  const handleCreate = () => {
    setEditingTraining(null)
    setIsDuplicate(false)
    setImportedValues(null)
    setImportIssues([])
    setFormDialogOpen(true)
  }

  const handleImportClick = () => {
    setExerciseCatalogRequested(true)
    importInputRef.current?.click()
  }

  const handleCopyImportPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_IMPORT_PROMPT)
      toast.success('Plantilla copiada')
    } catch {
      toast.error('No se ha podido copiar el prompt')
    }
  }

  const handleCopyImportPromptWithCatalog = async () => {
    const exerciseNames = (exercisesQuery.data?.data ?? [])
      .map((exercise) => exercise.name.trim())
      .filter(Boolean)

    if (exerciseNames.length === 0) {
      toast.error('No hay ejercicios cargados para incluir en el prompt')
      return
    }

    try {
      await navigator.clipboard.writeText(buildImportPromptWithExerciseCatalog(exerciseNames))
      toast.success(`Prompt copiado con ${exerciseNames.length} ejercicios`)
    } catch {
      toast.error('No se ha podido copiar el prompt')
    }
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!file.name.toLowerCase().endsWith('.json') && !file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Selecciona un archivo .json o .csv')
      return
    }

    try {
      const text = await file.text()
      const result = parseTrainingImport(file.name, text, exercisesQuery.data?.data ?? [])

      setEditingTraining(null)
      setIsDuplicate(false)
      setImportedValues(result.values)
      setImportIssues(result.issues)
      setFormDialogOpen(true)

      if (result.issues.length > 0) {
        toast.warning('Entrenamiento importado con avisos. Revisa ejercicios no enlazados.')
        return
      }

      toast.success('Entrenamiento importado. Revisa y guarda para crear.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se ha podido importar el archivo')
    }
  }

  const handleView = (training: Training) => {
    setSelectedTraining(training)
    setDetailDialogOpen(true)
  }

  const handleEdit = (training: Training) => {
    setEditingTraining(training)
    setIsDuplicate(false)
    setFormDialogOpen(true)
  }

  const handleDuplicate = (training: Training) => {
    setEditingTraining(training)
    setIsDuplicate(true)
    setFormDialogOpen(true)
  }

  const handleDelete = (training: Training) => {
    setSelectedTraining(training)
    setDeleteDialogOpen(true)
  }

  const handleFormDialogOpenChange = (open: boolean) => {
    setFormDialogOpen(open)

    if (!open) {
      setEditingTraining(null)
      setIsDuplicate(false)
      setImportedValues(null)
      setImportIssues([])
    }
  }

  const handleDetailDialogOpenChange = (open: boolean) => {
    setDetailDialogOpen(open)

    if (!open) {
      setSelectedTraining(null)
    }
  }

  const handleDeleteDialogOpenChange = (open: boolean) => {
    setDeleteDialogOpen(open)

    if (!open) {
      setSelectedTraining(null)
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* Page header */}
        <TrainingsPageHeader
          total={total}
          importInputRef={importInputRef}
          onImportFile={handleImportFile}
          onImportClick={handleImportClick}
          importDisabled={exercisesQuery.isLoading}
          onOpenImportPrompt={() => setImportPromptOpen(true)}
          onCreate={handleCreate}
        />

        <CatalogGroupStrip
          groups={groups}
          activeFilter={groupFilter}
          onFilterChange={setGroupFilter}
          disabled={organizationPending}
          onCreate={() => {
            setGroupToEdit(null)
            setGroupDialogOpen(true)
          }}
          onEdit={(group) => {
            setGroupToEdit(group)
            setGroupDialogOpen(true)
          }}
          onDelete={setGroupToDelete}
        />

        {/* Content */}
        {trainingsQuery.isLoading ? (
          <TrainingsTableSkeleton />
        ) : trainingsQuery.isError ? (
          <TrainingsErrorCard
            message={getApiErrorMessage(
              trainingsQuery.error,
              'Inténtalo de nuevo en unos segundos.'
            )}
            onRetry={() => trainingsQuery.refetch()}
          />
        ) : total === 0 && !hasQuery ? (
          <TrainingsEmptyCard onCreate={handleCreate} />
        ) : (
          <TrainingsListPanel
            title={
              activeGroupName ? `Entrenamientos · ${activeGroupName}` : 'Listado de entrenamientos'
            }
            search={search}
            onSearchChange={setSearch}
            sections={sections}
            filters={filters}
            trainings={trainings}
            approvalById={trainingApprovalById}
            onView={handleView}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            sortBy={sort.sort_by}
            sortDir={sort.sort_dir}
            onSortChange={(field) => toggleSortSearchParams(setSearchParams, field)}
            movementDisabled={organizationPending}
            trainingTypeColors={trainingTypeColorsQuery.data}
            page={page}
            totalPages={totalPages}
            onPreviousPage={() =>
              replacePaginationSearchParams(setSearchParams, {
                page: Math.max(1, page - 1),
              })
            }
            onNextPage={() =>
              replacePaginationSearchParams(setSearchParams, {
                page: Math.min(totalPages, page + 1),
              })
            }
          />
        )}

        {/* Dialogs */}
        {selectedIds.size > 0 && (
          <TrainingsSelectionBar
            count={selectedIds.size}
            disabled={organizationPending}
            onMove={() => setMoveDialogOpen(true)}
          />
        )}
        <CatalogGroupDialog
          open={groupDialogOpen}
          onOpenChange={setGroupDialogOpen}
          group={groupToEdit}
          pending={organizationPending}
          onSubmit={handleGroupSubmit}
        />
        <DeleteCatalogGroupDialog
          open={Boolean(groupToDelete)}
          onOpenChange={(open) => !open && setGroupToDelete(null)}
          group={groupToDelete}
          pending={organizationPending}
          onConfirm={() =>
            groupToDelete &&
            deleteGroup.mutate(groupToDelete.id, {
              onSuccess: () => {
                if (groupFilter === groupToDelete.id) setGroupFilter('all')
                setGroupToDelete(null)
                toast.success('Grupo eliminado')
              },
              onError: (error) =>
                toast.error(getApiErrorMessage(error, 'No se pudo eliminar el grupo')),
            })
          }
        />
        <MoveToGroupDialog
          open={moveDialogOpen}
          onOpenChange={setMoveDialogOpen}
          groups={groups}
          count={selectedIds.size}
          pending={organizationPending}
          onConfirm={(groupId) => handleMove([...selectedIds], groupId)}
        />
        <TrainingFormDialog
          open={formDialogOpen && (!editingTraining || Boolean(editingTrainingDetailQuery.data))}
          onOpenChange={handleFormDialogOpenChange}
          training={editingTraining ? editingTrainingDetailQuery.data : null}
          isDuplicate={isDuplicate}
          importedValues={importedValues}
          importIssues={importIssues}
          onSaved={() => {
            if (!editingTraining || isDuplicate) {
              replacePaginationSearchParams(setSearchParams, { page: 1 })
              setSearch('')
            }
          }}
        />

        <TrainingDetailDialog
          training={selectedTrainingDetailQuery.data ?? null}
          open={detailDialogOpen}
          onOpenChange={handleDetailDialogOpenChange}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
        />

        <DeleteTrainingDialog
          training={selectedTraining}
          open={deleteDialogOpen}
          onOpenChange={handleDeleteDialogOpenChange}
          onDeleted={() => replacePaginationSearchParams(setSearchParams, { page: 1 })}
        />

        <AiImportPromptDialog
          open={importPromptOpen}
          onOpenChange={setImportPromptOpen}
          catalogLoading={exercisesQuery.isLoading}
          catalogError={exercisesQuery.isError}
          catalogCount={exercisesQuery.data?.data.length ?? 0}
          onCopyTemplate={handleCopyImportPrompt}
          onCopyWithCatalog={handleCopyImportPromptWithCatalog}
        />
      </div>
    </DndContext>
  )
}
