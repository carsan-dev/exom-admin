import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, Plus, RefreshCcw, RotateCcw, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  getApiErrorMessage,
  useCreateNotificationTemplate,
  useNotificationTemplates,
  useResetNotificationTemplate,
  useUpdateNotificationTemplate,
} from '../api'
import type { NotificationTemplate } from '../types'

interface TemplateDraft {
  title: string
  body: string
  route: string
  enabled: boolean
}

interface CreateTemplateDraft extends TemplateDraft {
  name: string
  description: string
  category: string
}

const emptyDraft: TemplateDraft = {
  title: '',
  body: '',
  route: '',
  enabled: true,
}

const emptyCreateDraft: CreateTemplateDraft = {
  name: '',
  description: '',
  category: 'Manual',
  title: '',
  body: '',
  route: '',
  enabled: true,
}

function normalizeRoute(route: string) {
  const trimmed = route.trim()
  return trimmed ? trimmed : null
}

function validateTemplateFields(title: string, body: string, route: string | null) {
  if (!title || !body) {
    return 'Título y cuerpo son obligatorios'
  }

  if (route && !route.startsWith('/')) {
    return 'La ruta debe empezar por / o quedar vacía'
  }

  return null
}

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return 'Sin cambios'
  }

  return new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getTemplateSearchText(template: NotificationTemplate) {
  return [
    template.name,
    template.description,
    template.category,
    template.title,
    template.body,
    template.key,
    template.delivery_info.label,
    template.delivery_info.description,
  ]
    .join(' ')
    .toLowerCase()
}

