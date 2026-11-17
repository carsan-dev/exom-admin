import { useMediaQuery } from '@/hooks/use-media-query'
import type { SortDir } from '@/lib/sort-search-params'
import { getDietBadgeColorMap, type DietCatalogValueWithColor, type Diet } from '../types'
import { DietsDesktopTable } from './diets-desktop-table'
import type { DietApprovalSummary } from './diet-row-parts'
import { DietsMobileList } from './diets-mobile-list'

interface DietsTableProps {
  diets: Diet[]
  approvalById?: Record<string, DietApprovalSummary>
  onView: (diet: Diet) => void
  onEdit: (diet: Diet) => void
  onDuplicate: (diet: Diet) => void
  onDelete: (diet: Diet) => void
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  movementDisabled?: boolean
  sortBy?: string
  sortDir?: SortDir
  onSortChange?: (field: string) => void
  nutritionalBadgeColors?: DietCatalogValueWithColor[]
}

/** Props comunes de las dos variantes (tabla y lista apilada). */
export interface DietsListViewProps {
  diets: Diet[]
  approvalById: Record<string, DietApprovalSummary>
  onView: (diet: Diet) => void
  onEdit: (diet: Diet) => void
  onDuplicate: (diet: Diet) => void
  onDelete: (diet: Diet) => void
  selectedIds: Set<string>
  allSelected: boolean
  onToggleAll: () => void
  onToggle: (id: string) => void
  movementDisabled?: boolean
  sortBy?: string
  sortDir: SortDir
  onSortChange: (field: string) => void
  badgeColorMap: Map<string, string>
}

export function DietsTable({
  diets,
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
  nutritionalBadgeColors,
}: DietsTableProps) {
  // Tabla desde md; lista apilada por debajo. Solo se monta una variante.
  const isDesktop = useMediaQuery('(min-width: 768px)', true)
  const badgeColorMap = getDietBadgeColorMap(nutritionalBadgeColors)
  const allSelected = diets.length > 0 && diets.every((item) => selectedIds.has(item.id))
  const toggleAll = () => {
    const next = new Set(selectedIds)
    for (const diet of diets) {
      if (allSelected) next.delete(diet.id)
      else next.add(diet.id)
    }
    onSelectionChange?.(next)
  }
  const toggle = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange?.(next)
  }

  const viewProps: DietsListViewProps = {
    diets,
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
    badgeColorMap,
  }

  return isDesktop ? <DietsDesktopTable {...viewProps} /> : <DietsMobileList {...viewProps} />
}
