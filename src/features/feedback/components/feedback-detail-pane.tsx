import { EmptyState } from '@/components/page'
import type { FeedbackItem } from '../types'
import { FeedbackDetailView } from './feedback-detail-view'

interface FeedbackDetailPaneProps {
  item: FeedbackItem | null
  draft: string
  onDraftChange: (value: string) => void
  onRespond: (item: FeedbackItem, response: string) => void
  isResponding: boolean
}

/** Detalle fijo junto al listado (lg y superior). */
export function FeedbackDetailPane({ item, draft, onDraftChange, onRespond, isResponding }: FeedbackDetailPaneProps) {
  return (
    <section
      id="feedback-detail"
      aria-label="Detalle de feedback"
      className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-92px)] lg:self-start lg:overflow-y-auto lg:pl-8"
    >
      {item ? (
        <FeedbackDetailView
          key={item.id}
          item={item}
          draft={draft}
          onDraftChange={onDraftChange}
          onRespond={onRespond}
          isResponding={isResponding}
          layout="pane"
        />
      ) : (
        <EmptyState title="Selecciona un feedback del listado" />
      )}
    </section>
  )
}
