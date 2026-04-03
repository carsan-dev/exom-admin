import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getApiErrorMessage } from '@/lib/api-utils'
import { toast } from 'sonner'
import { useRespondFeedback } from '../api'
import type { FeedbackItem } from '../types'

function getClientName(item: FeedbackItem) {
  const { profile } = item.client
  if (profile?.first_name || profile?.last_name) {
    return `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
  }
  return item.client.email
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

interface FeedbackDetailDialogProps {
  item: FeedbackItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FeedbackDetailDialog({ item, open, onOpenChange }: FeedbackDetailDialogProps) {
  const [response, setResponse] = useState('')
  const { mutate: respond, isPending } = useRespondFeedback()

  useEffect(() => {
    setResponse('')
  }, [item?.id, open])

  function handleRespond() {
    if (!item || !response.trim()) return
    respond(
      { id: item.id, admin_response: response.trim() },
      {
        onSuccess: () => {
          toast.success('Respuesta enviada correctamente')
          setResponse('')
          onOpenChange(false)
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'No se ha podido enviar la respuesta'))
        },
      },
    )
  }

  function handleOpenChange(open: boolean) {
    if (!open) setResponse('')
    onOpenChange(open)
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de feedback</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Cliente: </span>
              <span className="font-medium">{getClientName(item)}</span>
            </div>
            {item.exercise && (
              <div>
                <span className="text-muted-foreground">Ejercicio: </span>
                <span className="font-medium">{item.exercise.name}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Fecha: </span>
              <span>{formatDate(item.created_at)}</span>
            </div>
            <div>
              {item.status === 'PENDING' ? (
                <Badge variant="outline" className="border-yellow-400 text-yellow-700 bg-yellow-50">
                  Pendiente
                </Badge>
              ) : (
                <Badge variant="outline" className="border-green-400 text-green-700 bg-green-50">
                  Revisado
                </Badge>
              )}
            </div>
          </div>

          <div className="rounded-lg overflow-hidden bg-muted">
            {item.media_type === 'IMAGE' ? (
              <img
                src={item.media_url}
                alt="Feedback media"
                className="w-full max-h-[400px] object-contain"
              />
            ) : (
              <video
                src={item.media_url}
                controls
                className="w-full max-h-[400px]"
              />
            )}
          </div>

          {item.notes && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Notas del cliente</p>
              <p className="text-sm text-muted-foreground rounded-lg bg-muted px-3 py-2">
                {item.notes}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Respuesta del admin</p>
            {item.admin_response ? (
              <p className="text-sm text-muted-foreground rounded-lg bg-muted px-3 py-2">
                {item.admin_response}
              </p>
            ) : (
              <div className="space-y-2">
                <textarea
                  placeholder="Escribe tu respuesta o comentario..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
                <Button
                  onClick={handleRespond}
                  disabled={isPending || !response.trim()}
                >
                  {isPending ? 'Enviando...' : 'Responder'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
