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
          className="gap-2 rounded-full px-3 py-1 text-xs"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="rounded-full p-0.5 transition-colors hover:bg-foreground/10"
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
