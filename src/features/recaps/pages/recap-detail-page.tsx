import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  CheckCircle2,
  Dumbbell,
  HeartPulse,
  MessageSquareText,
  Salad,
  Sparkles,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getApiErrorMessage } from '@/lib/api-utils'
import { toast } from 'sonner'
import { useArchiveRecap, useRecapDetail, useReviewRecap } from '../api'
import { RecapSectionCard } from '../components/recap-section-card'
import { RecapStatusBadge } from '../components/recap-status-badge'
import { formatRecapOption, getRecapClientName } from '../types'

function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-8 w-40" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-[420px] w-full rounded-2xl" />
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  )
}

function formatDate(dateStr: string | null, fallback = '—') {
  if (!dateStr) return fallback

  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatWeekRange(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)

  return `${startDate.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  })} - ${endDate.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`
}

function formatNotes(value: string | null, emptyCopy = 'Sin notas del cliente') {
  return value?.trim() || emptyCopy
}

export function RecapDetailPage() {
  const { id } = useParams()
  const recapQuery = useRecapDetail(id)
  const reviewMutation = useReviewRecap()
  const archiveMutation = useArchiveRecap()
  const [internalNote, setInternalNote] = useState('')
  const [clientFeedback, setClientFeedback] = useState('')
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)

  useEffect(() => {
    setInternalNote(recapQuery.data?.admin_comments ?? '')
    setClientFeedback(recapQuery.data?.client_feedback_text ?? '')
  }, [recapQuery.data?.admin_comments, recapQuery.data?.client_feedback_text, recapQuery.data?.id])

  const recap = recapQuery.data
  const existingInternalNote = recap?.admin_comments ?? ''
  const existingClientFeedback = recap?.client_feedback_text ?? ''
  const canReviewSubmittedRecap = Boolean(
    recap && recap.status === 'SUBMITTED' && !recap.archived_at,
  )
  const canEditReviewedComment = Boolean(
    recap && recap.status === 'REVIEWED' && !recap.archived_at,
  )
  const canSubmitReview = Boolean(
    recap &&
      !reviewMutation.isPending &&
      (canReviewSubmittedRecap ||
        (canEditReviewedComment &&
          (internalNote.trim() !== existingInternalNote.trim() ||
            clientFeedback.trim() !== existingClientFeedback.trim()))),
  )

  const reviewButtonLabel = useMemo(() => {
    if (!recap) return 'Guardar revisión'
    if (recap.status === 'SUBMITTED') return 'Marcar como revisado'
    if (recap.status === 'REVIEWED') return 'Guardar cambios'
    return 'Pendiente de envío'
  }, [recap])

  if (recapQuery.isLoading) {
    return <DetailPageSkeleton />
  }

  if (recapQuery.isError || !recap) {
    const message = getApiErrorMessage(recapQuery.error, 'No se ha podido cargar el recap solicitado.')

    return (
      <Card className="border-border/70">
        <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
          <div className="rounded-full bg-status-error/10 p-4 text-status-error">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Error al cargar el recap</h1>
            <p className="max-w-xl text-sm text-muted-foreground">{message}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" asChild>
              <Link to="/recaps">
                <ArrowLeft className="h-4 w-4" />
                Volver a recaps
              </Link>
            </Button>
            <Button onClick={() => void recapQuery.refetch()}>Reintentar</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const clientName = getRecapClientName(recap.client)

  function handleReview() {
    if (!recap || reviewMutation.isPending || (!canReviewSubmittedRecap && !canEditReviewedComment)) {
      return
    }

    reviewMutation.mutate(
      {
        id: recap.id,
        admin_comments: internalNote.trim(),
        client_feedback_text: clientFeedback.trim(),
      },
      {
        onSuccess: () => {
          toast.success(
            recap.status === 'SUBMITTED'
              ? 'Recap revisado correctamente'
              : 'Comentario guardado correctamente',
          )
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'No se pudo guardar la revisión'))
        },
      },
    )
  }

  function handleArchive() {
    if (!recap) return

    archiveMutation.mutate(recap.id, {
      onSuccess: () => {
        toast.success('Recap archivado correctamente')
        setArchiveDialogOpen(false)
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, 'No se pudo archivar el recap'))
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link to="/recaps">
            <ArrowLeft className="h-4 w-4" />
            Volver a recaps
          </Link>
        </Button>

        <div className="flex flex-wrap gap-3">
          {!recap.archived_at && recap.status !== 'DRAFT' && (
            <Button onClick={handleReview} disabled={!canSubmitReview}>
              <CheckCircle2 className="h-4 w-4" />
              {reviewMutation.isPending ? 'Guardando...' : reviewButtonLabel}
            </Button>
          )}
          {recap.status === 'REVIEWED' && !recap.archived_at && (
            <Button variant="outline" onClick={() => setArchiveDialogOpen(true)}>
              <Archive className="h-4 w-4" />
              Archivar recap
            </Button>
          )}
        </div>
      </div>

      <Card className="border-border/70">
        <CardContent className="flex flex-col gap-5 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-brand-primary">Revisión de recap</p>
              <div>
                <h1 className="text-3xl font-semibold text-foreground">{clientName}</h1>
                <p className="text-sm text-muted-foreground">{recap.client.email}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Semana {formatWeekRange(recap.week_start_date, recap.week_end_date)}
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <RecapStatusBadge status={recap.status} archivedAt={recap.archived_at} />
              <p className="text-sm text-muted-foreground">
                Enviado: {formatDate(recap.submitted_at ?? recap.created_at)}
              </p>
              {recap.reviewed_at && (
                <p className="text-sm text-muted-foreground">Revisado: {formatDate(recap.reviewed_at)}</p>
              )}
              {recap.archived_at && (
                <p className="text-sm text-muted-foreground">Archivado: {formatDate(recap.archived_at)}</p>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <DetailField label="Semana" value={formatWeekRange(recap.week_start_date, recap.week_end_date)} />
            <DetailField label="Cliente" value={clientName} />
            <DetailField label="Correo" value={recap.client.email} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="training" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 lg:grid-cols-5">
          <TabsTrigger className="rounded-xl border border-border bg-card py-3 data-[state=active]:border-brand-primary/40 data-[state=active]:bg-brand-soft/10 data-[state=active]:text-brand-primary" value="training">
            Entreno
          </TabsTrigger>
          <TabsTrigger className="rounded-xl border border-border bg-card py-3 data-[state=active]:border-brand-primary/40 data-[state=active]:bg-brand-soft/10 data-[state=active]:text-brand-primary" value="nutrition">
            Nutrición
          </TabsTrigger>
          <TabsTrigger className="rounded-xl border border-border bg-card py-3 data-[state=active]:border-brand-primary/40 data-[state=active]:bg-brand-soft/10 data-[state=active]:text-brand-primary" value="recovery">
            Recuperación
          </TabsTrigger>
          <TabsTrigger className="rounded-xl border border-border bg-card py-3 data-[state=active]:border-brand-primary/40 data-[state=active]:bg-brand-soft/10 data-[state=active]:text-brand-primary" value="general">
            General
          </TabsTrigger>
          <TabsTrigger className="rounded-xl border border-border bg-card py-3 data-[state=active]:border-brand-primary/40 data-[state=active]:bg-brand-soft/10 data-[state=active]:text-brand-primary" value="improvement">
            Mejora
          </TabsTrigger>
        </TabsList>

        <TabsContent value="training">
          <RecapSectionCard
            title="Entrenos"
            description="Resumen del rendimiento y la percepción de la semana de entreno."
            action={<Dumbbell className="h-5 w-5 text-brand-primary" />}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <DetailField label="Esfuerzo semanal" value={recap.training_effort?.toString() ?? 'No indicado'} />
              <DetailField
                label="Sesiones completadas"
                value={recap.training_sessions?.toString() ?? 'No indicado'}
              />
              <DetailField label="Progreso" value={formatRecapOption(recap.training_progress)} />
              <DetailField label="Notas" value={formatNotes(recap.training_notes)} />
            </div>
          </RecapSectionCard>
        </TabsContent>

        <TabsContent value="nutrition">
          <RecapSectionCard
            title="Nutrición"
            description="Calidad de alimentación, hidratación y observaciones nutricionales."
            action={<Salad className="h-5 w-5 text-brand-primary" />}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <DetailField label="Calidad de alimentación" value={formatRecapOption(recap.nutrition_quality)} />
              <DetailField label="Calidad de comidas" value={recap.food_quality?.toString() ?? 'No indicado'} />
              <DetailField label="Hidratación activada" value={recap.hydration_enabled ? 'Sí' : 'No'} />
              <DetailField label="Nivel de hidratación" value={formatRecapOption(recap.hydration_level)} />
              <div className="md:col-span-2">
                <DetailField label="Notas" value={formatNotes(recap.nutrition_notes)} />
              </div>
            </div>
          </RecapSectionCard>
        </TabsContent>

        <TabsContent value="recovery">
          <RecapSectionCard
            title="Recuperación y hábitos"
            description="Sueño, fatiga y molestias reportadas durante la semana."
            action={<HeartPulse className="h-5 w-5 text-brand-primary" />}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <DetailField label="Horas de sueño" value={formatRecapOption(recap.sleep_hours_range)} />
              <DetailField label="Fatiga" value={formatRecapOption(recap.fatigue_level)} />
              <DetailField label="Intensidad del dolor" value={formatRecapOption(recap.pain_intensity)} />
              <div className="rounded-xl border border-border/70 bg-background px-4 py-3 md:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Zonas con dolor muscular
                </p>
                {recap.muscle_pain_zones.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recap.muscle_pain_zones.map((zone) => (
                      <span
                        key={zone}
                        className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground"
                      >
                        {formatRecapOption(zone)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Sin zonas reportadas.</p>
                )}
              </div>
              <div className="md:col-span-2">
                <DetailField label="Notas" value={formatNotes(recap.recovery_notes)} />
              </div>
            </div>
          </RecapSectionCard>
        </TabsContent>

        <TabsContent value="general">
          <RecapSectionCard
            title="Sensaciones generales"
            description="Estado de ánimo, estrés y sensación global de la semana."
            action={<MessageSquareText className="h-5 w-5 text-brand-primary" />}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <DetailField label="Estado de ánimo" value={formatRecapOption(recap.mood)} />
              <DetailField label="Estrés activado" value={recap.stress_enabled ? 'Sí' : 'No'} />
              <DetailField label="Nivel de estrés" value={recap.stress_level?.toString() ?? 'No indicado'} />
              <DetailField label="Notas" value={formatNotes(recap.general_notes)} />
            </div>
          </RecapSectionCard>
        </TabsContent>

        <TabsContent value="improvement">
          <RecapSectionCard
            title="Ayúdanos a mejorar"
            description="Valoraciones del servicio y feedback abierto sobre la experiencia."
            action={<Sparkles className="h-5 w-5 text-brand-primary" />}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <DetailField
                label="Valoración del servicio"
                value={recap.improvement_service_rating?.toString() ?? 'No indicado'}
              />
              <DetailField
                label="Valoración de la app"
                value={recap.improvement_app_rating?.toString() ?? 'No indicado'}
              />
              <div className="rounded-xl border border-border/70 bg-background px-4 py-3 md:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Áreas de mejora
                </p>
                {recap.improvement_areas.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recap.improvement_areas.map((area) => (
                      <span
                        key={area}
                        className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground"
                      >
                        {formatRecapOption(area)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Sin áreas destacadas.</p>
                )}
              </div>
              <div className="md:col-span-2">
                <DetailField
                  label="Comentario del cliente"
                  value={formatNotes(recap.improvement_feedback_text, 'Sin comentario adicional')}
                />
              </div>
            </div>
          </RecapSectionCard>
        </TabsContent>
      </Tabs>

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
              onChange={(event) => setClientFeedback(event.target.value)}
              rows={4}
              disabled={Boolean(recap.archived_at) || recap.status === 'DRAFT' || reviewMutation.isPending}
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
              onChange={(event) => setInternalNote(event.target.value)}
              rows={3}
              disabled={Boolean(recap.archived_at) || recap.status === 'DRAFT' || reviewMutation.isPending}
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

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar recap?</AlertDialogTitle>
            <AlertDialogDescription>
              El recap dejará de aparecer en el listado activo y pasará a la vista de archivados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={archiveMutation.isPending}>
              {archiveMutation.isPending ? 'Archivando...' : 'Archivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
