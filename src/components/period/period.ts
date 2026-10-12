/**
 * Analytics period presets. All dates are `YYYY-MM-DD` UTC civil dates and ranges are inclusive.
 */
export type PeriodPreset = '7d' | '30d' | '90d' | 'ytd' | 'all' | 'month' | 'prev_month' | 'custom'

export interface PeriodRange {
  from: string | undefined
  to: string
}

export interface CustomRange {
  from?: string
  to?: string
}

export const PERIOD_LABELS: Readonly<Record<PeriodPreset, string>> = {
  '7d': 'Últimos 7 días',
  '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días',
  ytd: 'Año actual',
  all: 'Todo el historial',
  month: 'Mes actual',
  prev_month: 'Mes anterior',
  custom: 'Personalizado',
}

export const PERIOD_PRESETS: readonly PeriodPreset[] = ['7d', '30d', '90d', 'ytd', 'all', 'month', 'prev_month', 'custom']

/** Old progress URL values that must keep working. */
const LEGACY_ALIASES: Readonly<Record<string, PeriodPreset>> = { '4w': '30d', '3m': '90d' }

const DAY_MS = 86_400_000
const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Current UTC civil date (`YYYY-MM-DD`). */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function isCivilDate(value: string | null | undefined): value is string {
  if (!value || !CIVIL_DATE.test(value)) return false
  const time = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
}

export function parsePeriodPreset(value: string | null | undefined): PeriodPreset | null {
  if (!value) return null
  const preset = PERIOD_PRESETS.find((item) => item === value)
  if (preset) return preset
  return Object.prototype.hasOwnProperty.call(LEGACY_ALIASES, value) ? LEGACY_ALIASES[value] : null
}

const toDay = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS
const fromDay = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10)
const shiftDays = (date: string, days: number) => fromDay(toDay(date) + days)
const civil = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10)
const parts = (date: string) => {
  const [year, month, day] = date.split('-').map(Number)
  return { year, month: month - 1, day }
}
/** Days in a month; `month` is 0-based and may be out of range (Date.UTC normalises it). */
const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
/** Same day number in another month, clamped to that month's length. */
const clampedDate = (year: number, month: number, day: number) => {
  const normalised = new Date(Date.UTC(year, month, 1))
  const y = normalised.getUTCFullYear()
  const m = normalised.getUTCMonth()
  return civil(y, m, Math.min(day, daysInMonth(y, m)))
}

/** Inclusive length in days. */
export function rangeLengthDays(from: string, to: string): number {
  return toDay(to) - toDay(from) + 1
}

export function resolvePeriod(preset: PeriodPreset, custom: CustomRange, today: string): PeriodRange {
  const { year, month } = parts(today)
  switch (preset) {
    case '7d': return { from: shiftDays(today, -6), to: today }
    case '30d': return { from: shiftDays(today, -29), to: today }
    case '90d': return { from: shiftDays(today, -89), to: today }
    case 'ytd': return { from: civil(year, 0, 1), to: today }
    case 'all': return { from: undefined, to: today }
    case 'month': return { from: civil(year, month, 1), to: today }
    case 'prev_month': return { from: civil(year, month - 1, 1), to: civil(year, month, 0) }
    case 'custom': return { from: custom.from, to: custom.to ?? today }
  }
}

export function previousPeriod(range: PeriodRange, preset: PeriodPreset): PeriodRange | null {
  const { from, to } = range
  if (preset === 'all' || !from) return null
  const start = parts(from)
  const end = parts(to)
  switch (preset) {
    case 'ytd':
      return { from: clampedDate(start.year - 1, start.month, start.day), to: clampedDate(end.year - 1, end.month, end.day) }
    case 'month':
      return { from: clampedDate(start.year, start.month - 1, start.day), to: clampedDate(end.year, end.month - 1, end.day) }
    case 'prev_month':
      return { from: civil(start.year, start.month - 1, 1), to: civil(start.year, start.month, 0) }
    default: {
      const length = rangeLengthDays(from, to)
      return { from: shiftDays(from, -length), to: shiftDays(from, -1) }
    }
  }
}

export function validateCustomRange(
  from: string | null | undefined,
  to: string | null | undefined,
  today: string,
  maxDays?: number,
): string | null {
  if (!from || !to) return 'Selecciona las fechas de inicio y fin.'
  if (!isCivilDate(from) || !isCivilDate(to)) return 'Introduce fechas válidas.'
  if (from > to) return 'La fecha de inicio debe ser anterior o igual a la de fin.'
  if (to > today) return 'La fecha de fin no puede ser posterior a hoy.'
  if (maxDays !== undefined && rangeLengthDays(from, to) > maxDays) return `El periodo no puede superar ${maxDays} días.`
  return null
}

/** `YYYY-MM-DD` → `dd/MM/yyyy` without timezone conversion. */
export function formatCivilDate(date: string): string {
  return date.split('-').reverse().join('/')
}

const formatRange = (range: PeriodRange) =>
  `${range.from ? formatCivilDate(range.from) : 'Inicio'} – ${formatCivilDate(range.to)}`

/** Text shown under a period selector. */
export function describePeriodRange(value: PeriodPreset, range: PeriodRange, previousRange: PeriodRange | null): string {
  if (value === 'all') return 'Todo el historial · sin comparación'
  const current = formatRange(range)
  return previousRange ? `${current} · Comparado con ${formatRange(previousRange)}` : current
}
