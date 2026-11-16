import { FilterToolbar, type FilterSectionConfig, type UseListFiltersResult } from '@/components/filters'
import { EmptyState } from '@/components/page'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { NotificationTemplate } from '../types'

interface TemplateListProps {
  filteredTemplates: NotificationTemplate[]
  templates: NotificationTemplate[]
  selectedTemplate: NotificationTemplate | null
  setSelectedKey: (key: string) => void
  search: string
  setSearch: (value: string) => void
  filterSections: FilterSectionConfig[]
  filters: UseListFiltersResult
}

export function TemplateList({
  filteredTemplates,
  templates,
  selectedTemplate,
  setSelectedKey,
  search,
  setSearch,
  filterSections,
  filters,
}: TemplateListProps) {
  return (
    <section aria-labelledby="template-list-title" className="min-w-0 space-y-3 py-4 xl:border-r xl:border-border xl:pr-4">
      <h2 id="template-list-title" className="sr-only">
        Plantillas
      </h2>
      <FilterToolbar
        onSearchChange={setSearch}
        searchPlaceholder="Nombre, categoría o texto"
        sections={filterSections}
        filters={filters}
        search={search}
      />

      <p aria-live="polite" className="text-xs text-foreground-muted">
        {filteredTemplates.length} visibles de {templates.length}
      </p>

      <div className="border-t border-border">
        {filteredTemplates.map((template) => {
          const isSelected = template.key === selectedTemplate?.key

          return (
            <button
              key={template.key}
              type="button"
              aria-current={isSelected ? 'true' : undefined}
              className={cn(
                'block min-h-11 w-full border-b border-border p-3 text-left transition-colors duration-(--dur-fast) ease-(--ease-out) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
                isSelected ? 'bg-lime-soft' : 'hover:bg-background-surface',
              )}
              onClick={() => setSelectedKey(template.key)}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0 space-y-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{template.name}</span>
                  <span className="block line-clamp-2 text-[13px] leading-[18px] text-foreground-secondary">{template.title}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      'rounded-none px-1.5 py-0 text-[11px]',
                      template.is_system
                        ? 'border-accent-line/40 bg-lime-soft text-accent-text'
                        : 'border-border-strong text-foreground-secondary',
                    )}
                  >
                    {template.is_system ? 'Automática' : 'Manual'}
                  </Badge>
                  <Badge variant="outline" className="rounded-none border-border-strong px-1.5 py-0 text-[11px] text-foreground-secondary">
                    {template.category}
                  </Badge>
                  {!template.enabled ? (
                    <Badge variant="outline" className="rounded-none border-status-warning/40 bg-status-warning-soft px-1.5 py-0 text-[11px] text-status-warning">
                      Pausada
                    </Badge>
                  ) : null}
                </span>
              </span>
            </button>
          )
        })}

        {filteredTemplates.length === 0 ? (
          <EmptyState title="No hay plantillas con esos filtros." className="border-b border-border" />
        ) : null}
      </div>
    </section>
  )
}
