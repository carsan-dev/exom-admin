import { useEffect, useRef } from 'react'
import { useBaseDeliveries } from '../api'
import type { BaseSubscriber } from '../types'
import { ResendDialog } from './resend-dialog'

interface RowResendDialogProps {
  subscriber: BaseSubscriber | null
  onClose: () => void
}

/** Returns focus to the row's resend button, or to a stable anchor of the row if that button is gone. */
function restoreRowFocus(subscriberId: string, event: Event) {
  event.preventDefault()
  const id = CSS.escape(subscriberId)
  const target =
    document.querySelector<HTMLElement>(`[data-resend-trigger="${id}"]`) ??
    document.querySelector<HTMLElement>(`[data-focus-anchor="${id}"]`)
  target?.focus()
}

/**
 * Resend of the latest delivery straight from the list row. A single ResendDialog stays mounted for the whole flow
 * (loading, ready, blocked, error), so focus handling is not lost on a remount. The row's `latest_delivery` only
 * selects WHICH delivery to load; whether it can be resent is judged by ResendDialog on the fresh data.
 */
export function RowResendDialog({ subscriber, onClose }: RowResendDialogProps) {
  const deliveriesQuery = useBaseDeliveries(subscriber?.id ?? null)
  // The parent clears `subscriber` on close, before Radix restores focus.
  const lastId = useRef<string | null>(null)
  useEffect(() => {
    if (subscriber) lastId.current = subscriber.id
  }, [subscriber])
  const latest = subscriber?.latest_delivery ?? null
  const found = deliveriesQuery.data?.find((item) => item.id === latest?.id) ?? null
  // Cached data may be stale: wait for the refresh unless it already says PENDING (blocked either way).
  const delivery = found && (!deliveriesQuery.isFetching || found.status === 'PENDING') ? found : null
  const failed =
    !delivery &&
    !deliveriesQuery.isFetching &&
    (deliveriesQuery.isError || deliveriesQuery.isSuccess || deliveriesQuery.fetchStatus === 'paused')
  const paused = !delivery && deliveriesQuery.fetchStatus === 'paused'

  return (
    <ResendDialog
      delivery={delivery}
      pendingMonth={latest?.month}
      loadFailed={failed || paused}
      onRetry={() => void deliveriesQuery.refetch()}
      onCloseAutoFocus={(event) => lastId.current && restoreRowFocus(lastId.current, event)}
      open={subscriber !== null}
      onOpenChange={(open) => !open && onClose()}
    />
  )
}
