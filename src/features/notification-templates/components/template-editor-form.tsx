import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { RotateCcw, Save, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatUpdatedAt, normalizeRoute, type TemplateDraft } from '../template-helpers'
import type { NotificationTemplate } from '../types'
import { DeliveryInfo } from './delivery-info'
import { ScheduleEditor } from './schedule-editor'
import { TemplateVariables } from './template-variables'

interface TemplateEditorFormProps {
  selectedTemplate: NotificationTemplate
  draft: TemplateDraft
  setDraft: Dispatch<SetStateAction<TemplateDraft>>
  isBusy: boolean
  isSaving: boolean
  hasChanges: boolean
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
  handleResetOrDelete: () => void | Promise<void>
}

export function TemplateEditorForm({
  selectedTemplate,
  draft,
  setDraft,
  isBusy,
  isSaving,
  hasChanges,
  handleSubmit,
  handleResetOrDelete,
}: TemplateEditorFormProps) {
  return (
    <form onSubmit={handleSubmit}>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-xl">{selectedTemplate.name}</CardTitle>
            <CardDescription>{selectedTemplate.description}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-brand-primary/20 bg-brand-soft/10 text-accent-text">
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
          <ScheduleEditor template={selectedTemplate} />
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
  )
}
