import { Link } from 'react-router'
import { Archive, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RecapItem } from '../types'
import type { RecapPrintModel } from './recap-print-model'
import { RecapPrintableSummary } from './recap-printable-summary'

interface RecapDetailActionsProps {
  recap: RecapItem
  backTo: string
  backLabel: string
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
  backTo,
  backLabel,
  printModel,
  hasUnsavedChanges,
  canSubmitReview,
  reviewPending,
  reviewButtonLabel,
  onReview,
  onArchiveClick,
}: RecapDetailActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="ghost" asChild>
        <Link to={backTo}>
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      </Button>

      <div className="flex flex-wrap gap-3">
        <RecapPrintableSummary model={printModel} disabled={hasUnsavedChanges} />
        {!recap.archived_at && recap.status !== 'DRAFT' && (
          <Button onClick={onReview} disabled={!canSubmitReview}>
            <CheckCircle2 className="h-4 w-4" />
            {reviewPending ? 'Guardando...' : reviewButtonLabel}
          </Button>
        )}
        {recap.status === 'REVIEWED' && !recap.archived_at && (
          <Button variant="outline" disabled={hasUnsavedChanges} onClick={onArchiveClick}>
            <Archive className="h-4 w-4" />
            Archivar recap
          </Button>
        )}
      </div>
    </div>
  )
}
