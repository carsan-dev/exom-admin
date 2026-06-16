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
import {
  getApiErrorMessage,
  type TrainingsListParams,
  useTrainingTags,
  useTrainingTypes,
  useTrainings,
  useExercisesList,
} from '../api'
import { DeleteTrainingDialog } from '../components/delete-training-dialog'
import { TrainingDetailDialog } from '../components/training-detail-dialog'
import { TrainingFormDialog } from '../components/training-form-dialog'
import { TrainingsTable } from '../components/trainings-table'
import { parseTrainingImport } from '../import-training'
import { getTrainingTypeLabel, type Training } from '../types'
import type { TrainingFormValues } from '../schemas'

const PAGE_SIZE = 10
const LEVEL_OPTIONS: FilterOption[] = [
  { value: 'PRINCIPIANTE', label: 'Principiante' },
  { value: 'INTERMEDIO', label: 'Intermedio' },
  { value: 'AVANZADO', label: 'Avanzado' },
]

const AI_IMPORT_PROMPT = `Genera un entrenamiento para EXOM en JSON valido, sin markdown y sin texto adicional.

IMPORTANTE:
- Sustituye todas las partes marcadas como [MODIFICAR].
- Usa solo nombres exactos de ejercicios del catalogo EXOM.
- Cada ejercicio suelto debe tener kind "EXERCISE".
- Cada circuito debe tener kind "CIRCUIT" y una lista exercises.
- En circuitos, cada ejercicio representa 1 serie por ronda.
- level solo puede ser: "PRINCIPIANTE", "INTERMEDIO" o "AVANZADO".

Catalogo de ejercicios disponible:
[MODIFICAR: pega aqui los nombres exactos de ejercicios del catalogo EXOM, uno por linea]

Objetivo del entrenamiento:
[MODIFICAR: describe objetivo, nivel, duracion, material disponible, lesiones, foco muscular y restricciones]

Devuelve exactamente este JSON:

{
  "name": "[MODIFICAR: nombre del entrenamiento]",
  "types": ["[MODIFICAR: tipo principal, ej. Fuerza]"],
  "accentColor": "[MODIFICAR: color hex, ej. #C5E384, o null]",
  "level": "[MODIFICAR: PRINCIPIANTE | INTERMEDIO | AVANZADO]",
  "estimated_duration_min": [MODIFICAR: numero de minutos o null],
  "estimated_calories": [MODIFICAR: kcal estimadas o null],
  "warmup_description": "[MODIFICAR: calentamiento breve o cadena vacia]",
  "warmup_duration_min": [MODIFICAR: minutos de calentamiento o null],
  "cooldown_description": "[MODIFICAR: vuelta a la calma o cadena vacia]",
  "tags": ["[MODIFICAR: etiqueta 1]", "[MODIFICAR: etiqueta 2]"],
  "items": [
    {
      "kind": "EXERCISE",
      "exercise_name": "[MODIFICAR: nombre exacto del ejercicio 1]",
      "sets": [MODIFICAR: numero de series],
      "reps_or_duration": "[MODIFICAR: reps o duracion, ej. 10, 12-15, 30s]",
      "rest_seconds": [MODIFICAR: descanso entre series en segundos]
    },
    {
      "kind": "CIRCUIT",
      "name": "[MODIFICAR: nombre del circuito]",
      "rounds": [MODIFICAR: numero de rondas],
      "rest_between_rounds_seconds": [MODIFICAR: descanso entre rondas en segundos],
      "exercises": [
        {
          "exercise_name": "[MODIFICAR: nombre exacto del ejercicio del circuito 1]",
          "reps_or_duration": "[MODIFICAR: reps o duracion de 1 serie]",
          "rest_seconds": [MODIFICAR: descanso tras este ejercicio dentro de la ronda]
        },
        {
          "exercise_name": "[MODIFICAR: nombre exacto del ejercicio del circuito 2]",
          "reps_or_duration": "[MODIFICAR: reps o duracion de 1 serie]",
          "rest_seconds": [MODIFICAR: descanso tras este ejercicio dentro de la ronda]
        }
      ]
    }
  ]
}`

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
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const page = getPageSearchParam(searchParams.get('page'))
  const deferredSearch = useDeferredValue(search)
  const activeSearch = deferredSearch.trim()
  const tagsQuery = useTrainingTags()
  const trainingTypesQuery = useTrainingTypes()
  const exercisesQuery = useExercisesList()
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
  const pageResetKey = `${activeSearch}::${JSON.stringify(trainingFilterParams)}`
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
    ...trainingFilterParams,
  })
  const trainings = trainingsQuery.data?.data ?? []
  const trainingApprovalQuery = useResourceApprovalBatch(
    'training',
    trainings.map((training) => training.id)
  )
  const trainingApprovalById = buildResourceApprovalMap(trainingApprovalQuery.data ?? [])
  const total = trainingsQuery.data?.total ?? 0
  const totalPages = Math.max(1, trainingsQuery.data?.totalPages ?? 1)
  const hasActiveFilters = filters.activeCount > 0
  const hasQuery = activeSearch.length > 0 || hasActiveFilters

  const handleCreate = () => {
    setEditingTraining(null)
    setIsDuplicate(false)
    setImportedValues(null)
    setImportIssues([])
    setFormDialogOpen(true)
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleCopyImportPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_IMPORT_PROMPT)
      toast.success('Prompt copiado')
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
            <CardTitle className="text-xl">Listado de entrenamientos</CardTitle>
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
      <TrainingFormDialog
        open={formDialogOpen}
        onOpenChange={handleFormDialogOpenChange}
        training={editingTraining}
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
        training={selectedTraining}
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
            En cada ejercicio usa el nombre exacto del catálogo para que EXOM pueda enlazarlo.
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={handleCopyImportPrompt}>
              <Copy className="h-4 w-4" />
              Copiar prompt
            </Button>
          </div>

          <pre className="max-h-[56vh] overflow-auto rounded-lg border border-border bg-muted/40 p-4 text-xs leading-relaxed text-foreground">
            <code>{AI_IMPORT_PROMPT}</code>
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}
