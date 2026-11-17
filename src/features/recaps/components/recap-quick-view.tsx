import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { ErrorState } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useRecapDetail } from '../api'
import { hasRecapReplyChanges, isRecapEditableAfterReview, isRecapPendingReview } from '../recaps-selection'
import { formatRecapOption, getRecapClientName } from '../types'
import type { RecapItem, RecapListItem } from '../types'
import { formatDate, formatWeekRange } from './recap-detail-format'
import { RecapStatusChip } from './recap-status-chip'
import { getRecapDetailPath } from './recaps-list-format'

/** Respuesta local sin enviar de un recap. */
export interface RecapReplyValues {
  clientFeedback: string
  internalNote: string
}

/** `review`: primera revisión de un pendiente. `edit`: cambios en un recap ya revisado. */
export type RecapReplyMode = 'review' | 'edit'

/** Motivo por el que se retira un borrador: otra persona revisó el pendiente, o se archivó el recap. */
export type RecapDraftDiscardReason = 'reviewed-by-other' | 'archived'

/** Borrador local de un recap, con el modo en el que se empezó a escribir. */
export interface RecapReplyDraft extends RecapReplyValues {
  mode: RecapReplyMode
}

/**
 * Petición de foco para la vista rápida:
 * - `select`: fila elegida en escritorio. Comentario si ya está cargado y admite respuesta; si no, título.
 *   Mientras carga, título y no se vuelve a mover.
 * - `advance`: siguiente recap tras enviar. Título mientras carga y comentario al cargar, salvo que el
 *   usuario haya movido el foco.
 * - `heading`: título del panel.
 */
export type RecapFocusRequest = 'select' | 'advance' | 'heading'

const SECTION_TITLE_CLASS = 'text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-foreground-muted'
const HELP_CLASS = 'text-xs leading-4 text-foreground-secondary'
const TEXT_BLOCK_CLASS =
  'min-w-0 whitespace-pre-wrap break-words border border-border px-4 py-3 text-sm leading-[22px] text-foreground [overflow-wrap:anywhere]'

type HeadingTag = 'h2' | 'h3' | 'h4'

interface SummaryField {
  label: string
  value: string
}

function valueOrMissing(value: number | null | undefined) {
  return value?.toString() ?? 'No indicado'
}

function getSummaryBlocks(recap: RecapItem): { title: string; fields: SummaryField[] }[] {
  const general: SummaryField[] = [{ label: 'Estado de ánimo', value: formatRecapOption(recap.mood) }]
  if (recap.stress_enabled) general.push({ label: 'Nivel de estrés', value: valueOrMissing(recap.stress_level) })
  if (recap.energy_level != null) {
    general.push({ label: 'Energía semanal (1 sin energía – 10 mucha)', value: recap.energy_level.toString() })
  }
  if (recap.hunger_level != null) {
    general.push({ label: 'Hambre semanal (1 sin hambre – 10 extrema)', value: recap.hunger_level.toString() })
  }
  if (recap.digestion_level != null) {
    general.push({ label: 'Digestión semanal (1 muy mala – 10 muy buena)', value: recap.digestion_level.toString() })
  }

  const nutrition: SummaryField[] = [
    { label: 'Calidad de alimentación', value: formatRecapOption(recap.nutrition_quality) },
    { label: 'Calidad de comidas', value: valueOrMissing(recap.food_quality) },
  ]
  if (recap.hydration_enabled) {
    nutrition.push({ label: 'Nivel de hidratación', value: formatRecapOption(recap.hydration_level) })
  }

  return [
    {
      title: 'Entreno',
      fields: [
        { label: 'Sesiones completadas', value: valueOrMissing(recap.training_sessions) },
        { label: 'Esfuerzo semanal', value: valueOrMissing(recap.training_effort) },
        { label: 'Progreso', value: formatRecapOption(recap.training_progress) },
      ],
    },
    { title: 'Nutrición', fields: nutrition },
    {
      title: 'Recuperación',
      fields: [
        { label: 'Horas de sueño', value: formatRecapOption(recap.sleep_hours_range) },
        { label: 'Fatiga', value: formatRecapOption(recap.fatigue_level) },
        { label: 'Intensidad del dolor', value: formatRecapOption(recap.pain_intensity) },
        {
          label: 'Zonas con dolor muscular',
          value:
            recap.muscle_pain_zones.length > 0
              ? recap.muscle_pain_zones.map((zone) => formatRecapOption(zone)).join(', ')
              : 'Sin zonas reportadas.',
        },
      ],
    },
    { title: 'General', fields: general },
  ]
}

