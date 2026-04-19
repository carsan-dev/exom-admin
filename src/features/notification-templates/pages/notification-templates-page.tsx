import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, RefreshCcw, RotateCcw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  getApiErrorMessage,
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

const emptyDraft: TemplateDraft = {
  title: '',
  body: '',
  route: '',
  enabled: true,
}

function normalizeRoute(route: string) {
  const trimmed = route.trim()
  return trimmed ? trimmed : null
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
  ]
    .join(' ')
    .toLowerCase()
}

function TemplateVariables({ variables }: { variables: string[] }) {
  if (variables.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin variables disponibles.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {variables.map((variable) => (
        <Badge key={variable} variant="outline" className="border-brand-primary/20 bg-brand-soft/10 text-brand-primary">
          {`{${variable}}`}
        </Badge>
      ))}
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

export function NotificationTemplatesPage() {
  const currentUserRole = useAuth((state) => state.user?.role)
  const canManageTemplates = currentUserRole === 'SUPER_ADMIN'
  const templatesQuery = useNotificationTemplates(canManageTemplates)
  const updateTemplate = useUpdateNotificationTemplate()
  const resetTemplate = useResetNotificationTemplate()
  const [selectedKey, setSelectedKey] = useState('')
  const [search, setSearch] = useState('')
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

    if (!title || !body) {
      toast.error('Título y cuerpo son obligatorios')
      return
    }

    if (route && !route.startsWith('/')) {
      toast.error('La ruta debe empezar por / o quedar vacía')
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

  const handleReset = async () => {
    if (!selectedTemplate) {
      return
    }

    const confirmed = window.confirm(`¿Restaurar "${selectedTemplate.name}" a su texto por defecto?`)
    if (!confirmed) {
      return
    }

    try {
      await resetTemplate.mutateAsync(selectedTemplate.key)
      toast.success('Plantilla restaurada')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido restaurar la plantilla'))
    }
  }

  if (!canManageTemplates) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Plantillas de notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            Solo super admins pueden cambiar mensajes automáticos.
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
            Ajusta textos automáticos sin desplegar cambios de código.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryCounts).map(([category, count]) => (
            <Badge key={category} variant="outline" className="border-border bg-muted text-muted-foreground">
              {category}: {count}
            </Badge>
          ))}
        </div>
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
              <CardTitle className="text-lg">Automáticas</CardTitle>
              <CardDescription>{templates.length} plantillas configurables</CardDescription>
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
                        Al pausar, el evento automático no enviará nada.
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
                    <Label>Variables</Label>
                    <TemplateVariables variables={selectedTemplate.variables} />
                    <p className="text-xs text-muted-foreground">
                      Mantén las llaves para que el sistema reemplace cada dato al enviar.
                    </p>
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
                      onClick={handleReset}
                      disabled={isBusy || !selectedTemplate.customized}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restaurar defecto
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
    </div>
  )
}
