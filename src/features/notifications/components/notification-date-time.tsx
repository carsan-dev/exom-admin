import { formatNotificationDateTime } from '../format-notification-date'

/** Absolute local date and time of a notification, as a machine-readable `<time>`. */
export function NotificationDateTime({ value }: { value: string }) {
  const text = formatNotificationDateTime(value)
  const isValid = !Number.isNaN(new Date(value).getTime())

  if (!isValid) {
    return <span>{text}</span>
  }

  return (
    <time dateTime={value} className="tabular-nums">
      {text}
    </time>
  )
}
