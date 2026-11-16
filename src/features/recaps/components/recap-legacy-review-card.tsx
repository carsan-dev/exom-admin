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
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Comentario para el cliente
          </label>
          <textarea
            placeholder="Escribe un comentario que verá el cliente en su recap..."
            value={clientFeedback}
            onChange={(event) => onClientFeedbackChange(event.target.value)}
            rows={4}
            disabled={Boolean(recap.archived_at) || recap.status === 'DRAFT' || reviewPending}
            className="flex w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
          {recap.client_feedback_sent_at && (
            <p className="text-xs text-muted-foreground">
              Enviado al cliente: {formatDate(recap.client_feedback_sent_at)}
              {recap.client_feedback_read_at
                ? ` · Leído: ${formatDate(recap.client_feedback_read_at)}`
                : ' · Pendiente de lectura'}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Este texto es visible para el cliente. Si lo cambias se enviará una notificación push.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Nota interna (solo visible para el equipo)
          </label>
          <textarea
            placeholder="Notas internas que nunca se comparten con el cliente..."
            value={internalNote}
            onChange={(event) => onInternalNoteChange(event.target.value)}
            rows={3}
            disabled={Boolean(recap.archived_at) || recap.status === 'DRAFT' || reviewPending}
            className="flex w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Esta nota nunca se comparte con el cliente y no genera notificaciones.
          </p>
        </div>

        {recap.archived_at ? (
          <p className="text-sm text-muted-foreground">
            Este recap está archivado. Los comentarios quedan en modo lectura.
          </p>
        ) : recap.status === 'DRAFT' ? (
          <p className="text-sm text-muted-foreground">
            Este recap sigue en borrador. El cliente debe enviarlo antes de que puedas revisarlo.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {recap.status === 'SUBMITTED'
              ? 'Al guardar marcarás este recap como revisado.'
              : 'Puedes actualizar los comentarios antes de archivarlo.'}
          </p>
        )}
      </div>
    </RecapSectionCard>
  )
}
