import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DeltaPolarity = 'higher-is-better' | 'lower-is-better' | 'neutral'
export type DeltaMode = 'absolute' | 'percent' | 'both'

export interface DeltaBadgeProps {
  current: number | null
  previous: number | null
  polarity: DeltaPolarity
  /** Formats a non-negative magnitude; the sign is added by the badge. */
  format?: (n: number) => string
  mode?: DeltaMode
  unit?: string
  className?: string
}

const MINUS = '−'
const absoluteFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })
const percentFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 })
const baseClass = 'inline-flex items-center gap-1 text-xs font-medium'

export function DeltaBadge({ current, previous, polarity, format, mode = 'absolute', unit, className }: DeltaBadgeProps) {
  if (current === null || previous === null || !Number.isFinite(current) || !Number.isFinite(previous)) {
    return (
      <span data-testid="delta-badge" role="img" aria-label="Sin datos del periodo anterior" className={cn(baseClass, 'text-muted-foreground', className)}>
        Sin datos previos
      </span>
    )
  }

  // Absorb floating-point noise (e.g. 0.3 − 0.1 − 0.2) so equal values never show a direction.
  const rawDiff = current - previous
  const diff = Math.abs(rawDiff) < 1e-9 ? 0 : rawDiff
  const magnitude = Math.abs(diff)
  const absoluteValue = format ? format(magnitude) : absoluteFormatter.format(magnitude)
  const absolute = `${absoluteValue}${unit ? ` ${unit}` : ''}`
  const percentValue = previous === 0 ? null : percentFormatter.format((magnitude / Math.abs(previous)) * 100)
  const percent = percentValue === null ? null : `${percentValue} %`
  const effectiveMode = percent === null ? 'absolute' : mode
  const body = effectiveMode === 'percent' ? percent : effectiveMode === 'both' ? `${absolute} (${percent})` : absolute
  // A difference that rounds to zero in what is displayed is "no change", never "+0".
  const showsNonZero = (value: string | null) => value !== null && /[1-9]/.test(value)
  const displaysChange = effectiveMode === 'percent' ? showsNonZero(percentValue)
    : effectiveMode === 'both' ? showsNonZero(absoluteValue) || showsNonZero(percentValue)
      : showsNonZero(absoluteValue)
  const direction = diff === 0 || !displaysChange ? 0 : diff > 0 ? 1 : -1
  const sign = direction > 0 ? '+' : direction < 0 ? MINUS : ''

  const good = (direction > 0 && polarity === 'higher-is-better') || (direction < 0 && polarity === 'lower-is-better')
  const coloured = direction !== 0 && polarity !== 'neutral'
  // Semantic colour stays on the icon only; text stays neutral for contrast on light themes.
  const iconColour = !coloured ? 'text-muted-foreground' : good ? 'text-status-success' : 'text-status-error'
  const textColour = direction === 0 ? 'text-muted-foreground' : 'text-foreground'
  const Icon = direction > 0 ? ArrowUpRight : direction < 0 ? ArrowDownRight : Minus
  const label = direction === 0
    ? 'Sin cambios respecto al periodo anterior'
    : `${direction > 0 ? 'Sube' : 'Baja'} ${body} respecto al periodo anterior`

  return (
    <span data-testid="delta-badge" role="img" aria-label={label} className={cn(baseClass, textColour, className)}>
      <Icon aria-hidden="true" className={cn('size-3.5 shrink-0', iconColour)} />
      <span>{direction === 0 ? 'Sin cambios' : `${sign}${body}`}</span>
    </span>
  )
}
