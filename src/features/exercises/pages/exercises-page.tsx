import { useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Dumbbell, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { normalizeSearchText } from '@/lib/search'
import { useResourceApprovalBatch } from '@/features/approval-requests/api'
import { buildResourceApprovalMap } from '@/features/approval-requests/types'
import { getApiErrorMessage, useExercises } from '../api'
import { DeleteExerciseDialog } from '../components/delete-exercise-dialog'
import { ExerciseDetailDialog } from '../components/exercise-detail-dialog'
import { ExerciseFormDialog } from '../components/exercise-form-dialog'
import { ExercisesTable } from '../components/exercises-table'
import type { Exercise } from '../types'

const PAGE_SIZE = 10

function ExercisesTableSkeleton() {
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

export function ExercisesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)

  const exercisesQuery = useExercises(page, PAGE_SIZE)
  const allExercises = exercisesQuery.data?.data ?? []
  const exerciseApprovalQuery = useResourceApprovalBatch('exercise', allExercises.map((exercise) => exercise.id))
  const exerciseApprovalById = buildResourceApprovalMap(exerciseApprovalQuery.data ?? [])
  const total = exercisesQuery.data?.total ?? 0
  const totalPages = exercisesQuery.data?.totalPages ?? 1
  const normalizedSearch = normalizeSearchText(search.trim())

  // Client-side search filter on the current page
  const exercises = normalizedSearch
    ? allExercises.filter((e) =>
        normalizeSearchText(e.name).includes(normalizedSearch)
      )
    : allExercises

  const handleCreate = () => {
    setEditingExercise(null)
    setFormDialogOpen(true)
  }

  const handleView = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setDetailDialogOpen(true)
  }

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise)
    setFormDialogOpen(true)
  }

  const handleDelete = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-none [isolation:isolate] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] sm:shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-primary">Catálogo</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Ejercicios</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Gestiona el catálogo completo de ejercicios. Crea, edita y adjunta videos instructivos para cada movimiento.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `${total} ejercicios en el catálogo` : 'Aún no hay ejercicios en el catálogo'}
          </p>
        </div>

        <Button onClick={handleCreate} className="lg:self-start">
          <Plus className="h-4 w-4" />
          Nuevo ejercicio
        </Button>
      </div>

      {/* Content */}
      {exercisesQuery.isLoading ? (
        <ExercisesTableSkeleton />
      ) : exercisesQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
            <div className="rounded-full bg-status-error/10 p-4 text-status-error">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">No se ha podido cargar el catálogo</h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                {getApiErrorMessage(exercisesQuery.error, 'Inténtalo de nuevo en unos segundos.')}
              </p>
            </div>
            <Button onClick={() => exercisesQuery.refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      ) : allExercises.length === 0 ? (
        <Card className="border-dashed border-border/70">
          <CardContent className="flex flex-col items-center gap-4 pt-10 text-center">
            <div className="rounded-full bg-brand-soft/10 p-4 text-brand-primary">
              <Dumbbell className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">Aún no hay ejercicios</h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                Crea el primer ejercicio para empezar a construir el catálogo que usarán tus clientes.
              </p>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Crear primer ejercicio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Listado de ejercicios</CardTitle>
            <CardDescription>Vista paginada del catálogo con búsqueda y acciones por ejercicio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {exercises.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No se encontraron ejercicios con "{search}"
              </p>
            ) : (
              <ExercisesTable
                exercises={exercises}
                approvalById={exerciseApprovalById}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}

            {/* Pagination */}
            {!search && (
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <ExerciseFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        exercise={editingExercise}
        onSaved={() => {
          if (!editingExercise) setPage(1)
        }}
      />

      <ExerciseDetailDialog
        exercise={selectedExercise}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onEdit={handleEdit}
      />

      <DeleteExerciseDialog
        exercise={selectedExercise}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={() => setPage(1)}
      />
    </div>
  )
}
