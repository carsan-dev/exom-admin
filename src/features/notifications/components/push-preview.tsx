import { cn } from '@/lib/utils'

export const PUSH_PREVIEW_APP_NAME = 'EXOM'
export const PUSH_PREVIEW_TITLE_FALLBACK = 'Título de la notificación'
export const PUSH_PREVIEW_BODY_FALLBACK = 'El mensaje aparecerá aquí'

interface PushPreviewProps {
  title: string
  body: string
}

/**
 * Decorative look-alike of an OS push notification, updated live. Hidden from assistive
 * technology because the form fields already carry the same content.
 */
export function PushPreview({ title, body }: PushPreviewProps) {
  const trimmedTitle = title.trim()
  const trimmedBody = body.trim()

  return (
    <div data-testid="push-preview" aria-hidden="true" className="min-w-0 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground-muted">Vista previa</p>
      <div className="flex min-w-0 items-start gap-3 overflow-hidden border border-border-strong bg-card p-3">
        <span className="mt-0.5 flex size-8 flex-none items-center justify-center bg-brand-primary font-display text-xs font-extrabold text-primary-foreground">
          E
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex min-w-0 items-center justify-between gap-2 text-[11px] uppercase tracking-[0.06em] text-foreground-muted">
            <span>{PUSH_PREVIEW_APP_NAME}</span>
            <span className="flex-none">ahora</span>
          </div>
          <p
            className={cn(
              'truncate text-sm font-semibold',
              trimmedTitle ? 'text-foreground' : 'text-foreground-muted',
            )}
          >
            {trimmedTitle || PUSH_PREVIEW_TITLE_FALLBACK}
          </p>
          <p
            className={cn(
              'line-clamp-2 break-words text-sm',
              trimmedBody ? 'text-foreground-secondary' : 'text-foreground-muted',
            )}
          >
            {trimmedBody || PUSH_PREVIEW_BODY_FALLBACK}
          </p>
        </div>
      </div>
    </div>
  )
}
