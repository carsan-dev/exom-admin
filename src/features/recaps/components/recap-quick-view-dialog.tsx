import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { RecapListItem } from '../types'
import {
  RecapQuickView,
  type RecapFocusRequest,
  type RecapReplyDraft,
  type RecapReplyMode,
  type RecapReplyValues,
} from './recap-quick-view'

interface RecapQuickViewDialogProps {
  item: RecapListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Devuelve el foco al cerrar; se llama desde `onCloseAutoFocus`. */
  onCloseAutoFocus: (event: Event) => void
  draft: RecapReplyDraft | undefined
  onDraftChange: (id: string, values: RecapReplyDraft, saved: RecapReplyValues) => void
  onSend: (item: RecapListItem, values: RecapReplyValues, mode: RecapReplyMode) => void
  onDraftDiscard: (id: string) => void
  isSending: boolean
  focusRequest: RecapFocusRequest | null
  onFocusHandled: () => void
  /** Posición del recap en la lista cargada (1-based) y tamaño de la lista; 0 si no está en ella. */
  position: number
  total: number
  onPrevious?: () => void
  onNext?: () => void
}

/** Vista rápida por debajo de lg: diálogo con navegación Anterior/Siguiente por la lista cargada. */
export function RecapQuickViewDialog({
  item,
  open,
  onOpenChange,
  onCloseAutoFocus,
  draft,
  onDraftChange,
  onSend,
  onDraftDiscard,
  isSending,
  focusRequest,
  onFocusHandled,
  position,
  total,
  onPrevious,
  onNext,
}: RecapQuickViewDialogProps) {
  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] min-w-0 max-w-2xl grid-cols-[minmax(0,1fr)] overflow-y-auto"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>Detalle de recap</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1 border-b border-border pb-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Recap anterior"
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
            aria-label="Recap siguiente"
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

        <RecapQuickView
          key={item.id}
          item={item}
          draft={draft}
          onDraftChange={onDraftChange}
          onSend={onSend}
          onDraftDiscard={onDraftDiscard}
          isSending={isSending}
          focusRequest={focusRequest}
          onFocusHandled={onFocusHandled}
          titleAs="h3"
        />
      </DialogContent>
    </Dialog>
  )
}
