import { FilterToolbar, type FilterSectionConfig, type UseListFiltersResult } from '@/components/filters'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Plantillas</CardTitle>
        <CardDescription>
          {filteredTemplates.length} visibles de {templates.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <FilterToolbar
          onSearchChange={setSearch}
          searchPlaceholder="Nombre, categoría o texto"
          sections={filterSections}
          filters={filters}
          search={search}
            placeholder="Nombre, categoría o texto"
          />
        </div>

        <div className="space-y-2">
          {filteredTemplates.map((template) => {
            const isSelected = template.key === selectedTemplate?.key

            return (
              <button
                key={template.key}
                type="button"
                className={cn(
                  'w-full rounded-lg border p-3 text-left transition-colors',
                  isSelected
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-border bg-background hover:bg-muted/40',
                )}
                onClick={() => setSelectedKey(template.key)}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0 space-y-1">
                    <span className="block truncate text-sm font-medium text-foreground">{template.name}</span>
                    <span className="block line-clamp-2 text-xs text-muted-foreground">{template.title}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        template.is_system
                          ? 'border-brand-primary/20 bg-brand-soft/10 text-accent-text'
                          : 'border-border bg-muted text-muted-foreground',
                      )}
                    >
                      {template.is_system ? 'Automática' : 'Manual'}
                    </Badge>
                    <Badge variant="outline" className="border-border bg-muted text-[10px] text-muted-foreground">
                      {template.category}
                    </Badge>
                    {!template.enabled ? (
                      <Badge variant="outline" className="border-status-warning/30 bg-status-warning/10 text-[10px] text-status-warning">
                        Pausada
                      </Badge>
                    ) : null}
                  </span>
                </span>
              </button>
            )
          })}

          {filteredTemplates.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No hay plantillas con esos filtros.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
