export const CHART_SCALE_OPTIONS = ['auto', '0.5', '1', '2', '5', '10', '20'] as const

export type ChartScale = (typeof CHART_SCALE_OPTIONS)[number]

export interface YAxisScale {
  domain: [number, number]
  ticks: number[]
}

function round(value: number) {
  return Number(value.toFixed(10))
}

function niceStep(rawStep: number, minimumStep: number) {
  const safeStep = Math.max(rawStep, minimumStep)
  const exponent = Math.floor(Math.log10(safeStep))
  const magnitude = 10 ** exponent
  const normalized = safeStep / magnitude
  const niceMultiplier = [1, 2, 2.5, 5, 10].find((candidate) => candidate >= normalized) ?? 10

  return Math.max(niceMultiplier * magnitude, minimumStep)
}

export function calculateYAxisScale(
  values: Array<number | null | undefined>,
  scale: ChartScale,
  minimumAutoStep: number,
): YAxisScale | undefined {
  const finiteValues = values.filter((value): value is number => value != null && Number.isFinite(value))

  if (finiteValues.length === 0) return undefined

  const minimum = Math.min(...finiteValues)
  const maximum = Math.max(...finiteValues)
  const step = scale === 'auto'
    ? niceStep((maximum - minimum) / 4, minimumAutoStep)
    : Number(scale)

  let lower = minimum === maximum
    ? minimum - 2 * step
    : Math.floor(minimum / step) * step - step
  let upper = minimum === maximum
    ? maximum + 2 * step
    : Math.ceil(maximum / step) * step + step
  lower = Math.max(0, lower)

  while (Math.round((upper - lower) / step) + 1 < 5) {
    if (lower >= step) lower -= step
    else upper += step
  }

  lower = round(lower)
  upper = round(upper)
  const tickCount = Math.round((upper - lower) / step) + 1
  const ticks = Array.from({ length: tickCount }, (_, index) => round(lower + index * step))

  return { domain: [lower, upper], ticks }
}
