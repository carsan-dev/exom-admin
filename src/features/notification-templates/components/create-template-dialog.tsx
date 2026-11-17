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

/** Campos validados al crear: mensaje en línea además del toast (RDS-F5-A11Y-05). */
type ValidatedField = 'name' | 'title' | 'route' | 'body'
type FieldErrors = Partial<Record<ValidatedField, string>>

/** Orden visual de los campos: el foco va al primero inválido. */
const VALIDATED_FIELDS: ValidatedField[] = ['name', 'title', 'route', 'body']

const fieldId = (field: ValidatedField) => `new-template-${field}`
const errorId = (field: ValidatedField) => `new-template-${field}-error`

/**
 * Error en línea de cada campo con las mismas reglas que `handleSubmit`. Nombre y ruta
 * repiten el texto del toast; título y cuerpo desglosan «Título y cuerpo son obligatorios».
 */
function getFieldError(field: ValidatedField, value: string): string | undefined {
  switch (field) {
    case 'name':
      return value.trim() ? undefined : 'El nombre es obligatorio'
    case 'title':
      return value.trim() ? undefined : 'El título es obligatorio'
    case 'body':
      return value.trim() ? undefined : 'El cuerpo es obligatorio'
    case 'route': {
      const route = normalizeRoute(value)
      return route && !route.startsWith('/') ? 'La ruta debe empezar por / o quedar vacía' : undefined
    }
  }
}

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (template: NotificationTemplate) => void
}

export function CreateTemplateDialog({ open, onOpenChange, onCreated }: CreateTemplateDialogProps) {
  const createTemplate = useCreateNotificationTemplate()
  const [draft, setDraft] = useState<CreateTemplateDraft>(emptyCreateDraft)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  useUnsavedChanges(
    'create-notification-template',
    open && (JSON.stringify(draft) !== JSON.stringify(emptyCreateDraft) || createTemplate.isPending),
  )

  useEffect(() => {
    if (!open) {
      setDraft(emptyCreateDraft)
      setFieldErrors({})
    }
  }, [open])

  // El error en línea de un campo se recalcula al editarlo: desaparece en cuanto es válido.
  const clearFieldError = (field: ValidatedField, value: string) => {
    setFieldErrors((current) => (current[field] ? { ...current, [field]: getFieldError(field, value) } : current))
  }

  const fieldA11yProps = (field: ValidatedField) => ({
    'aria-invalid': fieldErrors[field] ? true : undefined,
    'aria-describedby': fieldErrors[field] ? errorId(field) : undefined,
  })

  const renderFieldError = (field: ValidatedField) =>
    fieldErrors[field] ? (
      <p id={errorId(field)} className="text-sm font-medium text-destructive">
        {fieldErrors[field]}
      </p>
    ) : null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: FieldErrors = {}
    for (const field of VALIDATED_FIELDS) {
      const message = getFieldError(field, draft[field])
      if (message) {
        nextErrors[field] = message
      }
    }
    setFieldErrors(nextErrors)
    const firstInvalid = VALIDATED_FIELDS.find((field) => nextErrors[field])
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus()
    }

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
      <DialogContent disableOutsideClose className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0 pb-4">
          <DialogTitle>Nueva plantilla manual</DialogTitle>
          <DialogDescription>
            Crea un texto reutilizable para enviar notificaciones puntuales desde el panel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-1">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
            <div className="space-y-2">
              <Label htmlFor="new-template-name" required>Nombre</Label>
              <Input
                id="new-template-name"
                value={draft.name}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, name: event.target.value }))
                  clearFieldError('name', event.target.value)
                }}
                maxLength={120}
                disabled={createTemplate.isPending}
                aria-required="true"
                {...fieldA11yProps('name')}
              />
              {renderFieldError('name')}
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
              <Label htmlFor="new-template-title" required>Título</Label>
              <Input
                id="new-template-title"
                value={draft.title}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, title: event.target.value }))
                  clearFieldError('title', event.target.value)
                }}
                maxLength={120}
                disabled={createTemplate.isPending}
                aria-required="true"
                {...fieldA11yProps('title')}
              />
              {renderFieldError('title')}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-template-route">Ruta</Label>
              <Input
                id="new-template-route"
                value={draft.route}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, route: event.target.value }))
                  clearFieldError('route', event.target.value)
                }}
                maxLength={160}
                disabled={createTemplate.isPending}
                placeholder="/recap"
                {...fieldA11yProps('route')}
              />
              {renderFieldError('route')}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-template-body" required>Cuerpo</Label>
            <textarea
              id="new-template-body"
              value={draft.body}
              onChange={(event) => {
                setDraft((current) => ({ ...current, body: event.target.value }))
                clearFieldError('body', event.target.value)
              }}
              maxLength={500}
              rows={5}
              disabled={createTemplate.isPending}
              aria-required="true"
              {...fieldA11yProps('body')}
              className="flex min-h-28 w-full resize-y rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground transition-[border-color,background-color] duration-(--dur-fast) ease-(--ease-out) placeholder:text-muted-foreground hover:border-control-border-hover focus-visible:border-focus focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-muted-foreground"
            />
            {renderFieldError('body')}
          </div>

          {/* Por debajo de md la etiqueta cubre toda la fila: área pulsable de la casilla ≥ 44 px. */}
          <div className="relative flex items-start gap-3 border border-border p-3 max-md:min-h-11">
            <input
              id="new-template-enabled"
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
              disabled={createTemplate.isPending}
              className="mt-0.5 size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus max-md:size-6"
            />
            <div className="space-y-1">
              <Label htmlFor="new-template-enabled" className="max-md:after:absolute max-md:after:inset-0 max-md:after:content-['']">Disponible al enviar</Label>
              <p className="text-[13px] leading-5 text-foreground-secondary">
                Si está pausada, no aparecerá como plantilla rápida en envío manual.
              </p>
            </div>
          </div>

          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border pt-4 max-sm:mt-3">
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
