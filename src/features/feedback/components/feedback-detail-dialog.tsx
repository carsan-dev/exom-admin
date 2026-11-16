import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { FeedbackItem } from '../types'
import { FeedbackDetailView } from './feedback-detail-view'

interface FeedbackDetailDialogProps {
  item: FeedbackItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: string
  onDraftChange: (value: string) => void
  onResponded: (item: FeedbackItem, response: string) => void
  /** Posición del elemento en la lista cargada (1-based) y tamaño de la lista; 0 si no está en ella. */
  position: number
  total: number
  onPrevious?: () => void
  onNext?: () => void
}

/** Detalle por debajo de lg: diálogo con navegación Anterior/Siguiente por la lista cargada. */
export function FeedbackDetailDialog({
  item,
  open,
  onOpenChange,
  draft,
  onDraftChange,
  onResponded,
  position,
  total,
  onPrevious,
  onNext,
}: FeedbackDetailDialogProps) {
  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] min-w-0 max-w-2xl grid-cols-[minmax(0,1fr)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de feedback</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1 border-b border-border pb-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Feedback anterior"
            disabled={!onPrevious}
            onClick={onPrevious}
            className="size-11 md:size-9"
          >
            <ChevronUp aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Feedback siguiente"
            disabled={!onNext}
            onClick={onNext}
            className="size-11 md:size-9"
          >
            <ChevronDown aria-hidden="true" />
          </Button>
          {position > 0 && (
            <span aria-live="polite" className="px-2 text-xs tabular-nums text-foreground-muted">
              {position} de {total}
            </span>
          )}
        </div>

        <FeedbackDetailView
          item={item}
          draft={draft}
          onDraftChange={onDraftChange}
          onResponded={onResponded}
          titleAs="h3"
        />
      </DialogContent>
    </Dialog>
  )
}
