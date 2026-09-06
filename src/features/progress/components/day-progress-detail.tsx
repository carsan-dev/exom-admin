import { useEffect, useState } from 'react'
import { CheckCircle2, Dumbbell, MessageSquareReply, Salad, StickyNote } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/lib/api-utils'
import type { DayProgress } from '../types'
import { formatCompletedSet } from '../format-completed-set'
import { useReplyToTrainingNote } from '../api'
import { DietHistory } from './diet-history'

interface DayProgressDetailProps {
  clientId: string
  date: string
  progress: DayProgress | null | undefined
  isLoading?: boolean
}

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

export function DayProgressDetail({ clientId, date, progress, isLoading }: DayProgressDetailProps) {
  const formattedDate = dateFormatter.format(new Date(date + 'T12:00:00Z'))
  const [reply, setReply] = useState('')
  const replyMutation = useReplyToTrainingNote(clientId, date)

  useEffect(() => {
    setReply(progress?.admin_reply_text ?? '')
  }, [progress?.id, progress?.admin_reply_text])

  const savedReply = progress?.admin_reply_text ?? ''
  const hasReplyChanges = reply.trim() !== savedReply

  async function handleSaveReply() {
    try {
      await replyMutation.mutateAsync(reply)
      toast.success(
        reply.trim() ? 'Respuesta guardada y enviada al cliente' : 'Respuesta eliminada'
      )
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se ha podido guardar la respuesta'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl capitalize">{formattedDate}</CardTitle>
        <CardDescription>Detalle de actividad del día</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-52" />
          </div>
        ) : !progress ? (
          <p className="text-sm text-muted-foreground">Sin registro de progreso para este día.</p>
        ) : (
          <>
            {/* Entrenamiento */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-brand-primary" />
                <span className="text-sm font-medium">Entrenamiento</span>
                <Badge variant={progress.training_completed ? 'default' : 'secondary'}>
                  {progress.training_completed ? 'Completado' : 'No completado'}
                </Badge>
              </div>
              {progress.exercises_completed.length > 0 ? (
                <ul className="space-y-1 pl-6">
                  {progress.exercises_completed.map((ex, i) => (
                    <li key={i} className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-status-success shrink-0" />
                        <span title={ex.exercise_id}>
                          {ex.exercise_name ?? 'Ejercicio eliminado'}
                        </span>
                        {(!ex.sets || ex.sets.length === 0) && ex.weight_used != null && (
                          <span className="text-xs">— {ex.weight_used} kg</span>
                        )}
                      </div>
                      {ex.sets && ex.sets.length > 0 && (
                        <div className="ml-6 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                          {ex.sets.map((set) => (
                            <span
                              key={set.set_number}
                              className="rounded-md bg-muted px-2 py-1 text-xs"
                            >
                              {formatCompletedSet(set)}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pl-6 text-xs text-muted-foreground">Sin ejercicios registrados</p>
              )}
            </div>

            {/* Dieta */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Salad className="h-4 w-4 text-status-success" />
                <span className="text-sm font-medium">Dieta</span>
                <Badge variant={progress.meals_completed.length > 0 ? 'default' : 'secondary'}>
                  {progress.meals_completed.length > 0
                    ? `${progress.meals_completed.length} comidas`
                    : 'Sin comidas'}
                </Badge>
              </div>
              {progress.meals_completed_details.length > 0 ? (
                <ul className="space-y-1 pl-6">
                  {progress.meals_completed_details.map((meal, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-status-success shrink-0" />
                      <span title={meal.meal_id}>{meal.meal_name ?? 'Comida eliminada'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pl-6 text-xs text-muted-foreground">Sin comidas registradas</p>
              )}
            </div>

            {/* Nota y respuesta */}
            <DietHistory entries={progress.diet_history ?? []} />
            {progress.notes && (
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Nota del cliente</span>
                </div>
                <p className="pl-6 text-sm text-muted-foreground">{progress.notes}</p>

                <div className="space-y-2 pl-6">
                  <label
                    htmlFor="training-note-reply"
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <MessageSquareReply className="h-4 w-4 text-brand-primary" />
                    Respuesta para el cliente
                  </label>
                  <textarea
                    id="training-note-reply"
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    maxLength={1000}
                    rows={4}
                    disabled={replyMutation.isPending}
                    placeholder="Escribe una respuesta que verá el cliente en el detalle del entreno..."
                    className="flex w-full resize-none rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      <span>{reply.length}/1000</span>
                      {progress.admin_reply_sent_at && (
                        <span>
                          {' · Último envío: '}
                          {new Intl.DateTimeFormat('es-ES', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }).format(new Date(progress.admin_reply_sent_at))}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={handleSaveReply}
                      disabled={!hasReplyChanges || replyMutation.isPending}
                    >
                      {replyMutation.isPending
                        ? 'Guardando...'
                        : reply.trim()
                          ? savedReply
                            ? 'Guardar cambios'
                            : 'Responder'
                          : 'Eliminar respuesta'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Una respuesta nueva o modificada enviará una notificación push al cliente.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
