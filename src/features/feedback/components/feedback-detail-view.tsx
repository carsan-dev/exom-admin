import { Check, ImageOff, VideoOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusChip } from '@/components/ui/status-chip'
import { Tag } from '@/components/ui/tag'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { formatFeedbackDate, getFeedbackClientName } from '../feedback-format'
import type { FeedbackItem } from '../types'

function getExpiredMediaLabel(item: FeedbackItem) {
  return item.media_type === 'VIDEO' ? 'El vídeo ya no está disponible' : 'La imagen ya no está disponible'
}

const textBlockClass =
  'min-w-0 whitespace-pre-wrap border border-border px-4 py-3 text-sm leading-[22px] text-foreground [overflow-wrap:anywhere]'

interface FeedbackDetailViewProps {
  item: FeedbackItem
  draft: string
  onDraftChange: (value: string) => void
  /** Envía la respuesta (ya recortada). La mutación vive en la página para sobrevivir al desmontaje del detalle. */
  onRespond: (item: FeedbackItem, response: string) => void
  /** Hay una respuesta de este elemento en vuelo. */
  isResponding: boolean
  /** Nivel del título con el nombre del cliente. */
  titleAs?: 'h2' | 'h3'
  /** `pane`: panel fijo de escritorio (medio y notas en dos columnas desde xl). */
  layout?: 'pane' | 'stacked'
}

export function FeedbackDetailView({
  item,
  draft,
  onDraftChange,
  onRespond,
  isResponding,
  titleAs: Title = 'h2',
  layout = 'stacked',
}: FeedbackDetailViewProps) {
  function handleRespond() {
    const response = draft.trim()
    if (!response || isResponding) return
    onRespond(item, response)
  }

  const isPane = layout === 'pane'
  const MediaGoneIcon = item.media_type === 'VIDEO' ? VideoOff : ImageOff

  return (
    <div className="min-w-0">
      <header className="min-w-0 border-b border-border pb-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <Title className="min-w-0 text-lg font-semibold leading-6 text-foreground [overflow-wrap:anywhere]">
            {getFeedbackClientName(item)}
          </Title>
          {item.status === 'PENDING' ? (
            <StatusChip variant="warning">Pendiente</StatusChip>
          ) : (
            <StatusChip variant="success">Revisado</StatusChip>
          )}
        </div>
        <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
          {item.exercise && (
            <div className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-foreground-muted">
                Ejercicio
              </dt>
              <dd className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2 text-sm leading-5 text-foreground [overflow-wrap:anywhere]">
                {item.exercise.name}
                {item.feedback_kind === 'LAST_SET' && <Tag className="h-5 px-1.5 text-[11px]">Última serie</Tag>}
              </dd>
            </div>
          )}
          {!item.exercise && item.feedback_kind === 'LAST_SET' && (
            <div className="min-w-0">
              <dt className="sr-only">Tipo</dt>
              <dd>
                <Tag className="h-5 px-1.5 text-[11px]">Última serie</Tag>
              </dd>
            </div>
          )}
          {item.training && (
            <div className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-foreground-muted">
                Entrenamiento
              </dt>
              <dd className="mt-0.5 text-sm leading-5 text-foreground [overflow-wrap:anywhere]">{item.training.name}</dd>
            </div>
          )}
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-foreground-muted">
              Fecha programada
            </dt>
            <dd className="mt-0.5 text-sm leading-5 text-foreground">
              {formatFeedbackDate(item.assignment_date ?? item.created_at, 'long')}
            </dd>
          </div>
        </dl>
      </header>

      <div
        className={cn(
          'min-w-0 space-y-6 pt-5',
          isPane && 'xl:grid xl:grid-cols-2 xl:items-start xl:gap-x-6 xl:space-y-0',
        )}
      >
        <div className={cn('min-w-0 overflow-hidden border border-border bg-background-secondary', isPane && !item.notes && 'xl:col-span-2')}>
          {item.media_url ? (
            item.media_type === 'IMAGE' ? (
              <img src={item.media_url} alt="Feedback media" className="max-h-[400px] w-full object-contain" />
            ) : (
              <video src={item.media_url} controls className="max-h-[400px] w-full" />
            )
          ) : (
            <div className="flex min-h-44 items-center justify-center px-6 py-10 text-center text-sm text-foreground-secondary">
              <div className="flex flex-col items-center space-y-1">
                <MediaGoneIcon aria-hidden="true" className="mb-2 size-5 text-foreground-muted" />
                <p className="font-semibold text-foreground">{getExpiredMediaLabel(item)}</p>
                <p className="max-w-[44ch]">
                  {item.media_deleted_at
                    ? `Se eliminó automáticamente el ${formatFeedbackDate(item.media_deleted_at, 'long')} según la política de retención.`
                    : 'Se eliminó automáticamente según la política de retención.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {item.notes && (
          <div className="min-w-0 space-y-2">
            <h3 className="text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-foreground-muted">
              Notas del cliente
            </h3>
            <p className={cn(textBlockClass, 'bg-background-secondary')}>{item.notes}</p>
          </div>
        )}

        <div className={cn('min-w-0 space-y-2', isPane && 'xl:col-span-2 xl:mt-6')}>
          <h3 className="text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-foreground-muted">
            Respuesta del admin
          </h3>
          {item.admin_response ? (
            <div className={textBlockClass}>
              <p className="mb-1.5 flex items-center gap-2 text-xs leading-4 text-foreground-muted">
                <Check aria-hidden="true" className="size-3.5 text-status-success" />
                Respondido
              </p>
              {item.admin_response}
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                placeholder="Escribe tu respuesta o comentario..."
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                rows={3}
                className="resize-none"
              />
              <Button onClick={handleRespond} disabled={isResponding || !draft.trim()} className="max-md:h-11 max-md:w-full">
                {isResponding ? 'Enviando...' : 'Responder'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
