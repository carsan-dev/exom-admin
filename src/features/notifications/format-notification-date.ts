export const NOTIFICATION_DATE_FALLBACK = 'Fecha no disponible'

function pad(value: number) {
  return String(value).padStart(2, '0')
}

/**
 * Formats an ISO timestamp as `dd/mm/aaaa HH:mm` in the browser's local time zone.
 * Invalid input yields a fallback string instead of throwing.
 */
export function formatNotificationDateTime(value: string | null | undefined): string {
  if (!value) return NOTIFICATION_DATE_FALLBACK

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return NOTIFICATION_DATE_FALLBACK

  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  return `${day}/${month}/${date.getFullYear()} ${hours}:${minutes}`
}
