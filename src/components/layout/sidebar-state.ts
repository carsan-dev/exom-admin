export const SIDEBAR_STORAGE_KEY = 'exom-admin-sidebar'

/** Lee el estado de escritorio; ante error o ausencia de valor, expandido. */
export function readSidebarExpanded(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'rail'
  } catch {
    return true
  }
}

export function writeSidebarExpanded(expanded: boolean): void {
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, expanded ? 'expanded' : 'rail')
  } catch {
    // Almacenamiento no disponible: la preferencia solo vive en memoria.
  }
}
