import { Link } from 'react-router'
import { Archive, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RecapItem } from '../types'
import type { RecapPrintModel } from './recap-print-model'
import { RecapPrintableSummary } from './recap-printable-summary'

interface RecapDetailBackLinkProps {
  backTo: string
  backLabel: string
}

export function RecapDetailBackLink({ backTo, backLabel }: RecapDetailBackLinkProps) {
  return (
    <Button variant="ghost" asChild>
      <Link to={backTo}>
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {backLabel}
      </Link>
    </Button>
  )
}

interface RecapDetailActionsProps {
  recap: RecapItem
  printModel: RecapPrintModel | null
  hasUnsavedChanges: boolean
  canSubmitReview: boolean
  reviewPending: boolean
  reviewButtonLabel: string
  onReview: () => void
  onArchiveClick: () => void
}

export function RecapDetailActions({
  recap,
  printModel,
  hasUnsavedChanges,
  canSubmitReview,
  reviewPending,
  reviewButtonLabel,
  onReview,
  onArchiveClick,
}: RecapDetailActionsProps) {
  return (
    <>
      <RecapPrintableSummary model={printModel} disabled={hasUnsavedChanges} />
      {!recap.archived_at && recap.status !== 'DRAFT' && (
        <Button onClick={onReview} disabled={!canSubmitReview}>
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
          {reviewPending ? 'Guardando...' : reviewButtonLabel}
        </Button>
      )}
      {recap.status === 'REVIEWED' && !recap.archived_at && (
        <Button variant="outline" disabled={hasUnsavedChanges} onClick={onArchiveClick}>
          <Archive aria-hidden="true" className="h-4 w-4" />
          Archivar recap
        </Button>
      )}
    </>
  )
}
