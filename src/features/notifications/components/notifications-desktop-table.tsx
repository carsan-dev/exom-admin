import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getNotificationRecipientName } from '../types'
import { NotificationDateTime } from './notification-date-time'
import { NotificationRecipientCell } from './notification-recipient-cell'
import { NotificationMessage } from './notification-message'
import { NotificationStatusCell } from './notification-status-cell'
import type { NotificationsListItemsProps } from './notifications-list-types'

/** Tabla desde md; mismos datos que la lista apilada. */
export function NotificationsDesktopTable({ items }: NotificationsListItemsProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Destinatario</TableHead>
          <TableHead>Título</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Fecha</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="align-top">
              <NotificationRecipientCell
                name={getNotificationRecipientName(item.recipient)}
                email={item.recipient.email}
                avatarUrl={item.recipient.profile?.avatar_url}
              />
            </TableCell>
            <TableCell className="align-top">
              <NotificationMessage item={item} className="max-w-xl" />
            </TableCell>
            <TableCell className="align-top">
              <NotificationStatusCell status={item.status} />
            </TableCell>
            <TableCell className="whitespace-nowrap align-top text-sm text-foreground-secondary">
              <NotificationDateTime value={item.created_at} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
