import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  type CustomRange,
  type PeriodPreset,
  type PeriodRange,
  PERIOD_LABELS,
  describePeriodRange,
  parsePeriodPreset,
  todayUtc,
} from './period'

export interface PeriodSelectorProps {
  value: PeriodPreset
  options: readonly PeriodPreset[]
  onChange: (preset: PeriodPreset) => void
  custom: CustomRange
  onCustomChange: (range: CustomRange) => void
  error: string | null
  range: PeriodRange
  previousRange: PeriodRange | null
  /** Preset whose range is shown in `range`; defaults to `value`. */
  effectivePreset?: PeriodPreset
  label?: string
  className?: string
}

export function PeriodSelector({
  value,
  options,
  onChange,
  custom,
  onCustomChange,
  error,
  range,
  previousRange,
  effectivePreset,
  label = 'Periodo',
  className,
}: PeriodSelectorProps) {
  const id = useId()
  const selectId = `${id}-period`
  const fromId = `${id}-from`
  const toId = `${id}-to`
  const errorId = `${id}-error`
  const today = todayUtc()
  const invalid = error ? true : undefined

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={selectId}>{label}</Label>
          <Select
            value={value}
            onValueChange={(next) => {
              const preset = parsePeriodPreset(next)
              if (preset && options.includes(preset)) onChange(preset)
            }}
          >
            <SelectTrigger id={selectId} className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>{PERIOD_LABELS[option]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {value === 'custom' && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor={fromId}>Desde</Label>
              <Input
                id={fromId}
                type="date"
                className="w-auto"
                value={custom.from ?? ''}
                max={today}
                aria-invalid={invalid}
                aria-describedby={error ? errorId : undefined}
                onChange={(event) => onCustomChange({ from: event.target.value, to: custom.to })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={toId}>Hasta</Label>
              <Input
                id={toId}
                type="date"
                className="w-auto"
                value={custom.to ?? ''}
                max={today}
                aria-invalid={invalid}
                aria-describedby={error ? errorId : undefined}
                onChange={(event) => onCustomChange({ from: custom.from, to: event.target.value })}
              />
            </div>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{describePeriodRange(effectivePreset ?? value, range, previousRange)}</p>
      {error && <p id={errorId} role="alert" className="text-sm text-status-error">{error}</p>}
    </div>
  )
}
