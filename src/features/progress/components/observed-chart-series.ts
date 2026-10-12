interface DatedPoint {
  timestamp: number
}

/** Sort dated blocks without moving an unknown-date barrier past observed records. */
export function orderObservedRecords<T extends DatedPoint>(records: T[]) {
  const ordered: T[] = []
  let dated: T[] = []
  const flush = () => {
    ordered.push(...dated.sort((a, b) => a.timestamp - b.timestamp))
    dated = []
  }
  records.forEach((point) => {
    if (Number.isFinite(point.timestamp)) dated.push(point)
    else { flush(); ordered.push(point) }
  })
  flush()
  return ordered
}

/** No generated dates/values. Unknown dates and explicit invalid records break guides. */
export function observedChartSeries<T extends DatedPoint>(records: T[], valid: (point: T) => boolean) {
  const points = records.filter((point) => Number.isFinite(point.timestamp) && valid(point))
    .sort((a, b) => a.timestamp - b.timestamp)
  const segments: T[][] = []
  let segment: T[] = []
  const finish = () => {
    // Same-date sets alone cannot establish a temporal guide.
    if (segment.length > 1 && segment[0].timestamp < segment[segment.length - 1].timestamp) segments.push(segment)
    segment = []
  }
  orderObservedRecords(records).forEach((point) => {
    if (Number.isFinite(point.timestamp) && valid(point)) segment.push(point)
    else finish()
  })
  finish()
  return { points, segments }
}

/** Reject malformed/normalized civil dates rather than plotting invented dates. */
export function observationTimestamp(date: string | undefined) {
  if (!date) return NaN
  const timestamp = Date.parse(date)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date.slice(0, 10)
    ? timestamp : NaN
}
