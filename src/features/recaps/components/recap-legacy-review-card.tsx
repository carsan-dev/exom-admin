import { Textarea } from '@/components/ui/textarea'
import type { RecapItem } from '../types'
import { formatDate } from './recap-detail-format'
import { RecapSectionCard } from './recap-section-card'

interface RecapLegacyReviewCardProps {
  recap: RecapItem
  clientFeedback: string
  internalNote: string
  reviewPending: boolean
  onClientFeedbackChange: (value: string) => void
  onInternalNoteChange: (value: string) => void
}

const LABEL_CLASS = 'block text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-foreground-muted'
const HELP_CLASS = 'text-xs leading-4 text-foreground-secondary'

export function RecapLegacyReviewCard({
  recap,
  clientFeedback,
  internalNote,
  reviewPending,
  onClientFeedbackChange,
  onInternalNoteChange,
}: RecapLegacyReviewCardProps) {
  return (
    <RecapSectionCard
      title="Revisión del admin"
      description="Añade un comentario visible para el cliente y/o una nota interna. Solo el comentario para el cliente activa una notificación push."
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <label className={LABEL_CLASS}>
            Comentario para el cliente
          </label>
          <Textarea
            placeholder="Escribe un comentario que verá el cliente en su recap..."
            aria-label="Comentario para el cliente"
            value={clientFeedback}
            onChange={(event) => onClientFeedbackChange(event.target.value)}
            rows={4}
            disabled={Boolean(recap.archived_at) || recap.status === 'DRAFT' || reviewPending}
            className="resize-none"
          />
          {recap.client_feedback_sent_at && (
            <p className={HELP_CLASS}>
              Enviado al cliente: {formatDate(recap.client_feedback_sent_at)}
              {recap.client_feedback_read_at
                ? ` · Leído: ${formatDate(recap.client_feedback_read_at)}`
                : ' · Pendiente de lectura'}
            </p>
          )}
          <p className={HELP_CLASS}>
            Este texto es visible para el cliente. Si lo cambias se enviará una notificación push.
          </p>
        </div>

        <div className="space-y-2">
          <label className={LABEL_CLASS}>
            Nota interna (solo visible para el equipo)
          </label>
          <Textarea
            placeholder="Notas internas que nunca se comparten con el cliente..."
            aria-label="Nota interna (solo visible para el equipo)"
            value={internalNote}
            onChange={(event) => onInternalNoteChange(event.target.value)}
            rows={3}
            disabled={Boolean(recap.archived_at) || recap.status === 'DRAFT' || reviewPending}
            className="resize-none"
          />
          <p className={HELP_CLASS}>
            Esta nota nunca se comparte con el cliente y no genera notificaciones.
          </p>
        </div>

        {recap.archived_at ? (
          <p className="border border-status-info/30 bg-status-info-soft p-3 text-sm text-foreground">
            Este recap está archivado. Los comentarios quedan en modo lectura.
          </p>
        ) : recap.status === 'DRAFT' ? (
          <p className="text-sm text-foreground-secondary">
            Este recap sigue en borrador. El cliente debe enviarlo antes de que puedas revisarlo.
          </p>
        ) : (
          <p className="text-sm text-foreground-secondary">
            {recap.status === 'SUBMITTED'
              ? 'Al guardar marcarás este recap como revisado.'
              : 'Puedes actualizar los comentarios antes de archivarlo.'}
          </p>
        )}
      </div>
    </RecapSectionCard>
  )
}
