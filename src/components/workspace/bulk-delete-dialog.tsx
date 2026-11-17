import { type ReactNode, useEffect, useId, useRef } from 'react'
import { LoaderCircle, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type {
  BulkDeleteItem,
  BulkDeleteItemResult,
  BulkDeleteOutcome,
  BulkDeleteProgress,
  BulkDeleteSummary,
} from '@/lib/bulk-delete'
import { agreeParticiple, type BulkDeleteEntityLabels, formatEntityCount } from './bulk-delete-labels'

export interface BulkDeleteDialogProps {
  open: boolean
  /** Close requests are ignored while the batch is running. */
  onOpenChange: (open: boolean) => void
  /** Items to delete, in execution order; their names are listed in the confirmation. */
  items: ReadonlyArray<BulkDeleteItem>
  labels: BulkDeleteEntityLabels
  /** Consequences of the deletion for this entity, shown under the list. */
  consequences: ReactNode
  /** The current role turns each deletion into an approval request (ADMIN). */
  requiresApproval: boolean
  /** The batch is in progress. */
  running: boolean
  progress: BulkDeleteProgress | null
  /** Result of the finished batch. When present the dialog shows the result phase. */
  summary: BulkDeleteSummary | null
  onConfirm: () => void
}

const RESULT_GROUPS: ReadonlyArray<{ outcome: BulkDeleteOutcome; stem: string; suffix?: string }> = [
  { outcome: 'deleted', stem: 'Eliminad' },
  { outcome: 'pending_approval', stem: 'Enviad', suffix: ' a aprobación' },
  { outcome: 'failed', stem: 'Fallid' },
  { outcome: 'not_attempted', stem: 'No intentad' },
]

function describeSummary(summary: BulkDeleteSummary, gender: BulkDeleteEntityLabels['gender']) {
  return RESULT_GROUPS.filter(({ outcome }) => summary.counts[outcome] > 0)
    .map(({ outcome, stem, suffix = '' }) => {
      const count = summary.counts[outcome]
      return `${count} ${agreeParticiple(stem, count, gender).toLowerCase()}${suffix}`
    })
    .join(', ')
}

/**
 * Close auto-focus handler. The dialog is opened imperatively (no Radix Trigger), so Radix would
 * leave focus on <body>. Focus goes back to the element focused when it opened (the «Eliminar (N)»
 * button of the selection bar). When that element left the document, e.g. the bar unmounted
 * because nothing is selected any more, it goes to the page's <main> landmark instead (focusable
 * with tabIndex -1 in the app shell).
 */
function restoreFocus(event: Event, opener: Element | null) {
  const target = opener instanceof HTMLElement && opener.isConnected ? opener : document.querySelector<HTMLElement>('main')
  if (!target) return
  target.focus()
  // Only take over from Radix when focus really moved (e.g. a <main> without tabIndex refuses it).
  if (document.activeElement === target) event.preventDefault()
}

function ResultItem({ result }: { result: BulkDeleteItemResult }) {
  if (result.outcome !== 'failed') return <li>{result.name}</li>
  return (
    <li>
      <span className="font-medium text-foreground">{result.name}</span>
      <span className="text-foreground-secondary">: {result.message}</span>
    </li>
  )
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  items,
  labels,
  consequences,
  requiresApproval,
  running,
  progress,
  summary,
  onConfirm,
}: BulkDeleteDialogProps) {
  const idPrefix = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<Element | null>(null)
  const count = items.length
  const countLabel = formatEntityCount(count, labels)

  useEffect(() => {
    if (summary) closeRef.current?.focus()
  }, [summary])

  const handleOpenChange = (next: boolean) => {
    if (!next && running) return
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        disableOutsideClose={running}
        onEscapeKeyDown={(event) => {
          if (running) event.preventDefault()
        }}
        onOpenAutoFocus={(event) => {
          // Still the element that opened the dialog: Radix has not moved focus yet.
          openerRef.current = document.activeElement
          event.preventDefault()
          cancelRef.current?.focus()
        }}
        onCloseAutoFocus={(event) => restoreFocus(event, openerRef.current)}
      >
        {summary ? (
          <>
            <DialogHeader>
              <DialogTitle>Resultado de la eliminación</DialogTitle>
              <DialogDescription role="status" aria-live="polite">
                {describeSummary(summary, labels.gender)}.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-72 space-y-4 overflow-y-auto border-y border-border py-3">
              {RESULT_GROUPS.map(({ outcome, stem, suffix = '' }) => {
                const results = summary.results.filter((result) => result.outcome === outcome)
                if (results.length === 0) return null
                const headingId = `${idPrefix}-${outcome}`
                return (
                  <section key={outcome} aria-labelledby={headingId}>
                    <h3 id={headingId} className="text-sm font-semibold text-foreground">
                      {agreeParticiple(stem, results.length, labels.gender)}
                      {suffix} ({results.length})
                    </h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-foreground-secondary">
                      {results.map((result) => (
                        <ResultItem key={result.id} result={result} />
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>

            <DialogFooter>
              <Button ref={closeRef} variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Eliminar {countLabel}</DialogTitle>
              <DialogDescription>{consequences}</DialogDescription>
            </DialogHeader>

            {requiresApproval && (
              <p className="flex items-start gap-2 border border-status-warning/30 bg-status-warning-soft p-3 text-[13px] text-foreground">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-status-warning" />
                Tu rol necesita aprobación: se enviará una solicitud por cada elemento y no se eliminarán
                hasta que se aprueben.
              </p>
            )}

            <div className="space-y-2">
              <ul
                aria-label={`${labels.plural.charAt(0).toUpperCase()}${labels.plural.slice(1)} ${agreeParticiple('seleccionad', 2, labels.gender)}`}
                className="max-h-56 list-disc space-y-1 overflow-y-auto border-y border-border py-3 pl-8 text-[13px] text-foreground"
              >
                {items.map((item) => (
                  <li key={item.id}>{item.name}</li>
                ))}
              </ul>

              <p role="status" aria-live="polite" className="text-[13px] text-foreground-secondary">
                {running ? `Eliminando ${progress?.current ?? 1} de ${progress?.total ?? count}…` : ''}
              </p>
            </div>

            <DialogFooter>
              <Button ref={cancelRef} variant="outline" onClick={() => onOpenChange(false)} disabled={running}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={onConfirm} disabled={running || count === 0}>
                {running ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                    Eliminando…
                  </>
                ) : requiresApproval ? (
                  'Solicitar eliminación'
                ) : (
                  `Eliminar ${countLabel}`
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
