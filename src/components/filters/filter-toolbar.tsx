import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { FilterChips } from './filter-chips'
import { FilterPopover } from './filter-popover'
import type { FilterSectionConfig, UseListFiltersResult } from './types'

interface FilterToolbarProps {
  search?: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  placeholder?: string
  sections: FilterSectionConfig[]
  filters: UseListFiltersResult
}

export function FilterToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar por nombre...',
  placeholder,
  sections,
  filters,
}: FilterToolbarProps) {
  const effectivePlaceholder = placeholder ?? searchPlaceholder

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={effectivePlaceholder}
            value={search ?? ''}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-9"
          />
        </div>
        <FilterPopover sections={sections} filters={filters} />
      </div>

      <FilterChips chips={filters.chips} activeCount={filters.activeCount} onClear={filters.clear} />
    </div>
  )
}
