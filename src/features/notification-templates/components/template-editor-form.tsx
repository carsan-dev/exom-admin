import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { RotateCcw, Save, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CharCounter } from '@/features/notifications/components/char-counter'
import { PushPreview } from '@/features/notifications/components/push-preview'
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
    <form onSubmit={handleSubmit} className="flex min-w-0 flex-col">
      <div className="space-y-3 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <h2 className="text-xl font-semibold leading-7 text-foreground">{selectedTemplate.name}</h2>
            <p className="text-[13px] leading-5 text-foreground-secondary">{selectedTemplate.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-none border-accent-line/40 bg-lime-soft text-accent-text">
              {selectedTemplate.category}
            </Badge>
            <Badge variant="outline" className="rounded-none border-border-strong text-foreground-secondary">
              {selectedTemplate.is_system ? 'Automática' : 'Manual'}
            </Badge>
            <Badge variant="outline" className="rounded-none border-border-strong text-foreground-secondary">
              {selectedTemplate.customized ? 'Editada' : 'Por defecto'}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-foreground-muted">
          Último cambio: {formatUpdatedAt(selectedTemplate.updated_at)}
        </p>
      </div>

      <div className="space-y-6 pb-6">
        <div className="flex items-start gap-3 max-md:min-h-11">
          <input
            id="template-enabled"
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
            disabled={isBusy}
            className="mt-0.5 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus max-md:size-6"
          />
          <div className="space-y-1">
            <Label htmlFor="template-enabled">Activa</Label>
            <p className="text-[13px] leading-5 text-foreground-secondary">
              {selectedTemplate.is_system
                ? 'Al pausar, el evento automático no enviará nada.'
                : 'Al pausar, no aparecerá como plantilla rápida al enviar.'}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label htmlFor="template-title">Título</Label>
            <Input
              id="template-title"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              disabled={isBusy}
              maxLength={120}
              className="max-md:h-11"
            />
            <CharCounter label="título" count={draft.title.length} max={120} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-route">Ruta</Label>
            <Input
              id="template-route"
              value={draft.route}
              onChange={(event) => setDraft((current) => ({ ...current, route: event.target.value }))}
              disabled={isBusy}
              placeholder="/trainings"
              className="max-md:h-11"
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
            className="flex min-h-28 w-full resize-y rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground transition-[border-color,background-color] duration-(--dur-fast) ease-(--ease-out) placeholder:text-muted-foreground hover:border-control-border-hover focus-visible:border-focus focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-muted-foreground"
          />
          <CharCounter label="cuerpo" count={draft.body.length} max={500} unit=" caracteres" />
        </div>

        <div className="space-y-3 border-t border-border pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground-muted">Cuándo se envía</h3>
          <DeliveryInfo template={selectedTemplate} />
          <ScheduleEditor template={selectedTemplate} />
        </div>

        <div className="space-y-3 border-t border-border pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground-muted">Variables</h3>
          <TemplateVariables template={selectedTemplate} />
        </div>

        <div className="space-y-3 border-t border-border pt-5">
          <PushPreview
            title={draft.title}
            body={draft.body}
            titleFallback="Sin título"
            bodyFallback="Sin cuerpo"
          />
          <p className="text-xs text-foreground-muted">{normalizeRoute(draft.route) ?? 'Sin ruta'}</p>
        </div>
      </div>

      <div className="sticky bottom-0 z-[3] flex flex-col-reverse gap-2 border-t border-border-strong bg-background py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:flex-row sm:items-center sm:justify-between">
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
    </form>
  )
}
