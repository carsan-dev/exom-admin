import { Input } from '@/components/ui/input'
import type { FilterSectionConfig, RangeFilterValue } from './types'

interface FilterSectionRangeProps {
  section: Extract<FilterSectionConfig, { type: 'range' }>
  value: RangeFilterValue
  onChange: (value: RangeFilterValue) => void
}

function parseNumber(value: string) {
  if (value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

export function FilterSectionRange({ section, value, onChange }: FilterSectionRangeProps) {
  const [min, max] = value
  const step = section.step ?? 1
  const displayMin = min ?? section.min
  const displayMax = max ?? section.max

  const applyMin = (nextMin: number | null) => {
    if (nextMin == null) {
      onChange([null, max])
      return
    }

    const clamped = Math.max(section.min, Math.min(nextMin, max ?? section.max))
    onChange([clamped, max])
  }

  const applyMax = (nextMax: number | null) => {
    if (nextMax == null) {
      onChange([min, null])
      return
    }

    const clamped = Math.min(section.max, Math.max(nextMax, min ?? section.min))
    onChange([min, clamped])
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Mínimo
          </p>
          <Input
            type="number"
            min={section.min}
            max={max ?? section.max}
            step={step}
            value={min ?? ''}
            onChange={(event) => applyMin(parseNumber(event.target.value))}
            placeholder={String(section.min)}
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Máximo
          </p>
          <Input
            type="number"
            min={min ?? section.min}
            max={section.max}
            step={step}
            value={max ?? ''}
            onChange={(event) => applyMax(parseNumber(event.target.value))}
            placeholder={String(section.max)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {section.min}
            {section.unit ? ` ${section.unit}` : ''}
          </span>
          <span>
            {section.max}
            {section.unit ? ` ${section.unit}` : ''}
          </span>
        </div>
        <div className="space-y-3">
          <label className="block space-y-2 text-sm text-muted-foreground">
            <span>Desde</span>
            <input
              type="range"
              min={section.min}
              max={section.max}
              step={step}
              value={displayMin}
              onChange={(event) => applyMin(Number(event.target.value))}
              className="w-full accent-primary"
            />
          </label>
          <label className="block space-y-2 text-sm text-muted-foreground">
            <span>Hasta</span>
            <input
              type="range"
              min={section.min}
              max={section.max}
              step={step}
              value={displayMax}
              onChange={(event) => applyMax(Number(event.target.value))}
              className="w-full accent-primary"
            />
          </label>
        </div>
      </div>
    </div>
  )
}
