import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { FilterSectionDateRange } from './filter-section-date-range'
import { FilterSectionMulti } from './filter-section-multi'
import { FilterSectionRange } from './filter-section-range'
import type { FilterSectionConfig, UseListFiltersResult } from './types'

interface FilterPopoverProps {
  sections: FilterSectionConfig[]
  filters: UseListFiltersResult
}

export function FilterPopover({ sections, filters }: FilterPopoverProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {filters.activeCount > 0 ? (
            <Badge variant="secondary" className="rounded-full px-2 py-0 text-[11px]">
              {filters.activeCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(36rem,calc(100vw-2rem))] p-0">
        <div className="border-b border-border/70 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Filtros del listado</p>
          <p className="text-xs text-muted-foreground">Selecciona uno o varios criterios.</p>
        </div>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto p-4">
          {sections.map((section) => (
            <section key={section.key} className="space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">{section.label}</h3>
              </div>

              {section.type === 'multi' ? (
                <FilterSectionMulti
                  section={section}
                  value={Array.isArray(filters.values[section.key]) ? (filters.values[section.key] as string[]) : []}
                  onChange={(value) => filters.setValue(section.key, value)}
                />
              ) : null}

              {section.type === 'range' ? (
                <FilterSectionRange
                  section={section}
                  value={
                    Array.isArray(filters.values[section.key])
                      ? (filters.values[section.key] as [number | null, number | null])
                      : [null, null]
                  }
                  onChange={(value) => filters.setValue(section.key, value)}
                />
              ) : null}

              {section.type === 'date-range' ? (
                <FilterSectionDateRange
                  section={section}
                  value={
                    Array.isArray(filters.values[section.key])
                      ? (filters.values[section.key] as [string | null, string | null])
                      : [null, null]
                  }
                  onChange={(value) => filters.setValue(section.key, value)}
                />
              ) : null}
            </section>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border/70 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={filters.clear}
            disabled={filters.activeCount === 0}
          >
            Limpiar
          </Button>
          <Button type="button" onClick={() => setOpen(false)}>
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
