import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FilterToolbar,
  type FilterSectionConfig,
  type UseListFiltersResult,
} from '@/components/filters'
import type { SortDir } from '@/lib/sort-search-params'
import type { CatalogValueWithColor, Training } from '../types'
import { TrainingsPaginationBar } from './trainings-pagination-bar'
import { TrainingsTable } from './trainings-table'

interface TrainingApprovalSummary {
  pending_approval_actions: string[]
}

interface TrainingsListPanelProps {
  title: string
  search: string
  onSearchChange: (value: string) => void
  sections: FilterSectionConfig[]
  filters: UseListFiltersResult
  trainings: Training[]
  approvalById: Record<string, TrainingApprovalSummary>
  onView: (training: Training) => void
  onEdit: (training: Training) => void
  onDuplicate: (training: Training) => void
  onDelete: (training: Training) => void
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  sortBy?: string
  sortDir: SortDir
  onSortChange: (field: string) => void
  movementDisabled: boolean
  trainingTypeColors?: CatalogValueWithColor[]
  page: number
  totalPages: number
  onPreviousPage: () => void
  onNextPage: () => void
}

export function TrainingsListPanel({
  title,
  search,
  onSearchChange,
  sections,
  filters,
  trainings,
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
  trainingTypeColors,
  page,
  totalPages,
  onPreviousPage,
  onNextPage,
}: TrainingsListPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>
          Vista paginada del catálogo con búsqueda y acciones por entrenamiento
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

        {trainings.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No se encontraron entrenamientos con la búsqueda y filtros actuales.
          </p>
        ) : (
          <TrainingsTable
            trainings={trainings}
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
            trainingTypeColors={trainingTypeColors}
          />
        )}

        {/* Pagination */}
        <TrainingsPaginationBar
          page={page}
          totalPages={totalPages}
          onPrevious={onPreviousPage}
          onNext={onNextPage}
        />
      </CardContent>
    </Card>
  )
}
