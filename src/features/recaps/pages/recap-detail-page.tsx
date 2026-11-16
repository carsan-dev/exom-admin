import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog'
import { getApiErrorMessage } from '@/lib/api-utils'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { toast } from 'sonner'
import { recapIdentity, useRecapIdentity, useArchiveRecap, useRecapDetail, useReviewRecap } from '../api'
import { RecapArchiveDialog } from '../components/recap-archive-dialog'
import { RecapDetailActions } from '../components/recap-detail-actions'
import { RecapDetailLoadError } from '../components/recap-detail-load-error'
import { RecapDetailRefreshAlert } from '../components/recap-detail-refresh-alert'
import { RecapDetailSkeleton } from '../components/recap-detail-skeleton'
import { RecapDetailSummaryCard } from '../components/recap-detail-summary-card'
import { RecapDetailTabs } from '../components/recap-detail-tabs'
import { RecapLegacyErrorPanel } from '../components/recap-legacy-error-panel'
import { RecapLegacyReviewCard } from '../components/recap-legacy-review-card'
import { RecapReviewEditor } from '../components/recap-review-editor'
import { toRecapPrintModel } from '../components/recap-print-model'
import { getRecapClientName } from '../types'

export function RecapDetailPage() {
  const { id } = useParams()
  const identity = useRecapIdentity()
  if (!identity.split(':')[0]) return <p role="alert">Inicia sesión para consultar el recap.</p>
  return <ScopedRecapDetailPage key={`${identity}:${id}`} id={id} identity={identity} />
}
function ScopedRecapDetailPage({ id, identity }: { id?: string; identity: string }) {
  const recapQuery = useRecapDetail(id)
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo')
  const backTo = returnTo?.startsWith('/progress?') ? returnTo : '/recaps'
  const backLabel = backTo === '/recaps' ? 'Volver a recaps' : 'Volver a seguimiento'
  const live = useRef(false)
  useEffect(() => { live.current = true; return () => { live.current = false } }, [])
  const current = () => live.current && recapIdentity() === identity
  const reviewMutation = useReviewRecap()
  const archiveMutation = useArchiveRecap()
  const [internalNote, setInternalNote] = useState('')
  const [clientFeedback, setClientFeedback] = useState('')
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [reviewDirty, setReviewDirty] = useState(false)
  const [reviewPending, setReviewPending] = useState(false)
  const [baseline, setBaseline] = useState({ note: '', feedback: '' })
  const [legacyError, setLegacyError] = useState('')
  const [legacyServer, setLegacyServer] = useState<typeof recapQuery.data>()
  const { confirm, dialog: confirmDialog } = useConfirmDialog()
  const latestLegacyServer = useRef(legacyServer)
  useEffect(() => { latestLegacyServer.current = legacyServer }, [legacyServer])

  useEffect(() => {
    const data = recapQuery.data
    if (!data || legacyError) return
    const note = data.admin_comments ?? ''
    const feedback = data.client_feedback_text ?? ''
    // A background refresh may acknowledge matching values, never erase edits.
    if ((internalNote === baseline.note && clientFeedback === baseline.feedback) ||
      (internalNote === note && clientFeedback === feedback)) {
      if (baseline.note !== note || baseline.feedback !== feedback) setBaseline({ note, feedback })
      if (internalNote !== note) setInternalNote(note)
      if (clientFeedback !== feedback) setClientFeedback(feedback)
    }
  }, [recapQuery.data, internalNote, clientFeedback, baseline, legacyError])

  const recap = recapQuery.data
  const existingInternalNote = baseline.note
  const existingClientFeedback = baseline.feedback
  const hasUnsavedChanges = Boolean(
    recap &&
      (internalNote !== existingInternalNote ||
        clientFeedback !== existingClientFeedback ||
        reviewMutation.isPending || reviewDirty || Boolean(legacyError) ||
        archiveMutation.isPending),
  )
  useUnsavedChanges('recap-review', hasUnsavedChanges)
  const canReviewSubmittedRecap = Boolean(
    recap && recap.status === 'SUBMITTED' && !recap.archived_at,
  )
  const canEditReviewedComment = Boolean(
    recap && recap.status === 'REVIEWED' && !recap.archived_at,
  )
  const canSubmitReview = Boolean(
    recap &&
      !reviewMutation.isPending && !archiveMutation.isPending && !reviewPending && !legacyError &&
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
    return <RecapDetailSkeleton />
  }

  if (!recap) {
    const message = getApiErrorMessage(recapQuery.error, 'No se ha podido cargar el recap solicitado.')

    return (
      <RecapDetailLoadError
        message={message}
        backTo={backTo}
        backLabel={backLabel}
        onRetry={() => void recapQuery.refetch()}
      />
    )
  }

  const clientName = getRecapClientName(recap.client)
  const printClientName = [recap.client.profile?.first_name?.trim(), recap.client.profile?.last_name?.trim()]
    .filter(Boolean).join(' ') || 'Cliente sin nombre'
  const printModel = toRecapPrintModel(recap, printClientName)

  function handleReview() {
    if (!current() || !recap || !canSubmitReview) {
      return
    }

    reviewMutation.mutate(
      {
        id: recap.id,
        admin_comments: internalNote.trim(),
        client_feedback_text: clientFeedback.trim(),
      },
      {
        onSuccess: (data) => {
          if (!current()) return
          const note = data.admin_comments ?? ''
          const feedback = data.client_feedback_text ?? ''
          setInternalNote(note); setClientFeedback(feedback); setBaseline({ note, feedback })
          toast.success(
            recap.status === 'SUBMITTED'
              ? 'Recap revisado correctamente'
              : 'Comentario guardado correctamente',
          )
        },
        onError: (error) => {
          if (!current()) return
          setLegacyError(getApiErrorMessage(error, 'No se pudo confirmar el guardado.'))
        },
      },
    )
  }

  function handleArchive() {
    if (!current() || !recap || hasUnsavedChanges) return

    archiveMutation.mutate(recap.id, {
      onSuccess: () => {
        if (!current()) return
        toast.success('Recap archivado correctamente')
        setArchiveDialogOpen(false)
      },
      onError: (error) => {
        if (!current()) return
        toast.error(getApiErrorMessage(error, 'No se pudo archivar el recap'))
      },
    })
  }

  return (
    <div className="space-y-6">
      <RecapDetailActions
        recap={recap}
        backTo={backTo}
        backLabel={backLabel}
        printModel={printModel}
        hasUnsavedChanges={hasUnsavedChanges}
        canSubmitReview={canSubmitReview}
        reviewPending={reviewMutation.isPending}
        reviewButtonLabel={reviewButtonLabel}
        onReview={handleReview}
        onArchiveClick={() => setArchiveDialogOpen(true)}
      />

      <RecapDetailSummaryCard recap={recap} clientName={clientName} />

      <RecapDetailTabs recap={recap} />

      {recapQuery.isError && <RecapDetailRefreshAlert isFetching={recapQuery.isFetching} onRetry={() => void recapQuery.refetch()} />}
      <RecapReviewEditor recap={recap} archived={Boolean(recap.archived_at)} onDirty={setReviewDirty} onPending={setReviewPending} disabled={reviewMutation.isPending || archiveMutation.isPending || Boolean(legacyError)} />
      {legacyError && <RecapLegacyErrorPanel error={legacyError} isFetching={recapQuery.isFetching} server={legacyServer} onConsult={async () => {
        const result = await recapQuery.refetch()
        if (current() && result.data && !result.isError) setLegacyServer(result.data)
      }} onDiscard={async () => {
        if (!current() || !legacyServer) return
        // The identity or the saved version may change while the question is open: re-check both
        // after the answer and load only the version that was on screen when asked.
        if (!(await confirm({ title: 'Descartar tus comentarios locales y cargar los guardados?' })) || !current()) return
        if (latestLegacyServer.current !== legacyServer) return
        const note = legacyServer.admin_comments ?? ''; const feedback = legacyServer.client_feedback_text ?? ''
        setInternalNote(note); setClientFeedback(feedback); setBaseline({ note, feedback }); setLegacyError(''); setLegacyServer(undefined)
      }} />}
      <RecapLegacyReviewCard
        recap={recap}
        clientFeedback={clientFeedback}
        internalNote={internalNote}
        reviewPending={reviewMutation.isPending}
        onClientFeedbackChange={setClientFeedback}
        onInternalNoteChange={setInternalNote}
      />

      <RecapArchiveDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        onConfirm={handleArchive}
        pending={archiveMutation.isPending}
      />
      {confirmDialog}
    </div>
  )
}
