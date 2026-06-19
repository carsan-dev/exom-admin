export function resolveDraggedCatalogIds(activeId: string, selectedIds: Set<string>) {
  return selectedIds.has(activeId) ? [...selectedIds] : [activeId]
}
