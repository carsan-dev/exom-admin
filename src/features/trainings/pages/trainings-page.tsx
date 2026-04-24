import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Dumbbell, Plus } from 'lucide-react'
import {
  FilterToolbar,
  filtersToApiParams,
  type FilterOption,
  type FilterSectionConfig,
  useListFilters,
} from '@/components/filters'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useResourceApprovalBatch } from '@/features/approval-requests/api'
import { buildResourceApprovalMap } from '@/features/approval-requests/types'
import {
  getApiErrorMessage,
  type TrainingsListParams,
  useTrainingTags,
  useTrainings,
} from '../api'
import { DeleteTrainingDialog } from '../components/delete-training-dialog'
import { TrainingDetailDialog } from '../components/training-detail-dialog'
import { TrainingFormDialog } from '../components/training-form-dialog'
import { TrainingsTable } from '../components/trainings-table'
import type { Training } from '../types'

const PAGE_SIZE = 10
const LEVEL_OPTIONS: FilterOption[] = [
  { value: 'PRINCIPIANTE', label: 'Principiante' },
  { value: 'INTERMEDIO', label: 'Intermedio' },
  { value: 'AVANZADO', label: 'Avanzado' },
]
const TRAINING_TYPE_OPTIONS: FilterOption[] = [
  { value: 'FUERZA', label: 'Fuerza' },
  { value: 'CARDIO', label: 'Cardio' },
  { value: 'HIIT', label: 'HIIT' },
  { value: 'FLEXIBILIDAD', label: 'Flexibilidad' },
]

function toFilterOptions(values?: string[]): FilterOption[] {
  return values?.map((value) => ({ value, label: value })) ?? []
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
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null)
  const [editingTraining, setEditingTraining] = useState<Training | null>(null)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const deferredSearch = useDeferredValue(search)
  const activeSearch = deferredSearch.trim()
  const tagsQuery = useTrainingTags()
  const sections = useMemo<FilterSectionConfig[]>(
    () => [
      {
        type: 'multi',
        key: 'type',
        label: 'Tipo',
        options: TRAINING_TYPE_OPTIONS,
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
    [tagsQuery.data, tagsQuery.isLoading]
  )
  const filters = useListFilters(sections)
  const trainingFilterParams = filtersToApiParams(filters.values, sections) as Partial<TrainingsListParams>

  useEffect(() => {
    setPage(1)
  }, [activeSearch, filters.values])

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
    setFormDialogOpen(true)
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

        <Button onClick={handleCreate} className="lg:self-start">
          <Plus className="h-4 w-4" />
          Nuevo entrenamiento
        </Button>
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
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
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
        onSaved={() => {
          if (!editingTraining || isDuplicate) {
            setPage(1)
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
        onDeleted={() => setPage(1)}
      />
    </div>
  )
}
