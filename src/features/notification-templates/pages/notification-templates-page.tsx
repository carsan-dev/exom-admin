import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type SetStateAction,
} from 'react'
import { Info, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  type FilterOption,
  type FilterSectionConfig,
  useListFilters,
} from '@/components/filters'
import { useAuth } from '@/hooks/use-auth'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { EmptyState, PageHeader } from '@/components/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog'
import {
  getApiErrorMessage,
  useNotificationTemplates,
  useResetNotificationTemplate,
  useUpdateNotificationTemplate,
  useUpdateNotificationTemplateSchedule,
} from '../api'
import { CreateTemplateDialog } from '../components/create-template-dialog'
import { LoadErrorCard } from '../components/load-error-card'
import { LoadingState } from '../components/loading-state'
import { PermissionsNotice } from '../components/permissions-notice'
import { TemplateEditorForm } from '../components/template-editor-form'
import { TemplateList } from '../components/template-list'
import {
  DELIVERY_TYPE_OPTIONS,
  TEMPLATE_ORIGIN_OPTIONS,
  TEMPLATE_STATE_OPTIONS,
  emptyDraft,
  getScheduleDraft,
  getTemplateOrigin,
  getTemplateSearchText,
  getTemplateState,
  getTextDraft,
  normalizeRoute,
  normalizeScheduleDraft,
  schedulesEqual,
  textDraftDiffers,
  validateTemplateFields,
  type ScheduleDraft,
  type TemplateDraft,
} from '../template-helpers'
import type { NotificationTemplate } from '../types'

/**
 * Unsaved edits of one part (text or schedule) of one template. While there is no entry for the
 * selected template, its draft is derived from the server value, so refetches never overwrite edits
 * and a late response can only clear the exact entry it was sent for.
 */
interface TemplateEdits<T> {
  key: string
  draft: T
}

const SWITCH_CONFIRM = {
  title: 'Hay cambios sin guardar',
  description: 'Si cambias de plantilla ahora, se descartarán los cambios sin guardar de esta plantilla.',
  cancelLabel: 'Permanecer',
  confirmLabel: 'Salir sin guardar',
  destructive: true,
} as const

function isScheduleTemplate(template: NotificationTemplate) {
  return template.delivery_info.type === 'schedule'
}

