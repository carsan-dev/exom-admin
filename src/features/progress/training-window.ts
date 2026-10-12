const DAY_MS = 86400000
const WINDOW_DAYS = 366
const FIRST_DAY = Date.parse('0001-01-01T00:00:00Z') / DAY_MS

/** Consecutive inclusive API windows, bounded by the first representable calendar year. */
export function trainingWindowFor(today: string, rawWindow: string | null) {
  const todayDay = Date.parse(`${today}T00:00:00Z`) / DAY_MS
  const maxIndex = Math.max(0, Math.floor((todayDay - FIRST_DAY) / WINDOW_DAYS))
  const requested = rawWindow !== null && /^\d+$/.test(rawWindow) ? Number(rawWindow) : 0
  const index = Math.min(maxIndex, Number.isNaN(requested) ? 0 : requested)
  const toDay = todayDay - index * WINDOW_DAYS
  const fromDay = Math.max(FIRST_DAY, toDay - (WINDOW_DAYS - 1))
  const formatDay = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10)

  return {
    index,
    from: formatDay(fromDay),
    to: formatDay(toDay),
    hasOlder: index < maxIndex,
    hasNewer: index > 0,
  }
}
