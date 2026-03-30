import { useEffect, useState } from 'react'
import { addDays, addWeeks, format, parseISO, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, CalendarDays, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSearchParams } from 'react-router'
import {
  buildCatalogAvailability,
  getApiErrorMessage,
  isUuidString,
  useAssignmentClients,
  useAssignmentDietsCatalog,
  useAssignmentsWeek,
  useAssignmentTrainingsCatalog,
  useBulkAssign,
  useCopyWeek,
  useDeleteAssignment,
  useUpdateAssignment,
} from '../api'
import { AssignmentEditorDialog } from '../components/assignment-editor-dialog'
import { AssignmentsCatalogErrorState } from '../components/assignments-catalog-error-state'
import { AssignmentsEmptyState } from '../components/assignments-empty-state'
import { AssignmentsToolbar } from '../components/assignments-toolbar'
import { AssignmentsWeekGrid } from '../components/assignments-week-grid'
import { CopyWeekDialog } from '../components/copy-week-dialog'
import { CopyWeekPreviewDialog } from '../components/copy-week-preview-dialog'
import type { AssignmentDay, AssignmentEditorValues, CopyWeekValues } from '../types'
import { buildAssignmentSummary, buildCopyWeekPreview } from '../types'

function formatIsoDate(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

function getCurrentWeekStart() {
  return formatIsoDate(startOfWeek(new Date(), { weekStartsOn: 1 }))
}

function buildPlaceholderWeek(weekStart: string, clientId: string): AssignmentDay[] {
  const start = parseISO(weekStart)

  return Array.from({ length: 7 }, (_, index) => ({
    id: null,
    client_id: clientId,
    date: formatIsoDate(addDays(start, index)),
    is_rest_day: false,
    training: null,
    diet: null,
  }))
}

function formatWeekLabel(weekStart: string) {
  const start = parseISO(weekStart)
  const end = addDays(start, 6)

  return `${format(start, "d 'de' MMMM", { locale: es })} - ${format(end, "d 'de' MMMM", { locale: es })}`
}

function AssignmentsPageSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <div className="grid gap-4 xl:grid-cols-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-52 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

export function AssignmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [copyWeekOpen, setCopyWeekOpen] = useState(false)
  const [copyPreviewOpen, setCopyPreviewOpen] = useState(false)
  const [pendingCopyValues, setPendingCopyValues] = useState<CopyWeekValues | null>(null)
  const selectedClientIdParam = searchParams.get('clientId')
  const selectedClientId = isUuidString(selectedClientIdParam) ? selectedClientIdParam : ''

  const clientsQuery = useAssignmentClients()
  const trainingsQuery = useAssignmentTrainingsCatalog()
  const dietsQuery = useAssignmentDietsCatalog()
  const assignmentsQuery = useAssignmentsWeek(selectedClientId || undefined, weekStart)

  const bulkAssign = useBulkAssign()
  const copyWeek = useCopyWeek()
  const updateAssignment = useUpdateAssignment()
  const deleteAssignment = useDeleteAssignment()

  const clients = clientsQuery.data ?? []
  const trainings = trainingsQuery.data ?? []
  const diets = dietsQuery.data ?? []
  const catalogAvailability = buildCatalogAvailability({
    trainingsCount: trainings.length,
    trainingsLoading: trainingsQuery.isLoading,
    trainingsError: trainingsQuery.isError,
    trainingsErrorReason: trainingsQuery.error,
    dietsCount: diets.length,
    dietsLoading: dietsQuery.isLoading,
    dietsError: dietsQuery.isError,
    dietsErrorReason: dietsQuery.error,
  })
  const days = assignmentsQuery.data?.days ?? buildPlaceholderWeek(weekStart, selectedClientId)
  const selectedDays = days.filter((day) => selectedDates.includes(day.date))
  const selectedExistingDay = selectedDays.length === 1 && selectedDays[0]?.id ? selectedDays[0] : null
  const summary = buildAssignmentSummary(days)
  const hasAssignmentsInWeek = summary.training_days > 0 || summary.diet_days > 0 || summary.rest_days > 0
  const isMutating = bulkAssign.isPending || copyWeek.isPending || updateAssignment.isPending || deleteAssignment.isPending
  const canOpenEditor = selectedDates.length > 0 && (catalogAvailability.can_use_any_plan_catalog || catalogAvailability.is_rest_only)
  const canCopyWeek = Boolean(selectedClientId) && !assignmentsQuery.isLoading && !assignmentsQuery.isError
  const assignActionLabel = catalogAvailability.is_rest_only
    ? 'Marcar descanso'
    : selectedDates.length > 1
      ? 'Asignar seleccion'
      : 'Editar seleccion'
  const copyPreview = pendingCopyValues && selectedClientId
    ? buildCopyWeekPreview(
        selectedClientId,
        pendingCopyValues.source_week_start,
        pendingCopyValues.target_week_start,
        days,
      )
    : null

  useEffect(() => {
    setSelectedDates([])
    setEditorOpen(false)
    setCopyWeekOpen(false)
    setCopyPreviewOpen(false)
    setPendingCopyValues(null)
  }, [selectedClientId, weekStart])

  useEffect(() => {
    if (!selectedClientIdParam) {
      return
    }

    if (isUuidString(selectedClientIdParam)) {
      return
    }

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('clientId')
    setSearchParams(nextSearchParams, { replace: true })
  }, [searchParams, selectedClientIdParam, setSearchParams])

  const handleClientChange = (clientId: string) => {
    const nextSearchParams = new URLSearchParams(searchParams)

    if (isUuidString(clientId)) {
      nextSearchParams.set('clientId', clientId)
    } else {
      nextSearchParams.delete('clientId')
    }

    setSearchParams(nextSearchParams, { replace: true })
  }

  const toggleDaySelection = (date: string) => {
    setSelectedDates((current) =>
      current.includes(date)
        ? current.filter((item) => item !== date)
        : [...current, date].sort(),
    )
  }

  const changeWeek = (offset: number) => {
    setWeekStart((current) => formatIsoDate(addWeeks(parseISO(current), offset)))
  }

  const handleClearSelection = () => {
    setSelectedDates([])
  }

  const handleOpenEditor = () => {
    if (selectedDates.length === 0) {
      return
    }

    setEditorOpen(true)
  }

  const handleDeleteSelectedDay = async () => {
    if (!selectedExistingDay?.id) {
      return
    }

    try {
      await deleteAssignment.mutateAsync(selectedExistingDay.id)
      toast.success('Dia limpiado correctamente')
      handleClearSelection()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido limpiar el dia seleccionado.'))
    }
  }

  const handleEditorSubmit = async (values: AssignmentEditorValues) => {
    try {
      if (selectedExistingDay?.id && selectedDays.length === 1) {
        await updateAssignment.mutateAsync({
          assignmentId: selectedExistingDay.id,
          values,
        })
        toast.success('Asignacion actualizada correctamente')
      } else {
        await bulkAssign.mutateAsync(values)
        toast.success(selectedDays.length > 1 ? 'Asignaciones actualizadas correctamente' : 'Asignacion creada correctamente')
      }

      handleClearSelection()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se han podido guardar los cambios.'))
      throw error
    }
  }

  if (clientsQuery.isLoading) {
    return <AssignmentsPageSkeleton />
  }

  if (clientsQuery.isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
          <div className="rounded-full bg-status-error/10 p-4 text-status-error">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">No se ha podido cargar la cartera</h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              {getApiErrorMessage(clientsQuery.error, 'Intentalo de nuevo en unos segundos.')}
            </p>
          </div>
          <Button onClick={() => clientsQuery.refetch()}>Reintentar</Button>
        </CardContent>
      </Card>
    )
  }

  if (clients.length === 0) {
    return (
      <AssignmentsEmptyState
        icon={<Users className="h-8 w-8" />}
        title="Todavia no tienes clientes asignados"
        description="En cuanto tengas clientes en cartera podras planificar entrenamientos, dietas y descansos desde esta vista."
      />
    )
  }

  return (
    <div className="space-y-6">
      <AssignmentsToolbar
        clients={clients}
        selectedClientId={selectedClientId}
        weekLabel={formatWeekLabel(weekStart)}
        selectionCount={selectedDates.length}
        summary={summary}
        isBusy={isMutating}
        canCopyWeek={canCopyWeek}
        canAssign={canOpenEditor}
        assignActionLabel={assignActionLabel}
        canDeleteSelectedDay={Boolean(selectedExistingDay)}
        onClientChange={handleClientChange}
        onPreviousWeek={() => changeWeek(-1)}
        onNextWeek={() => changeWeek(1)}
        onOpenEditor={handleOpenEditor}
        onOpenCopyWeek={() => setCopyWeekOpen(true)}
        onDeleteSelectedDay={() => void handleDeleteSelectedDay()}
        onClearSelection={handleClearSelection}
      />

      {!selectedClientId ? (
        <AssignmentsEmptyState
          icon={<CalendarDays className="h-8 w-8" />}
          title="Selecciona un cliente para empezar"
          description="Elige un cliente desde la barra superior para revisar su semana, seleccionar dias y planificar entrenamientos, dietas o descansos."
          actionLabel="Cargar primer cliente"
          onAction={() => handleClientChange(clients[0]?.id ?? '')}
        />
      ) : assignmentsQuery.isLoading ? (
        <AssignmentsPageSkeleton />
      ) : assignmentsQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
            <div className="rounded-full bg-status-error/10 p-4 text-status-error">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">No se ha podido cargar la semana</h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                {getApiErrorMessage(assignmentsQuery.error, 'Intentalo de nuevo en unos segundos.')}
              </p>
            </div>
            <Button onClick={() => assignmentsQuery.refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {(catalogAvailability.is_loading || catalogAvailability.has_error || catalogAvailability.has_empty_catalogs) && (
            <AssignmentsCatalogErrorState
              availability={catalogAvailability}
              onRetryTrainings={() => void trainingsQuery.refetch()}
              onRetryDiets={() => void dietsQuery.refetch()}
            />
          )}

          {!hasAssignmentsInWeek && (
            <Card className="border-dashed border-border/70">
              <CardContent className="pt-6 text-center">
                <p className="text-sm font-medium text-foreground">Semana sin planificacion</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Selecciona uno o varios dias en el grid para crear la primera asignacion de esta semana.
                </p>
              </CardContent>
            </Card>
          )}

          <AssignmentsWeekGrid
            days={days}
            selectedDates={selectedDates}
            disabled={isMutating}
            onToggleDay={toggleDaySelection}
          />
        </>
      )}

      {selectedClientId && (
        <>
          <AssignmentEditorDialog
            open={editorOpen}
            clientId={selectedClientId}
            selectedDays={selectedDays}
            availableTrainings={trainings}
            availableDiets={diets}
            catalogAvailability={catalogAvailability}
            isSubmitting={isMutating}
            onOpenChange={setEditorOpen}
            onRetryTrainings={() => void trainingsQuery.refetch()}
            onRetryDiets={() => void dietsQuery.refetch()}
            onSubmit={handleEditorSubmit}
          />

          <CopyWeekDialog
            open={copyWeekOpen}
            sourceWeekStart={weekStart}
            isSubmitting={copyWeek.isPending}
            onOpenChange={setCopyWeekOpen}
            onSubmit={async (values) => {
              setPendingCopyValues({
                client_id: selectedClientId,
                source_week_start: values.source_week_start,
                target_week_start: values.target_week_start,
              })
              setCopyWeekOpen(false)
              setCopyPreviewOpen(true)
            }}
          />

          <CopyWeekPreviewDialog
            open={copyPreviewOpen}
            preview={copyPreview}
            isSubmitting={copyWeek.isPending}
            onOpenChange={(open) => {
              setCopyPreviewOpen(open)

              if (!open) {
                setPendingCopyValues(null)
              }
            }}
            onConfirm={async () => {
              if (!pendingCopyValues) {
                return
              }

              try {
                await copyWeek.mutateAsync(pendingCopyValues)
                toast.success('Semana copiada correctamente')
                setWeekStart(pendingCopyValues.target_week_start)
                setCopyPreviewOpen(false)
                setPendingCopyValues(null)
                handleClearSelection()
              } catch (error) {
                toast.error(getApiErrorMessage(error, 'No se ha podido copiar la semana.'))
                throw error
              }
            }}
          />
        </>
      )}
    </div>
  )
}
