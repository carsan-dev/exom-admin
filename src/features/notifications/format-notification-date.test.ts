import { describe, expect, it } from 'vitest'
import { formatNotificationDateTime, NOTIFICATION_DATE_FALLBACK } from './format-notification-date'

// Dates are built from local components so the assertions hold in any time zone.
const localIso = (year: number, month: number, day: number, hours: number, minutes: number) =>
  new Date(year, month - 1, day, hours, minutes).toISOString()

describe('formatNotificationDateTime', () => {
  it('formats as dd/mm/aaaa HH:mm in local time', () => {
    expect(formatNotificationDateTime(localIso(2026, 11, 15, 18, 42))).toBe('15/11/2026 18:42')
  })

  it('pads single-digit day, month, hour and minute with a leading zero', () => {
    expect(formatNotificationDateTime(localIso(2026, 3, 5, 7, 4))).toBe('05/03/2026 07:04')
  })

  it('renders midnight as 00:00', () => {
    expect(formatNotificationDateTime(localIso(2026, 1, 1, 0, 0))).toBe('01/01/2026 00:00')
  })

  it('returns the fallback for invalid or empty input without throwing', () => {
    expect(formatNotificationDateTime('no-es-una-fecha')).toBe(NOTIFICATION_DATE_FALLBACK)
    expect(formatNotificationDateTime('')).toBe(NOTIFICATION_DATE_FALLBACK)
    expect(formatNotificationDateTime(null)).toBe(NOTIFICATION_DATE_FALLBACK)
    expect(formatNotificationDateTime(undefined)).toBe(NOTIFICATION_DATE_FALLBACK)
  })
})
