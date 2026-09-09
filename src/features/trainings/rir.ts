import { z } from 'zod'

export const rirSequenceSchema = z.array(z.number().int().min(0).max(10)).min(1)
export const rirOverrideSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('INHERIT') }).strict(),
  z.object({ mode: z.literal('NONE') }).strict(),
  z.object({ mode: z.literal('FIXED'), value: z.number().int().min(0).max(10) }).strict(),
  z.object({ mode: z.literal('SEQUENCE'), sequence: rirSequenceSchema }).strict(),
])
export type RirOverride = z.infer<typeof rirOverrideSchema>
export interface RirConfig {
  sequence: number[]
  overrides: Record<string, RirOverride>
}
export function rirWeek(date: string, start: string, length: number) {
  const monday = (value: string) => {
    const d = new Date(`${value}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
    return d.getTime()
  }
  const weeks = (monday(date) - monday(start)) / 604800000
  return weeks < 0 ? null : weeks % length
}
export function resolveRir(
  config: RirConfig | null,
  start: string,
  date: string,
  id: string,
  base: number | null
) {
  if (!config) return base
  const week = rirWeek(date, start, config.sequence.length)
  if (week === null) return base
  const rule = config.overrides[id]
  if (rule?.mode === 'NONE') return null
  if (rule?.mode === 'FIXED') return rule.value
  return (rule?.mode === 'SEQUENCE' ? rule.sequence : config.sequence)[week]
}
