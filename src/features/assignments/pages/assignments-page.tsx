import { useEffect, useState } from 'react'
import { addMonths, addWeeks, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, CalendarDays, Repeat2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { useSearchParams } from 'react-router'
import {
  buildCatalogAvailability,
  getApiErrorMessage,
  hasClientId,
  useActiveAutoAssignmentRule,
  useAssignmentClients,
  useAssignmentCatalogOptions,
  useAssignmentsMonth,
  useAssignmentsWeek,
  useBatchAssign,
  useCopyWeek,
  useCreateAutoAssignmentRule,
  useDeactivateAutoAssignmentRule,
  useDeleteAssignment,
  useUpdateAssignment,
  useUpdateAutoAssignmentRule,
} from '../api'
import { AssignmentEditorDialog } from '../components/assignment-editor-dialog'
import { AssignmentsCatalogErrorState } from '../components/assignments-catalog-error-state'
import { AssignmentsEmptyState } from '../components/assignments-empty-state'
import { AssignmentsMonthGrid } from '../components/assignments-month-grid'
import { AssignmentsToolbar } from '../components/assignments-toolbar'
import { AssignmentsWeekGrid } from '../components/assignments-week-grid'
import { CopyWeekDialog } from '../components/copy-week-dialog'
import { CopyWeekPreviewDialog } from '../components/copy-week-preview-dialog'
import type {
  AssignmentEditorValues,
  AssignmentUpdateValues,
  AssignmentsViewMode,
  CopyWeekValues,
} from '../types'
import {
  buildAssignmentSummary,
  buildCopyWeekPreview,
  buildPlaceholderDays,
  formatIsoDate,
  getVisibleDates,
  getWeekStartDate,
} from '../types'

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/

function getCurrentAnchorDate() {
  return formatIsoDate(new Date())
}

function getInitialViewMode(value: string | null): AssignmentsViewMode {
  return value === 'month' ? 'month' : 'week'
}

function getInitialAnchorDateParam(value: string | null) {
  return value && isoDateRegex.test(value) ? value : getCurrentAnchorDate()
}

function formatPeriodLabel(viewMode: AssignmentsViewMode, anchorDate: string) {
  const date = parseISO(anchorDate)

  if (viewMode === 'month') {
    return format(date, "MMMM 'de' yyyy", { locale: es })
  }

  const start = getWeekStartDate(date)
  const end = addWeeks(start, 1)
  const weekEnd = new Date(end)
  weekEnd.setDate(weekEnd.getDate() - 1)

  return `${format(start, "d 'de' MMMM", { locale: es })} - ${format(weekEnd, "d 'de' MMMM", { locale: es })}`
}

function getIsoWeekday(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const value = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return value === 0 ? 7 : value
}

function AssignmentsPageSkeleton({ viewMode }: { viewMode: AssignmentsViewMode }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <div className="grid gap-4 xl:grid-cols-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>

      {viewMode === 'week' ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-6 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, index) => (
              <Skeleton key={index} className="min-h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function AssignmentsPage() {
  const currentUserRole = useAuth((state) => state.user?.role)
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN'
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [copyWeekOpen, setCopyWeekOpen] = useState(false)
  const [copyPreviewOpen, setCopyPreviewOpen] = useState(false)
  const [deactivateAutoRuleOpen, setDeactivateAutoRuleOpen] = useState(false)
  const [pendingCopyValues, setPendingCopyValues] = useState<CopyWeekValues | null>(null)

  const selectedClientIdParam = searchParams.get('clientId')
  const selectedClientId = hasClientId(selectedClientIdParam) ? selectedClientIdParam : ''
  const viewMode = getInitialViewMode(searchParams.get('view'))
  const anchorDate = getInitialAnchorDateParam(searchParams.get('date'))
  const anchorDateObject = parseISO(anchorDate)
  const weekStart = formatIsoDate(getWeekStartDate(anchorDateObject))

  const clientsQuery = useAssignmentClients(currentUserRole)
  const catalogQuery = useAssignmentCatalogOptions(editorOpen)
  const activeAutoRuleQuery = useActiveAutoAssignmentRule(selectedClientId || undefined)
  const weekAssignmentsQuery = useAssignmentsWeek(
    viewMode === 'week' ? (selectedClientId || undefined) : undefined,
    viewMode === 'week' ? weekStart : undefined,
  )
  const monthAssignmentsQuery = useAssignmentsMonth(
    viewMode === 'month' ? (selectedClientId || undefined) : undefined,
    viewMode === 'month' ? anchorDateObject.getFullYear() : undefined,
    viewMode === 'month' ? anchorDateObject.getMonth() + 1 : undefined,
  )

  const batchAssign = useBatchAssign()
  const copyWeek = useCopyWeek()
  const createAutoRule = useCreateAutoAssignmentRule()
  const deactivateAutoRule = useDeactivateAutoAssignmentRule()
  const updateAssignment = useUpdateAssignment()
  const updateAutoRule = useUpdateAutoAssignmentRule()
  const deleteAssignment = useDeleteAssignment()

  const clients = clientsQuery.data ?? []
  const trainings = catalogQuery.data?.trainings ?? []
  const diets = catalogQuery.data?.diets ?? []
  const catalogAvailability = buildCatalogAvailability({
    trainingsCount: trainings.length,
    trainingsLoading: catalogQuery.isLoading,
    trainingsError: catalogQuery.isError,
    trainingsErrorReason: catalogQuery.error,
    dietsCount: diets.length,
    dietsLoading: catalogQuery.isLoading,
    dietsError: catalogQuery.isError,
    dietsErrorReason: catalogQuery.error,
  })

  const activeAssignmentsQuery = viewMode === 'week' ? weekAssignmentsQuery : monthAssignmentsQuery
  const days = activeAssignmentsQuery.data?.days ?? buildPlaceholderDays(viewMode, anchorDate, selectedClientId)
  const selectedDays = days
    .filter((day) => selectedDates.includes(day.date))
    .sort((left, right) => left.date.localeCompare(right.date))
  const selectedExistingDay = selectedDays.length === 1 && selectedDays[0]?.id ? selectedDays[0] : null
  const summary = buildAssignmentSummary(days)
  const hasAssignmentsInPeriod = summary.training_days > 0 || summary.diet_days > 0 || summary.rest_days > 0
  const isMutating =
    batchAssign.isPending ||
    copyWeek.isPending ||
    createAutoRule.isPending ||
    updateAutoRule.isPending ||
    deactivateAutoRule.isPending ||
    updateAssignment.isPending ||
    deleteAssignment.isPending
  const canOpenEditor = selectedDates.length > 0
  const canCopyWeek = viewMode === 'week' && Boolean(selectedClientId) && !weekAssignmentsQuery.isLoading && !weekAssignmentsQuery.isError
  const canSelectAll = Boolean(selectedClientId) && days.length > 0 && !isMutating
  const assignActionLabel = catalogQuery.isFetched && catalogAvailability.is_rest_only
    ? 'Marcar descanso'
    : selectedDates.length > 1
      ? 'Editar selección'
      : 'Editar día'
  const visibleDatesKey = days.map((day) => day.date).join('|')
  const copyPreview = pendingCopyValues && selectedClientId
    ? buildCopyWeekPreview(
        selectedClientId,
        pendingCopyValues.source_week_start,
        pendingCopyValues.target_week_start,
        days,
      )
    : null

  const updateSearchParam = (updates: {
    clientId?: string | null
    view?: AssignmentsViewMode
    date?: string
  }) => {
    const nextSearchParams = new URLSearchParams(searchParams)

    if (updates.clientId !== undefined) {
      if (hasClientId(updates.clientId)) {
        nextSearchParams.set('clientId', updates.clientId)
      } else {
        nextSearchParams.delete('clientId')
      }
    }

    if (updates.view) {
      nextSearchParams.set('view', updates.view)
    }

    if (updates.date) {
      nextSearchParams.set('date', updates.date)
    }

    setSearchParams(nextSearchParams, { replace: true })
  }

  useEffect(() => {
    setEditorOpen(false)
    setCopyWeekOpen(false)
    setCopyPreviewOpen(false)
    setDeactivateAutoRuleOpen(false)
    setPendingCopyValues(null)
  }, [selectedClientId, viewMode, anchorDate])

  useEffect(() => {
    setSelectedDates((current) => {
      const next = current.filter((date) => days.some((day) => day.date === date))

      return next.length === current.length && next.every((date, index) => date === current[index])
        ? current
        : next
    })
  }, [selectedClientId, viewMode, anchorDate, visibleDatesKey, days])

  useEffect(() => {
    if (!selectedClientIdParam) {
      return
    }

    if (hasClientId(selectedClientIdParam)) {
      return
    }

    updateSearchParam({ clientId: null })
  }, [selectedClientIdParam])

  const handleClientChange = (clientId: string) => {
    updateSearchParam({ clientId })
  }

  const handleViewChange = (nextView: AssignmentsViewMode) => {
    if (nextView === viewMode) {
      return
    }

    const preservedDates = new Set(getVisibleDates(nextView, anchorDate))
    setSelectedDates((current) => current.filter((date) => preservedDates.has(date)))
    updateSearchParam({ view: nextView })
  }

  const toggleDaySelection = (date: string) => {
    setSelectedDates((current) =>
      current.includes(date)
        ? current.filter((item) => item !== date)
        : [...current, date].sort(),
    )
  }

  const changeVisiblePeriod = (offset: number) => {
    const nextDate = viewMode === 'week'
      ? addWeeks(anchorDateObject, offset)
      : addMonths(anchorDateObject, offset)

    updateSearchParam({ date: formatIsoDate(nextDate) })
  }

  const handleClearSelection = () => {
    setSelectedDates([])
  }

  const handleSelectAllVisible = () => {
    setSelectedDates(days.map((day) => day.date))
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
      toast.success('Día limpiado correctamente')
      handleClearSelection()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido limpiar el día seleccionado.'))
    }
  }

  const handleEditorSubmit = async (values: AssignmentEditorValues) => {
    try {
      const updatingRule = Boolean(values.auto_assignment?.rule_id)
      const singleDay = values.days[0]
      const movedSingleExistingDay = values.days.length === 1
        && Boolean(singleDay?.assignment_id)
        && singleDay.original_date !== singleDay.date

      if (updatingRule) {
        // Pattern updates intentionally leave materialized and manual dates untouched.
      } else if (movedSingleExistingDay && singleDay?.assignment_id) {
        const updateValues: AssignmentUpdateValues = {
          date: singleDay.date,
          training_id: singleDay.is_rest_day ? null : (singleDay.training_id ?? null),
          diet_id: singleDay.is_rest_day ? null : (singleDay.diet_id ?? null),
          is_rest_day: singleDay.is_rest_day,
        }

        await updateAssignment.mutateAsync({
          assignmentId: singleDay.assignment_id,
          values: updateValues,
        })
        toast.success('Asignación actualizada correctamente')
      } else {
        await batchAssign.mutateAsync(values)
        toast.success(values.days.length > 1 ? 'Asignaciones actualizadas correctamente' : 'Asignación guardada correctamente')
      }

      if (values.auto_assignment?.enabled) {
        const ruleValues = {
          client_id: values.client_id,
          source_week_start: values.auto_assignment.source_week_start,
          starts_on: values.auto_assignment.starts_on,
          ends_on: values.auto_assignment.ends_on ?? null,
          days: values.days.map((day) => ({
            weekday: getIsoWeekday(day.date),
            training_id: day.is_rest_day ? null : (day.training_id ?? null),
            diet_id: day.is_rest_day ? null : (day.diet_id ?? null),
            is_rest_day: day.is_rest_day,
          })),
        }
        if (values.auto_assignment.rule_id) {
          await updateAutoRule.mutateAsync({ ruleId: values.auto_assignment.rule_id, values: ruleValues })
          toast.success('Patrón semanal actualizado')
        } else {
          await createAutoRule.mutateAsync(ruleValues)
          toast.success('Autoasignación semanal activada')
        }
      }

      handleClearSelection()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se han podido guardar los cambios.'))
      throw error
    }
  }

  const handleDeactivateAutoRule = async () => {
    const ruleId = activeAutoRuleQuery.data?.id

    if (!ruleId) {
      return
    }

    try {
      await deactivateAutoRule.mutateAsync(ruleId)
      toast.success('Autoasignación desactivada')
      setDeactivateAutoRuleOpen(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido desactivar la autoasignación.'))
    }
  }

  if (clientsQuery.isLoading) {
    return <AssignmentsPageSkeleton viewMode={viewMode} />
  }

  if (clientsQuery.isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
          <div className="rounded-full bg-status-error/10 p-4 text-status-error">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              {isSuperAdmin ? 'No se ha podido cargar el listado de clientes' : 'No se ha podido cargar la cartera'}
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
               {getApiErrorMessage(clientsQuery.error, 'Inténtalo de nuevo en unos segundos.')}
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
        title={isSuperAdmin ? 'Todavía no hay clientes registrados' : 'Todavía no tienes clientes asignados'}
        description={
          isSuperAdmin
            ? 'En cuanto exista al menos un cliente podrás planificar entrenamientos, dietas y descansos desde esta vista.'
            : 'En cuanto tengas clientes en cartera podrás planificar entrenamientos, dietas y descansos desde esta vista.'
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <AssignmentsToolbar
        clients={clients}
        selectedClientId={selectedClientId}
        periodLabel={formatPeriodLabel(viewMode, anchorDate)}
        viewMode={viewMode}
        selectionCount={selectedDates.length}
        summary={summary}
        isBusy={isMutating}
        canCopyWeek={canCopyWeek}
        canAssign={canOpenEditor}
        canSelectAll={canSelectAll}
        assignActionLabel={assignActionLabel}
        canDeleteSelectedDay={Boolean(selectedExistingDay)}
        activeAutoRule={activeAutoRuleQuery.data ?? null}
        isAutoRuleLoading={activeAutoRuleQuery.isLoading}
        onDeactivateAutoRule={() => setDeactivateAutoRuleOpen(true)}
        onClientChange={handleClientChange}
        onChangeView={handleViewChange}
        onPreviousPeriod={() => changeVisiblePeriod(-1)}
        onNextPeriod={() => changeVisiblePeriod(1)}
        onOpenEditor={handleOpenEditor}
        onOpenCopyWeek={() => setCopyWeekOpen(true)}
        onSelectAllVisible={handleSelectAllVisible}
        onDeleteSelectedDay={() => void handleDeleteSelectedDay()}
        onClearSelection={handleClearSelection}
      />

      {!selectedClientId ? (
        <AssignmentsEmptyState
          icon={<CalendarDays className="h-8 w-8" />}
          title="Selecciona un cliente para empezar"
          description="Elige un cliente desde la barra superior para revisar su calendario, seleccionar varios días y planificar entrenamientos, dietas o descansos."
          actionLabel="Cargar primer cliente"
          onAction={() => handleClientChange(clients[0]?.id ?? '')}
        />
      ) : activeAssignmentsQuery.isLoading ? (
        <AssignmentsPageSkeleton viewMode={viewMode} />
      ) : activeAssignmentsQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
            <div className="rounded-full bg-status-error/10 p-4 text-status-error">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">
                {viewMode === 'week' ? 'No se ha podido cargar la semana' : 'No se ha podido cargar el mes'}
              </h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                {getApiErrorMessage(activeAssignmentsQuery.error, 'Inténtalo de nuevo en unos segundos.')}
              </p>
            </div>
            <Button onClick={() => activeAssignmentsQuery.refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {catalogQuery.isFetched && (catalogAvailability.has_error || catalogAvailability.has_empty_catalogs) && (
            <AssignmentsCatalogErrorState
              availability={catalogAvailability}
              onRetryTrainings={() => void catalogQuery.refetch()}
              onRetryDiets={() => void catalogQuery.refetch()}
            />
          )}

          {!hasAssignmentsInPeriod && (
            <Card className="border-dashed border-border/70">
              <CardContent className="pt-6 text-center">
                <p className="text-sm font-medium text-foreground">
                  {viewMode === 'week' ? 'Semana sin planificación' : 'Mes sin planificación'}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {viewMode === 'week'
                    ? 'Selecciona uno o varios días en el grid para crear la primera asignación de esta semana.'
                    : 'Selecciona varios días en el calendario mensual para construir una planificación más rápida.'}
                </p>
              </CardContent>
            </Card>
          )}

          {viewMode === 'week' ? (
            <AssignmentsWeekGrid
              days={days}
              selectedDates={selectedDates}
              disabled={isMutating}
              onToggleDay={toggleDaySelection}
            />
          ) : (
            <AssignmentsMonthGrid
              days={days}
              selectedDates={selectedDates}
              disabled={isMutating}
              onToggleDay={toggleDaySelection}
            />
          )}
        </>
      )}

      {selectedClientId && (
        <>
          <Dialog open={deactivateAutoRuleOpen} onOpenChange={setDeactivateAutoRuleOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Desactivar autoasignación semanal</DialogTitle>
                <DialogDescription>
                  La regla dejará de generar nuevos entrenamientos, dietas o descansos para próximas semanas.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-foreground">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-status-warning/10 p-2 text-status-warning">
                    <Repeat2 className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Las asignaciones ya generadas se mantendrán.</p>
                    <p className="text-muted-foreground">
                      Podrás activar otra autoasignación seleccionando días y guardando un nuevo patrón semanal.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeactivateAutoRuleOpen(false)}
                  disabled={deactivateAutoRule.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void handleDeactivateAutoRule()}
                  disabled={deactivateAutoRule.isPending || !activeAutoRuleQuery.data}
                >
                  {deactivateAutoRule.isPending ? 'Desactivando...' : 'Desactivar autoasignación'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AssignmentEditorDialog
            open={editorOpen}
            clientId={selectedClientId}
            selectedDays={selectedDays}
            availableTrainings={trainings}
            availableDiets={diets}
            catalogAvailability={catalogAvailability}
            isSubmitting={isMutating}
            activeAutoRule={activeAutoRuleQuery.data ?? null}
            onOpenChange={setEditorOpen}
            onRetryTrainings={() => void catalogQuery.refetch()}
            onRetryDiets={() => void catalogQuery.refetch()}
            onSubmit={handleEditorSubmit}
          />

          {viewMode === 'week' && (
            <>
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
                    updateSearchParam({ view: 'week', date: pendingCopyValues.target_week_start })
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
        </>
      )}
    </div>
  )
}
