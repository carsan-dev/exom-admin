import { useId } from 'react'
import {
  FilterToolbar,
  type FilterSectionConfig,
  type UseListFiltersResult,
} from '@/components/filters'
import { EmptyState } from '@/components/page'
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
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="min-w-0 space-y-4">
      <div>
        <h2 id={titleId} className="font-display text-lg font-bold uppercase leading-none text-foreground">
          {title}
        </h2>
        <p className="mt-1 text-[13px] text-foreground-secondary">
          Vista paginada del catálogo con búsqueda y acciones por entrenamiento
        </p>
      </div>

      <FilterToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar por nombre..."
        sections={sections}
        filters={filters}
      />

      {trainings.length === 0 ? (
        <EmptyState
          className="border-y border-border"
          title="No se encontraron entrenamientos con la búsqueda y filtros actuales."
        />
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

      <TrainingsPaginationBar
        page={page}
        totalPages={totalPages}
        onPrevious={onPreviousPage}
        onNext={onNextPage}
      />
    </section>
  )
}