function getClientNotes(recap: RecapItem): SummaryField[] {
  return [
    { label: 'Entreno', value: recap.training_notes },
    { label: 'Nutrición', value: recap.nutrition_notes },
    { label: 'Recuperación', value: recap.recovery_notes },
    { label: 'General', value: recap.general_notes },
  ].flatMap(({ label, value }) => (value?.trim() ? [{ label, value: value.trim() }] : []))
}

function SummaryBlock({ title, fields, headingAs: Heading }: { title: string; fields: SummaryField[]; headingAs: HeadingTag }) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="min-w-0 border-t border-border pt-3">
      <Heading id={headingId} className={SECTION_TITLE_CLASS}>
        {title}
      </Heading>
      <dl className="mt-2 space-y-2">
        {fields.map((field) => (
          <div key={field.label} className="min-w-0">
            <dt className="text-[13px] leading-5 text-foreground-secondary">{field.label}</dt>
            <dd className="text-sm leading-5 text-foreground [overflow-wrap:anywhere]">{field.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

interface RecapReplyFormProps {
  values: RecapReplyValues
  onChange: (values: RecapReplyValues) => void
  onSend: () => void
  isSending: boolean
  mode: RecapReplyMode
  /** En `edit`, solo si el comentario o la nota cambian respecto a lo guardado. */
  canSubmit: boolean
  commentRef: RefObject<HTMLTextAreaElement | null>
}

function RecapReplyForm({ values, onChange, onSend, isSending, mode, canSubmit, commentRef }: RecapReplyFormProps) {
  const fieldId = useId()
  const commentId = `${fieldId}-comment`
  const noteId = `${fieldId}-note`
  // Abierta de inicio si ya hay nota (guardada o en el borrador); después la controla el usuario.
  const [noteInitiallyOpen] = useState(() => values.internalNote.trim() !== '')

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={commentId}>Comentario para el cliente</Label>
        <Textarea
          ref={commentRef}
          id={commentId}
          placeholder="Escribe un comentario que verá el cliente en su recap..."
          aria-describedby={`${commentId}-help`}
          value={values.clientFeedback}
          onChange={(event) => onChange({ ...values, clientFeedback: event.target.value })}
          rows={4}
          disabled={isSending}
          className="resize-none"
        />
        <p id={`${commentId}-help`} className={HELP_CLASS}>
          Este texto es visible para el cliente. Si lo cambias se enviará una notificación push.
        </p>
      </div>

      <details open={noteInitiallyOpen} className="group min-w-0 border-y border-border">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-1 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus md:min-h-9 [&::-webkit-details-marker]:hidden">
          <ChevronRight aria-hidden="true" className="size-4 flex-none group-open:rotate-90" />
          Nota interna
        </summary>
        <div className="min-w-0 space-y-2 px-1 pb-4 pt-2">
          <Label htmlFor={noteId}>Nota interna (solo visible para el equipo)</Label>
          <Textarea
            id={noteId}
            placeholder="Notas internas que nunca se comparten con el cliente..."
            aria-describedby={`${noteId}-help`}
            value={values.internalNote}
            onChange={(event) => onChange({ ...values, internalNote: event.target.value })}
            rows={3}
            disabled={isSending}
            className="resize-none"
          />
          <p id={`${noteId}-help`} className={HELP_CLASS}>
            Esta nota nunca se comparte con el cliente y no genera notificaciones.
          </p>
        </div>
      </details>

      <Button type="button" onClick={onSend} disabled={isSending || !canSubmit} className="max-md:h-11 max-md:w-full">
        {mode === 'edit'
          ? isSending
            ? 'Guardando...'
            : 'Guardar cambios'
          : isSending
            ? 'Enviando...'
            : 'Enviar y marcar revisado'}
      </Button>
    </div>
  )
}

function RecapQuickViewSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-4 pt-5">
      <span className="sr-only">Cargando recap</span>
      <div aria-hidden="true" className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2 border-t border-border pt-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-2/5" />
          </div>
        ))}
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}

