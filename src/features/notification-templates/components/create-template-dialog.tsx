import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { Button } from '@/components/ui/button'
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
import { getApiErrorMessage, useCreateNotificationTemplate } from '../api'
import {
  emptyCreateDraft,
  normalizeRoute,
  validateTemplateFields,
  type CreateTemplateDraft,
} from '../template-helpers'
import type { NotificationTemplate } from '../types'

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (template: NotificationTemplate) => void
}

export function CreateTemplateDialog({ open, onOpenChange, onCreated }: CreateTemplateDialogProps) {
  const createTemplate = useCreateNotificationTemplate()
  const [draft, setDraft] = useState<CreateTemplateDraft>(emptyCreateDraft)
  useUnsavedChanges(
    'create-notification-template',
    open && (JSON.stringify(draft) !== JSON.stringify(emptyCreateDraft) || createTemplate.isPending),
  )

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
      <DialogContent disableOutsideClose className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
                className="max-md:h-11"
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
                className="max-md:h-11"
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
                className="max-md:h-11"
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
                className="max-md:h-11"
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
                className="max-md:h-11"
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
              className="flex min-h-28 w-full resize-y rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground transition-[border-color,background-color] duration-(--dur-fast) ease-(--ease-out) placeholder:text-muted-foreground hover:border-control-border-hover focus-visible:border-focus focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-muted-foreground"
            />
          </div>

          <div className="flex items-start gap-3 border border-border p-3 max-md:min-h-11">
            <input
              id="new-template-enabled"
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
              disabled={createTemplate.isPending}
              className="mt-0.5 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus max-md:size-6"
            />
            <div className="space-y-1">
              <Label htmlFor="new-template-enabled">Disponible al enviar</Label>
              <p className="text-[13px] leading-5 text-foreground-secondary">
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