function TemplateVariables({ template }: { template: NotificationTemplate }) {
  if (template.variables.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        Esta plantilla no recibe datos dinámicos. El texto se enviará tal como está escrito.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Las variables se reemplazan al enviar. Mantén las llaves si quieres conservar ese dato dinámico.
      </p>
      <div className="space-y-2">
        {template.variables.map((variable) => (
          <div key={variable} className="rounded-lg border border-border bg-muted/20 p-3">
            <Badge variant="outline" className="border-brand-primary/20 bg-brand-soft/10 text-brand-primary">
              {`{${variable}}`}
            </Badge>
            <p className="mt-2 text-sm text-muted-foreground">
              {template.variable_help[variable] ?? 'Dato dinámico que el sistema reemplaza al enviar.'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DeliveryInfo({ template }: { template: NotificationTemplate }) {
  const delivery = template.delivery_info
  const typeLabel =
    delivery.type === 'schedule'
      ? 'Programada'
      : delivery.type === 'event'
        ? 'Por evento'
        : 'Manual'

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-brand-primary/20 bg-brand-soft/10 text-brand-primary">
          {typeLabel}
        </Badge>
        <p className="text-sm font-medium text-foreground">{delivery.label}</p>
      </div>
      <p className="text-sm text-muted-foreground">{delivery.description}</p>
      {delivery.type === 'schedule' ? (
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <p>
            Huso horario: <span className="font-medium text-foreground">{delivery.timezone ?? 'Europe/Madrid'}</span>
          </p>
          {delivery.cron ? (
            <p>
              Cron: <span className="font-mono text-foreground">{delivery.cron}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (template: NotificationTemplate) => void
}

function CreateTemplateDialog({ open, onOpenChange, onCreated }: CreateTemplateDialogProps) {
  const createTemplate = useCreateNotificationTemplate()
  const [draft, setDraft] = useState<CreateTemplateDraft>(emptyCreateDraft)

  useEffect(() => {
    if (!open) {
      setDraft(emptyCreateDraft)
    }
  }, [open])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = draft.name.trim()
    const title = draft.title.trim()
    const body = draft.body.trim()
    const route = normalizeRoute(draft.route)
    const validationError = validateTemplateFields(title, body, route)

    if (!name) {
      toast.error('El nombre es obligatorio')
      return
    }

    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      const template = await createTemplate.mutateAsync({
        name,
        description: draft.description.trim() || undefined,
        category: draft.category.trim() || 'Manual',
        title,
        body,
        route,
        enabled: draft.enabled,
      })
      toast.success('Plantilla creada')
      onCreated(template)
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido crear la plantilla'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva plantilla manual</DialogTitle>
          <DialogDescription>
            Crea un texto reutilizable para enviar notificaciones puntuales desde el panel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
            <div className="space-y-2">
              <Label htmlFor="new-template-name">Nombre</Label>
              <Input
                id="new-template-name"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                maxLength={120}
                disabled={createTemplate.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-template-category">Categoría</Label>
              <Input
                id="new-template-category"
                value={draft.category}
                onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                maxLength={80}
                disabled={createTemplate.isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-template-description">Descripción</Label>
            <Input
              id="new-template-description"
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              maxLength={240}
              disabled={createTemplate.isPending}
              placeholder="Uso recomendado de esta plantilla"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-2">
              <Label htmlFor="new-template-title">Título</Label>
              <Input
                id="new-template-title"
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                maxLength={120}
                disabled={createTemplate.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-template-route">Ruta</Label>
              <Input
                id="new-template-route"
                value={draft.route}
                onChange={(event) => setDraft((current) => ({ ...current, route: event.target.value }))}
                maxLength={160}
                disabled={createTemplate.isPending}
                placeholder="/recap"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-template-body">Cuerpo</Label>
            <textarea
              id="new-template-body"
              value={draft.body}
              onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
              maxLength={500}
              rows={5}
              disabled={createTemplate.isPending}
              className="flex min-h-28 w-full resize-y rounded-lg border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border p-3">
            <input
              id="new-template-enabled"
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
              disabled={createTemplate.isPending}
              className="mt-1 h-4 w-4 rounded border-input"
            />
            <div className="space-y-1">
              <Label htmlFor="new-template-enabled">Disponible al enviar</Label>
              <p className="text-sm text-muted-foreground">
                Si está pausada, no aparecerá como plantilla rápida en envío manual.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createTemplate.isPending}>
              {createTemplate.isPending ? 'Creando...' : 'Crear plantilla'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function NotificationTemplatesPage() {
  const currentUserRole = useAuth((state) => state.user?.role)
  const canManageTemplates = currentUserRole === 'SUPER_ADMIN'
  const templatesQuery = useNotificationTemplates(canManageTemplates)
  const updateTemplate = useUpdateNotificationTemplate()
  const resetTemplate = useResetNotificationTemplate()
  const [selectedKey, setSelectedKey] = useState('')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [draft, setDraft] = useState<TemplateDraft>(emptyDraft)

  const templates = templatesQuery.data ?? []
  const selectedTemplate = templates.find((template) => template.key === selectedKey) ?? null

  useEffect(() => {
    if (templates.length === 0) {
      setSelectedKey('')
      return
    }

    if (!selectedKey || !templates.some((template) => template.key === selectedKey)) {
      setSelectedKey(templates[0].key)
    }
  }, [selectedKey, templates])

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

  const filteredTemplates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    if (!normalizedSearch) {
      return templates
    }

    return templates.filter((template) => getTemplateSearchText(template).includes(normalizedSearch))
  }, [search, templates])

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

    const confirmed = selectedTemplate.is_system
      ? window.confirm(`¿Restaurar "${selectedTemplate.name}" a su texto por defecto?`)
      : window.confirm(`¿Eliminar la plantilla manual "${selectedTemplate.name}"?`)

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
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Plantillas de notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            Solo super admins pueden cambiar plantillas.
          </p>
        </div>

        <Card>
          <CardContent className="flex items-start gap-3 p-6 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
            <p>No tienes permisos para modificar plantillas.</p>
          </CardContent>
        </Card>
      </div>
    )
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
        <Card>
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-status-error" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">No se pudieron cargar las plantillas</p>
                <p className="text-sm text-muted-foreground">
                  {getApiErrorMessage(templatesQuery.error, 'Reintenta en unos segundos')}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => void templatesQuery.refetch()}>
              <RefreshCcw className="h-4 w-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!templatesQuery.isLoading && !templatesQuery.isError ? (
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plantillas</CardTitle>
              <CardDescription>{templates.length} configurables</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-search">Buscar</Label>
                <Input
                  id="template-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nombre, categoría o texto"
                />
              </div>

              <div className="space-y-2">
                {filteredTemplates.map((template) => {
                  const isSelected = template.key === selectedTemplate?.key

                  return (
                    <button
                      key={template.key}
                      type="button"
                      className={cn(
                        'w-full rounded-lg border p-3 text-left transition-colors',
                        isSelected
                          ? 'border-brand-primary bg-brand-primary/10'
                          : 'border-border bg-background hover:bg-muted/40',
                      )}
                      onClick={() => setSelectedKey(template.key)}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0 space-y-1">
                          <span className="block truncate text-sm font-medium text-foreground">{template.name}</span>
                          <span className="block line-clamp-2 text-xs text-muted-foreground">{template.title}</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px]',
                              template.is_system
                                ? 'border-brand-primary/20 bg-brand-soft/10 text-brand-primary'
                                : 'border-border bg-muted text-muted-foreground',
                            )}
                          >
                            {template.is_system ? 'Automática' : 'Manual'}
                          </Badge>
                          <Badge variant="outline" className="border-border bg-muted text-[10px] text-muted-foreground">
                            {template.category}
                          </Badge>
                          {!template.enabled ? (
                            <Badge variant="outline" className="border-status-warning/30 bg-status-warning/10 text-[10px] text-status-warning">
                              Pausada
                            </Badge>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  )
                })}

                {filteredTemplates.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No hay plantillas con esos filtros.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            {selectedTemplate ? (
              <form onSubmit={handleSubmit}>
                <CardHeader className="gap-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-xl">{selectedTemplate.name}</CardTitle>
                      <CardDescription>{selectedTemplate.description}</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-brand-primary/20 bg-brand-soft/10 text-brand-primary">
                        {selectedTemplate.category}
                      </Badge>
                      <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                        {selectedTemplate.is_system ? 'Automática' : 'Manual'}
                      </Badge>
                      <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                        {selectedTemplate.customized ? 'Editada' : 'Por defecto'}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Último cambio: {formatUpdatedAt(selectedTemplate.updated_at)}
                  </p>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="flex items-start gap-3">
                    <input
                      id="template-enabled"
                      type="checkbox"
                      checked={draft.enabled}
                      onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
                      disabled={isBusy}
                      className="mt-1 h-4 w-4 rounded border-input"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="template-enabled">Activa</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedTemplate.is_system
                          ? 'Al pausar, el evento automático no enviará nada.'
                          : 'Al pausar, no aparecerá como plantilla rápida al enviar.'}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="space-y-2">
                      <Label htmlFor="template-title">Título</Label>
                      <Input
                        id="template-title"
                        value={draft.title}
                        onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                        disabled={isBusy}
                        maxLength={120}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="template-route">Ruta</Label>
                      <Input
                        id="template-route"
                        value={draft.route}
                        onChange={(event) => setDraft((current) => ({ ...current, route: event.target.value }))}
                        disabled={isBusy}
                        placeholder="/trainings"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-body">Cuerpo</Label>
                    <textarea
                      id="template-body"
                      value={draft.body}
                      onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
                      disabled={isBusy}
                      maxLength={500}
                      rows={5}
                      className="flex min-h-28 w-full resize-y rounded-lg border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground">{draft.body.length}/500 caracteres</p>
                  </div>

                  <div className="space-y-2 border-t border-border pt-4">
                    <Label>Cuándo se envía</Label>
                    <DeliveryInfo template={selectedTemplate} />
                  </div>

                  <div className="space-y-2 border-t border-border pt-4">
                    <Label>Variables</Label>
                    <TemplateVariables template={selectedTemplate} />
                  </div>

                  <div className="space-y-2 border-t border-border pt-4">
                    <Label>Vista previa</Label>
                    <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-sm font-medium text-foreground">{draft.title || 'Sin título'}</p>
                      <p className="text-sm text-muted-foreground">{draft.body || 'Sin cuerpo'}</p>
                      <p className="text-xs text-muted-foreground">{normalizeRoute(draft.route) ?? 'Sin ruta'}</p>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResetOrDelete}
                      disabled={isBusy || (selectedTemplate.is_system && !selectedTemplate.customized)}
                    >
                      {selectedTemplate.is_system ? <RotateCcw className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                      {selectedTemplate.is_system ? 'Restaurar defecto' : 'Eliminar plantilla'}
                    </Button>

                    <Button type="submit" disabled={isBusy || !hasChanges}>
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </div>
                </CardContent>
              </form>
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
    </div>
  )
}