interface RecapQuickViewProps {
  item: RecapListItem
  /** Respuesta local de este recap; `undefined` si no se ha editado. */
  draft: RecapReplyDraft | undefined
  /** `saved` son los valores guardados con los que se compara el borrador. */
  onDraftChange: (id: string, values: RecapReplyDraft, saved: RecapReplyValues) => void
  /** Envía la revisión o los cambios (valores ya recortados). La mutación vive en la página. */
  onSend: (item: RecapListItem, values: RecapReplyValues, mode: RecapReplyMode) => void
  /**
   * Descarta el borrador de este recap cuando ya no admite respuesta o cambia de modo. `reason` indica
   * por qué, para avisar al usuario (`null`: sin aviso). La página decide si avisa (una sola vez).
   */
  onDraftDiscard: (id: string, reason: RecapDraftDiscardReason | null) => void
  /** Hay un envío de este recap en vuelo. */
  isSending: boolean
  focusRequest: RecapFocusRequest | null
  onFocusHandled: () => void
  /** Nivel del título con el nombre del cliente; las secciones usan el siguiente. */
  titleAs?: 'h2' | 'h3'
  /** `pane`: panel de escritorio (resumen en dos columnas desde xl); `stacked`: diálogo. */
  layout?: 'pane' | 'stacked'
}

