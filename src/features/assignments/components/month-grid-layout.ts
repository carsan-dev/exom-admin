import { parseISO } from 'date-fns'

/**
 * Empty cells before the first visible day in a Monday-first month grid.
 * parseISO builds local midnight, so the weekday must be read in local time too
 * (getUTCDay() shifts one day back in zones east of UTC).
 */
export function getLeadingEmptyCells(firstDate: string) {
  return (parseISO(firstDate).getDay() + 6) % 7
}
