import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Dumbbell,
  Info,
  Plus,
  Upload,
} from 'lucide-react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import {
  FilterToolbar,
  filtersToApiParams,
  type FilterOption,
  type FilterSectionConfig,
  useListFilters,
} from '@/components/filters'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useResourceApprovalBatch } from '@/features/approval-requests/api'
import { buildResourceApprovalMap } from '@/features/approval-requests/types'
import {
  getPageSearchParam,
  replacePaginationSearchParams,
} from '@/lib/pagination-search-params'
import { getSortSearchParams, toggleSortSearchParams } from '@/lib/sort-search-params'
import {
  getApiErrorMessage,
  type TrainingsListParams,
  useTraining,
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
import { DeleteTrainingDialog } from '../components/delete-training-dialog'
import { TrainingDetailDialog } from '../components/training-detail-dialog'
import { TrainingFormDialog } from '../components/training-form-dialog'
import { TrainingsTable } from '../components/trainings-table'
import { parseTrainingImport } from '../import-training'
import { getTrainingTypeLabel, type Training } from '../types'
import type { TrainingFormValues } from '../schemas'
import type { CatalogGroup, CatalogGroupFilter } from '../../catalog-groups/types'
import { CatalogGroupStrip } from '../../catalog-groups/components/catalog-group-strip'
import { CatalogGroupDialog, DeleteCatalogGroupDialog, MoveToGroupDialog } from '../../catalog-groups/components/catalog-group-dialogs'
import { resolveDraggedCatalogIds } from '../../catalog-groups/drag-selection'

const PAGE_SIZE = 10
const LEVEL_OPTIONS: FilterOption[] = [
  { value: 'PRINCIPIANTE', label: 'Principiante' },
  { value: 'INTERMEDIO', label: 'Intermedio' },
  { value: 'AVANZADO', label: 'Avanzado' },
]

const AI_IMPORT_PROMPT = `Genera un entrenamiento para EXOM en JSON válido, sin markdown y sin texto adicional.

IMPORTANTE:
- Sustituye todas las partes marcadas como [MODIFICAR].
- Usa solo nombres exactos de ejercicios del catálogo EXOM.
- Cada ejercicio suelto debe tener kind "EXERCISE".
- Cada circuito debe tener kind "CIRCUIT" y una lista exercises.
- En circuitos, cada ejercicio representa 1 serie por ronda.
- Si NO hay circuito, no incluyas ningún objeto kind "CIRCUIT".
- Si hay varios ejercicios sueltos, repite el bloque kind "EXERCISE" dentro de items.
- Si hay varios circuitos, repite el bloque kind "CIRCUIT" dentro de items.
- level solo puede ser: "PRINCIPIANTE", "INTERMEDIO" o "AVANZADO".

Catálogo de ejercicios disponible:
[MODIFICAR: pega aquí los nombres exactos de ejercicios del catálogo EXOM, uno por línea]

Objetivo del entrenamiento:
[MODIFICAR: describe objetivo, nivel, duración, material disponible, lesiones, foco muscular y restricciones]

Devuelve exactamente este JSON:

{
  "name": "[MODIFICAR: nombre del entrenamiento]",
  "types": ["[MODIFICAR: tipo principal, ej. Fuerza]"],
  "accentColor": "[MODIFICAR: color hex, ej. #C5E384, o null]",
  "level": "[MODIFICAR: PRINCIPIANTE | INTERMEDIO | AVANZADO]",
  "estimated_duration_min": [MODIFICAR: número de minutos o null],
  "estimated_calories": [MODIFICAR: kcal estimadas o null],
  "warmup_description": "[MODIFICAR: calentamiento breve o cadena vacia]",
  "warmup_duration_min": [MODIFICAR: minutos de calentamiento o null],
  "cooldown_description": "[MODIFICAR: vuelta a la calma o cadena vacia]",
  "tags": ["[MODIFICAR: etiqueta 1]", "[MODIFICAR: etiqueta 2]"],
  "items": [
    {
      "kind": "EXERCISE",
      "exercise_name": "[MODIFICAR: nombre exacto del ejercicio 1]",
      "sets": [MODIFICAR: número de series],
      "reps_or_duration": "[MODIFICAR: reps o duración, ej. 10, 12-15, 30s]",
      "rest_seconds": [MODIFICAR: descanso entre series en segundos]
    },
    {
      "kind": "EXERCISE",
      "exercise_name": "[MODIFICAR: nombre exacto del ejercicio 2; duplica este bloque para más ejercicios]",
      "sets": [MODIFICAR: número de series],
      "reps_or_duration": "[MODIFICAR: reps o duración]",
      "rest_seconds": [MODIFICAR: descanso entre series en segundos]
    },
    {
      "kind": "CIRCUIT",
      "name": "[MODIFICAR: nombre del circuito; elimina este bloque completo si no hay circuito]",
      "rounds": [MODIFICAR: número de rondas],
      "rest_between_rounds_seconds": [MODIFICAR: descanso entre rondas en segundos],
      "exercises": [
        {
          "exercise_name": "[MODIFICAR: nombre exacto del ejercicio del circuito 1]",
          "reps_or_duration": "[MODIFICAR: reps o duración de 1 serie]",
          "rest_seconds": [MODIFICAR: descanso tras este ejercicio dentro de la ronda]
        },
        {
          "exercise_name": "[MODIFICAR: nombre exacto del ejercicio del circuito 2]",
          "reps_or_duration": "[MODIFICAR: reps o duración de 1 serie]",
          "rest_seconds": [MODIFICAR: descanso tras este ejercicio dentro de la ronda]
        }
      ]
    }
  ]
}

CASO SIN CIRCUITO:
- items debe contener solo objetos kind "EXERCISE".
- elimina por completo el bloque kind "CIRCUIT".

CASO CON VARIOS EJERCICIOS:
- añade un objeto kind "EXERCISE" por cada ejercicio suelto.
- no metas varios nombres dentro del mismo exercise_name.

CASO CON CIRCUITO:
- dentro del circuito, añade un objeto en exercises por cada ejercicio del circuito.
- rounds indica cuántas veces se repite la lista completa.
- cada ejercicio del circuito es 1 serie por ronda.`

const AI_IMPORT_GUIDE_STEPS = [
  {
    title: 'Varios ejercicios sueltos',
    text: 'Repite un bloque kind "EXERCISE" dentro de items por cada ejercicio. No juntes varios nombres en exercise_name.',
  },
  {
    title: 'Sin circuito',
    text: 'Elimina por completo el bloque kind "CIRCUIT". El array items queda solo con ejercicios sueltos.',
  },
  {
    title: 'Con circuito',
    text: 'Incluye un bloque kind "CIRCUIT". Dentro de exercises pon cada ejercicio del circuito; rounds marca cuántas rondas se repite la lista.',
  },
]

const AI_IMPORT_NO_CIRCUIT_EXAMPLE = `{
  "items": [
    {
      "kind": "EXERCISE",
      "exercise_name": "Sentadilla goblet",
      "sets": 3,
      "reps_or_duration": "10",
      "rest_seconds": 60
    },
    {
      "kind": "EXERCISE",
      "exercise_name": "Press banca",
      "sets": 4,
      "reps_or_duration": "8",
      "rest_seconds": 90
    }
  ]
}`

const AI_IMPORT_CIRCUIT_EXAMPLE = `{
  "items": [
    {
      "kind": "CIRCUIT",
      "name": "Circuito final",
      "rounds": 3,
      "rest_between_rounds_seconds": 60,
      "exercises": [
        {
          "exercise_name": "Jumping jacks",
          "reps_or_duration": "30s",
          "rest_seconds": 15
        },
        {
          "exercise_name": "Mountain climbers",
          "reps_or_duration": "20",
          "rest_seconds": 15
        }
      ]
    }
  ]
}`

function buildImportPromptWithExerciseCatalog(exerciseNames: string[]) {
  const catalog = exerciseNames.length > 0
    ? exerciseNames.map((name) => `- ${name}`).join('\n')
    : '[MODIFICAR: pega aquí los nombres exactos de ejercicios del catálogo EXOM, uno por línea]'

  return AI_IMPORT_PROMPT.replace(
    '[MODIFICAR: pega aquí los nombres exactos de ejercicios del catálogo EXOM, uno por línea]',
    catalog
  )
}

function toFilterOptions(values: string[] | undefined, getLabel?: (value: string) => string): FilterOption[] {
  return values?.map((value) => ({ value, label: getLabel ? getLabel(value) : value })) ?? []
}

function TrainingsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  )
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
  const trainingFilterParams = filtersToApiParams(filters.values, sections) as Partial<TrainingsListParams>
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
  const activeGroupName = groupFilter === 'all' ? null : groupFilter === 'ungrouped' ? 'Sin grupo' : groups.find((group) => group.id === groupFilter)?.name ?? null
  const organizationPending = createGroup.isPending || updateGroup.isPending || deleteGroup.isPending || moveMembership.isPending

  useEffect(() => { setSelectedIds(new Set()) }, [pageResetKey])

  const handleGroupSubmit = (name: string) => {
    const mutation = groupToEdit ? updateGroup.mutateAsync({ id: groupToEdit.id, name }) : createGroup.mutateAsync(name)
    mutation.then(() => { setGroupDialogOpen(false); setGroupToEdit(null); toast.success('Grupo guardado') }).catch((error) => toast.error(getApiErrorMessage(error, 'No se pudo guardar el grupo')))
  }

  const handleMove = (ids: string[], groupId: string | null) => {
    moveMembership.mutate({ ids, groupId }, {
      onSuccess: (result) => { setSelectedIds(new Set()); setMoveDialogOpen(false); toast.success(`${result.affected_count} elementos movidos`) },
      onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudieron mover los elementos')),
    })
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
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-none sm:shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-primary">
            Catálogo
          </p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Entrenamientos
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Gestiona el catálogo de entrenamientos. Crea rutinas con ejercicios, series, reps y
              más.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {total > 0
              ? `${total} entrenamientos en el catálogo`
              : 'Aún no hay entrenamientos en el catálogo'}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:self-start">
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleImportClick}
            disabled={exercisesQuery.isLoading}
          >
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setImportPromptOpen(true)}
                  aria-label="Ver prompt para generar entrenamientos importables"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Prompt para IA</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Nuevo entrenamiento
          </Button>
        </div>
      </div>

      <CatalogGroupStrip groups={groups} activeFilter={groupFilter} onFilterChange={setGroupFilter} disabled={organizationPending} onCreate={() => { setGroupToEdit(null); setGroupDialogOpen(true) }} onEdit={(group) => { setGroupToEdit(group); setGroupDialogOpen(true) }} onDelete={setGroupToDelete} />

      {/* Content */}
      {trainingsQuery.isLoading ? (
        <TrainingsTableSkeleton />
      ) : trainingsQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
            <div className="rounded-full bg-status-error/10 p-4 text-status-error">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">
                No se ha podido cargar el catálogo
              </h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                {getApiErrorMessage(trainingsQuery.error, 'Inténtalo de nuevo en unos segundos.')}
              </p>
            </div>
            <Button onClick={() => trainingsQuery.refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      ) : total === 0 && !hasQuery ? (
        <Card className="border-dashed border-border/70">
          <CardContent className="flex flex-col items-center gap-4 pt-10 text-center">
            <div className="rounded-full bg-brand-soft/10 p-4 text-brand-primary">
              <Dumbbell className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">Aún no hay entrenamientos</h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                Crea el primer entrenamiento para empezar a asignarlo a tus clientes.
              </p>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Crear primer entrenamiento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{activeGroupName ? `Entrenamientos · ${activeGroupName}` : 'Listado de entrenamientos'}</CardTitle>
            <CardDescription>
              Vista paginada del catálogo con búsqueda y acciones por entrenamiento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FilterToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por nombre..."
              sections={sections}
              filters={filters}
            />

            {trainings.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No se encontraron entrenamientos con la búsqueda y filtros actuales.
              </p>
            ) : (
              <TrainingsTable
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
              />
            )}

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    replacePaginationSearchParams(setSearchParams, {
                      page: Math.max(1, page - 1),
                    })
                  }
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    replacePaginationSearchParams(setSearchParams, {
                      page: Math.min(totalPages, page + 1),
                    })
                  }
                  disabled={page >= totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {selectedIds.size > 0 && <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border bg-card p-2 shadow-lg"><Button disabled={organizationPending} onClick={() => setMoveDialogOpen(true)}>Mover a grupo ({selectedIds.size})</Button></div>}
      <CatalogGroupDialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen} group={groupToEdit} pending={organizationPending} onSubmit={handleGroupSubmit} />
      <DeleteCatalogGroupDialog open={Boolean(groupToDelete)} onOpenChange={(open) => !open && setGroupToDelete(null)} group={groupToDelete} pending={organizationPending} onConfirm={() => groupToDelete && deleteGroup.mutate(groupToDelete.id, { onSuccess: () => { if (groupFilter === groupToDelete.id) setGroupFilter('all'); setGroupToDelete(null); toast.success('Grupo eliminado') }, onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo eliminar el grupo')) })} />
      <MoveToGroupDialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen} groups={groups} count={selectedIds.size} pending={organizationPending} onConfirm={(groupId) => handleMove([...selectedIds], groupId)} />
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

      <Dialog open={importPromptOpen} onOpenChange={setImportPromptOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader className="pr-8">
            <DialogTitle>Prompt para generar JSON compatible</DialogTitle>
            <DialogDescription>
              Copia esta plantilla en tu IA. Cambia cada bloque [MODIFICAR] antes de generar el
              archivo para importar.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
            Las partes entre <span className="font-semibold">[MODIFICAR]</span> son obligatorias.
            Si no hay circuito, elimina el bloque <span className="font-semibold">CIRCUIT</span>.
            Si hay varios ejercicios, duplica bloques <span className="font-semibold">EXERCISE</span>.
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
            {exercisesQuery.isLoading
              ? 'Cargando catálogo de ejercicios para poder incluirlo automáticamente...'
              : exercisesQuery.isError
                ? 'No se ha podido cargar el catálogo. Puedes copiar la plantilla y pegar los nombres manualmente.'
                : `El botón "Copiar con catálogo" incluirá ${exercisesQuery.data?.data.length ?? 0} ejercicios cargados.`}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {AI_IMPORT_GUIDE_STEPS.map((step) => (
              <div key={step.title} className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Ejemplo sin circuito</p>
              <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-foreground">
                <code>{AI_IMPORT_NO_CIRCUIT_EXAMPLE}</code>
              </pre>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Ejemplo con circuito</p>
              <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-foreground">
                <code>{AI_IMPORT_CIRCUIT_EXAMPLE}</code>
              </pre>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={handleCopyImportPrompt}>
              <Copy className="h-4 w-4" />
              Copiar plantilla
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCopyImportPromptWithCatalog}
              disabled={exercisesQuery.isLoading || (exercisesQuery.data?.data.length ?? 0) === 0}
            >
              <Copy className="h-4 w-4" />
              Copiar con catálogo
            </Button>
          </div>

          <pre className="max-h-[56vh] overflow-auto rounded-lg border border-border bg-muted/40 p-4 text-xs leading-relaxed text-foreground">
            <code>{AI_IMPORT_PROMPT}</code>
          </pre>
        </DialogContent>
      </Dialog>
    </div>
    </DndContext>
  )
}
