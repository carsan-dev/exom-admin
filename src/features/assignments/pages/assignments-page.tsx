import { useCallback, useEffect, useState } from 'react'
import { addDays, addMonths, addWeeks, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { useSearchParams } from 'react-router'
import { cn } from '@/lib/utils'
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
  useCopySelection,
  useCreateAutoAssignmentRule,
  useDeactivateAutoAssignmentRule,
  useDeleteAssignments,
  useUpdateAssignment,
  useUpdateAutoAssignmentRule,
} from '../api'
import { DAY_GESTURE_HINT_ID } from '../components/assignment-day-card'
import { AssignmentEditorDialog } from '../components/assignment-editor-dialog'
import type { AssignmentEditorMode } from '../components/assignment-editor-state'
import { AssignmentsCatalogErrorState } from '../components/assignments-catalog-error-state'
import { AssignmentsClientsErrorCard } from '../components/assignments-clients-error-card'
import { AssignmentsEmptyState } from '../components/assignments-empty-state'
import { AssignmentsMonthGrid } from '../components/assignments-month-grid'
import { AssignmentsNoPlanningCard } from '../components/assignments-no-planning-card'
import { AssignmentsPageSkeleton } from '../components/assignments-page-skeleton'
import { AssignmentsPeriodErrorCard } from '../components/assignments-period-error-card'
import { AssignmentsToolbar } from '../components/assignments-toolbar'
import { RirCyclePanel } from '../components/rir-cycle-panel'
import { AssignmentsWeekGrid } from '../components/assignments-week-grid'
import { CopySelectionDialog } from '../components/copy-selection-dialog'
import { CopyWeekDialog } from '../components/copy-week-dialog'
import { CopyWeekPreviewDialog } from '../components/copy-week-preview-dialog'
import { DeactivateAutoRuleDialog } from '../components/deactivate-auto-rule-dialog'
import { DeleteSelectionDialog } from '../components/delete-selection-dialog'
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

