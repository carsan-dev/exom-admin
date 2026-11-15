import { getNotificationRecipientName } from '../types'
import { NotificationDateTime } from './notification-date-time'
import { NotificationMessage } from './notification-message'
import { NotificationRecipientCell } from './notification-recipient-cell'
import { NotificationStatusCell } from './notification-status-cell'
import type { NotificationsListItemsProps } from './notifications-list-types'

/** Filas apiladas por debajo de md; mismos datos que la tabla. */
export function NotificationsMobileList({ items }: NotificationsListItemsProps) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((item) => (
        <li key={item.id} className="space-y-3 py-4">
          <NotificationRecipientCell
            name={getNotificationRecipientName(item.recipient)}
            email={item.recipient.email}
            avatarUrl={item.recipient.profile?.avatar_url}
          />
          <NotificationMessage item={item} />
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <NotificationStatusCell status={item.status} />
            <span className="text-sm text-foreground-secondary">
              <NotificationDateTime value={item.created_at} />
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
