import { z } from 'zod'

export const timeUnitSchema = z.enum(['SECONDS', 'MINUTES'])
export type TimeUnit = z.infer<typeof timeUnitSchema>
export const timedConfigSchema = z
  .object({
    version: z.literal(1),
    unit: timeUnitSchema,
    segments: z
      .array(
        z
          .object({
            action: z.string().trim().min(1, 'Indica la acción').max(80),
            seconds: z.number().int().min(1).max(2147483647),
            unit: timeUnitSchema,
          })
          .strict()
      )
      .max(20),
  })
  .strict()
export type TimedConfig = z.infer<typeof timedConfigSchema>

export function parseTimeInput(raw: string, unit: TimeUnit): number {
  const value = raw.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,15})?$/.test(value)) return NaN
  const [whole, fraction = ''] = value.split('.')
  const denominator = 10n ** BigInt(fraction.length)
  const numerator = BigInt(whole + fraction) * (unit === 'MINUTES' ? 60n : 1n)
  if (numerator % denominator !== 0n) return NaN
  const seconds = Number(numerator / denominator)
  return seconds >= 1 && seconds <= 2147483647 ? seconds : NaN
}

export function timeInputValue(seconds: number, unit: TimeUnit) {
  return Number.isFinite(seconds) ? String(unit === 'MINUTES' ? seconds / 60 : seconds) : ''
}

export function formatTime(seconds: number, unit: TimeUnit) {
  if (unit === 'SECONDS') return `${seconds} s`
  if (seconds % 3 === 0) return `${String(seconds / 60).replace('.', ',')} min`
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`
}

export function timedInstructions(total: number, config: TimedConfig) {
  if (!Number.isInteger(total) || total <= 0 || !timedConfigSchema.safeParse(config).success)
    return 'Completa los tiempos y las acciones para ver la previsualización.'
  const base = `${formatTime(total, config.unit)} en total.`
  if (!config.segments.length) return base
  const sequence = config.segments
    .map((s) => `${s.action}: ${formatTime(s.seconds, s.unit)}`)
    .join('; ')
  const cycle = config.segments.reduce((sum, s) => sum + s.seconds, 0)
  let tail = total % cycle
  let ending = ''
  for (const s of config.segments) {
    if (tail > 0 && tail < s.seconds) {
      ending = ` Último tramo recortado: ${s.action}, ${formatTime(tail, s.unit)}.`
      break
    }
    tail -= s.seconds
    if (tail <= 0) break
  }
  return `${base} ${sequence}; repetir hasta terminar.${ending}`
}
