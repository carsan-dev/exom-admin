import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ActiveChip } from './types'

interface FilterChipsProps {
  chips: ActiveChip[]
  activeCount: number
  onClear: () => void
}

export function FilterChips({ chips, activeCount, onClear }: FilterChipsProps) {
  if (activeCount === 0 || chips.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge
          key={`${chip.sectionKey}-${chip.value}`}
          variant="secondary"
          className="h-8 gap-1 rounded-none border-border-strong bg-card py-1 pl-2.5 pr-1 text-[13px] hover:bg-card font-normal text-foreground-secondary"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="grid size-6 place-items-center text-muted-foreground transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus"
            aria-label={`Quitar filtro ${chip.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Button type="button" variant="link" className="h-auto px-0 text-sm" onClick={onClear}>
        Limpiar todo
      </Button>
    </div>
  )
}
