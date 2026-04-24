import { Input } from '@/components/ui/input'
import type { DateRangeFilterValue, FilterSectionConfig } from './types'

interface FilterSectionDateRangeProps {
  section: Extract<FilterSectionConfig, { type: 'date-range' }>
  value: DateRangeFilterValue
  onChange: (value: DateRangeFilterValue) => void
}

export function FilterSectionDateRange({
  section,
  value,
  onChange,
}: FilterSectionDateRangeProps) {
  const [from, to] = value

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Desde
        </p>
        <Input
          type="date"
          value={from ?? ''}
          max={to ?? undefined}
          onChange={(event) => onChange([event.target.value || null, to ?? null])}
          aria-label={`Desde ${section.label}`}
        />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Hasta
        </p>
        <Input
          type="date"
          value={to ?? ''}
          min={from ?? undefined}
          onChange={(event) => onChange([from ?? null, event.target.value || null])}
          aria-label={`Hasta ${section.label}`}
        />
      </div>
    </div>
  )
}
