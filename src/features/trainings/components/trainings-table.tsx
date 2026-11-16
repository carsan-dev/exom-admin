import { useMediaQuery } from '@/hooks/use-media-query'
import type { SortDir } from '@/lib/sort-search-params'
import { getCatalogColorMap, type CatalogValueWithColor, type Training } from '../types'
import { TrainingsDesktopTable } from './trainings-desktop-table'
import type { TrainingApprovalSummary } from './training-row-parts'
import { TrainingsMobileList } from './trainings-mobile-list'

interface TrainingsTableProps {
  trainings: Training[]
  approvalById?: Record<string, TrainingApprovalSummary>
  onView: (training: Training) => void
  onEdit: (training: Training) => void
  onDuplicate: (training: Training) => void
  onDelete: (training: Training) => void
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  movementDisabled?: boolean
  sortBy?: string
  sortDir?: SortDir
  onSortChange?: (field: string) => void
  trainingTypeColors?: CatalogValueWithColor[]
}

/** Props comunes de las dos variantes (tabla y lista apilada). */
export interface TrainingsListViewProps {
  trainings: Training[]
  approvalById: Record<string, TrainingApprovalSummary>
  onView: (training: Training) => void
  onEdit: (training: Training) => void
  onDuplicate: (training: Training) => void
  onDelete: (training: Training) => void
  selectedIds: Set<string>
  allSelected: boolean
  onToggleAll: () => void
  onToggle: (id: string) => void
  movementDisabled?: boolean
  sortBy?: string
  sortDir: SortDir
  onSortChange: (field: string) => void
  colorMap: Map<string, string>
}

export function TrainingsTable({
  trainings,
  approvalById = {},
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  selectedIds = new Set(),
  onSelectionChange,
  movementDisabled,
  sortBy,
  sortDir = 'asc',
  onSortChange = () => {},
  trainingTypeColors,
}: TrainingsTableProps) {
  // Tabla desde md; lista apilada por debajo. Solo se monta una variante.
  const isDesktop = useMediaQuery('(min-width: 768px)', true)
  const colorMap = getCatalogColorMap(trainingTypeColors)
  const allSelected = trainings.length > 0 && trainings.every((item) => selectedIds.has(item.id))
  const toggleAll = () => {
    const next = new Set(selectedIds)
    for (const training of trainings) {
      if (allSelected) next.delete(training.id)
      else next.add(training.id)
    }
    onSelectionChange?.(next)
  }
  const toggle = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange?.(next)
  }

  const viewProps: TrainingsListViewProps = {
    trainings,
    approvalById,
    onView,
    onEdit,
    onDuplicate,
    onDelete,
    selectedIds,
    allSelected,
    onToggleAll: toggleAll,
    onToggle: toggle,
    movementDisabled,
    sortBy,
    sortDir,
    onSortChange,
    colorMap,
  }

  return isDesktop ? <TrainingsDesktopTable {...viewProps} /> : <TrainingsMobileList {...viewProps} />
}