export function AssignmentsPage() {
  const currentUserRole = useAuth((state) => state.user?.role)
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN'
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<AssignmentEditorMode>('selection')
  const [copyWeekOpen, setCopyWeekOpen] = useState(false)
  const [copySelectionOpen, setCopySelectionOpen] = useState(false)
  const [deleteSelectionOpen, setDeleteSelectionOpen] = useState(false)
  const [copyTargetDate, setCopyTargetDate] = useState('')
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
  const copySelection = useCopySelection()
  const createAutoRule = useCreateAutoAssignmentRule()
  const deactivateAutoRule = useDeactivateAutoAssignmentRule()
  const updateAssignment = useUpdateAssignment()
  const updateAutoRule = useUpdateAutoAssignmentRule()
  const deleteAssignments = useDeleteAssignments()

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
  const selectedAssignmentIds = selectedDays.flatMap((day) => day.id ? [day.id] : [])
  const summary = buildAssignmentSummary(days)
  const hasAssignmentsInPeriod = summary.training_days > 0 || summary.diet_days > 0 || summary.rest_days > 0
  const isMutating =
    batchAssign.isPending ||
    copyWeek.isPending ||
    copySelection.isPending ||
    createAutoRule.isPending ||
    updateAutoRule.isPending ||
    deactivateAutoRule.isPending ||
    updateAssignment.isPending ||
    deleteAssignments.isPending
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

  const updateSearchParam = useCallback((updates: {
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
  }, [searchParams, setSearchParams])

  useEffect(() => {
    setEditorOpen(false)
    setCopyWeekOpen(false)
    setCopySelectionOpen(false)
    setDeleteSelectionOpen(false)
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
  }, [selectedClientIdParam, updateSearchParam])

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

  const goToToday = () => {
    updateSearchParam({ date: getCurrentAnchorDate() })
  }

  const handleClearSelection = () => {
    setSelectedDates([])
  }

  const handleSelectAllVisible = () => {
    setSelectedDates(days.map((day) => day.date))
  }

  const openSelectionEditor = () => {
    setEditorMode('selection')
    setEditorOpen(true)
  }

  const handleOpenEditor = () => {
    if (selectedDates.length === 0) {
      return
    }

    openSelectionEditor()
  }

  // Double click / Enter on a day: the editor works on the selected days, so the day becomes the selection.
  const handleOpenDayEditor = (date: string) => {
    setSelectedDates([date])
    openSelectionEditor()
  }

  const handleOpenAutoRuleEditor = () => {
    if (!activeAutoRuleQuery.data) {
      return
    }

    setEditorMode('auto-rule')
    setEditorOpen(true)
  }

  const handleOpenCopySelection = () => {
    if (selectedDays.length === 0) return
    const firstDate = parseISO(selectedDays[0].date)
    setCopyTargetDate(formatIsoDate(viewMode === 'week' ? addWeeks(firstDate, 1) : addMonths(firstDate, 1)))
    setCopySelectionOpen(true)
  }

  const copySelectionPreview = selectedDays.map((day) => {
    const offset = differenceInCalendarDays(parseISO(day.date), parseISO(selectedDays[0]?.date ?? day.date))
    const targetDate = copyTargetDate ? formatIsoDate(addDays(parseISO(copyTargetDate), offset)) : ''
    const existingTarget = days.find((candidate) => candidate.date === targetDate)
    return { day, targetDate, existingTarget }
  })

  const handleCopySelection = async () => {
    if (!selectedClientId || selectedDays.length === 0 || !copyTargetDate) return
    try {
      const result = await copySelection.mutateAsync({
        client_id: selectedClientId,
        source_dates: selectedDays.map((day) => day.date),
        target_start_date: copyTargetDate,
      })
      toast.success(`${result.copied_count} días copiados${result.cleared_count ? ` y ${result.cleared_count} limpiados` : ''}`)
      setCopySelectionOpen(false)
      handleClearSelection()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido copiar la selección.'))
    }
  }

  const handleDeleteSelectedDays = async () => {
    if (selectedAssignmentIds.length === 0) {
      return
    }

    try {
      const result = await deleteAssignments.mutateAsync(selectedAssignmentIds)
      toast.success(result.deleted_count === 1
        ? 'Día limpiado correctamente'
        : `${result.deleted_count} días limpiados correctamente`)
      handleClearSelection()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se han podido limpiar los días seleccionados.'))
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
        // API reconciles materialized automatic dates; manual overrides remain untouched.
      } else if (movedSingleExistingDay && singleDay?.assignment_id) {
        const updateValues: AssignmentUpdateValues = {
          date: singleDay.date,
          training_id: singleDay.is_rest_day ? null : (singleDay.training_id ?? null),
          training_ids: singleDay.is_rest_day ? [] : singleDay.training_ids,
          training_policies: singleDay.is_rest_day ? {} : singleDay.training_policies,
          training_completion_mode: singleDay.is_rest_day ? undefined : singleDay.training_completion_mode,
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
          training_completion_mode: values.auto_assignment.training_completion_mode,
          days: values.days.map((day) => ({
            weekday: getIsoWeekday(day.date),
            training_id: day.is_rest_day ? null : (day.training_id ?? null),
            training_ids: day.is_rest_day ? [] : day.training_ids,
            trainings: day.is_rest_day ? [] : (day.training_ids ?? []).map((training_id) => ({
              training_id,
              last_set_video_policy: day.training_policies?.[training_id] ?? 'AUTO',
            })),
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
      <AssignmentsClientsErrorCard
        isSuperAdmin={isSuperAdmin}
        message={getApiErrorMessage(clientsQuery.error, 'Inténtalo de nuevo en unos segundos.')}
        onRetry={() => clientsQuery.refetch()}
      />
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
    <div className={cn('space-y-6', selectedDates.length > 0 && 'pb-28')}>
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
        canDeleteSelectedDays={selectedAssignmentIds.length > 0}
        activeAutoRule={activeAutoRuleQuery.data ?? null}
        isAutoRuleLoading={activeAutoRuleQuery.isLoading}
        onEditAutoRule={handleOpenAutoRuleEditor}
        onDeactivateAutoRule={() => setDeactivateAutoRuleOpen(true)}
        onClientChange={handleClientChange}
        onChangeView={handleViewChange}
        onPreviousPeriod={() => changeVisiblePeriod(-1)}
        onNextPeriod={() => changeVisiblePeriod(1)}
        onToday={goToToday}
        onOpenEditor={handleOpenEditor}
        onOpenCopyWeek={() => setCopyWeekOpen(true)}
        onSelectAllVisible={handleSelectAllVisible}
        canCopySelection={selectedDates.length > 0}
        onOpenCopySelection={handleOpenCopySelection}
        onDeleteSelectedDays={() => setDeleteSelectionOpen(true)}
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
        <AssignmentsPeriodErrorCard
          viewMode={viewMode}
          message={getApiErrorMessage(activeAssignmentsQuery.error, 'Inténtalo de nuevo en unos segundos.')}
          onRetry={() => activeAssignmentsQuery.refetch()}
        />
      ) : (
        <>
          {catalogQuery.isFetched && (catalogAvailability.has_error || catalogAvailability.has_empty_catalogs) && (
            <AssignmentsCatalogErrorState
              availability={catalogAvailability}
              onRetryTrainings={() => void catalogQuery.refetch()}
              onRetryDiets={() => void catalogQuery.refetch()}
            />
          )}

          {!hasAssignmentsInPeriod && <AssignmentsNoPlanningCard viewMode={viewMode} />}

          {viewMode === 'week' ? (
            <AssignmentsWeekGrid
              days={days}
              selectedDates={selectedDates}
              disabled={isMutating}
              todayDate={getCurrentAnchorDate()}
              onToggleDay={toggleDaySelection}
              onOpenDay={handleOpenDayEditor}
            />
          ) : (
            <AssignmentsMonthGrid
              days={days}
              selectedDates={selectedDates}
              disabled={isMutating}
              todayDate={getCurrentAnchorDate()}
              onToggleDay={toggleDaySelection}
              onOpenDay={handleOpenDayEditor}
            />
          )}

          <p id={DAY_GESTURE_HINT_ID} className="text-xs text-foreground-muted">
            Clic en un día para seleccionarlo · doble clic o Intro para editarlo directamente.
          </p>
        </>
      )}

      {selectedClientId && days.length > 0 && <RirCyclePanel key={selectedClientId} clientId={selectedClientId} from={days[0].date} to={days[days.length - 1].date} trainings={trainings} />}

      {selectedClientId && (
        <>
          <DeleteSelectionDialog
            open={deleteSelectionOpen}
            selectedCount={selectedAssignmentIds.length}
            isPending={deleteAssignments.isPending}
            onOpenChange={setDeleteSelectionOpen}
            onConfirm={async () => { await handleDeleteSelectedDays(); setDeleteSelectionOpen(false) }}
          />

          <CopySelectionDialog
            open={copySelectionOpen}
            targetDate={copyTargetDate}
            preview={copySelectionPreview}
            selectedCount={selectedDays.length}
            isPending={copySelection.isPending}
            onOpenChange={setCopySelectionOpen}
            onTargetDateChange={setCopyTargetDate}
            onConfirm={() => void handleCopySelection()}
          />
          <DeactivateAutoRuleDialog
            open={deactivateAutoRuleOpen}
            isPending={deactivateAutoRule.isPending}
            hasActiveRule={Boolean(activeAutoRuleQuery.data)}
            onOpenChange={setDeactivateAutoRuleOpen}
            onConfirm={() => void handleDeactivateAutoRule()}
          />

          <AssignmentEditorDialog
            open={editorOpen}
            mode={editorMode}
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
