import {
  FilterToolbar,
  type FilterSectionConfig,
  type UseListFiltersResult,
} from '@/components/filters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { SortDir } from '@/lib/sort-search-params'
import type { Diet, DietCatalogValueWithColor } from '../types'
import { DietsPaginationBar } from './diets-pagination-bar'
import { DietsTable } from './diets-table'

interface DietApprovalSummary {
  pending_approval_actions: string[]
}

interface DietsListPanelProps {
  title: string
  search: string
  onSearchChange: (value: string) => void
  sections: FilterSectionConfig[]
  filters: UseListFiltersResult
  diets: Diet[]
  approvalById: Record<string, DietApprovalSummary>
  onView: (diet: Diet) => void
  onEdit: (diet: Diet) => void
  onDuplicate: (diet: Diet) => void
  onDelete: (diet: Diet) => void
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  sortBy?: string
  sortDir: SortDir
  onSortChange: (field: string) => void
  movementDisabled: boolean
  nutritionalBadgeColors?: DietCatalogValueWithColor[]
  page: number
  totalPages: number
  onPreviousPage: () => void
  onNextPage: () => void
}

export function DietsListPanel({
  title,
  search,
  onSearchChange,
  sections,
  filters,
  diets,
  approvalById,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  selectedIds,
  onSelectionChange,
  sortBy,
  sortDir,
  onSortChange,
  movementDisabled,
  nutritionalBadgeColors,
  page,
  totalPages,
  onPreviousPage,
  onNextPage,
}: DietsListPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>
          Vista paginada del catálogo con búsqueda y acciones por dieta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FilterToolbar
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder="Buscar por nombre..."
          sections={sections}
          filters={filters}
        />

        {diets.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No se encontraron dietas con la búsqueda y filtros actuales.
          </p>
        ) : (
          <DietsTable
            diets={diets}
            approvalById={approvalById}
            onView={onView}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            selectedIds={selectedIds}
            onSelectionChange={onSelectionChange}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={onSortChange}
            movementDisabled={movementDisabled}
            nutritionalBadgeColors={nutritionalBadgeColors}
          />
        )}

        <DietsPaginationBar
          page={page}
          totalPages={totalPages}
          onPrevious={onPreviousPage}
          onNext={onNextPage}
        />
      </CardContent>
    </Card>
  )
}