export function NotificationTemplatesPage() {
  const currentUserRole = useAuth((state) => state.user?.role)
  const canManageTemplates = currentUserRole === 'SUPER_ADMIN'
  const templatesQuery = useNotificationTemplates(canManageTemplates)
  const updateTemplate = useUpdateNotificationTemplate()
  const updateSchedule = useUpdateNotificationTemplateSchedule()
  const resetTemplate = useResetNotificationTemplate()
  const { confirm, dialog: confirmDialog } = useConfirmDialog()
  const [selectedKey, setSelectedKey] = useState('')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [textEdits, setTextEdits] = useState<TemplateEdits<TemplateDraft> | null>(null)
  const [scheduleEdits, setScheduleEdits] = useState<TemplateEdits<ScheduleDraft> | null>(null)
  const saveInFlightRef = useRef(false)
  const deferredSearch = useDeferredValue(search)

  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data])
  const activeSearch = deferredSearch.trim().toLowerCase()
  const categoryOptions = useMemo<FilterOption[]>(
    () =>
      Array.from(new Set(templates.map((template) => template.category)))
        .sort((left, right) => left.localeCompare(right, 'es', { sensitivity: 'base' }))
        .map((category) => ({ value: category, label: category })),
    [templates]
  )
  const filterSections = useMemo<FilterSectionConfig[]>(
    () => [
      {
        type: 'multi',
        key: 'category',
        label: 'Categoría',
        options: categoryOptions,
        searchable: true,
      },
      {
        type: 'multi',
        key: 'delivery_type',
        label: 'Entrega',
        options: DELIVERY_TYPE_OPTIONS,
      },
      {
        type: 'multi',
        key: 'origin',
        label: 'Origen',
        options: TEMPLATE_ORIGIN_OPTIONS,
      },
      {
        type: 'multi',
        key: 'state',
        label: 'Estado',
        options: TEMPLATE_STATE_OPTIONS,
      },
    ],
    [categoryOptions]
  )
  const filters = useListFilters(filterSections)
  const selectedCategories = useMemo(
    () => Array.isArray(filters.values.category) ? (filters.values.category as string[]) : [],
    [filters.values.category],
  )
  const selectedDeliveryTypes = useMemo(
    () => Array.isArray(filters.values.delivery_type) ? (filters.values.delivery_type as string[]) : [],
    [filters.values.delivery_type],
  )
  const selectedOrigins = useMemo(
    () => Array.isArray(filters.values.origin) ? (filters.values.origin as string[]) : [],
    [filters.values.origin],
  )
  const selectedStates = useMemo(
    () => Array.isArray(filters.values.state) ? (filters.values.state as string[]) : [],
    [filters.values.state],
  )

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch = !activeSearch || getTemplateSearchText(template).includes(activeSearch)
      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(template.category)
      const matchesDeliveryType =
        selectedDeliveryTypes.length === 0 ||
        selectedDeliveryTypes.includes(template.delivery_info.type)
      const matchesOrigin =
        selectedOrigins.length === 0 || selectedOrigins.includes(getTemplateOrigin(template))
      const matchesState =
        selectedStates.length === 0 || selectedStates.includes(getTemplateState(template))

      return (
        matchesSearch &&
        matchesCategory &&
        matchesDeliveryType &&
        matchesOrigin &&
        matchesState
      )
    })
  }, [
    activeSearch,
    selectedCategories,
    selectedDeliveryTypes,
    selectedOrigins,
    selectedStates,
    templates,
  ])
  const selectedServerTemplate = templates.find((template) => template.key === selectedKey) ?? null

  const draft: TemplateDraft = selectedServerTemplate
    ? textEdits?.key === selectedServerTemplate.key
      ? textEdits.draft
      : getTextDraft(selectedServerTemplate)
    : emptyDraft
  const scheduleDraft: ScheduleDraft | null = selectedServerTemplate
    ? scheduleEdits?.key === selectedServerTemplate.key
      ? scheduleEdits.draft
      : getScheduleDraft(selectedServerTemplate)
    : null
  const hasTextChanges = selectedServerTemplate ? textDraftDiffers(selectedServerTemplate, draft) : false
  const hasScheduleChanges =
    selectedServerTemplate && scheduleDraft && isScheduleTemplate(selectedServerTemplate)
      ? !schedulesEqual(
          normalizeScheduleDraft(selectedServerTemplate, scheduleDraft),
          normalizeScheduleDraft(selectedServerTemplate, getScheduleDraft(selectedServerTemplate)),
        )
      : false
  const hasChanges = hasTextChanges || hasScheduleChanges
  // A clean template hidden by search/filters is replaced by the first visible one (as before);
  // a dirty one stays selected and editable so filtering never discards edits.
  const keepHiddenSelection = Boolean(selectedServerTemplate && hasChanges)
  const selectedTemplate =
    selectedServerTemplate &&
    (keepHiddenSelection || filteredTemplates.some((template) => template.key === selectedKey))
      ? selectedServerTemplate
      : null

  /** Changes the selection and drops any edits; callers decide whether discarding is allowed. */
  const changeSelection = (key: string) => {
    setSelectedKey(key)
    setTextEdits(null)
    setScheduleEdits(null)
  }

  useEffect(() => {
    if (keepHiddenSelection) {
      return
    }

    if (filteredTemplates.length === 0) {
      setSelectedKey('')
      setTextEdits(null)
      setScheduleEdits(null)
      return
    }

    if (!selectedKey || !filteredTemplates.some((template) => template.key === selectedKey)) {
      setSelectedKey(filteredTemplates[0].key)
      setTextEdits(null)
      setScheduleEdits(null)
    }
  }, [filteredTemplates, keepHiddenSelection, selectedKey])

  const requestSelection = async (key: string) => {
    if (key === selectedKey) {
      return
    }

    if (hasChanges && !(await confirm(SWITCH_CONFIRM))) {
      return
    }

    changeSelection(key)
  }

  const setDraft = (action: SetStateAction<TemplateDraft>) => {
    if (!selectedServerTemplate) {
      return
    }

    const template = selectedServerTemplate
    setTextEdits((current) => {
      const base = current?.key === template.key ? current.draft : getTextDraft(template)
      return { key: template.key, draft: typeof action === 'function' ? action(base) : action }
    })
  }

  const setScheduleDraft = (action: SetStateAction<ScheduleDraft>) => {
    if (!selectedServerTemplate) {
      return
    }

    const template = selectedServerTemplate
    setScheduleEdits((current) => {
      const base = current?.key === template.key ? current.draft : getScheduleDraft(template)
      return { key: template.key, draft: typeof action === 'function' ? action(base) : action }
    })
  }

  const categoryCounts = useMemo(() => {
    return templates.reduce<Record<string, number>>((acc, template) => {
      acc[template.category] = (acc[template.category] ?? 0) + 1
      return acc
    }, {})
  }, [templates])

  const isSaving = updateTemplate.isPending || updateSchedule.isPending
  const isResetting = resetTemplate.isPending
  const isBusy = isSaving || isResetting
  useUnsavedChanges('notification-template', Boolean(selectedTemplate && (hasChanges || isBusy)))
  useUnsavedChanges(
    `notification-schedule-${selectedTemplate?.key ?? ''}`,
    Boolean(selectedTemplate && (hasScheduleChanges || updateSchedule.isPending)),
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedTemplate || saveInFlightRef.current || isBusy) {
      return
    }

    const template = selectedTemplate
    const key = template.key
    const textEntry = hasTextChanges && textEdits?.key === key ? textEdits : null
    const scheduleEntry = hasScheduleChanges && scheduleEdits?.key === key ? scheduleEdits : null

    if (!textEntry && !scheduleEntry) {
      return
    }

    // Validate every dirty part before sending anything.
    const validationErrors: string[] = []
    const textValues = textEntry
      ? {
          title: textEntry.draft.title.trim(),
          body: textEntry.draft.body.trim(),
          route: normalizeRoute(textEntry.draft.route),
          enabled: textEntry.draft.enabled,
        }
      : null
    const scheduleValues = scheduleEntry ? normalizeScheduleDraft(template, scheduleEntry.draft) : null

    if (textValues) {
      const textError = validateTemplateFields(textValues.title, textValues.body, textValues.route)
      if (textError) {
        validationErrors.push(textError)
      }
    }

    if (scheduleValues) {
      if (!scheduleValues.timezone) {
        validationErrors.push('El huso horario es obligatorio')
      } else if (scheduleValues.times.some((time) => !time)) {
        validationErrors.push('Completa todas las horas')
      }
    }

    if (validationErrors.length > 0) {
      validationErrors.forEach((message) => toast.error(message))
      return
    }

    // Each part is saved and reported on its own: a failure keeps only that part's edits.
    // Edits are cleared only if the entry is still the one sent, so a late response cannot touch
    // the drafts of another template or edits discarded by switching templates.
    const saveText = async () => {
      if (!textEntry || !textValues) {
        return
      }

      try {
        await updateTemplate.mutateAsync({ key, values: textValues })
        setTextEdits((current) => (current === textEntry ? null : current))
        toast.success('Plantilla actualizada')
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'No se ha podido actualizar la plantilla'))
      }
    }

    const saveSchedule = async () => {
      if (!scheduleEntry || !scheduleValues) {
        return
      }

      try {
        await updateSchedule.mutateAsync({
          key,
          values: {
            enabled: scheduleValues.enabled,
            timezone: scheduleValues.timezone,
            times: scheduleValues.times,
            weekday: (template.delivery_info.schedule_kind ?? 'daily') === 'weekly' ? scheduleValues.weekday : null,
          },
        })
        setScheduleEdits((current) => (current === scheduleEntry ? null : current))
        toast.success('Horario actualizado')
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'No se ha podido actualizar el horario'))
      }
    }

    saveInFlightRef.current = true
    try {
      await Promise.all([saveText(), saveSchedule()])
    } finally {
      saveInFlightRef.current = false
    }
  }

  const handleResetOrDelete = async () => {
    if (!selectedTemplate) {
      return
    }

    const confirmed = await (selectedTemplate.is_system
      ? confirm({ title: `¿Restaurar "${selectedTemplate.name}" a su texto por defecto?` })
      : confirm({ title: `¿Eliminar la plantilla manual "${selectedTemplate.name}"?`, confirmLabel: 'Eliminar', destructive: true }))

    if (!confirmed) {
      return
    }

    try {
      const key = selectedTemplate.key
      const result = await resetTemplate.mutateAsync(key)

      if ('deleted' in result) {
        toast.success('Plantilla eliminada')
        changeSelection('')
      } else {
        // The restore replaces the text the user confirmed to discard; the API keeps the stored
        // schedule, so unsaved schedule edits are kept too.
        setTextEdits((current) => (current?.key === key ? null : current))
        toast.success('Plantilla restaurada')
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido actualizar la plantilla'))
    }
  }

  if (!canManageTemplates) {
    return <PermissionsNotice />
  }

  return (
    <div>
      <PageHeader
        title="Plantillas de notificaciones"
        description="Edita automáticas existentes y crea plantillas manuales para envíos puntuales."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva plantilla
          </Button>
        }
      />

      <div className="mb-6 flex items-start gap-3 border border-status-info/30 bg-status-info-soft p-3 text-[13px] leading-5 text-foreground-secondary">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-status-info" />
        <p>
          Las plantillas automáticas dependen de un evento del sistema. Una plantilla nueva creada aquí es manual:
          queda disponible al enviar una notificación desde el historial.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(categoryCounts).map(([category, count]) => (
          <Badge key={category} variant="outline" className="rounded-none border-border-strong text-foreground-secondary">
            {category}: {count}
          </Badge>
        ))}
      </div>

      {templatesQuery.isLoading ? <LoadingState /> : null}

      {templatesQuery.isError ? (
        <LoadErrorCard error={templatesQuery.error} onRetry={() => void templatesQuery.refetch()} />
      ) : null}

      {!templatesQuery.isLoading && !templatesQuery.isError ? (
        <div className="grid border-t border-border-strong xl:grid-cols-[360px_minmax(0,1fr)]">
          <TemplateList
            filteredTemplates={filteredTemplates}
            templates={templates}
            selectedTemplate={selectedTemplate}
            setSelectedKey={(key) => void requestSelection(key)}
            search={search}
            setSearch={setSearch}
            filterSections={filterSections}
            filters={filters}
          />

          <div className="min-w-0 xl:pl-8">
            {selectedTemplate ? (
              <TemplateEditorForm
                selectedTemplate={selectedTemplate}
                draft={draft}
                setDraft={setDraft}
                scheduleDraft={scheduleDraft ?? getScheduleDraft(selectedTemplate)}
                setScheduleDraft={setScheduleDraft}
                isBusy={isBusy}
                isSaving={isSaving}
                hasChanges={hasChanges}
                handleSubmit={handleSubmit}
                handleResetOrDelete={handleResetOrDelete}
              />
            ) : (
              <EmptyState title="Selecciona una plantilla para editarla." />
            )}
          </div>
        </div>
      ) : null}

      <CreateTemplateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(template) => void requestSelection(template.key)}
      />
      {confirmDialog}
    </div>
  )
}
