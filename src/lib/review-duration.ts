const MINUTE = 60
const HOUR = 3600
const DAY = 86400

/** Formats a review duration in seconds as "2 d 4 h", "5 h 12 min", "18 min" or "< 1 min". `null` renders "—". */
export function formatReviewDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return '—'
  if (seconds < MINUTE) return '< 1 min'
  const days = Math.floor(seconds / DAY)
  const hours = Math.floor((seconds % DAY) / HOUR)
  const minutes = Math.floor((seconds % HOUR) / MINUTE)
  if (days > 0) return `${days} d ${hours} h`
  if (hours > 0) return `${hours} h ${minutes} min`
  return `${minutes} min`
}

export function formatReviewCount(count: number): string {
  return `${count} ${count === 1 ? 'revisión' : 'revisiones'} en el periodo`
}
