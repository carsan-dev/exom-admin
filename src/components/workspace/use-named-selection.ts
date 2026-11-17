import { useEffect, useState } from 'react'
import type { BulkDeleteItem } from '@/lib/bulk-delete'

export interface NamedItem {
  id: string
  name: string
}

export interface UseNamedSelectionResult {
  selectedIds: Set<string>
  /** Replaces the selection (the table hands over the full next set). */
  updateSelection: (next: Set<string>) => void
  clearSelection: () => void
  /** Keeps only the given ids selected (e.g. the retryable ones after a partial batch). */
  retainSelection: (ids: ReadonlySet<string>) => void
  /** Selected ids with their remembered names, in selection order. */
  toItems: () => BulkDeleteItem[]
}

/**
 * Selection that spans pages and remembers each item's name while it is visible, so a later
 * confirmation can list items that are no longer on screen. Cleared whenever `resetKey` changes
 * (search, filters, sort), like the page it serves.
 */
export function useNamedSelection(
  pageItems: ReadonlyArray<NamedItem>,
  resetKey: string
): UseNamedSelectionResult {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // id → name of every selected item, fed while selecting (the selection spans pages).
  const [selectedNames, setSelectedNames] = useState<Map<string, string>>(new Map())

  const updateSelection = (next: Set<string>) => {
    setSelectedIds(next)
    setSelectedNames((previous) => {
      const names = new Map<string, string>()
      for (const id of next) {
        names.set(id, previous.get(id) ?? pageItems.find((item) => item.id === id)?.name ?? id)
      }
      return names
    })
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setSelectedNames(new Map())
  }

  const retainSelection = (ids: ReadonlySet<string>) => {
    setSelectedIds(new Set(ids))
    setSelectedNames((previous) => new Map([...previous].filter(([id]) => ids.has(id))))
  }

  useEffect(() => {
    setSelectedIds(new Set())
    setSelectedNames(new Map())
  }, [resetKey])

  const toItems = () => [...selectedIds].map((id) => ({ id, name: selectedNames.get(id) ?? id }))

  return { selectedIds, updateSelection, clearSelection, retainSelection, toItems }
}
