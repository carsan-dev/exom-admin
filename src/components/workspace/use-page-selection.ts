const EMPTY_SELECTION: ReadonlySet<string> = new Set()

export interface UsePageSelectionResult {
  /** Every row of the visible page is selected. */
  allSelected: boolean
  /** State of the «Seleccionar página» header checkbox: checked, mixed or unchecked. */
  headerChecked: boolean | 'indeterminate'
  /** Selects the visible page, or deselects it when it is already fully selected. */
  toggleAll: () => void
  toggle: (id: string) => void
}

/**
 * Selection helpers for a paginated list. The selection spans pages, so the header control only
 * reads and writes the rows currently visible and leaves the rest of the set untouched.
 */
export function usePageSelection(
  items: ReadonlyArray<{ id: string }>,
  selectedIds: ReadonlySet<string> = EMPTY_SELECTION,
  onSelectionChange?: (ids: Set<string>) => void
): UsePageSelectionResult {
  const selectedOnPage = items.filter((item) => selectedIds.has(item.id)).length
  const allSelected = items.length > 0 && selectedOnPage === items.length
  const headerChecked = allSelected ? true : selectedOnPage > 0 ? 'indeterminate' : false

  const toggleAll = () => {
    const next = new Set(selectedIds)
    for (const item of items) {
      if (allSelected) next.delete(item.id)
      else next.add(item.id)
    }
    onSelectionChange?.(next)
  }

  const toggle = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange?.(next)
  }

  return { allSelected, headerChecked, toggleAll, toggle }
}
