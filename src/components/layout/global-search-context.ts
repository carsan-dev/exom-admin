import { createContext, useContext } from 'react'

export interface GlobalSearchContextValue {
  isOpen: boolean
  /**
   * Opens the search. Focus returns to `returnFocusTo` when it closes; without it,
   * to the element that had focus when it opened.
   */
  openSearch: (returnFocusTo?: HTMLElement | null) => void
}

export const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null)

/** Null outside `GlobalSearchProvider`: entry points render nothing there. */
export function useGlobalSearch() {
  return useContext(GlobalSearchContext)
}
