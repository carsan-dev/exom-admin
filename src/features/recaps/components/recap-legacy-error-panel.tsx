import { Button } from '@/components/ui/button'
import type { RecapItem } from '../types'

interface RecapLegacyErrorPanelProps {
  error: string
  isFetching: boolean
  server: RecapItem | undefined
  onConsult: () => void | Promise<void>
  onDiscard: () => void | Promise<void>
}

export function RecapLegacyErrorPanel({ error, isFetching, server, onConsult, onDiscard }: RecapLegacyErrorPanelProps) {
  return (
    <div role="alert" className="min-w-0 space-y-3 border border-status-error/30 bg-status-error-soft p-3 text-sm text-foreground">
      <p className="[overflow-wrap:anywhere]">{error} Se conservan tus comentarios. Consulta el servidor antes de repetir un guardado que pueda enviar feedback.</p>
      <Button variant="outline" disabled={isFetching} onClick={onConsult}>Consultar comentarios guardados</Button>
      {server && (
        <>
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">Comentario guardado: {server.client_feedback_text || 'Sin comentario'}</p>
          <Button variant="outline" onClick={onDiscard}>Descartar comentarios y cargar guardados</Button>
        </>
      )}
    </div>
  )
}