/** Vista rápida de un recap (panel de escritorio y diálogo móvil). */
export function RecapQuickView({
  item,
  draft,
  onDraftChange,
  onSend,
  onDraftDiscard,
  isSending,
  focusRequest,
  onFocusHandled,
  titleAs: Title = 'h2',
  layout = 'stacked',
}: RecapQuickViewProps) {
  const detailQuery = useRecapDetail(item.id)
  const detail = detailQuery.data
  const headingRef = useRef<HTMLHeadingElement>(null)
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const headingFocusedWhileLoading = useRef(false)

  const status = detail?.status ?? item.status
  const archivedAt = detail ? detail.archived_at : item.archived_at
  const detailState = detail ? 'ready' : detailQuery.isError ? 'error' : 'loading'
  const canReply = Boolean(detail) && isRecapPendingReview({ status, archived_at: archivedAt })
  const canEdit = Boolean(detail) && isRecapEditableAfterReview({ status, archived_at: archivedAt })
  const canWrite = canReply || canEdit
  const mode: RecapReplyMode = canEdit ? 'edit' : 'review'
  const sectionHeading: HeadingTag = Title === 'h2' ? 'h3' : 'h4'
  const SectionHeading = sectionHeading

  // Con el detalle cargado y sin poder escribir (archivado por otro), el borrador no se puede enviar ni
  // descartar desde aquí: se retira para no dejar activo el aviso de cambios sin guardar. También si el
  // modo cambió (otra persona revisó el pendiente): una respuesta pensada para un pendiente no debe
  // sobrescribir con «Guardar cambios» lo que esa persona guardó.
  const draftMode = draft?.mode
  useEffect(() => {
    if (detailState !== 'ready' || draftMode === undefined || (canWrite && draftMode === mode)) return
    const reason: RecapDraftDiscardReason | null = !canWrite
      ? archivedAt
        ? 'archived'
        : null
      : 'reviewed-by-other'
    onDraftDiscard(item.id, reason)
  }, [detailState, canWrite, mode, draftMode, archivedAt, onDraftDiscard, item.id])

  useEffect(() => {
    if (!focusRequest) return
    const heading = headingRef.current

    if (focusRequest === 'heading') {
      heading?.focus()
      onFocusHandled()
      return
    }

    if (detailState === 'loading') {
      if (!headingFocusedWhileLoading.current) {
        heading?.focus()
        headingFocusedWhileLoading.current = true
      }
      // Al elegir una fila no se vuelve a mover el foco cuando termine la carga.
      if (focusRequest === 'select') onFocusHandled()
      return
    }

    const active = document.activeElement
    const userMovedFocus =
      headingFocusedWhileLoading.current && active !== heading && active !== document.body && active !== null
    if (!userMovedFocus) {
      if (canWrite && commentRef.current) commentRef.current.focus()
      else heading?.focus()
    }
    onFocusHandled()
  }, [focusRequest, detailState, canWrite, onFocusHandled])

  const saved: RecapReplyValues = {
    clientFeedback: detail?.client_feedback_text ?? '',
    internalNote: detail?.admin_comments ?? '',
  }
  const values: RecapReplyValues = draft && draft.mode === mode ? draft : saved
  const clientNotes = detail ? getClientNotes(detail) : []
  // Igual que la página de detalle: un pendiente se envía aunque no haya cambios; un revisado, solo si cambia algo.
  const canSubmit = canReply || (canEdit && hasRecapReplyChanges(values, saved))

  function handleSend() {
    if (!canWrite || !canSubmit || isSending) return
    onSend(item, { clientFeedback: values.clientFeedback.trim(), internalNote: values.internalNote.trim() }, mode)
  }

  return (
    <div className="min-w-0">
      <header className="min-w-0 border-b border-border pb-4">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <Title
              ref={headingRef}
              tabIndex={-1}
              className="min-w-0 text-lg font-semibold leading-6 text-foreground outline-none [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {getRecapClientName(item.client)}
            </Title>
            <RecapStatusChip status={status} archivedAt={archivedAt} />
          </div>
          <Button variant="outline" size="sm" className="max-md:h-11 flex-none" asChild>
            <Link to={getRecapDetailPath(item.id)}>Ver completo</Link>
          </Button>
        </div>
        <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
          <div className="min-w-0">
            <dt className={SECTION_TITLE_CLASS}>Semana</dt>
            <dd className="mt-0.5 text-sm leading-5 text-foreground">
              {formatWeekRange(item.week_start_date, item.week_end_date)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className={SECTION_TITLE_CLASS}>Enviado</dt>
            <dd className="mt-0.5 text-sm leading-5 text-foreground">{formatDate(item.submitted_at ?? item.created_at)}</dd>
          </div>
        </dl>
      </header>

      {detailState === 'loading' && <RecapQuickViewSkeleton />}

      {detailState === 'error' && (
        <ErrorState
          className="py-10"
          title="Error al cargar el recap. Intenta de nuevo."
          retryLabel={detailQuery.isFetching ? 'Reintentando...' : 'Reintentar'}
          onRetry={() => void detailQuery.refetch()}
        />
      )}

      {detail && (
        <div className="min-w-0 space-y-6 pt-5">
          <div className={cn('grid min-w-0 gap-x-6 gap-y-4', layout === 'pane' ? 'xl:grid-cols-2' : 'sm:grid-cols-2')}>
            {getSummaryBlocks(detail).map((block) => (
              <SummaryBlock key={block.title} title={block.title} fields={block.fields} headingAs={sectionHeading} />
            ))}
          </div>

          {clientNotes.length > 0 && (
            <section className="min-w-0 space-y-2">
              <SectionHeading className={SECTION_TITLE_CLASS}>Notas del cliente</SectionHeading>
              <dl className="space-y-3">
                {clientNotes.map((note) => (
                  <div key={note.label} className="min-w-0 space-y-1">
                    <dt className="text-[13px] leading-5 text-foreground-secondary">{note.label}</dt>
                    <dd className={cn(TEXT_BLOCK_CLASS, 'bg-background-secondary')}>{note.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="min-w-0 space-y-3">
            <SectionHeading className={SECTION_TITLE_CLASS}>Revisión del admin</SectionHeading>
            {canWrite ? (
              <>
                <RecapReplyForm
                  key={mode}
                  values={values}
                  onChange={(next) => onDraftChange(item.id, { clientFeedback: next.clientFeedback, internalNote: next.internalNote, mode }, saved)}
                  onSend={handleSend}
                  isSending={isSending}
                  mode={mode}
                  canSubmit={canSubmit}
                  commentRef={commentRef}
                />
                {canEdit && (
                  <p className="text-sm text-foreground-secondary">
                    Para la revisión compartible, imprimir o archivar, abre «Ver completo».
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-3">
                {(detail.client_feedback_text?.trim() || detail.admin_comments?.trim()) && (
                  <dl className="space-y-3">
                    {detail.client_feedback_text?.trim() && (
                      <div className="min-w-0 space-y-1">
                        <dt className="text-[13px] leading-5 text-foreground-secondary">Comentario para el cliente</dt>
                        <dd className={TEXT_BLOCK_CLASS}>{detail.client_feedback_text}</dd>
                      </div>
                    )}
                    {detail.admin_comments?.trim() && (
                      <div className="min-w-0 space-y-1">
                        <dt className="text-[13px] leading-5 text-foreground-secondary">Nota interna</dt>
                        <dd className={TEXT_BLOCK_CLASS}>{detail.admin_comments}</dd>
                      </div>
                    )}
                  </dl>
                )}
                <p className="text-sm text-foreground-secondary">
                  {archivedAt
                    ? 'Recap archivado: los comentarios son de solo lectura. Para consultar la revisión compartible o imprimir, abre «Ver completo».'
                    : 'Para consultar la revisión compartible o imprimir, abre «Ver completo».'}
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
