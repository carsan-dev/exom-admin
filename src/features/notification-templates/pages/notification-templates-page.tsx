import { useDeferredValue, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  type FilterOption,
  type FilterSectionConfig,
  useListFilters,
} from '@/components/filters'
import { useAuth } from '@/hooks/use-auth'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog'
import {
  getApiErrorMessage,
  useNotificationTemplates,
  useResetNotificationTemplate,
  useUpdateNotificationTemplate,
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
  getTemplateOrigin,
  getTemplateSearchText,
  getTemplateState,
  normalizeRoute,
  validateTemplateFields,
  type TemplateDraft,
} from '../template-helpers'

export function NotificationTemplatesPage() {
  const currentUserRole = useAuth((state) => state.user?.role)
  const canManageTemplates = currentUserRole === 'SUPER_ADMIN'
  const templatesQuery = useNotificationTemplates(canManageTemplates)
  const updateTemplate = useUpdateNotificationTemplate()
  const resetTemplate = useResetNotificationTemplate()
  const { confirm, dialog: confirmDialog } = useConfirmDialog()
  const [selectedKey, setSelectedKey] = useState('')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [draft, setDraft] = useState<TemplateDraft>(emptyDraft)
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
  const selectedTemplate = filteredTemplates.find((template) => template.key === selectedKey) ?? null

  useEffect(() => {
    if (filteredTemplates.length === 0) {
      setSelectedKey('')
      return
    }

    if (!selectedKey || !filteredTemplates.some((template) => template.key === selectedKey)) {
      setSelectedKey(filteredTemplates[0].key)
    }
  }, [filteredTemplates, selectedKey])

  useEffect(() => {
    if (!selectedTemplate) {
      setDraft(emptyDraft)
      return
    }

    setDraft({
      title: selectedTemplate.title,
      body: selectedTemplate.body,
      route: selectedTemplate.route ?? '',
      enabled: selectedTemplate.enabled,
    })
  }, [selectedTemplate])

  const categoryCounts = useMemo(() => {
    return templates.reduce<Record<string, number>>((acc, template) => {
      acc[template.category] = (acc[template.category] ?? 0) + 1
      return acc
    }, {})
  }, [templates])

  const hasChanges = selectedTemplate
    ? draft.title !== selectedTemplate.title ||
      draft.body !== selectedTemplate.body ||
      normalizeRoute(draft.route) !== selectedTemplate.route ||
      draft.enabled !== selectedTemplate.enabled
    : false

  const isSaving = updateTemplate.isPending
  const isResetting = resetTemplate.isPending
  const isBusy = isSaving || isResetting
  useUnsavedChanges('notification-template', Boolean(selectedTemplate && (hasChanges || isBusy)))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedTemplate) {
      return
    }

    const title = draft.title.trim()
    const body = draft.body.trim()
    const route = normalizeRoute(draft.route)
    const validationError = validateTemplateFields(title, body, route)

    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      await updateTemplate.mutateAsync({
        key: selectedTemplate.key,
        values: {
          title,
          body,
          route,
          enabled: draft.enabled,
        },
      })
      toast.success('Plantilla actualizada')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido actualizar la plantilla'))
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
      const result = await resetTemplate.mutateAsync(selectedTemplate.key)

      if ('deleted' in result) {
        toast.success('Plantilla eliminada')
        setSelectedKey('')
      } else {
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Plantillas de notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            Edita automáticas existentes y crea plantillas manuales para envíos puntuales.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            {Object.entries(categoryCounts).map(([category, count]) => (
              <Badge key={category} variant="outline" className="border-border bg-muted text-muted-foreground">
                {category}: {count}
              </Badge>
            ))}
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva plantilla
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-brand-primary/15 bg-brand-soft/10 p-4 text-sm text-muted-foreground">
        Las plantillas automáticas dependen de un evento del sistema. Una plantilla nueva creada aquí es manual:
        queda disponible al enviar una notificación desde el historial.
      </div>

      {templatesQuery.isLoading ? <LoadingState /> : null}

      {templatesQuery.isError ? (
        <LoadErrorCard error={templatesQuery.error} onRetry={() => void templatesQuery.refetch()} />
      ) : null}

      {!templatesQuery.isLoading && !templatesQuery.isError ? (
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <TemplateList
            filteredTemplates={filteredTemplates}
            templates={templates}
            selectedTemplate={selectedTemplate}
            setSelectedKey={setSelectedKey}
            search={search}
            setSearch={setSearch}
            filterSections={filterSections}
            filters={filters}
          />

          <Card>
            {selectedTemplate ? (
              <TemplateEditorForm
                selectedTemplate={selectedTemplate}
                draft={draft}
                setDraft={setDraft}
                isBusy={isBusy}
                isSaving={isSaving}
                hasChanges={hasChanges}
                handleSubmit={handleSubmit}
                handleResetOrDelete={handleResetOrDelete}
              />
            ) : (
              <CardContent className="p-6 text-sm text-muted-foreground">
                Selecciona una plantilla para editarla.
              </CardContent>
            )}
          </Card>
        </div>
      ) : null}

      <CreateTemplateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(template) => setSelectedKey(template.key)}
      />
      {confirmDialog}
    </div>
  )
}
