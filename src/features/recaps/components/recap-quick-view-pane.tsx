import { EmptyState } from '@/components/page'
import type { RecapListItem } from '../types'
import {
  RecapQuickView,
  type RecapDraftDiscardReason,
  type RecapFocusRequest,
  type RecapReplyDraft,
  type RecapReplyMode,
  type RecapReplyValues,
} from './recap-quick-view'

export const RECAP_QUICK_VIEW_PANE_ID = 'recap-detail'

interface RecapQuickViewPaneProps {
  item: RecapListItem | null
  draft: RecapReplyDraft | undefined
  onDraftChange: (id: string, values: RecapReplyDraft, saved: RecapReplyValues) => void
  onSend: (item: RecapListItem, values: RecapReplyValues, mode: RecapReplyMode) => void
  onDraftDiscard: (id: string, reason: RecapDraftDiscardReason | null) => void
  isSending: boolean
  focusRequest: RecapFocusRequest | null
  onFocusHandled: () => void
}

/** Vista rápida fija junto al listado (lg y superior). */
export function RecapQuickViewPane({
  item,
  draft,
  onDraftChange,
  onSend,
  onDraftDiscard,
  isSending,
  focusRequest,
  onFocusHandled,
}: RecapQuickViewPaneProps) {
  return (
    <section
      id={RECAP_QUICK_VIEW_PANE_ID}
      aria-label="Detalle de recap"
      className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-92px)] lg:self-start lg:overflow-y-auto lg:pl-8"
    >
      {item ? (
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
          layout="pane"
        />
      ) : (
        <EmptyState title="Selecciona un recap del listado" />
      )}
    </section>
  )
}
