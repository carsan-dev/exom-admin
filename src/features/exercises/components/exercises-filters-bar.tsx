import { FilterToolbar, type FilterSectionConfig, type UseListFiltersResult } from '@/components/filters'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ExercisesFiltersBarProps {
  search: string
  onSearchChange: (value: string) => void
  sections: FilterSectionConfig[]
  filters: UseListFiltersResult
  trainingUsage: string
  onTrainingUsageChange: (value: string) => void
}

export function ExercisesFiltersBar({
  search,
  onSearchChange,
  sections,
  filters,
  trainingUsage,
  onTrainingUsageChange,
}: ExercisesFiltersBarProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="min-w-0 md:flex-1">
        <FilterToolbar
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder="Buscar por nombre..."
          sections={sections}
          filters={filters}
        />
      </div>
      <div className="flex flex-col gap-2 md:w-64 md:flex-none">
        <span className="text-xs font-medium text-muted-foreground">Uso en entrenamientos</span>
        <Select value={trainingUsage} onValueChange={onTrainingUsageChange}>
          <SelectTrigger aria-label="Uso en entrenamientos">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="used">Usados en entrenamientos</SelectItem>
            <SelectItem value="unused">Sin entrenamientos</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
